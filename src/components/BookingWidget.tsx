"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ride, rupees } from "@/lib/data";
import { toast } from "@/lib/toast";

type PaymentMethod = "online" | "cash";

export default function BookingWidget({
  ride,
  existingStatus,
}: {
  ride: Ride;
  // If the signed-in passenger already has an active booking on THIS ride
  // (pending or confirmed), we swap the booking form for a status card so
  // they can't accidentally double-book. "declined" still allows a retry,
  // so we don't pass it through here.
  existingStatus?: "pending" | "confirmed";
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState<PaymentMethod>("online");
  const [loading, setLoading] = useState(false);
  const max = ride.seats;
  const subtotal = ride.price * qty;

  // Existing-booking state — render a status card instead of the form.
  if (existingStatus) {
    const isConfirmed = existingStatus === "confirmed";
    return (
      <div className="card self-start p-6 md:sticky md:top-[86px]">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full ${
              isConfirmed ? "bg-[#eafbe0] text-[#3c7a14]" : "bg-[#fef3e0] text-[#b5641e]"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isConfirmed ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </>
              )}
            </svg>
          </span>
          <div>
            <div className="font-semibold">
              {isConfirmed ? "Your seat is confirmed" : "Request pending"}
            </div>
            <div className="text-sm text-muted">
              {isConfirmed
                ? `with ${ride.driver}`
                : `${ride.driver} hasn’t responded yet.`}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          You can’t book this ride again — one request per passenger per ride.
        </p>
        <Link href="/trips" className="btn btn-primary mt-5 w-full">
          See in Your trips
        </Link>
      </div>
    );
  }



  // Same-day conflict the server flagged — kept in state so the modal can
  // show details (which driver, what route) and so the "Cancel old & book"
  // retry has the data it needs.
  type Conflict = {
    id: string;
    driver: string;
    from: string;
    to: string;
    date: string;
    status: "pending" | "confirmed";
  };
  const [conflict, setConflict] = useState<Conflict | null>(null);

  async function postBooking(replaceExisting: boolean) {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rideId: ride.id,
        driverId: ride.driverId,
        seats: qty,
        paymentMethod: pay,
        replaceExisting,
      }),
    });
    return res;
  }

  async function book() {
    setLoading(true);
    try {
      const res = await postBooking(false);
      if (res.status === 401) {
        toast("Please sign in to book this ride.");
        router.push(`/sign-in?next=/ride/${ride.id}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      // Same-day conflict — show the confirm dialog instead of toasting.
      if (res.status === 409 && data.code === "same-day-conflict" && data.conflict) {
        setConflict(data.conflict as Conflict);
        return;
      }
      if (!res.ok) {
        toast(data.error || "Couldn’t complete the booking.");
        return;
      }
      if (data.status === "confirmed") {
        toast(
          pay === "online"
            ? `Paid & booked! ${qty} seat${qty > 1 ? "s" : ""} with ${ride.driver} confirmed.`
            : `Booked! ${qty} seat${qty > 1 ? "s" : ""} with ${ride.driver} confirmed.`
        );
      } else {
        toast(`Request sent to ${ride.driver}. You’ll be notified when they accept.`);
      }
      router.push("/trips");
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReplace() {
    setLoading(true);
    try {
      const res = await postBooking(true);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t complete the booking.");
        return;
      }
      toast(`Cancelled previous trip and ${data.status === "confirmed" ? "booked" : "requested"} this one.`);
      router.push("/trips");
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
      setConflict(null);
    }
  }

  return (
    <div className="card self-start p-6 md:sticky md:top-[86px]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted">Price per seat</span>
        <span className="text-2xl font-bold">{rupees(ride.price)}</span>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold">Seats</span>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-line text-xl font-bold text-blue hover:border-blue disabled:opacity-40"
            disabled={qty <= 1}
            aria-label="Decrease seats"
          >
            −
          </button>
          <span className="min-w-7 text-center text-lg font-bold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-line text-xl font-bold text-blue hover:border-blue disabled:opacity-40"
            disabled={qty >= max}
            aria-label="Increase seats"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 text-[15px]">
        <span>
          {rupees(ride.price)} × {qty} seat{qty > 1 ? "s" : ""}
        </span>
        <span>{rupees(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between py-2 text-[15px]">
        <span>Booking fee</span>
        <span className="font-semibold text-[#3c7a14]">Free</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-3.5 text-xl font-bold">
        <span>Total</span>
        <span>{rupees(subtotal)}</span>
      </div>

      {/* Payment method */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-2 text-sm font-semibold">Payment</div>
        <div className="grid gap-2">
          {(
            [
              ["online", "Pay online (UPI / Card)"],
              ["cash", "Pay cash to driver"],
            ] as [PaymentMethod, string][]
          ).map(([val, label]) => (
            <label
              key={val}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-[15px] transition ${
                pay === val ? "border-blue bg-bgtint" : "border-line"
              }`}
            >
              <input type="radio" name="pay" className="accent-blue" checked={pay === val} onChange={() => setPay(val)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <button onClick={book} disabled={loading || max < 1} className="btn btn-primary mt-5 w-full disabled:opacity-60">
        {loading ? "Sending request…" : max < 1 ? "Sold out" : "Request to book"}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        The driver reviews your request first — your seat is confirmed once they accept.
        {pay === "online" ? " You’re only charged on acceptance." : ""}
      </p>

      {/* Same-day conflict modal. Shown when the server refused the booking
          because the passenger already has an active trip on this date —
          asks whether to cancel the old one to make space for this one. */}
      {conflict && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !loading && setConflict(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">You already have a trip on this day</h3>
            <p className="mt-2 text-sm text-muted">
              You have a {conflict.status === "confirmed" ? "confirmed" : "pending"} booking
              with <b className="text-ink">{conflict.driver}</b> for{" "}
              <b className="text-ink">
                {conflict.from} → {conflict.to}
              </b>{" "}
              on {new Date(conflict.date).toDateString()}.
            </p>
            <p className="mt-3 text-sm text-muted">
              Cancel that trip to book this one with <b className="text-ink">{ride.driver}</b>?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConflict(null)}
                disabled={loading}
                className="btn btn-outline"
              >
                Keep my current trip
              </button>
              <button
                type="button"
                onClick={confirmReplace}
                disabled={loading}
                className="btn btn-primary disabled:opacity-60"
              >
                {loading ? "Switching…" : "Cancel old, book this"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
