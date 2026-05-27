"use client";

import { useMemo, useState } from "react";
import SearchCard from "@/components/SearchCard";
import RideCard from "@/components/RideCard";
import { type Ride } from "@/lib/data";
import { toast } from "@/lib/toast";

type FlagKey = "instant" | "verified" | "maxTwo" | "womenOnly" | "lgbtq" | "ac" | "music" | "pets";
type TimeKey = "morning" | "afternoon" | "evening";

const FLAGS: { key: FlagKey; label: string; group: string }[] = [
  { key: "instant", label: "Instant booking", group: "Trust & comfort" },
  { key: "verified", label: "Verified profile", group: "Trust & comfort" },
  { key: "womenOnly", label: "♀ Women only", group: "Trust & comfort" },
  { key: "lgbtq", label: "🏳️‍🌈 LGBTQ+ friendly", group: "Trust & comfort" },
  { key: "maxTwo", label: "Max 2 in the back", group: "Trust & comfort" },
  { key: "ac", label: "Air conditioning", group: "Amenities" },
  { key: "music", label: "Music", group: "Amenities" },
  { key: "pets", label: "Pets allowed", group: "Amenities" },
];

const TIMES: { key: TimeKey; label: string }[] = [
  { key: "morning", label: "Before 12:00" },
  { key: "afternoon", label: "12:00 – 18:00" },
  { key: "evening", label: "After 18:00" },
];

const GROUPS = ["Trust & comfort", "Amenities"];

function timeBucket(dep: string): TimeKey {
  const h = Number(dep.split(":")[0]);
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

// Shared checkbox controls — used by both the desktop sidebar and the mobile sheet.
function FilterControls({
  flags,
  times,
  onToggleFlag,
  onToggleTime,
}: {
  flags: Set<FlagKey>;
  times: Set<TimeKey>;
  onToggleFlag: (k: FlagKey) => void;
  onToggleTime: (k: TimeKey) => void;
}) {
  return (
    <>
      {GROUPS.map((g) => (
        <div key={g} className="border-t border-line py-4 first:border-t-0">
          <h4 className="mb-3 font-semibold uppercase tracking-wide text-muted">{g}</h4>
          {FLAGS.filter((f) => f.group === g).map((f) => (
            <label key={f.key} className="flex cursor-pointer items-center gap-2.5 py-1.5">
              <input
                type="checkbox"
                className="h-4.5 w-4.5 accent-blue"
                checked={flags.has(f.key)}
                onChange={() => onToggleFlag(f.key)}
              />
              {f.label}
            </label>
          ))}
        </div>
      ))}
      <div className="border-t border-line py-4">
        <h4 className="mb-3 font-semibold uppercase tracking-wide text-muted">Departure time</h4>
        {TIMES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center gap-2.5 py-1.5">
            <input
              type="checkbox"
              className="h-4.5 w-4.5 accent-blue"
              checked={times.has(t.key)}
              onChange={() => onToggleTime(t.key)}
            />
            {t.label}
          </label>
        ))}
      </div>
    </>
  );
}

function toggle<T>(set: Set<T>, k: T): Set<T> {
  const next = new Set(set);
  next.has(k) ? next.delete(k) : next.add(k);
  return next;
}

type Query = { rides: Ride[]; from: string; to: string; date: string; seats: string };

export default function SearchResults({ rides: allRides, from, to, date, seats }: Query) {
  // Committed filters (drive the results).
  const [flags, setFlags] = useState<Set<FlagKey>>(new Set());
  const [times, setTimes] = useState<Set<TimeKey>>(new Set());
  const [sort, setSort] = useState("dep");

  // Mobile bottom-sheet: draft filters, only committed on Apply.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftFlags, setDraftFlags] = useState<Set<FlagKey>>(new Set());
  const [draftTimes, setDraftTimes] = useState<Set<TimeKey>>(new Set());

  // Free-text search by driver name OR number plate.
  const [nameQuery, setNameQuery] = useState("");

  const activeCount = flags.size + times.size;

  const rides = useMemo(() => {
    // Match on the first part of the query (e.g. "Sector 45") so the city/state
    // we now append to a selected place doesn't over-narrow the results.
    const head = (s: string) => s.split(",")[0].trim().toLowerCase();
    let list = allRides.filter((r) => {
      if (from && !r.from.toLowerCase().includes(head(from))) return false;
      if (to && !r.to.toLowerCase().includes(head(to))) return false;
      if (seats && r.seats < Number(seats)) return false;
      return true;
    });
    list = list.filter((r) => [...flags].every((f) => r[f]));
    if (times.size) list = list.filter((r) => times.has(timeBucket(r.dep)));

    // Free-text match on driver name or number plate.
    const nq = nameQuery.trim().toLowerCase();
    if (nq) {
      list = list.filter(
        (r) => r.driver.toLowerCase().includes(nq) || (r.plate ?? "").toLowerCase().includes(nq)
      );
    }

    const cmp: Record<string, (a: Ride, b: Ride) => number> = {
      price: (a, b) => a.price - b.price,
      rating: (a, b) => b.rating - a.rating,
      dur: (a, b) => a.dur.localeCompare(b.dur),
      dep: (a, b) => a.dep.localeCompare(b.dep),
    };
    return [...list].sort(cmp[sort] ?? cmp.dep);
  }, [allRides, from, to, seats, flags, times, sort, nameQuery]);

  // Open the sheet with the currently-applied filters as the starting draft.
  function openSheet() {
    setDraftFlags(new Set(flags));
    setDraftTimes(new Set(times));
    setSheetOpen(true);
  }
  function applyDraft() {
    setFlags(new Set(draftFlags));
    setTimes(new Set(draftTimes));
    setSheetOpen(false);
  }
  function clearDraft() {
    setDraftFlags(new Set());
    setDraftTimes(new Set());
  }
  const draftCount = draftFlags.size + draftTimes.size;

  return (
    <>
      <div className="bg-sherpa py-4">
        <div className="wrap">
          <SearchCard variant="bar" from={from} to={to} date={date} seats={seats} />
        </div>
      </div>

      <div className="wrap">
        <div className="grid gap-7 py-8 md:grid-cols-[280px_1fr]">
          {/* Desktop filters sidebar */}
          <aside className="card hidden h-fit self-start p-5 md:sticky md:top-[86px] md:block">
            <h3 className="font-semibold">
              Filters
              {activeCount > 0 && (
                <span className="ml-2 rounded-full bg-blue px-2 py-0.5 font-semibold text-white">{activeCount}</span>
              )}
            </h3>
            <FilterControls
              flags={flags}
              times={times}
              onToggleFlag={(k) => setFlags((p) => toggle(p, k))}
              onToggleTime={(k) => setTimes((p) => toggle(p, k))}
            />
          </aside>

          {/* Results */}
          <main>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-bold">{from && to ? `${from} → ${to}` : "All rides"}</h1>
                <div className="text-muted">
                  {rides.length} ride{rides.length !== 1 ? "s" : ""} found
                  {date ? ` · ${new Date(date).toDateString()}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mobile-only Filters trigger */}
                <button
                  type="button"
                  onClick={openSheet}
                  className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line px-4 py-2.5 font-semibold md:hidden"
                >
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-full bg-blue px-2 py-0.5 font-semibold text-white">{activeCount}</span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border-[1.5px] border-line px-4 py-2.5 font-semibold text-ink"
                >
                  <option value="dep">Earliest departure</option>
                  <option value="price">Lowest price</option>
                  <option value="rating">Top rated drivers</option>
                  <option value="dur">Shortest ride</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search by driver name or number plate…"
                className="w-full rounded-xl border-[1.5px] border-line px-4 py-2.5 outline-none transition focus:border-blue"
              />
            </div>

            {rides.length === 0 ? (
              <div className="px-5 py-16 text-center text-muted">
                <h3 className="font-semibold text-ink">No rides match your search yet</h3>
                <p className="mt-2">Try another date, loosen your filters, or set an alert for new rides.</p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => toast("Alert set! We’ll notify you when a ride appears.")}
                >
                  Set a ride alert
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rides.map((r) => (
                  <RideCard key={r.id} ride={r} compact />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filters bottom sheet */}
      <div className={`fixed inset-0 z-[80] md:hidden ${sheetOpen ? "" : "pointer-events-none"}`} aria-hidden={!sheetOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSheetOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-[var(--shadow-lg)] transition-transform duration-200 ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          {/* Sticky top bar with Apply */}
          <div className="sticky top-0 z-10 rounded-t-2xl bg-white">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <button
                type="button"
                onClick={clearDraft}
                className="font-semibold text-muted disabled:opacity-40"
                disabled={draftCount === 0}
              >
                Clear
              </button>
              <h3 className="font-semibold">Filters</h3>
              <button type="button" onClick={applyDraft} className="btn btn-primary px-5 py-2">
                Apply{draftCount > 0 ? ` (${draftCount})` : ""}
              </button>
            </div>
          </div>

          {/* Scrollable filter list */}
          <div className="overflow-y-auto px-4 pb-8">
            <FilterControls
              flags={draftFlags}
              times={draftTimes}
              onToggleFlag={(k) => setDraftFlags((p) => toggle(p, k))}
              onToggleTime={(k) => setDraftTimes((p) => toggle(p, k))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
