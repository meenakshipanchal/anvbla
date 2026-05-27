"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

// Kept local (not imported from the server-only bookings lib) so this stays a
// pure client component. Structurally matches a Booking.
type Request = {
  id: string;
  userName: string;
  from: string;
  to: string;
  date: string;
  dep: string;
  seats: number;
};

export default function RideRequests({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function respond(id: string, action: "accept" | "decline", reasonText?: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, action, reason: reasonText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t update the request.");
        return;
      }
      toast(action === "accept" ? "Request accepted — the seat is confirmed." : "Request declined.");
      setDecliningId(null);
      setReason("");
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <>
      <h2 className="mt-8 mb-4 font-semibold">
        Ride requests
        <span className="ml-2 rounded-full bg-blue px-2 py-0.5 text-xs font-semibold text-white">{requests.length}</span>
      </h2>
      <div className="grid gap-3">
        {requests.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">
                  {r.userName} wants to join your ride
                </div>
                <div className="text-muted">
                  {r.from} → {r.to}
                  {r.date ? ` · ${new Date(r.date).toDateString()}` : ""} · {r.dep} · {r.seats} seat
                  {r.seats > 1 ? "s" : ""}
                </div>
              </div>
            </div>
            {decliningId === r.id ? (
              <div className="mt-3">
                <label className="nav-label mb-1 block font-semibold text-muted">
                  REASON (OPTIONAL) — SHOWN TO PASSENGER
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={240}
                  placeholder="e.g. Different route, prefer same gender, etc."
                  className="w-full rounded-xl border-[1.5px] border-line p-2 outline-none focus:border-blue"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy === r.id}
                    onClick={() => respond(r.id, "decline", reason)}
                    className="btn btn-outline px-4 py-2 disabled:opacity-60"
                  >
                    Confirm decline
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => {
                      setDecliningId(null);
                      setReason("");
                    }}
                    className="btn px-4 py-2 font-semibold text-muted hover:bg-bgsoft"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => respond(r.id, "accept")}
                  className="btn btn-primary px-4 py-2 disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => {
                    setDecliningId(r.id);
                    setReason("");
                  }}
                  className="btn btn-outline px-4 py-2 disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
