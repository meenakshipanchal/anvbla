import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "./firebase-admin";
import { type Ride } from "./data";
import { ensureUserDoc, POSTED, BOOKED } from "./users";

/* Rides live under each driver: users/{driverId}/postedRides/{rideId}.
   Global listings use a collection-group query across every driver's
   postedRides. Writes go through the Admin SDK only, after the caller's
   Firebase session is verified server-side. */

// Tag name used by the cached reads below. Mutation handlers call
// revalidateTag(RIDES_TAG) to invalidate the cache the moment a ride is
// created/updated/deleted — so /search/listings stay fast (cached reads)
// without ever going stale.
export const RIDES_TAG = "rides";

// Only rides on/after today are useful for /search — anything older is a
// past trip with no booking value. Filter at the query level so Firestore
// returns far less data (the in-memory client filters then run on a small
// list). `date` is stored as YYYY-MM-DD which sorts correctly as a string.
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const listRides = unstable_cache(
  async (): Promise<Ride[]> => {
    if (!adminDb) return [];
    try {
      // `.where("date", ">=", today)` on a collection-group query needs a
      // single-field index — Firestore auto-creates it on first use. The cap
      // keeps the payload small even if the DB grows.
      const snap = await adminDb
        .collectionGroup(POSTED)
        .where("date", ">=", todayISO())
        .orderBy("date")
        .limit(200)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ride, "id">) }));
    } catch {
      // If the composite index isn't ready yet (first deploy) fall back to a
      // plain collection-group fetch — slower, but the page still works.
      try {
        const snap = await adminDb.collectionGroup(POSTED).limit(200).get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ride, "id">) }));
      } catch {
        return [];
      }
    }
  },
  ["rides:list"],
  // 60s safety net — even without an explicit revalidateTag, listings won't
  // be older than this. Tag-based invalidation handles the common case.
  { revalidate: 60, tags: [RIDES_TAG] }
);

// Top-level lookup so we can resolve a rideId → driverId in ONE read, then
// fetch the ride doc directly. Without this, getRideById has to do a
// collection-group scan over everyone's rides — O(total rides in the system).
// Written by createRide; removed by deleteRide.
const RIDE_INDEX = "rideIndex";

// Rides are keyed by id but nested under a driver, so we used to resolve via
// a full collection-group scan. Now: 1 index read + 1 direct doc read. Tag-
// cached so repeat views are instant; tag-busted on delete/update.
export async function getRideById(id: string): Promise<Ride | null> {
  return unstable_cache(
    async (rideId: string): Promise<Ride | null> => {
      if (!adminDb) return null;
      try {
        const idx = await adminDb.collection(RIDE_INDEX).doc(rideId).get();
        const driverId = idx.exists ? (idx.data()?.driverId as string | undefined) : undefined;
        if (driverId) {
          const ref = adminDb.collection("users").doc(driverId).collection(POSTED).doc(rideId);
          const snap = await ref.get();
          return snap.exists
            ? ({ id: snap.id, ...(snap.data() as Omit<Ride, "id">) } as Ride)
            : null;
        }
        // Legacy fallback for rides created before the index existed — slow,
        // but works. New rides always hit the fast path above.
        const groupSnap = await adminDb.collectionGroup(POSTED).get();
        const doc = groupSnap.docs.find((d) => d.id === rideId);
        return doc ? { id: doc.id, ...(doc.data() as Omit<Ride, "id">) } : null;
      } catch {
        return null;
      }
    },
    ["rides:byId", id],
    { revalidate: 60, tags: [RIDES_TAG, `ride:${id}`] }
  )(id);
}

// Per-driver listing — cached per uid via the cache key array.
export async function listRidesByDriver(uid: string): Promise<Ride[]> {
  return unstable_cache(
    async (driverUid: string): Promise<Ride[]> => {
      if (!adminDb) return [];
      try {
        const snap = await adminDb.collection("users").doc(driverUid).collection(POSTED).get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ride, "id">) }));
      } catch {
        return [];
      }
    },
    ["rides:byDriver", uid],
    { revalidate: 60, tags: [RIDES_TAG, `driver:${uid}`] }
  )(uid);
}

export async function createRide(data: Omit<Ride, "id">): Promise<string> {
  if (!adminDb) throw new Error("Firestore is not configured (missing Admin SDK credentials).");
  const driverId = data.driverId;
  if (!driverId) throw new Error("Missing driver.");
  await ensureUserDoc(driverId, data.driver);
  const ref = adminDb.collection("users").doc(driverId).collection(POSTED).doc();
  // Write the ride and the top-level lookup atomically — both must succeed or
  // getRideById will fall back to the slow path. The index lets future reads
  // resolve rideId → driverId in one tiny doc fetch.
  const batch = adminDb.batch();
  batch.set(ref, { ...data, rideId: ref.id });
  batch.set(adminDb.collection(RIDE_INDEX).doc(ref.id), { driverId, createdAt: Date.now() });
  await batch.commit();
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
  // Keep the rideIndex lookup in sync — otherwise getRideById would still
  // resolve the rideId to a now-missing driver doc and return null on the
  // slow path. Cleaner to drop the index entry as part of the same batch.
  batch.delete(db.collection(RIDE_INDEX).doc(rideId));
  await batch.commit();
  return affected;
}
