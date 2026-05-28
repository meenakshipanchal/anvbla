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

type Query = {
  rides: Ride[];
  from: string;
  to: string;
  date: string;
  seats: string;
  // Server-geocoded coords for the search endpoints. Used to surface NEARBY
  // rides (within NEARBY_KM) in addition to plain text matches. Null means
  // geocoding couldn't resolve the term — we then fall back to text only.
  fromLat: number | null;
  fromLng: number | null;
  toLat: number | null;
  toLng: number | null;
};

// Radius treated as "near" for endpoint matching. 30 km is generous enough
// to cover a metro area without surfacing unrelated cities.
const NEARBY_KM = 30;
// Wider radius for "along the route" matching — if the user's pickup or
// drop-off falls within ALONG_KM of the line between the ride's from and
// to, it's considered a midway-sector match (Gurgaon → Faridabad picks up
// passengers anywhere along that corridor).
const ALONG_KM = 20;

type LL = { lat: number; lng: number };

function kmBetween(a: LL, b: LL): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Perpendicular distance (in km) from a point to the great-circle SEGMENT
// between a and b. We treat lat/lng as Cartesian — fine at city/state scale
// in India; nothing here drives navigation, just match filtering. Returns
// the haversine distance from the point to its closest point on the segment.
function kmToSegment(p: LL, a: LL, b: LL): number {
  const ax = a.lng, ay = a.lat;
  const bx = b.lng, by = b.lat;
  const px = p.lng, py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  // Degenerate segment (from == to) → just point-to-point distance.
  if (len2 < 1e-12) return kmBetween(p, a);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const closest: LL = { lat: ay + t * dy, lng: ax + t * dx };
  return kmBetween(p, closest);
}

export default function SearchResults({
  rides: allRides,
  from,
  to,
  date,
  seats,
  fromLat,
  fromLng,
  toLat,
  toLng,
}: Query) {
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
    // Each search endpoint matches a ride if EITHER:
    //   - the ride's text contains the head of the search query, OR
    //   - the search coord is within NEARBY_KM of the ride's matching endpoint, OR
    //   - the search coord is within ALONG_KM of the line between the ride's
    //     two endpoints (i.e. the user's stop falls midway along the trip).
    // A ride is shown only when BOTH from AND to pass this — keeps results
    // relevant to the user's actual journey direction.
    const head = (s: string) => s.split(",")[0].trim().toLowerCase();

    const searchFrom: LL | null =
      typeof fromLat === "number" && typeof fromLng === "number"
        ? { lat: fromLat, lng: fromLng }
        : null;
    const searchTo: LL | null =
      typeof toLat === "number" && typeof toLng === "number" ? { lat: toLat, lng: toLng } : null;

    function endpointMatches(
      query: string,
      searchCoord: LL | null,
      rideText: string,
      rideFromCoord: LL | null,
      rideToCoord: LL | null
    ): boolean {
      if (!query) return true;
      // Text path — works even with no coords on either side.
      if (rideText.toLowerCase().includes(head(query))) return true;
      if (!searchCoord) return false;
      // Coord path: near the ride's own endpoint OR along its route line.
      if (rideFromCoord && kmBetween(searchCoord, rideFromCoord) <= NEARBY_KM) return true;
      if (rideToCoord && kmBetween(searchCoord, rideToCoord) <= NEARBY_KM) return true;
      if (rideFromCoord && rideToCoord && kmToSegment(searchCoord, rideFromCoord, rideToCoord) <= ALONG_KM) return true;
      return false;
    }

    let list = allRides.filter((r) => {
      const rideFromCoord: LL | null =
        typeof r.fromLat === "number" && typeof r.fromLng === "number"
          ? { lat: r.fromLat, lng: r.fromLng }
          : null;
      const rideToCoord: LL | null =
        typeof r.toLat === "number" && typeof r.toLng === "number"
          ? { lat: r.toLat, lng: r.toLng }
          : null;

      if (!endpointMatches(from, searchFrom, r.from, rideFromCoord, rideToCoord)) return false;
      if (!endpointMatches(to, searchTo, r.to, rideFromCoord, rideToCoord)) return false;
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
  }, [allRides, from, to, seats, flags, times, sort, nameQuery, fromLat, fromLng, toLat, toLng]);

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
