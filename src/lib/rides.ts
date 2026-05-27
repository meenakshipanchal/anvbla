import "server-only";
import { adminDb } from "./firebase-admin";
import { type Ride } from "./data";
import { ensureUserDoc, POSTED, BOOKED } from "./users";

/* Rides live under each driver: users/{driverId}/postedRides/{rideId}.
   Global listings use a collection-group query across every driver's
   postedRides. Writes go through the Admin SDK only, after the caller's
   Firebase session is verified server-side. */

export async function listRides(): Promise<Ride[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collectionGroup(POSTED).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ride, "id">) }));
  } catch {
    return [];
  }
}

// Rides are keyed by id but nested under a driver, so resolve via collection group.
export async function getRideById(id: string): Promise<Ride | null> {
  if (!adminDb) return null;
  try {
    const snap = await adminDb.collectionGroup(POSTED).get();
    const doc = snap.docs.find((d) => d.id === id);
    return doc ? { id: doc.id, ...(doc.data() as Omit<Ride, "id">) } : null;
  } catch {
    return null;
  }
}

export async function listRidesByDriver(uid: string): Promise<Ride[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection("users").doc(uid).collection(POSTED).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ride, "id">) }));
  } catch {
    return [];
  }
}

export async function createRide(data: Omit<Ride, "id">): Promise<string> {
  if (!adminDb) throw new Error("Firestore is not configured (missing Admin SDK credentials).");
  const driverId = data.driverId;
  if (!driverId) throw new Error("Missing driver.");
  await ensureUserDoc(driverId, data.driver);
  const ref = adminDb.collection("users").doc(driverId).collection(POSTED).doc();
  // Store the id in the doc too so collection-group results carry it.
  await ref.set({ ...data, rideId: ref.id });
  return ref.id;
}

// Driver marks the trip done once they reach the destination (unlocks reviews).
export async function markRideCompleted(driverUid: string, rideId: string): Promise<void> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const ref = adminDb.collection("users").doc(driverUid).collection(POSTED).doc(rideId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Ride not found.");
  await ref.update({ completed: true });
}

/* Driver cancels their own ride. Cascades to every booking on it: pending +
   confirmed bookings flip to "declined" with a system reason, so passengers
   see WHY in their /trips page. Returns the cancelled bookings so the caller
   can push-notify each affected passenger. */
export type CancelledBooking = { passengerId: string; from: string; to: string; rideId: string };
export async function deleteRide(driverUid: string, rideId: string): Promise<CancelledBooking[]> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const db = adminDb;
  const rideRef = db.collection("users").doc(driverUid).collection(POSTED).doc(rideId);
  const rideSnap = await rideRef.get();
  if (!rideSnap.exists) throw new Error("Ride not found.");

  // Find every booking that targets this ride. We deliberately don't use
  // .where("rideId", "==", rideId) on the collection-group query because that
  // would require a composite index — instead we fetch all bookedRides and
  // filter in memory (same trick listBookingsForRide / listBookingsForDriver
  // already use, so the app stays index-free).
  const bookingsSnap = await db.collectionGroup(BOOKED).get();
  const affected: CancelledBooking[] = [];
  const batch = db.batch();
  for (const d of bookingsSnap.docs) {
    const b = d.data();
    if (b.rideId !== rideId) continue;
    if (b.status === "pending" || b.status === "confirmed") {
      batch.update(d.ref, {
        status: "declined",
        respondedAt: Date.now(),
        declineReason: "The driver cancelled this ride.",
      });
      affected.push({
        passengerId: b.userId,
        from: b.from || "",
        to: b.to || "",
        rideId,
      });
    }
  }
  batch.delete(rideRef);
  await batch.commit();
  return affected;
}
