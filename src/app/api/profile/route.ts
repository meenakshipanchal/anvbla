import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/* Profile read/write — returns the signed-in user's editable profile fields
   (bio) and a few read-only ones (joinedAt) sourced from Firebase Admin
   metadata. The user doc at users/{uid} is the source of truth for editable
   fields; auth metadata covers the rest. */

// Route handlers in Next 15 are dynamic by default, but Vercel + browsers
// can still cache GETs aggressively. Mark this dynamic + no-store so the
// freshly-saved bio is never served from anywhere stale.
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ profile: null }, { headers: NO_STORE });

  let bio = "";
  let joinedAt: number | null = null;

  try {
    if (adminDb) {
      const snap = await adminDb.collection("users").doc(user.uid).get();
      if (snap.exists) bio = String(snap.data()?.bio ?? "");
    }
  } catch {
    /* doc may not exist yet — bio stays empty */
  }
  try {
    // creationTime comes from the Firebase Auth metadata, NOT the user doc
    // (the user doc is created lazily on first ride/booking and would be
    // misleading here). Falls back to null if Admin Auth is unavailable.
    if (adminAuth) {
      const rec = await adminAuth.getUser(user.uid);
      const t = rec.metadata.creationTime;
      if (t) {
        const ms = Date.parse(t);
        if (!Number.isNaN(ms)) joinedAt = ms;
      }
    }
  } catch {
    /* ignore — joinedAt stays null */
  }

  return NextResponse.json(
    {
      profile: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        picture: user.picture,
        bio,
        joinedAt,
      },
    },
    { headers: NO_STORE }
  );
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!adminDb) return NextResponse.json({ error: "Backend not configured." }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const rawBio = typeof body.bio === "string" ? body.bio : "";
  // Cap length so a single user can't blow up the doc; carpooling bios are
  // short by nature. The cap is enforced here, NOT on the client, so a
  // hand-crafted POST can't bypass it.
  const bio = rawBio.trim().slice(0, 280);

  try {
    const ref = adminDb.collection("users").doc(user.uid);
    await ref.set({ bio, name: user.name, updatedAt: Date.now() }, { merge: true });
    // Read it back so the response definitively reflects what's in Firestore.
    // Without this, a "200 OK" can paper over a write that didn't actually
    // land — the user sees a success toast but a refresh shows the old value.
    const verify = await ref.get();
    const persisted = String(verify.data()?.bio ?? "");
    if (persisted !== bio) {
      console.error("[profile] post-write verify mismatch", {
        uid: user.uid,
        wrote: bio.length,
        readBack: persisted.length,
      });
      return NextResponse.json(
        { error: "Saved, but the value didn’t land in Firestore. Please retry." },
        { status: 500, headers: NO_STORE }
      );
    }
    // Profile shows up on /ride/[id] (driver strip) and could surface in
    // /search later; bust both so updates are immediate.
    revalidatePath("/account");
    revalidatePath("/search");
    return NextResponse.json({ ok: true, bio: persisted }, { headers: NO_STORE });
  } catch (e) {
    console.error("[profile] PATCH failed", { uid: user.uid, error: (e as Error).message });
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500, headers: NO_STORE }
    );
  }
}
