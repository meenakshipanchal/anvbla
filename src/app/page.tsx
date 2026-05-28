import Link from "next/link";
import SearchCard from "@/components/SearchCard";
import RecentSearches from "@/components/RecentSearches";

/* Homepage — single goal: find a ride. Hero with search bar, then the
   user's recent searches as one-tap shortcuts (BlaBlaCar-style). The
   recent list quietly hides itself if the visitor has no history yet,
   so a first-time user still gets a clean hero without empty-state noise. */

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[52vh] flex-col justify-center overflow-hidden pb-14 pt-12 text-white md:min-h-[60vh] md:pb-20 md:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(4,47,58,.88)_0%,rgba(5,71,82,.48)_55%,rgba(5,71,82,.12)_100%)]" />
        <div className="wrap relative z-10">
          <h1 className="max-w-[640px] font-bold tracking-tight">
            Find a ride at <span className="text-green">low prices</span>
          </h1>
          <p className="mt-3 max-w-[480px] text-[#d6eef2]">
            Share the journey, split the cost.
          </p>
          <div className="mt-8">
            <SearchCard variant="hero" />
          </div>
        </div>
      </section>

      {/* User's recent searches — one tap to re-run. Renders nothing when
          the user has no history yet (first visit / cleared storage). */}
      <RecentSearches />

      {/* Driver CTA — quiet section divider, no tinted background */}
      <section className="border-t border-line py-14 md:py-20">
        <div className="wrap mx-auto max-w-[560px] text-center">
          <h2 className="font-bold tracking-tight">Driving somewhere?</h2>
          <p className="mt-3 text-muted">
            Publish your trip and let passengers chip in for fuel and tolls.
          </p>
          <div className="mt-8">
            <Link href="/publish" className="btn btn-primary btn-lg">
              Publish a ride
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
