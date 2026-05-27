import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRideById } from "@/lib/rides";
import { listBookingsByUser } from "@/lib/bookings";
import { createReview, hasReviewed } from "@/lib/reviews";

/* A passenger reviews the driver — only after the ride is completed and they
   actually had a confirmed seat on it. One review per passenger per ride. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 });

  const { rideId, rating, text } = await req.json().catch(() => ({}));
  const stars = Number(rating);
  if (!rideId || !(stars >= 1 && stars <= 5)) {
    return NextResponse.json({ error: "Please choose a rating from 1 to 5." }, { status: 400 });
  }

  const ride = await getRideById(String(rideId));
  if (!ride) return NextResponse.json({ error: "Ride not found." }, { status: 404 });
  if (!ride.completed) return NextResponse.json({ error: "You can review once the trip is completed." }, { status: 400 });
  if (ride.driverId === user.uid) return NextResponse.json({ error: "You can’t review your own ride." }, { status: 400 });

  const booked = (await listBookingsByUser(user.uid)).some(
    (b) => b.rideId === String(rideId) && b.status === "confirmed"
  );
  if (!booked) return NextResponse.json({ error: "Only confirmed passengers can review this ride." }, { status: 403 });

  if (await hasReviewed(String(rideId), user.uid)) {
    return NextResponse.json({ error: "You’ve already reviewed this trip." }, { status: 400 });
  }

  try {
    const id = await createReview({
      rideId: String(rideId),
      driverId: ride.driverId ?? "",
      authorId: user.uid,
      authorName: user.name,
      rating: stars,
      text: text ? String(text).slice(0, 500) : "",
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
