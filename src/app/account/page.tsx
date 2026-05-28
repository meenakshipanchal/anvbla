import AccountView from "./AccountView";
import { getCurrentUser } from "@/lib/session";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const metadata = { title: "Profile" };
// Render fresh every request — the user's bio is editable and we want the
// page to reflect the latest write the moment they refresh.
export const dynamic = "force-dynamic";

/* Prefetch the user's profile server-side so the bio + joined-since chip
   paint on the very first render — no client useEffect round-trip, no
   placeholder flicker. AccountView still talks to /api/profile after
   editing, but the initial values come from here. */
export default async function AccountPage() {
  const user = await getCurrentUser();

  let bio = "";
  let joinedAt: number | null = null;
  if (user) {
    try {
      if (adminDb) {
        const snap = await adminDb.collection("users").doc(user.uid).get();
        if (snap.exists) bio = String(snap.data()?.bio ?? "");
      }
    } catch {
      /* no doc yet — bio stays empty */
    }
    try {
      if (adminAuth) {
        const rec = await adminAuth.getUser(user.uid);
        const t = rec.metadata.creationTime;
        if (t) {
          const ms = Date.parse(t);
          if (!Number.isNaN(ms)) joinedAt = ms;
        }
      }
    } catch {
      /* leave joinedAt null */
    }
  }

  return <AccountView initialBio={bio} initialJoinedAt={joinedAt} />;
}
