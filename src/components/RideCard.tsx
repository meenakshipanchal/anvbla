import Link from "next/link";
import { Ride, avatarColor, initials, rupees } from "@/lib/data";
import { Bolt, Shield, Star, Car, Auto } from "./Icons";

export default function RideCard({ ride, compact = false }: { ride: Ride; compact?: boolean }) {
  const col = avatarColor(ride.driver);

  if (compact) {
    const Vehicle = ride.vehicle === "auto" ? Auto : Car;
    return (
      <Link
        href={`/ride/${ride.id}`}
        className="block min-w-0 rounded-xl border border-line bg-white p-3 shadow-[var(--shadow-card)] transition hover:border-sky hover:shadow-md"
      >
        {/* Driver name — highlighted on top, with vehicle icon */}
        <div className="mb-1.5 flex items-center gap-1.5 font-bold text-blue">
          <Vehicle width={14} height={14} />
          <span className="truncate">{ride.driver}</span>
        </div>

        {/* Time + price */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0 flex-1 truncate font-bold">
            <span>{ride.dep}</span>
            {ride.arr && (
              <>
                <span className="mx-1.5 text-muted">→</span>
                <span>{ride.arr}</span>
              </>
            )}
          </div>
          <div className="shrink-0 font-bold">{rupees(ride.price)}</div>
        </div>

        {/* Route */}
        <div className="mt-1 truncate font-semibold">
          {ride.from} → {ride.to}
        </div>

        {/* Tags — small, wrap when narrow */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {ride.instant && (
            <span className="nav-label inline-flex items-center gap-0.5 rounded-full bg-sky-soft px-1.5 py-0.5 font-semibold text-blue">
              <Bolt width={10} height={10} /> Instant
            </span>
          )}
          {ride.womenOnly && (
            <span className="nav-label rounded-full bg-[#fce7f3] px-1.5 py-0.5 font-semibold text-[#be185d]">
              ♀ Women
            </span>
          )}
          {ride.lgbtq && (
            <span className="nav-label rounded-full bg-[#f3e8ff] px-1.5 py-0.5 font-semibold text-[#7c3aed]">
              🏳️‍🌈 LGBTQ+
            </span>
          )}
          <span className="nav-label ml-auto inline-flex items-center gap-0.5 font-semibold text-muted">
            <Star width={10} height={10} className="text-star" /> {ride.rating.toFixed(1)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/ride/${ride.id}`}
      className="mb-4 grid cursor-pointer grid-cols-1 gap-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-sky hover:shadow-md md:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="flex gap-3.5">
          <div className="flex flex-col items-center pt-1.5">
            <span className="h-3 w-3 rounded-full border-[2.5px] border-blue bg-blue" />
            <span className="my-1 w-0.5 flex-1 bg-line" />
            <span className="h-3 w-3 rounded-full border-[2.5px] border-blue" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold">
              {ride.dep} · {ride.from}
            </div>
            <div className="text-sm text-muted">{ride.fromSpot}</div>
            <div className="my-1 text-xs text-muted">{ride.dur}</div>
            <div className="text-lg font-bold">
              {ride.arr} · {ride.to}
            </div>
            <div className="text-sm text-muted">{ride.toSpot}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          {ride.instant ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-soft px-2.5 py-1 text-xs font-semibold text-blue">
              <Bolt /> Instant
            </span>
          ) : (
            <span className="rounded-full bg-bgsoft px-2.5 py-1 text-xs font-semibold text-muted">On request</span>
          )}
          {ride.verified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eafbe0] px-2.5 py-1 text-xs font-semibold text-[#3c7a14]">
              <Shield /> Verified
            </span>
          )}
          {ride.maxTwo && (
            <span className="rounded-full bg-sky-soft px-2.5 py-1 text-xs font-semibold text-blue">
              Max 2 in back
            </span>
          )}
          {ride.womenOnly && (
            <span className="rounded-full bg-[#fce7f3] px-2.5 py-1 text-xs font-semibold text-[#be185d]">
              ♀ Women only
            </span>
          )}
          {ride.lgbtq && (
            <span className="rounded-full bg-[#f3e8ff] px-2.5 py-1 text-xs font-semibold text-[#7c3aed]">
              🏳️‍🌈 LGBTQ+ friendly
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-between">
        <div className="text-2xl font-bold">{rupees(ride.price)}</div>
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-10 w-10 place-items-center rounded-full font-bold text-white"
            style={{ background: col }}
          >
            {initials(ride.driver)}
          </span>
          <div>
            <div className="text-sm font-semibold">{ride.driver}</div>
            <span className="inline-flex items-center gap-1 text-[13px] text-muted">
              <Star className="text-star" /> {ride.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
