import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createRide, deleteRide, markRideCompleted } from "@/lib/rides";
import { geocode } from "@/lib/geo";
import { sendPush } from "@/lib/push";

// Bust every cache that lists or shows a ride. Called from each mutation so a
// deleted/completed/new ride disappears from /search and /ride/[id] instantly
// — otherwise Next's Router Cache will keep serving the stale RSC payload and a
// passenger can book a ride that no longer exists.
function revalidateRideViews(rideId?: string) {
  revalidatePath("/search");
  revalidatePath("/trips");
  if (rideId) revalidatePath(`/ride/${rideId}`);
}

// Trip duration from the driver's own departure + arrival (ETA) times.
function durationBetween(dep: string, arr: string): string {
  const [dh, dm] = dep.split(":").map(Number);
  const [ah, am] = arr.split(":").map(Number);
  if ([dh, dm, ah, am].some(Number.isNaN)) return "";
  let diff = ah * 60 + am - (dh * 60 + dm);
  if (diff <= 0) diff += 24 * 60; // arrival next day
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/* Publish a ride. Requires a verified Firebase session; the ride is recorded
   against the signed-in user as the driver. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to publish a ride." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    from, to, date, time, arr, seats, price, note,
    instant, ac, music, pets, maxTwo, womenOnly, lgbtq,
    car, plate, stops, routeVia, vehicle,
    fromLat, fromLng, toLat, toLng,
  } = body;
  if (!from || !to || !date || !time || !arr) {
    return NextResponse.json({ error: "Please add route, date, departure time and the arrival ETA." }, { status: 400 });
  }

  // Coerce client-provided coords; if a finite number was sent, use it as-is
  // (pin-precise spot the driver picked). Otherwise fall back to text geocoding,
  // which only gives an area centroid.
  const toCoord = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);
  const cFromLat = toCoord(fromLat);
  const cFromLng = toCoord(fromLng);
  const cToLat = toCoord(toLat);
  const cToLng = toCoord(toLng);

  try {
    const [fromGeo, toGeo] = await Promise.all([
      cFromLat != null && cFromLng != null ? Promise.resolve({ lat: cFromLat, lng: cFromLng }) : geocode(String(from)),
      cToLat != null && cToLng != null ? Promise.resolve({ lat: cToLat, lng: cToLng }) : geocode(String(to)),
    ]);
    // ETA (arrival) is the driver's own input; duration is derived from it.
    const dur = durationBetween(String(time), String(arr));
    const id = await createRide({
      from: String(from),
      to: String(to),
      fromSpot: "",
      toSpot: "",
      dep: String(time),
      arr: String(arr),
      dur,
      price: Number(price) || 0,
      seats: Number(seats) || 1,
      driver: user.name,
      driverId: user.uid,
      rating: 5,
      trips: 0,
      car: car ? String(car) : "",
      plate: plate ? String(plate) : "",
      stops: stops === "" || stops === undefined || stops === null ? null : Number(stops),
      routeVia: routeVia ? String(routeVia).slice(0, 200) : "",
      vehicle: vehicle === "auto" ? "auto" : "car",
      // Driver-selected ride-comfort options (default to sensible values).
      instant: instant === undefined ? true : !!instant,
      verified: false,
      maxTwo: !!maxTwo,
      ac: ac === undefined ? true : !!ac,
      music: !!music,
      pets: !!pets,
      smoking: false,
      womenOnly: !!womenOnly,
      lgbtq: !!lgbtq,
      date: String(date),
      note: note ? String(note) : "",
      createdAt: Date.now(),
      fromLat: fromGeo?.lat ?? null,
      fromLng: fromGeo?.lng ?? null,
      toLat: toGeo?.lat ?? null,
      toLng: toGeo?.lng ?? null,
      completed: false,
    });
    revalidateRideViews(id);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/* Driver marks a ride completed (reached destination) — unlocks reviews. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { rideId, action } = await req.json().catch(() => ({}));
  if (!rideId || action !== "complete") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await markRideCompleted(user.uid, String(rideId));
    revalidateRideViews(String(rideId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* Driver deletes their own posted ride. Auto-declines any pending/confirmed
   bookings on it and pushes a notification to each affected passenger. */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { rideId } = await req.json().catch(() => ({}));
  if (!rideId) return NextResponse.json({ error: "Missing rideId." }, { status: 400 });

  try {
    const affected = await deleteRide(user.uid, String(rideId));
    // Bust the caches BEFORE returning so the driver's next /search render
    // doesn't see the just-deleted ride from the Router Cache.
    revalidateRideViews(String(rideId));
    for (const p of affected) {
      void sendPush(p.passengerId, {
        title: "Ride cancelled",
        body: `${user.name} cancelled the ride ${p.from} → ${p.to}.`,
        url: "/trips",
        tag: `ride-${p.rideId}`,
      });
    }
    return NextResponse.json({ ok: true, cancelled: affected.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
