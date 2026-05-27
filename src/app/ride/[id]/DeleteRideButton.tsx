"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

/* Driver-only: delete this posted ride. Two-step click so it can't be
   triggered by accident — first click flips into a "Yes, delete" confirm
   that includes the side-effect (auto-cancelling existing bookings). */
export default function DeleteRideButton({ rideId }: { rideId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function del() {
    setLoading(true);
    try {
      const res = await fetch("/api/rides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId }),
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
      router.push("/trips");
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold text-[#c0392b] hover:bg-[#fdecea]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
        </svg>
        Delete ride
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-[#c0392b]/30 bg-[#fdecea] p-3">
      <div className="font-semibold text-[#c0392b]">Delete this ride?</div>
      <div className="mt-0.5 text-muted">
        Any pending or confirmed passengers will be notified that you cancelled. This can’t be undone.
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
  );
}
