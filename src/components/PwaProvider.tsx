"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./Icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Routes where the install banner must never appear (it would overlap the auth card).
const NO_BANNER_ROUTES = ["/sign-in", "/sign-up", "/sso-callback"];

export default function PwaProvider() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // The PWA cache service worker is a PRODUCTION-only optimisation. In dev
    // it caches Next's HMR chunks cache-first and serves stale UI, so we skip
    // registration and clean up the PWA SW from any previous build.
    //
    // IMPORTANT: we MUST NOT touch the FCM service worker
    // (/firebase-messaging-sw.js) here — that one handles push notifications
    // and is registered on-demand by requestPushPermission().
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        navigator.serviceWorker.getRegistrations().then((rs) => {
          for (const r of rs) {
            const url = r.active?.scriptURL || "";
            if (url.endsWith("/firebase-messaging-sw.js")) continue; // keep FCM
            r.unregister();
          }
        });
        if ("caches" in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
      }
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!sessionStorage.getItem("bb-install-dismissed")) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    sessionStorage.setItem("bb-install-dismissed", "1");
    setVisible(false);
  }

  const onAuthRoute = NO_BANNER_ROUTES.some((r) => pathname.startsWith(r));
  if (!visible || onAuthRoute) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-[90] mx-auto max-w-md rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-lg)] md:bottom-3">
      <div className="flex items-start gap-3">
        <Logo width={40} height={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Install BlaBlue</div>
          <div className="text-xs text-muted">Add the app to your home screen for a faster, offline-ready ride.</div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={dismiss} className="px-3 py-2 text-sm font-semibold text-muted">
          Not now
        </button>
        <button onClick={install} className="btn btn-primary px-4 py-2 text-sm">
          Install
        </button>
      </div>
    </div>
  );
}
