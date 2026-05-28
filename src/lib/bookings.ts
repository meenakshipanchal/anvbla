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

// Server returns this shape when the passenger already has another active
// booking on the same day — the API surfaces it as a 409 so the client can
// ask "cancel the old one to book this new one?" instead of silently failing.
export class SameDayConflictError extends Error {
  readonly code = "same-day-conflict" as const;
  readonly conflictingBooking: {
    id: string;
    driver: string;
    from: string;
    to: string;
    date: string;
    status: BookingStatus;
  };
  constructor(conflict: SameDayConflictError["conflictingBooking"]) {
    super(`You already have a booking on ${conflict.date}.`);
    this.conflictingBooking = conflict;
  }
}

export async function createBooking(
  user: SessionUser,
  input: {
    rideId: string;
    driverId: string;
    seats: number;
    paymentMethod: PaymentMethod;
    // When true, any active same-day booking the passenger has elsewhere is
    // auto-declined as part of the same transaction. The client passes this
    // after the user confirms the "cancel the other one?" prompt.
    replaceExisting?: boolean;
  }
): Promise<{ id: string; status: BookingStatus }> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const db = adminDb;
  const { rideId, driverId, seats, paymentMethod, replaceExisting } = input;

  await ensureUserDoc(user.uid, user.name);

  return db.runTransaction(async (tx) => {
    const rideRef = db.collection("users").doc(driverId).collection(POSTED).doc(rideId);
    const snap = await tx.get(rideRef);
    if (!snap.exists) throw new Error("This ride no longer exists.");

    const ride = snap.data()!;
    if (driverId === user.uid) throw new Error("You can’t book your own ride.");
    if ((ride.seats ?? 0) < seats) throw new Error("Not enough seats left.");

    // Prevent double-booking. A passenger with an active booking on this
    // ride — pending OR confirmed — must not be able to file a second
    // request. A previously declined booking is fine to retry, since the
    // driver has already said no to the old one.
    const mineSnap = await tx.get(
      db.collection("users").doc(user.uid).collection(BOOKED)
    );
    const mineActive = mineSnap.docs
      .map((d) => ({ ref: d.ref, data: d.data() as Record<string, unknown> }))
      .filter(
        (b) =>
          (b.data.status === "pending" || b.data.status === "confirmed") &&
          // Don't count the just-declined ones — and don't count bookings on
          // rides that no longer exist (those should self-clean elsewhere).
          typeof b.data.rideId === "string"
      );

    if (mineActive.some((b) => b.data.rideId === rideId)) {
      throw new Error(
        "You already have a request on this ride. Check Your trips for the status."
      );
    }

    // Same-day conflict check. A passenger can only have ONE active booking
    // per calendar date — if they want to switch rides, they need to release
    // the existing one first. EXCEPTION: a booking on a trip that's already
    // marked completed doesn't count, since that trip is done; the passenger
    // is free to take another ride later the same day.
    const rideDate = String(ride.date ?? "");
    const sameDayCandidates = rideDate
      ? mineActive.filter((b) => String(b.data.date ?? "") === rideDate)
      : [];
    const sameDay: typeof sameDayCandidates = [];
    for (const b of sameDayCandidates) {
      const bRideId = String(b.data.rideId ?? "");
      const bDriverId = String(b.data.driverId ?? "");
      if (!bRideId || !bDriverId) continue;
      const otherRideSnap = await tx.get(
        db.collection("users").doc(bDriverId).collection(POSTED).doc(bRideId)
      );
      // If the underlying ride is gone or already completed, it's not an
      // active conflict — the passenger can book again on this date.
      if (!otherRideSnap.exists) continue;
      if (otherRideSnap.data()?.completed === true) continue;
      sameDay.push(b);
    }
    if (sameDay.length > 0) {
      if (!replaceExisting) {
        const c = sameDay[0];
        throw new SameDayConflictError({
          id: c.ref.id,
          driver: String(c.data.driver ?? ""),
          from: String(c.data.from ?? ""),
          to: String(c.data.to ?? ""),
          date: rideDate,
          status: c.data.status as BookingStatus,
        });
      }
      // User said "cancel the old one to book this new one." Auto-decline
      // each conflicting booking and free its seats if it was confirmed.
      for (const c of sameDay) {
        const wasConfirmed = c.data.status === "confirmed";
        tx.update(c.ref, {
          status: "declined",
          respondedAt: Date.now(),
          declineReason: "Cancelled by passenger to book a different ride.",
        });
        // If the old booking was already eating seats on its ride, return
        // them so the next passenger can grab them.
        if (wasConfirmed && typeof c.data.driverId === "string" && typeof c.data.rideId === "string") {
          const oldRideRef = db
            .collection("users")
            .doc(c.data.driverId as string)
            .collection(POSTED)
            .doc(c.data.rideId as string);
          const oldRideSnap = await tx.get(oldRideRef);
          if (oldRideSnap.exists) {
            const oldRide = oldRideSnap.data()!;
            tx.update(oldRideRef, {
              seats: (oldRide.seats ?? 0) + (Number(c.data.seats) || 0),
            });
          }
        }
      }
    }

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
