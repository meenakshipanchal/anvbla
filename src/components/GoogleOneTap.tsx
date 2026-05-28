"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useFirebaseUser } from "./FirebaseProvider";

/* Global Google One Tap prompt.

   Mounted once in the root layout so the prompt appears on ANY page the
   moment a visitor lands without being signed in — homepage, /search, /ride,
   anywhere. The GSI script itself is preloaded in the layout's <head>; this
   component just wires the initialize() + prompt() once it's ready and the
   user is unauthenticated.

   No-op (returns null) if NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset, Firebase
   isn't initialized, or the user is already signed in. */

type GsiCredentialResponse = { credential: string };
type GsiId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GsiCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    itp_support?: boolean;
  }) => void;
  prompt: () => void;
  cancel: () => void;
  disableAutoSelect: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

const ONE_TAP_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function GoogleOneTap() {
  const router = useRouter();
  const { user } = useFirebaseUser();

  useEffect(() => {
    if (!ONE_TAP_CLIENT_ID || !firebaseAuth || user) return;

    let cancelled = false;
    let pollId: number | null = null;

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !firebaseAuth) return;
      window.google.accounts.id.initialize({
        client_id: ONE_TAP_CLIENT_ID,
        use_fedcm_for_prompt: true,
        cancel_on_tap_outside: false,
        auto_select: true,
        itp_support: true,
        callback: async (response) => {
          if (!firebaseAuth) return;
          try {
            const cred = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(firebaseAuth, cred);
            // FirebaseProvider's onIdTokenChanged sets the session cookie;
            // refresh server components so the navbar swaps Log in → avatar.
            router.refresh();
          } catch {
            /* Silently ignore — the fallback "Continue with Google" button
               on /sign-in still works. */
          }
        },
      });
      window.google.accounts.id.prompt();
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      pollId = window.setInterval(() => {
        if (window.google?.accounts?.id) {
          if (pollId !== null) window.clearInterval(pollId);
          init();
        }
      }, 50);
    }

    return () => {
      cancelled = true;
      if (pollId !== null) window.clearInterval(pollId);
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* prompt may already be gone */
      }
    };
  }, [user, router]);

  return null;
}
