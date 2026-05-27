import "server-only";
import { adminDb } from "./firebase-admin";
import type { SessionUser } from "./session";
import { ensureUserDoc, POSTED, BOOKED } from "./users";

/* Bookings live under each passenger: users/{passengerId}/bookedRides/{id}.
   The booked ride itself lives under its driver: users/{driverId}/postedRides/{rideId}.
   Flow:
   - Instant rides confirm immediately and decrement seats on booking.
   - On-request rides create a PENDING request (no seats taken yet); the driver
     accepts/declines. On accept, seats are decremented and status → confirmed.
   A driver's incoming requests are read via a collection-group query over every
   passenger's bookedRides, filtered in memory (keeps it index-free). */

export type BookingStatus = "pending" | "confirmed" | "declined";
export type PaymentMethod = "online" | "cash";

export type Booking = {
  id: string;
  rideId: string;
  userId: string; // passenger
  userName: string;
  driverId: string; // the ride's driver
  seats: number;
  total: number;
  from: string;
  to: string;
  date: string;
  dep: string;
  driver: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "paid" | "cash" | "unpaid";
  commission: number;
  createdAt: number;
  // Set when the driver responds. `declineReason` is shown to the passenger so
  // they know WHY their request didn't go through (optional, driver may skip).
  respondedAt?: number;
  declineReason?: string;
};

const COMMISSION_RATE = 0.05; // platform's cut, taken from the driver's earnings

export async function createBooking(
  user: SessionUser,
  input: { rideId: string; driverId: string; seats: number; paymentMethod: PaymentMethod }
): Promise<{ id: string; status: BookingStatus }> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const db = adminDb;
  const { rideId, driverId, seats, paymentMethod } = input;

  await ensureUserDoc(user.uid, user.name);

  return db.runTransaction(async (tx) => {
    const rideRef = db.collection("users").doc(driverId).collection(POSTED).doc(rideId);
    const snap = await tx.get(rideRef);
    if (!snap.exists) throw new Error("This ride no longer exists.");

    const ride = snap.data()!;
    if (driverId === user.uid) throw new Error("You can’t book your own ride.");
    if ((ride.seats ?? 0) < seats) throw new Error("Not enough seats left.");

    // Every booking starts as a request; the driver must accept before seats
    // are taken and the trip is confirmed. (Even on rides flagged 'instant' —
    // 'instant' now just means the driver is notified immediately.)
    const status: BookingStatus = "pending";

    const total = (ride.price ?? 0) * seats;
    const bookingRef = db.collection("users").doc(user.uid).collection(BOOKED).doc();
    tx.set(bookingRef, {
      bookingId: bookingRef.id,
      rideId,
      userId: user.uid,
      userName: user.name,
      driverId,
      seats,
      total,
      from: ride.from ?? "",
      to: ride.to ?? "",
      date: ride.date ?? "",
      dep: ride.dep ?? "",
      driver: ride.driver ?? "",
      status,
      paymentMethod,
      // Payment is deferred — collected on acceptance for online, on board for cash.
      paymentStatus: paymentMethod === "online" ? "unpaid" : "cash",
      commission: Math.round(total * COMMISSION_RATE),
      createdAt: Date.now(),
    });

    // Open a chat thread between passenger and driver as soon as a request exists.
    const threadId = `${rideId}__${user.uid}`;
    tx.set(
      db.collection("threads").doc(threadId),
      {
        rideId,
        route: `${ride.from ?? ""} → ${ride.to ?? ""}`,
        passengerId: user.uid,
        passengerName: user.name,
        driverId,
        driverName: ride.driver ?? "",
      },
      { merge: true }
    );

    return { id: bookingRef.id, status };
  });
}

// A passenger's own bookings (any status).
export async function listBookingsByUser(uid: string): Promise<Booking[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection("users").doc(uid).collection(BOOKED).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
  } catch {
    return [];
  }
}

// Every booking on a specific ride (any status) — used to list accepted co-passengers.
export async function listBookingsForRide(rideId: string): Promise<Booking[]> {
  if (!adminDb || !rideId) return [];
  try {
    const snap = await adminDb.collectionGroup(BOOKED).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))
      .filter((b) => b.rideId === rideId);
  } catch {
    return [];
  }
}

// Bookings on rides this user drives (any status) — collection group, filtered in memory.
export async function listBookingsForDriver(uid: string): Promise<Booking[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collectionGroup(BOOKED).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))
      .filter((b) => b.driverId === uid);
  } catch {
    return [];
  }
}

export async function countPendingRequestsForDriver(uid: string): Promise<number> {
  const all = await listBookingsForDriver(uid);
  return all.filter((b) => b.status === "pending").length;
}

/* Driver accepts or declines a pending request. On accept we take the seats.
   On decline, an optional reason is stored so the passenger can see WHY.
   Returns the new status AND a snapshot the caller can use to notify the
   passenger (so we don't make a second read for push notifications). */
export type RespondResult = {
  status: BookingStatus;
  passengerId: string;
  driverName: string;
  from: string;
  to: string;
  rideId: string;
};
export async function respondToBooking(
  driverUid: string,
  bookingId: string,
  action: "accept" | "decline",
  reason?: string
): Promise<RespondResult> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const db = adminDb;

  // Bookings are nested under the passenger, so locate the doc via collection group.
  const found = (await db.collectionGroup(BOOKED).get()).docs.find((d) => d.id === bookingId);
  if (!found) throw new Error("Request not found.");
  const bookingRef = found.ref;

  return db.runTransaction(async (tx) => {
    const bSnap = await tx.get(bookingRef);
    if (!bSnap.exists) throw new Error("Request not found.");
    const b = bSnap.data()!;
    if (b.driverId !== driverUid) throw new Error("You can’t respond to this request.");
    if (b.status !== "pending") throw new Error("This request has already been handled.");

    const result = {
      passengerId: b.userId as string,
      driverName: (b.driver as string) || "",
      from: (b.from as string) || "",
      to: (b.to as string) || "",
      rideId: b.rideId as string,
    };

    if (action === "decline") {
      tx.update(bookingRef, {
        status: "declined",
        respondedAt: Date.now(),
        declineReason: reason?.trim().slice(0, 240) || "",
      });
      return { ...result, status: "declined" as BookingStatus };
    }

    const rideRef = db.collection("users").doc(b.driverId).collection(POSTED).doc(b.rideId);
    const rSnap = await tx.get(rideRef);
    if (!rSnap.exists) throw new Error("This ride no longer exists.");
    const ride = rSnap.data()!;
    if ((ride.seats ?? 0) < b.seats) throw new Error("Not enough seats left to accept this request.");

    tx.update(rideRef, { seats: ride.seats - b.seats });
    tx.update(bookingRef, {
      status: "confirmed",
      respondedAt: Date.now(),
      // Online payment is "collected" (simulated) on acceptance; cash stays cash.
      paymentStatus: b.paymentMethod === "online" ? "paid" : "cash",
    });
    return { ...result, status: "confirmed" as BookingStatus };
  });
}
