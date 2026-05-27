import "server-only";
import { adminDb, adminMessaging } from "./firebase-admin";

/* Server-side push notifications via Firebase Cloud Messaging.
   Stored tokens live at /users/{uid}/fcmTokens/{tokenId}. We send to ALL of a
   user's tokens (each device = one token), and prune any the FCM service
   reports as expired or invalid. Free + unlimited on Firebase's Spark plan. */

const TOKENS = "fcmTokens";

export async function saveFcmToken(uid: string, token: string): Promise<void> {
  if (!adminDb) return;
  // Use the token itself as the doc id so re-registers are idempotent
  // (deterministic id ⇒ same doc, no duplicate). Tokens can be up to ~163
  // chars; Firestore doc ids cap at 1500 bytes, so safe.
  const id = token.replace(/[/]/g, "_");
  await adminDb
    .collection("users")
    .doc(uid)
    .collection(TOKENS)
    .doc(id)
    .set({ token, createdAt: Date.now() }, { merge: true });
}

/* Send a push to every device the user has registered. Title/body are shown
   on the OS notification; `url` is the in-app deep-link the SW opens on tap;
   `tag` lets us collapse duplicates (e.g. multiple "new message" pings from
   the same chat replace each other instead of stacking). */
export async function sendPush(
  uid: string,
  args: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
  if (!adminDb || !adminMessaging) return;
  try {
    const snap = await adminDb.collection("users").doc(uid).collection(TOKENS).get();
    const tokens = snap.docs.map((d) => d.get("token") as string).filter(Boolean);
    if (tokens.length === 0) return;

    const res = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title: args.title, body: args.body },
      data: {
        url: args.url || "/",
        ...(args.tag ? { tag: args.tag } : {}),
      },
      webpush: {
        fcmOptions: { link: args.url || "/" },
      },
    });

    // Prune dead tokens so future sends are cheap and we don't keep retrying
    // expired devices. FCM tells us per-token whether delivery failed.
    const stale: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-argument") ||
          code.includes("invalid-registration-token")
        ) {
          stale.push(tokens[i]);
        }
      }
    });
    if (stale.length > 0) {
      const batch = adminDb.batch();
      for (const t of stale) {
        const id = t.replace(/[/]/g, "_");
        batch.delete(adminDb.collection("users").doc(uid).collection(TOKENS).doc(id));
      }
      await batch.commit().catch(() => {});
    }
  } catch {
    // Best-effort: a failed push must never break the user-facing API call.
  }
}
