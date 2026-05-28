"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* Homepage shortcut list — reads the local "recent searches" log written
   by SearchCard whenever the user submits a new search. Each row is a
   one-tap link straight into /search with the same query, the way
   BlaBlaCar's home does it.

   Renders NOTHING if the user has no history yet (first visit / cleared
   storage) so the homepage stays clean. The hero search bar remains as
   the always-available entry point. */

type Recent = {
  from: string;
  to: string;
  date: string;
  seats: string;
  ts: number;
};

const KEY = "bb-recent-searches";

export default function RecentSearches() {
  // Render on mount only — localStorage isn't available on the server, and
  // we don't want a hydration mismatch from a stale snapshot.
  const [items, setItems] = useState<Recent[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setItems(raw ? (JSON.parse(raw) as Recent[]) : []);
    } catch {
      setItems([]);
    }
  }, []);

  if (!items || items.length === 0) return null;

  function clearOne(ts: number) {
    if (!items) return;
    const next = items.filter((r) => r.ts !== ts);
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function clearAll() {
    setItems([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="py-12 md:py-16">
      <div className="wrap">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold tracking-tight">Your recent searches</h2>
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold text-muted hover:text-blue"
          >
            Clear all
          </button>
        </div>
        <ul className="grid gap-2">
          {items.map((r) => {
            const params = new URLSearchParams({
              from: r.from,
              to: r.to,
              date: r.date,
              seats: r.seats,
            });
            return (
              <li key={r.ts} className="group flex items-stretch">
                <Link
                  href={`/search?${params.toString()}`}
                  className="flex flex-1 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 transition hover:border-blue"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bgsoft text-blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {r.from} <span className="mx-1 text-muted">→</span> {r.to}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {r.date ? new Date(r.date).toDateString() : "Any date"} ·{" "}
                      {r.seats} passenger{Number(r.seats) > 1 ? "s" : ""}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted group-hover:text-blue" aria-hidden>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
                <button
                  type="button"
                  aria-label="Remove search"
                  onClick={() => clearOne(r.ts)}
                  className="ml-2 grid w-10 shrink-0 place-items-center rounded-xl border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
