import "server-only";
import { adminDb } from "./firebase-admin";

/* Each user is a document at users/{uid} holding two sub-collections:
     users/{uid}/postedRides   — rides this user published (as a driver)
     users/{uid}/bookedRides   — rides this user booked (as a passenger)
   Cross-user reads (global search, a driver's incoming requests) use Firestore
   collection-group queries over those sub-collections. */

export const POSTED = "postedRides";
export const BOOKED = "bookedRides";

export async function ensureUserDoc(uid: string, name: string): Promise<void> {
  if (!adminDb || !uid) return;
  try {
    await adminDb.collection("users").doc(uid).set({ name, updatedAt: Date.now() }, { merge: true });
  } catch {
    /* non-fatal */
  }
}
