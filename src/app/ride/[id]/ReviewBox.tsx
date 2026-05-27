"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Star } from "@/components/Icons";

export default function ReviewBox({ rideId, driver }: { rideId: string; driver: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (rating < 1) {
      toast("Please choose a star rating.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, rating, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t submit your review.");
        return;
      }
      toast("Thanks for your review!");
      router.refresh();
    } catch {
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mt-5 p-6">
      <h2 className="mb-3 font-semibold">Rate your trip with {driver}</h2>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= (hover || rating) ? "text-star" : "text-line"}
          >
            <Star width={28} height={28} />
          </button>
        ))}
      </div>
      <textarea
        className="w-full rounded-xl border-[1.5px] border-line px-4 py-3 outline-none transition focus:border-blue"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="How was the ride? (optional)"
      />
      <button onClick={submit} disabled={loading} className="btn btn-primary mt-3 disabled:opacity-60">
        {loading ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
