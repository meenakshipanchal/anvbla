import { notFound } from "next/navigation";
import Link from "next/link";
import { avatarColor, initials } from "@/lib/data";
import { getRideById } from "@/lib/rides";

// A passenger MUST NOT be able to book a ride from a cached page after the
// driver has deleted it. Always read live Firestore for this route.
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getCurrentUser } from "@/lib/session";
import { listBookingsByUser, listBookingsForRide } from "@/lib/bookings";
import { listReviewsForDriver, driverRating, hasReviewed } from "@/lib/reviews";
import { Ac, Music, Pet, Seat, Shield, Star, Bolt, PinFrom, PinTo, Tick, Car, Auto } from "@/components/Icons";
import BookingWidget from "@/components/BookingWidget";
import RouteMap from "@/components/RouteMap";
import CompleteTripButton from "./CompleteTripButton";
import DeleteRideButton from "./DeleteRideButton";
import DriverPanel from "./DriverPanel";
import ReviewBox from "./ReviewBox";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ride = await getRideById(id);
  return { title: ride ? `${ride.from} → ${ride.to}` : "Ride" };
}

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ride = await getRideById(id);
  if (!ride) notFound();

  const user = await getCurrentUser();
  const isDriver = !!user && ride.driverId === user.uid;

  const reviews = await listReviewsForDriver(ride.driverId ?? "");
  const { avg, count } = driverRating(reviews);

  // All bookings on this ride. Passengers see the confirmed co-passengers card;
  // the driver gets a panel with pending requests + confirmed riders.
  const allBookings = await listBookingsForRide(ride.id);
  const coPassengers = allBookings.filter((b) => b.status === "confirmed");

  // Reviews unlock for confirmed passengers once the driver marks the trip done.
  let canReview = false;
  if (user && !isDriver && ride.completed) {
    const mine = await listBookingsByUser(user.uid);
    const confirmed = mine.some((b) => b.rideId === ride.id && b.status === "confirmed");
    canReview = confirmed && !(await hasReviewed(ride.id, user.uid));
  }

  const hasMap = ride.fromLat != null && ride.fromLng != null && ride.toLat != null && ride.toLng != null;

  const col = avatarColor(ride.driver);
  const amenities = [
    { ok: ride.ac, Icon: Ac, label: "Air conditioning" },
    { ok: ride.music, Icon: Music, label: "Music on board" },
    { ok: ride.pets, Icon: Pet, label: "Pets allowed" },
    { ok: ride.maxTwo, Icon: Seat, label: "Max 2 in the back" },
  ];

  return (
    <div className="wrap">
      {/* Driver strip — thin, highlighted, sticky at the very top */}
      {(() => {
        const VehicleIcon = ride.vehicle === "auto" ? Auto : Car;
        const vehicleLabel = ride.vehicle === "auto" ? "Auto" : "Car";
        const sub = [
          ride.plate,
          ride.car,
          ride.stops != null
            ? ride.stops === 0
              ? "Non-stop"
              : `${ride.stops} stop${ride.stops > 1 ? "s" : ""}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div className="mt-4 flex items-center gap-3 rounded-xl border-[1.5px] border-blue bg-bgtint px-3 py-2 shadow-md">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white"
              style={{ background: col }}
            >
              {initials(ride.driver)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">
                <span className="text-blue">{ride.driver}</span>{" "}
                <span className="text-muted">drives a</span>{" "}
                <VehicleIcon width={13} height={13} className="-mt-0.5 inline-block text-blue" />{" "}
                <span className="text-blue">{vehicleLabel}</span>
              </div>
              {sub && <div className="nav-label truncate text-muted">{sub}</div>}
            </div>
            <span className="nav-label inline-flex shrink-0 items-center gap-0.5 font-semibold text-muted">
              <Star className="text-star" width={10} height={10} />{" "}
              {count > 0 ? avg.toFixed(1) : ride.rating.toFixed(1)}
            </span>
          </div>
        );
      })()}

      <div className="pt-4 text-sm text-muted">
        <Link href="/search" className="hover:text-blue">
          ← Back to results
        </Link>
      </div>

      <div className="grid gap-7 pb-16 pt-4 md:grid-cols-[1fr_360px]">
        <div>
          {/* Route summary — compact */}
          <div className="card mb-4 p-4">
            <div className="flex items-center justify-between gap-2 text-muted">
              <span>{new Date(ride.date).toDateString()}</span>
              {ride.dur && <span className="nav-label">~{ride.dur}</span>}
            </div>

            <div className="mt-3 flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <PinFrom className="text-blue" width={16} height={16} />
                <span className="my-0.5 w-0.5 flex-1 bg-sky" style={{ minHeight: 22 }} />
                <PinTo className="text-blue" width={16} height={16} />
              </div>
              <div className="flex-1">
                <div className="mb-2">
                  <div className="font-bold">
                    <span className="text-blue">{ride.dep}</span> · {ride.from}
                  </div>
                  {ride.fromSpot && <div className="nav-label text-muted">{ride.fromSpot}</div>}
                </div>
                <div>
                  <div className="font-bold">
                    <span className="text-blue">{ride.arr}</span> · {ride.to}
                  </div>
                  {ride.toSpot && <div className="nav-label text-muted">{ride.toSpot}</div>}
                </div>
              </div>
            </div>

            {ride.routeVia && (
              <div className="mt-3 rounded-xl bg-bgsoft px-3 py-2 text-muted">
                <b className="font-semibold text-ink">Route:</b> {ride.routeVia}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1">
              {ride.instant && (
                <span className="nav-label inline-flex items-center gap-0.5 rounded-full bg-sky-soft px-1.5 py-0.5 font-semibold text-blue">
                  <Bolt width={10} height={10} /> Instant
                </span>
              )}
              {ride.verified && (
                <span className="nav-label inline-flex items-center gap-0.5 rounded-full bg-[#eafbe0] px-1.5 py-0.5 font-semibold text-[#3c7a14]">
                  <Shield width={10} height={10} /> Verified
                </span>
              )}
              {ride.womenOnly && (
                <span className="nav-label rounded-full bg-[#fce7f3] px-1.5 py-0.5 font-semibold text-[#be185d]">
                  ♀ Women only
                </span>
              )}
              {ride.lgbtq && (
                <span className="nav-label rounded-full bg-[#f3e8ff] px-1.5 py-0.5 font-semibold text-[#7c3aed]">
                  🏳️‍🌈 LGBTQ+
                </span>
              )}
              {ride.completed && (
                <span className="nav-label inline-flex items-center gap-0.5 rounded-full bg-[#eafbe0] px-1.5 py-0.5 font-semibold text-[#3c7a14]">
                  <Tick width={10} height={10} /> Completed
                </span>
              )}
              <span className="nav-label rounded-full bg-bgsoft px-1.5 py-0.5 font-semibold text-muted">
                {ride.seats} seat{ride.seats > 1 ? "s" : ""} left
              </span>
            </div>
            {isDriver && !ride.completed && <CompleteTripButton rideId={ride.id} />}
            {isDriver && !ride.completed && <DeleteRideButton rideId={ride.id} />}
          </div>

          {hasMap && (
            <div className="card mb-5 overflow-hidden p-0">
              <RouteMap
                fromLat={ride.fromLat!}
                fromLng={ride.fromLng!}
                toLat={ride.toLat!}
                toLng={ride.toLng!}
              />
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${ride.fromLat},${ride.fromLng}&destination=${ride.toLat},${ride.toLng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border-t border-line px-4 py-3 font-semibold text-blue hover:bg-bgsoft"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Open in Google Maps
              </a>
            </div>
          )}

          {/* Co-passengers (accepted on this ride) — passenger view only;
              the driver sees their passengers in the side panel instead. */}
          {!isDriver && coPassengers.length > 0 && (
            <div className="card mb-4 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">Find your co-passengers</h2>
                <span className="nav-label rounded-full bg-sky-soft px-2 py-1 font-semibold text-blue">
                  {ride.seats} seat{ride.seats !== 1 ? "s" : ""} left
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {coPassengers.map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white"
                      style={{ background: avatarColor(b.userName) }}
                    >
                      {initials(b.userName)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{b.userName}</div>
                      <div className="nav-label text-muted">
                        {b.seats} seat{b.seats > 1 ? "s" : ""} booked
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Ride comfort</h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {amenities.map(({ ok, Icon, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 text-[15px] ${ok ? "" : "text-muted line-through opacity-60"}`}
                >
                  <span className="text-blue">
                    <Icon />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {count > 0 && (
            <div className="card mt-5 p-6">
              <h2 className="mb-4 text-lg font-semibold">
                Reviews <span className="text-muted">({count})</span>
              </h2>
              <div className="grid gap-4">
                {reviews.slice(0, 8).map((rv) => (
                  <div key={rv.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white"
                        style={{ background: avatarColor(rv.authorName) }}
                      >
                        {initials(rv.authorName)}
                      </span>
                      <span className="font-semibold">{rv.authorName}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-sm text-muted">
                        <Star className="text-star" /> {rv.rating}
                      </span>
                    </div>
                    {rv.text && <p className="mt-2 text-sm text-muted">{rv.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canReview && <ReviewBox rideId={ride.id} driver={ride.driver} />}
        </div>

        {isDriver ? (
          <DriverPanel
            rideId={ride.id}
            seatsLeft={ride.seats}
            passengers={allBookings.map((b) => ({
              id: b.id,
              userId: b.userId,
              userName: b.userName,
              seats: b.seats,
              total: b.total,
              paymentMethod: b.paymentMethod,
              status: b.status,
            }))}
          />
        ) : (
          <BookingWidget ride={ride} />
        )}
      </div>
    </div>
  );
}
