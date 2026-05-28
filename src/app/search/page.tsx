import SearchResults from "./SearchResults";
import { listRides } from "@/lib/rides";
import { geocode } from "@/lib/geo";

export const metadata = { title: "Search rides" };
// Search must read live Firestore on every request — a deleted/booked ride
// has to disappear immediately. Never cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const from = one(sp.from);
  const to = one(sp.to);

  // Geocode both endpoints in parallel with the rides fetch. The client filter
  // uses these coords to surface NEARBY rides too, not only exact substring
  // matches — e.g. "Sector 45, Gurgaon → Faridabad" should also catch rides
  // starting from Cyber City or Sector 50 if they're within the radius.
  // Geocoding is best-effort: if the API has no key / fails, the client
  // falls back to plain text matching.
  const [rides, fromCoords, toCoords] = await Promise.all([
    listRides(),
    from ? geocode(from) : Promise.resolve(null),
    to ? geocode(to) : Promise.resolve(null),
  ]);

  return (
    <SearchResults
      rides={rides}
      from={from}
      to={to}
      date={one(sp.date)}
      seats={one(sp.seats) || "1"}
      fromLat={fromCoords?.lat ?? null}
      fromLng={fromCoords?.lng ?? null}
      toLat={toCoords?.lat ?? null}
      toLng={toCoords?.lng ?? null}
    />
  );
}
