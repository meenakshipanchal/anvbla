"use client";

/* Client-side Firebase Cloud Messaging helpers.
   - requestPushPermission(): one-time prompt; on grant, fetches the device
     push token and registers it server-side for the signed-in user.
   - Idempotent across reloads: skips work if the user has already granted
     and a token is already saved in localStorage. */

import { firebaseApp, firebaseVapidKey } from "@/lib/firebase";

const LS_TOKEN_KEY = "bb-fcm-token";

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export function pushSupport(): PushPermission {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (!firebaseApp || !firebaseVapidKey) return "unsupported";
  return Notification.permission as PushPermission;
}

/* Asks the browser for permission, then registers an FCM token with the
   server. Returns the new permission state. Safe to call multiple times. */
export async function requestPushPermission(): Promise<PushPermission> {
  const support = pushSupport();
  if (support === "unsupported" || support === "denied") return support;

  // Browser permission prompt (no-op if already granted).
  const perm = (await Notification.requestPermission()) as PushPermission;
  if (perm !== "granted") return perm;

  try {
    // Register OUR Firebase SW (not the PWA cache one) at the root scope.
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });

    // Lazy-load so we don't ship the messaging SDK to users who never grant.
    const { getMessaging, getToken, onMessage, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return "unsupported";

    const messaging = getMessaging(firebaseApp!);
    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: reg,
    });
    if (!token) return "default";

    // Foreground messages still arrive via onMessage — the SW handler only
    // fires in the background. Re-route to an in-app toast so the user sees
    // it even while the tab is focused.
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "BlaBlue";
      const body = payload.notification?.body || "";
      // Lightweight: just use our existing toast.
      import("@/lib/toast").then(({ toast }) => toast(`${title} — ${body}`));
    });

    // Persist server-side. Skip if we already registered this exact token.
    const cached = localStorage.getItem(LS_TOKEN_KEY);
    if (cached === token) return "granted";
    const r = await fetch("/api/fcm/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) localStorage.setItem(LS_TOKEN_KEY, token);
  } catch {
    // Best-effort: a network blip or browser quirk shouldn't crash the app.
  }
  return "granted";
}
