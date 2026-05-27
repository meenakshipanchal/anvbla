"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/lib/useAuthUser";
import { pushSupport, requestPushPermission } from "@/lib/fcm";

/* Small in-app prompt asking the user to enable push notifications. Appears
   bottom-center, above the bottom nav, only for signed-in users on browsers
   that actually support push AND haven't decided yet. Dismissable; remembers
   "not now" for the rest of the session. */

const DISMISS_KEY = "bb-push-dismissed";

export default function NotificationPrompt() {
  const { isSignedIn } = useAuthUser();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const s = pushSupport();
    // Only prompt when the browser supports it AND the user hasn't decided.
    // Granted = already on (silently re-register the token in case it rotated);
    // denied = leave them alone (browser would no-op anyway).
    if (s === "default") {
      // Small delay so it doesn't pop the instant the page loads.
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
    if (s === "granted") {
      void requestPushPermission(); // refresh token in background
    }
  }, [isSignedIn]);

  if (!show) return null;

  async function enable() {
    setBusy(true);
    await requestPushPermission();
    setBusy(false);
    setShow(false);
  }
  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div
      className="fixed inset-x-3 z-[80] mx-auto max-w-md rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-lg)]"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-soft text-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Turn on notifications</div>
          <div className="mt-0.5 text-muted">
            Get instant alerts for ride requests, accepts, and chat messages — even when BlaBlue is closed.
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={dismiss} className="px-3 py-2 font-semibold text-muted">
          Not now
        </button>
        <button onClick={enable} disabled={busy} className="btn btn-primary px-4 py-2 disabled:opacity-60">
          {busy ? "Asking…" : "Enable"}
        </button>
      </div>
    </div>
  );
}
