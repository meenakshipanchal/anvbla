import Link from "next/link";
import { Ticket, Search, Seat } from "@/components/Icons";
import RideRequests from "./RideRequests";
import PublishedRideRow from "./PublishedRideRow";
import WithdrawButton from "./WithdrawButton";
import { getCurrentUser } from "@/lib/session";
import { listRidesByDriver } from "@/lib/rides";
import { listBookingsByUser, listBookingsForDriver, type Booking } from "@/lib/bookings";
import { rupees } from "@/lib/data";

export const metadata = { title: "Your trips" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function BookingRow({ b, variant }: { b: Booking; variant: "confirmed" | "pending" | "declined" }) {
  // Confirmed bookings get a "Message driver" CTA inline; the thread id is the
  // same {rideId}__{passengerId} that's created at booking time.
  const threadId = `${b.rideId}__${b.userId}`;
  return (
    <div className="card w-full max-w-full overflow-hidden p-4 hover:border-sky">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/ride/${b.rideId}`} className="block min-w-0 flex-1">
          <div className="font-semibold break-words">
            {b.from} → {b.to}
          </div>
          <div className="text-muted break-words">
            {b.date ? new Date(b.date).toDateString() : ""} · {b.dep} · with {b.driver}
          </div>
        </Link>
        <div className="shrink-0 text-right">
          <div className="font-bold">{rupees(b.total)}</div>
          {variant === "confirmed" && (
            <span className="text-xs font-semibold text-[#3c7a14]">
              {b.seats} seat{b.seats > 1 ? "s" : ""} · confirmed
            </span>
          )}
          {variant === "pending" && (
            <span className="text-xs font-semibold text-[#b5641e]">Pending approval</span>
          )}
          {variant === "declined" && (
            <span className="text-xs font-semibold text-[#c0392b]">Declined</span>
          )}
        </div>
      </div>
      {variant === "confirmed" && (
        <Link
          href={`/inbox/${threadId}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bgtint px-3 py-1.5 font-semibold text-blue hover:bg-sky-soft"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat with {b.driver.split(" ")[0]}
        </Link>
      )}
      {/* Withdraw is allowed only while the driver hasn't responded yet.
          Once confirmed, the passenger loses this escape hatch by design. */}
      {variant === "pending" && <WithdrawButton bookingId={b.id} />}
      {variant === "declined" && (
        <div className="mt-3 rounded-xl bg-[#fdecea] px-3 py-2 text-[#c0392b]">
          <div className="nav-label mb-0.5 font-semibold">DRIVER DECLINED YOUR REQUEST</div>
          {b.declineReason ? (
            <div>
              <span className="font-semibold">Reason:</span> {b.declineReason}
            </div>
          ) : (
            <div>The driver didn’t share a reason.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default async function TripsPage() {
  const user = await getCurrentUser();
  const [published, myBookings, driverBookings] = user
    ? await Promise.all([
        listRidesByDriver(user.uid),
        listBookingsByUser(user.uid),
        listBookingsForDriver(user.uid),
      ])
    : [[], [], []];

  // Drop phantom "pending" requests whose underlying ride no longer exists
  // — they slip through if a passenger books in the race-gap between
  // deleteRide reading bookings and committing the batch. No live ride →
  // nothing for the driver to act on.
  const liveRideIds = new Set(published.map((r) => r.id));
  const requests = driverBookings.filter(
    (b) => b.status === "pending" && liveRideIds.has(b.rideId)
  );
  const upcoming = myBookings.filter((b) => b.status === "confirmed");
  const pending = myBookings.filter((b) => b.status === "pending");
  const declined = myBookings.filter((b) => b.status === "declined");
  const empty = published.length === 0 && myBookings.length === 0 && requests.length === 0;

  return (
    <div className="wrap py-12 md:py-16">
      <h1 className="font-bold">Your trips</h1>
      <p className="mt-1 text-muted">Rides you’ve booked or published show up here.</p>

      {/* Driver: incoming requests (accept / decline) */}
      <RideRequests requests={requests} />

      {/* Passenger: confirmed upcoming trips */}
      {upcoming.length > 0 && (
        <>
          <h2 className="mt-8 mb-4 font-semibold">Your upcoming trips</h2>
          <div className="grid gap-3">
            {upcoming.map((b) => (
              <BookingRow key={b.id} b={b} variant="confirmed" />
            ))}
          </div>
        </>
      )}

      {/* Passenger: requests waiting on the driver */}
      {pending.length > 0 && (
        <>
          <h2 className="mt-8 mb-4 font-semibold">Waiting for approval</h2>
          <div className="grid gap-3">
            {pending.map((b) => (
              <BookingRow key={b.id} b={b} variant="pending" />
            ))}
          </div>
        </>
      )}

      {/* Passenger: requests the driver declined (with the reason, if given) */}
      {declined.length > 0 && (
        <>
          <h2 className="mt-8 mb-4 font-semibold">Declined requests</h2>
          <div className="grid gap-3">
            {declined.map((b) => (
              <BookingRow key={b.id} b={b} variant="declined" />
            ))}
          </div>
        </>
      )}

      {/* Rides this user published */}
      {published.length > 0 && (
        <>
          <h2 className="mt-8 mb-4 font-semibold">Rides you published</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((r) => (
              <PublishedRideRow key={r.id} ride={r} />
            ))}
          </div>
        </>
      )}

      {empty && (
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-line bg-bgsoft px-6 py-16 text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-sky-soft text-blue">
            <Ticket width={30} height={30} />
          </span>
          <h2 className="font-semibold">No trips yet</h2>
          <p className="mt-1 max-w-sm text-muted">
            Publish a ride to share your travel costs, or find a carpool going your way.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/publish" className="btn btn-primary">
              <Seat /> Publish a ride
            </Link>
            <Link href="/search" className="btn btn-outline">
              <Search /> Find a ride
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
