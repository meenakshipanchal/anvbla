import Link from "next/link";
import SearchCard from "@/components/SearchCard";
import Faq from "@/components/Faq";
import { Bolt, Shield, PinTo, Mail, Tick, Star, Seat } from "@/components/Icons";

const VALUES = [
  {
    Icon: PinTo,
    t: "Travel anywhere",
    d: "Reach every corner of India — thousands of carpool rides set off across the country every single day.",
  },
  {
    Icon: Bolt,
    t: "Prices like nowhere else",
    d: "Shared fuel and tolls mean you pay just a small slice of what the journey would normally cost you.",
  },
  {
    Icon: Shield,
    t: "Ride with confidence",
    d: "Travel reassured — every member carries a verified profile, real ratings and honest reviews.",
  },
];

const STEPS = [
  { t: "Search your route", d: "Tell us where you’re setting off from, where you’re headed and the day you want to travel." },
  { t: "Pick & book", d: "Line up rides by time, price and driver rating, then book on the spot or request a seat." },
  { t: "Hop in & go", d: "Meet your driver at the pickup point, enjoy the trip, and leave each other a rating after." },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[54vh] flex-col justify-center overflow-hidden pb-10 pt-8 text-white md:min-h-[75vh] md:pb-28 md:pt-14">
        {/* Background photo */}
        <div className="pointer-events-none absolute inset-0 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        {/* Brand scrim — keeps the left-aligned text and search card legible */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(4,47,58,.94)_0%,rgba(5,71,82,.66)_42%,rgba(5,71,82,.22)_72%,rgba(5,71,82,.05)_100%)]" />
        <div className="wrap relative z-10">
          <span className="eyebrow text-green">Carpooling in India</span>
          <h1 className="mt-2 max-w-[720px] font-bold tracking-tight">
            Your pick of rides at <span className="text-green">low prices</span>
          </h1>
          <p className="mt-3.5 max-w-[560px] text-[#d6eef2]">
            Search carpool rides across India. Share the journey, split the cost, and arrive with new friends.
          </p>
          <div className="mt-7">
            <SearchCard variant="hero" />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-12 md:py-16">
        <div className="wrap grid gap-6 md:grid-cols-3">
          {VALUES.map(({ Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-line bg-bgsoft p-7">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-soft text-blue">
                <Icon width={26} height={26} />
              </div>
              <h3 className="mb-2 font-semibold">{t}</h3>
              <p className="text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Share your ride (driver) */}
      <section className="py-12 md:py-16">
        <div className="wrap flex flex-wrap items-center gap-10">
          <div className="min-w-[300px] flex-1">
            <div className="relative aspect-[16/11] overflow-hidden rounded-2xl shadow-md">
              <img src="/hero-bg.png" alt="Carpoolers meeting before a ride" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="min-w-[320px] flex-1">
            <span className="eyebrow">Become a driver</span>
            <h2 className="mb-3.5 font-bold">Share your ride. Shrink your costs.</h2>
            <p className="mb-4 text-muted">
              Carpool as a driver and turn those empty seats into real savings. Just publish your trip and let passengers
              chip in for the fuel and tolls along the way.
            </p>
            <ul className="my-4 grid gap-3.5">
              {[
                ["Spend less on the road.", "Riders share your fuel and toll costs on every trip."],
                ["You call the shots.", "Pick your seats, set your price and choose who travels with you."],
                ["Good company.", "Travel alongside verified members heading the same way."],
              ].map(([b, rest]) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green text-sherpa">
                    <Tick width={14} height={14} />
                  </span>
                  <span>
                    <b>{b}</b> {rest}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/publish" className="btn btn-primary btn-lg">
              <Seat /> Offer a ride
            </Link>
          </div>
        </div>
      </section>

      {/* Never miss a carpool (ride alerts) */}
      <section className="py-12 md:py-16">
        <div className="wrap flex flex-wrap-reverse items-center gap-10">
          <div className="min-w-[320px] flex-1">
            <span className="eyebrow">Ride alerts</span>
            <h2 className="mb-3.5 font-bold">Never miss a carpool again</h2>
            <p className="mb-5 text-muted">
              It’s frustrating to plan ahead and find no rides — drivers often post just a few days before they leave.
              Switch on ride alerts and we’ll ping you by email and in the app the moment a matching ride goes live. Stay
              ahead and grab the best seat.
            </p>
            <Link href="/search" className="btn btn-primary btn-lg">
              Find a ride
            </Link>
          </div>
          <div className="min-w-[300px] flex-1">
            <div className="relative grid aspect-[16/11] place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#054752,#0a5d6b)] text-white shadow-md">
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15">
                  <Mail width={30} height={30} />
                </span>
                <div className="w-full max-w-[240px] rounded-xl bg-white/95 p-3 text-left text-ink shadow-md">
                  <div className="font-semibold text-blue">New ride alert 🔔</div>
                  <div className="mt-0.5 text-muted">Delhi → Jaipur · tomorrow, 8:00 AM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16">
        <div className="wrap">
          <div className="mx-auto mb-9 max-w-[680px] text-center">
            <span className="eyebrow">Simple</span>
            <h2 className="font-bold tracking-tight">How carpooling works</h2>
            <p className="mt-2.5 text-muted">Three steps from search to seat.</p>
          </div>
          <div className="grid gap-7 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.t} className="text-center">
                <div className="mx-auto mb-4 grid h-13 w-13 place-items-center rounded-full bg-sherpa p-3.5 font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-semibold">{s.t}</h3>
                <p className="text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-bgtint py-14 md:py-20">
        <div className="wrap mx-auto max-w-[760px] text-center">
          <span className="eyebrow">Only on BlaBlue</span>
          <blockquote className="mt-4 text-[clamp(16px,2.4vw,20px)] font-semibold leading-snug text-ink">
            “Carpooling just works for me — I spend a little, reach my destination on time, in comfort and with the AC on.
            And it feels good knowing the driver gets some help with costs instead of driving alone.”
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue font-bold text-white">R</span>
            <div className="text-left">
              <div className="font-semibold">Rohan</div>
              <span className="inline-flex items-center gap-1 text-muted">
                <Star className="text-star" /> from Pune
              </span>
            </div>
          </div>
          <div className="mt-7">
            <Link href="/search" className="btn btn-primary btn-lg">
              Travel with carpool
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-bgsoft py-12 md:py-16">
        <div className="wrap">
          <div className="mx-auto mb-9 max-w-[680px] text-center">
            <span className="eyebrow">Good to know</span>
            <h2 className="font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <Faq />
        </div>
      </section>
    </>
  );
}
