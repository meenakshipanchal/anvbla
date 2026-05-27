"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { firebaseApp, firebaseAuth } from "@/lib/firebase";

/* Tracks the Firebase (Google) user, mirrors auth state into a lightweight
   cookie the proxy/middleware can read for an optimistic route gate, and boots
   Firebase Analytics (GA4). Email users continue to flow through Clerk. */

type FirebaseAuthState = { user: User | null; ready: boolean };
const FirebaseAuthContext = createContext<FirebaseAuthState>({ user: null, ready: false });

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FirebaseAuthState>({ user: null, ready: !firebaseAuth });

  useEffect(() => {
    if (!firebaseAuth) return;
    // Keep a server-verified session cookie in sync with Firebase auth state.
    // We expose `user` only AFTER the cookie is established, so navigation to a
    // protected route never races ahead of the gate.
    const unsub = onIdTokenChanged(firebaseAuth, async (user) => {
      try {
        if (user) {
          const idToken = await user.getIdToken();
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } else {
          await fetch("/api/auth/session", { method: "DELETE" });
        }
      } catch {
        // network hiccup — still reflect the auth state locally
      }
      setState({ user, ready: true });
    });
    return unsub;
  }, []);

  // Boot Analytics in the browser only, and only when supported (no SSR, no measurementId → skip).
  useEffect(() => {
    const app = firebaseApp;
    if (!app) return;
    let cancelled = false;
    import("firebase/analytics").then(({ isSupported, getAnalytics }) =>
      isSupported().then((ok) => {
        if (ok && !cancelled) getAnalytics(app);
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return <FirebaseAuthContext.Provider value={state}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseUser() {
  return useContext(FirebaseAuthContext);
}
