import SearchResults from "./SearchResults";
import { listRides } from "@/lib/rides";

export const metadata = { title: "Search rides" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  // Fetch from Firestore on the server, then hand the list to the client filter UI.
  const rides = await listRides();

  return (
    <SearchResults
      rides={rides}
      from={one(sp.from)}
      to={one(sp.to)}
      date={one(sp.date)}
      seats={one(sp.seats) || "1"}
    />
  );
}
