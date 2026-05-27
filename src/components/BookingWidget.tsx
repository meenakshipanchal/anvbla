"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ride, rupees } from "@/lib/data";
import { toast } from "@/lib/toast";

type PaymentMethod = "online" | "cash";

export default function BookingWidget({ ride }: { ride: Ride }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState<PaymentMethod>("online");
  const [loading, setLoading] = useState(false);
  const max = ride.seats;
  const subtotal = ride.price * qty;

  async function book() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: ride.id, driverId: ride.driverId, seats: qty, paymentMethod: pay }),
      });
      if (res.status === 401) {
        toast("Please sign in to book this ride.");
        router.push(`/sign-in?next=/ride/${ride.id}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
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
    </div>
  );
}
