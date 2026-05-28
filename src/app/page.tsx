import Link from "next/link";
import SearchCard from "@/components/SearchCard";
import { Seat } from "@/components/Icons";

/* Homepage — pared down to the single thing a visitor cares about:
   finding a ride. Hero + search bar at the top, three tight steps
   below, one CTA to publish. Everything else (testimonials, FAQ,
   driver pitch) lives on dedicated pages so / doesn't feel cluttered. */

const STEPS = [
  { n: "1", t: "Search", d: "Pick where you're going and when." },
  { n: "2", t: "Book", d: "Choose a ride that fits, request a seat." },
  { n: "3", t: "Travel", d: "Meet at the pickup, share the cost, go." },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[58vh] flex-col justify-center overflow-hidden pb-12 pt-10 text-white md:min-h-[72vh] md:pb-24 md:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(4,47,58,.94)_0%,rgba(5,71,82,.66)_42%,rgba(5,71,82,.22)_72%,rgba(5,71,82,.05)_100%)]" />
        <div className="wrap relative z-10">
          <span className="eyebrow text-green">Carpooling in India</span>
          <h1 className="mt-3 max-w-[720px] font-bold tracking-tight">
            Find a ride at <span className="text-green">low prices</span>
          </h1>
          <p className="mt-4 max-w-[520px] text-[#d6eef2]">
            Share the journey, split the cost.
          </p>
          <div className="mt-8">
            <SearchCard variant="hero" />
          </div>
        </div>
      </section>

      {/* How it works — minimal, three short steps */}
      <section className="py-14 md:py-20">
        <div className="wrap">
          <div className="mx-auto mb-10 max-w-[560px] text-center">
            <h2 className="font-bold tracking-tight">How it works</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-white p-7 text-center">
                <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-sky-soft font-bold text-blue">
                  {s.n}
                </div>
                <h3 className="mb-2 font-semibold">{s.t}</h3>
                <p className="text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Driver CTA — single, prominent */}
      <section className="bg-bgtint py-14 md:py-20">
        <div className="wrap mx-auto max-w-[640px] text-center">
          <h2 className="font-bold tracking-tight">Driving somewhere?</h2>
          <p className="mt-3 text-muted">
            Publish your trip and let passengers chip in for fuel and tolls.
          </p>
          <div className="mt-7">
            <Link href="/publish" className="btn btn-primary btn-lg">
              <Seat /> Publish a ride
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
