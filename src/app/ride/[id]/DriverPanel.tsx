"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { avatarColor, initials, rupees } from "@/lib/data";
import { toast } from "@/lib/toast";

type Pax = {
  id: string;
  userId: string;
  userName: string;
  seats: number;
  total: number;
  paymentMethod: "online" | "cash";
  status: "pending" | "confirmed" | "declined";
};

export default function DriverPanel({
  rideId,
  seatsLeft,
  passengers,
}: {
  rideId: string;
  seatsLeft: number;
  passengers: Pax[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  // id of the request the driver is composing a decline reason for (null = none).
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const pending = passengers.filter((p) => p.status === "pending");
  const confirmed = passengers.filter((p) => p.status === "confirmed");

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
      toast(action === "accept" ? "Request accepted — seat confirmed." : "Request declined.");
      setDecliningId(null);
      setReason("");
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  function Avatar({ name }: { name: string }) {
    return (
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white"
        style={{ background: avatarColor(name) }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <aside className="card sticky top-[90px] h-fit p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Your passengers</h2>
        <span className="nav-label rounded-full bg-sky-soft px-2 py-1 font-semibold text-blue">
          {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left
        </span>
      </div>

      {pending.length > 0 && (
        <div className="mb-4">
          <div className="nav-label mb-2 font-semibold text-muted">
            Pending requests ({pending.length})
          </div>
          <div className="grid gap-2.5">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.userName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.userName}</div>
                    <div className="nav-label text-muted">
                      {p.seats} seat{p.seats > 1 ? "s" : ""} · {rupees(p.total)} ·{" "}
                      {p.paymentMethod === "online" ? "Online" : "Cash"}
                    </div>
                  </div>
                </div>
                {decliningId === p.id ? (
                  <div className="mt-2">
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
                        disabled={busy === p.id}
                        onClick={() => respond(p.id, "decline", reason)}
                        className="btn btn-outline flex-1 px-3 py-1.5 disabled:opacity-60"
                      >
                        Confirm decline
                      </button>
                      <button
                        disabled={busy === p.id}
                        onClick={() => {
                          setDecliningId(null);
                          setReason("");
                        }}
                        className="btn flex-1 px-3 py-1.5 font-semibold text-muted hover:bg-bgsoft"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={busy === p.id}
                      onClick={() => respond(p.id, "accept")}
                      className="btn btn-primary flex-1 px-3 py-1.5 disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      disabled={busy === p.id}
                      onClick={() => {
                        setDecliningId(p.id);
                        setReason("");
                      }}
                      className="btn btn-outline flex-1 px-3 py-1.5 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="nav-label mb-2 font-semibold text-muted">
          Going alongside you ({confirmed.length})
        </div>
        {confirmed.length === 0 ? (
          <div className="rounded-xl bg-bgsoft px-3 py-3 text-muted">
            No passengers yet. We’ll notify you as requests come in.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {confirmed.map((p) => (
              <Link
                key={p.id}
                href={`/inbox/${rideId}__${p.userId}`}
                className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-bgsoft"
              >
                <Avatar name={p.userName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.userName}</div>
                  <div className="nav-label text-muted">
                    {p.seats} seat{p.seats > 1 ? "s" : ""} ·{" "}
                    {p.paymentMethod === "online" ? "Paid online" : "Cash on board"}
                  </div>
                </div>
                <span className="nav-label font-semibold text-blue">Message</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
