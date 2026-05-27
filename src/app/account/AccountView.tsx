"use client";

import Link from "next/link";
import { Shield, Star, Seat, Ticket, User } from "@/components/Icons";
import { useAuthUser } from "@/lib/useAuthUser";

/* Profile UI driven by the merged auth state (Clerk email + Firebase Google),
   so it works for both kinds of user on the client. Server-side verification of
   the Firebase session (Admin SDK) is a Phase 2 concern. */

const MENU = [
  { Icon: User, label: "Edit profile", sub: "Name, photo, bio" },
  { Icon: Shield, label: "Verify your account", sub: "Add ID, phone & email" },
  { Icon: Ticket, label: "Payments & refunds", sub: "Methods and history" },
  { Icon: Seat, label: "Vehicles", sub: "Manage your cars" },
];

export default function AccountView() {
  const { user, ready } = useAuthUser();

  if (!ready) {
    return <div className="wrap py-12 md:py-16 text-center text-muted">Loading…</div>;
  }

  // Signed out (or auth not configured): prompt to log in.
  if (!user) {
    return (
      <div className="wrap py-12 md:py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[var(--shadow-md)]">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-sky-soft text-blue">
            <User width={30} height={30} />
          </span>
          <h1 className="text-xl font-bold">Log in to BlaBlue</h1>
          <p className="mt-2 text-muted">
            Sign in with Google or an email code to book rides, message drivers, and manage your trips.
          </p>
          <Link href="/sign-in" className="btn btn-primary mt-6 w-full">
            Log in
          </Link>
          <Link href="/sign-up" className="btn btn-outline mt-3 w-full">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap py-12 md:py-16">
      <div className="card flex items-center gap-4 p-6">
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-sherpa text-xl font-bold text-white">
            {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <Star className="text-star" /> {user.email || "Welcome back"}
          </span>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#eafbe0] px-4 py-3 text-sm font-semibold text-[#3c7a14]">
        <Shield /> Verify your profile to ride and drive with confidence
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        {MENU.map(({ Icon, label, sub }, i) => (
          <button
            key={label}
            className={`flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-bgsoft ${
              i ? "border-t border-line" : ""
            }`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-soft text-blue">
              <Icon />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm text-muted">{sub}</span>
            </span>
            <span className="text-muted">›</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        Manage your full profile and security from the avatar menu in the top bar.
      </p>
    </div>
  );
}
