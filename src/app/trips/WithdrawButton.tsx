"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

/* Passenger-side withdraw. Lives only on pending booking rows in /trips —
   two-tap (confirm) so an accidental swipe doesn't cancel a request the
   passenger actually wants. Server side ensures only pending bookings
   owned by the caller can be withdrawn. */
export default function WithdrawButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function withdraw() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action: "withdraw" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t withdraw the request.");
        return;
      }
      toast("Request withdrawn.");
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
      >
        Withdraw request
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[#c0392b]/30 bg-[#fdecea] p-3">
      <div className="font-semibold text-[#c0392b]">Withdraw this request?</div>
      <p className="mt-0.5 text-sm text-muted">
        The driver won’t see your request anymore. You can book again later.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={withdraw}
          disabled={loading}
          className="btn px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          style={{ background: "#c0392b" }}
        >
          {loading ? "Withdrawing…" : "Yes, withdraw"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="btn px-3 py-1.5 font-semibold text-muted hover:bg-bgsoft"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
