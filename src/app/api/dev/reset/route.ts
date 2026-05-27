import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

/* Dev-only: deletes every document in the `rides` collection. Used once to wipe
   the old dummy rides so the app shows only real, user-published data. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production." }, { status: 403 });
  }
  if (!adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured." }, { status: 500 });
  }
  try {
    const snap = await adminDb.collection("rides").get();
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return NextResponse.json({ deleted: snap.size, collection: "rides" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
