import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createBooking, respondToBooking, countPendingRequestsForDriver } from "@/lib/bookings";
import { RIDES_TAG } from "@/lib/rides";
import { sendPush } from "@/lib/push";

/* Book seats on a ride. Requires a verified Firebase session. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to book a ride." }, { status: 401 });

  const { rideId, driverId, seats, paymentMethod } = await req.json().catch(() => ({}));
  const qty = Number(seats) || 0;
  if (!rideId || !driverId || qty < 1) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });
  const method = paymentMethod === "online" ? "online" : "cash";

  try {
    const { id, status } = await createBooking(user, {
      rideId: String(rideId),
      driverId: String(driverId),
      seats: qty,
      paymentMethod: method,
    });
    // Bust /trips (so the driver's badge + requests panel update on next render)
    // and /ride/[id] (seat count may have changed on accept). /search lists the
    // same seat count so revalidate it too. `'max'` = stale-while-revalidate
    // so accepts/declines don't block on a Firestore round-trip.
    revalidateTag(RIDES_TAG, "max");
    revalidateTag(`ride:${rideId}`, "max");
    revalidatePath("/trips");
    revalidatePath("/search");
    revalidatePath(`/ride/${rideId}`);
    // Notify the driver (best-effort; failure must not affect the booking).
    void sendPush(String(driverId), {
      title: "New ride request",
      body: `${user.name} wants to join your ride.`,
      url: `/ride/${rideId}`,
      tag: `booking-${id}`,
    });
    return NextResponse.json({ id, status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* Driver accepts or declines a pending request. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { bookingId, action, reason } = await req.json().catch(() => ({}));
  if (!bookingId || (action !== "accept" && action !== "decline")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await respondToBooking(
      user.uid,
      String(bookingId),
      action,
      typeof reason === "string" ? reason : undefined
    );
    revalidateTag(RIDES_TAG, "max");
    revalidateTag(`ride:${result.rideId}`, "max");
    revalidatePath("/trips");
    revalidatePath("/search");
    revalidatePath(`/ride/${result.rideId}`);
    // Notify the passenger about the driver's decision.
    const route = `${result.from} → ${result.to}`;
    void sendPush(result.passengerId, {
      title: action === "accept" ? "Ride confirmed 🎉" : "Request declined",
      body:
        action === "accept"
          ? `${result.driverName} accepted your ride: ${route}.`
          : reason
            ? `${result.driverName} declined: ${String(reason).slice(0, 140)}`
            : `${result.driverName} declined your ride request.`,
      url: action === "accept" ? `/inbox/${result.rideId}__${result.passengerId}` : "/trips",
      tag: `booking-${bookingId}`,
    });
    return NextResponse.json({ status: result.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* Pending-request count for the signed-in driver (powers the nav badge). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ requests: 0 });
  const requests = await countPendingRequestsForDriver(user.uid);
  return NextResponse.json({ requests });
}
