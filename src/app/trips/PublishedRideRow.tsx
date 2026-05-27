"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Ride, rupees } from "@/lib/data";
import { Bolt, Shield, Tick, Car, Auto, Star } from "@/components/Icons";
import { toast } from "@/lib/toast";

/* Driver-facing card for "Rides you published" — same content as the public
   RideCard but with an inline delete control so the driver can cancel without
   opening the ride detail page. */

export default function PublishedRideRow({ ride }: { ride: Ride }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const VehicleIcon = ride.vehicle === "auto" ? Auto : Car;

  async function del() {
    setLoading(true);
    try {
      const res = await fetch("/api/rides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: ride.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t delete the ride.");
        return;
      }
      toast(
        data.cancelled > 0
          ? `Ride deleted. ${data.cancelled} passenger${data.cancelled > 1 ? "s were" : " was"} notified.`
          : "Ride deleted."
      );
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card relative w-full max-w-full overflow-hidden p-3">
      {/* Trash icon (top-right). Hidden while the confirm strip is open. */}
      {!confirming && (
        <button
          aria-label="Delete ride"
          onClick={(e) => {
            e.preventDefault();
            setConfirming(true);
          }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-[#fdecea] hover:text-[#c0392b]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
          </svg>
        </button>
      )}

      <Link href={`/ride/${ride.id}`} className="block min-w-0 pr-9">
        <div className="flex items-center gap-1 font-semibold text-blue">
          <VehicleIcon width={14} height={14} />
          <span className="truncate">{ride.driver}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate font-bold">
            {ride.dep} → {ride.arr}
          </div>
          <div className="shrink-0 font-bold">{rupees(ride.price)}</div>
        </div>
        <div className="mt-1 font-semibold break-words">
          {ride.from} → {ride.to}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
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
              ♀ Women
            </span>
          )}
          {ride.completed && (
            <span className="nav-label inline-flex items-center gap-0.5 rounded-full bg-[#eafbe0] px-1.5 py-0.5 font-semibold text-[#3c7a14]">
              <Tick width={10} height={10} /> Completed
            </span>
          )}
          <span className="nav-label ml-auto inline-flex items-center gap-0.5 font-semibold text-muted">
            <Star className="text-star" width={10} height={10} /> {ride.rating.toFixed(1)}
          </span>
        </div>
      </Link>

      {confirming && (
        <div className="mt-3 rounded-xl border border-[#c0392b]/30 bg-[#fdecea] p-3">
          <div className="font-semibold text-[#c0392b]">Delete this ride?</div>
          <div className="mt-0.5 text-muted">
            Any pending or confirmed passengers will be notified. This can’t be undone.
          </div>
          <div className="mt-3 flex gap-2">
            <button
              disabled={loading}
              onClick={del}
              className="btn px-3 py-1.5 font-semibold text-white disabled:opacity-60"
              style={{ background: "#c0392b" }}
            >
              {loading ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              disabled={loading}
              onClick={() => setConfirming(false)}
              className="btn px-3 py-1.5 font-semibold text-muted hover:bg-bgsoft"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
