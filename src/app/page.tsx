import Link from "next/link";
import SearchCard from "@/components/SearchCard";

/* Homepage — single goal: find a ride. Hero with search on top, then three
   tight steps and one driver CTA. No marketing chrome (eyebrows, value-prop
   grid, testimonial, FAQ) so the page reads as "type, search, done." */

const STEPS = [
  { n: "1", t: "Search", d: "Pick where you're going and when." },
  { n: "2", t: "Book", d: "Choose a ride that fits, request a seat." },
  { n: "3", t: "Travel", d: "Meet at the pickup, share the cost, go." },
];

export default function Home() {
  return (
    <>
      {/* Hero — smaller, lighter teal scrim so the page doesn't feel dark */}
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

      {/* How it works — borderless, just text + a quiet number */}
      <section className="py-16 md:py-24">
        <div className="wrap">
          <h2 className="mb-12 text-center font-bold tracking-tight">How it works</h2>
          <div className="mx-auto grid max-w-3xl gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-full bg-bgsoft font-semibold text-blue">
                  {s.n}
                </div>
                <h3 className="mb-1.5 font-semibold">{s.t}</h3>
                <p className="text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Driver CTA — quiet section divider, no tinted background */}
      <section className="border-t border-line py-16 md:py-24">
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
