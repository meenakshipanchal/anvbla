"use client";

import { useEffect, useState } from "react";
import { useFirebaseUser } from "@/components/FirebaseProvider";
import { firebaseAuth } from "@/lib/firebase";

/* Source of truth for "is someone logged in". Prefers the Firebase client user
   (richer — has Google photo + display name), but falls back to the
   server-verified __session cookie when Firebase client hasn't yet restored
   its session in this tab (otherwise the header would flash "Log in" while
   server-rendered pages already show the user's data). */

export type AuthUser = {
  name: string;
  email: string;
  imageUrl: string | null;
  provider: "firebase";
};

type ServerUser = { uid: string; name: string; email: string; picture: string | null } | null;

export function useAuthUser() {
  const { user: fbUser, ready } = useFirebaseUser();
  const [serverUser, setServerUser] = useState<ServerUser>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d: { user: ServerUser }) => alive && setServerUser(d.user))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const user: AuthUser | null = fbUser
    ? {
        name: fbUser.displayName || "Traveller",
        email: fbUser.email ?? "",
        imageUrl: fbUser.photoURL,
        provider: "firebase",
      }
    : serverUser
      ? {
          name: serverUser.name,
          email: serverUser.email,
          imageUrl: serverUser.picture,
          provider: "firebase",
        }
      : null;

  async function signOut(redirectUrl = "/") {
    if (firebaseAuth?.currentUser) {
      const { signOut: fbSignOut } = await import("firebase/auth");
      await fbSignOut(firebaseAuth);
    }
    // Clear the server session cookie before leaving so the gate sees us as out.
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    window.location.href = redirectUrl;
  }

  return { user, isSignedIn: !!user, ready, signOut };
}
