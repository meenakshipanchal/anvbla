"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

export default function CompleteTripButton({ rideId }: { rideId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    try {
      const res = await fetch("/api/rides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, action: "complete" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t complete the trip.");
        return;
      }
      toast("Trip marked as reached — passengers can review you now.");
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={complete} disabled={loading} className="btn btn-dark mt-3 px-4 py-2 disabled:opacity-60">
      {loading ? "Marking…" : "Mark trip as reached"}
    </button>
  );
}
