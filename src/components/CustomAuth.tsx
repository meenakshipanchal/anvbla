"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { firebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { useFirebaseUser } from "./FirebaseProvider";
import { Logo } from "./Icons";

/* BlaBlue auth — Google sign-in via Firebase.
   NOTE: the Clerk email-OTP flow is disabled for now. Email verification will
   be re-added later (via Firebase). The Clerk-based email UI/logic that used to
   live here was removed to keep this Google-only and avoid the Clerk CAPTCHA
   hydration mismatch. */

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 36 26.7 37 24 37c-5.3 0-9.7-3.6-11.3-8.4l-6.6 5.1C9 40.3 15.9 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.7 36.4 44 30.8 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function firebaseError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  // User dismissing the popup isn't an error worth showing.
  if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return "";
  return e?.message?.replace(/^Firebase:\s*/, "") || "Couldn’t sign in with Google. Please try again.";
}

export default function CustomAuth() {
  const router = useRouter();
  const { user } = useFirebaseUser();
  const [error, setError] = useState("");
  // Where to send the user after sign-in (set by the proxy when it bounced them
  // here), plus the saved search route for a friendly "your effort is safe" note.
  const [next, setNext] = useState<string | null>(null);
  const [savedRoute, setSavedRoute] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (!n || !n.startsWith("/")) return;
    setNext(n);
    const q = n.indexOf("?");
    if (n.startsWith("/search") && q !== -1) {
      const sp = new URLSearchParams(n.slice(q + 1));
      const from = sp.get("from") || "";
      const to = sp.get("to") || "";
      if (from || to) setSavedRoute({ from, to });
    }
  }, []);

  // Once signed in (via popup OR a returning redirect) AND the server session
  // cookie is established by FirebaseProvider, go where they intended. The
  // provider only exposes `user` after the cookie is set, so this is race-free.
  useEffect(() => {
    if (user) router.replace(next || "/trips");
  }, [user, next, router]);

  async function handleGoogle() {
    setError("");
    if (!firebaseAuth) {
      setError("Google sign-in isn’t configured yet. Add your Firebase keys to .env.local.");
      return;
    }
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      // EXPLICITLY create the server session cookie before navigating. The
      // FirebaseProvider's onIdTokenChanged also does this in the background,
      // but if we redirect first the proxy won't see the cookie yet and will
      // bounce us right back here — classic Vercel/Next race.
      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ||
            "Signed in with Google, but the server couldn’t create a session. " +
              "Usually means FIREBASE_PRIVATE_KEY is missing or malformed on the server."
        );
        return;
      }
      // Cookie is now set — navigation will succeed past the proxy check.
      router.replace(next || "/trips");
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Popup blocked / unsupported → fall back to a full-page redirect sign-in.
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-environment") {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        } catch (e) {
          setError(firebaseError(e));
          return;
        }
      }
      const msg = firebaseError(err);
      if (msg) setError(msg);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-[var(--shadow-md)] sm:p-8">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 w-fit">
          <Logo width={46} height={46} />
        </div>
        <h1 className="text-2xl font-bold">Log in or sign up</h1>
        <p className="mt-1 text-sm text-muted">Carpool across India with BlaBlue.</p>
      </div>

      {next && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-sky-soft px-4 py-3 text-left text-sm text-blue">
          <span className="mt-0.5 shrink-0">💾</span>
          <span>
            {savedRoute ? (
              <>
                Don’t worry — your search{" "}
                <b>
                  {savedRoute.from || "anywhere"} → {savedRoute.to || "anywhere"}
                </b>{" "}
                is saved. Sign in and you’ll pick up right where you left off — no need to type it again.
              </>
            ) : (
              <>Don’t worry — you won’t lose your place. Sign in and we’ll take you right back.</>
            )}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!isFirebaseConfigured}
        className="btn btn-outline w-full disabled:opacity-50"
      >
        <GoogleG /> Continue with Google
      </button>

      {error && <p className="mt-4 rounded-lg bg-[#fdecec] px-3 py-2 text-center text-sm text-[#c0392b]">{error}</p>}

      <p className="mt-6 text-center text-xs text-muted">
        By continuing you agree to BlaBlue’s Terms & Privacy Policy.
      </p>
    </div>
  );
}
