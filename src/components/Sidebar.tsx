"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/lib/useAuthUser";
import { avatarColor, initials } from "@/lib/data";
import { Logo, Home, Search, Seat, Ticket, User } from "./Icons";

const NAV = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/search", label: "Search rides", Icon: Search },
  { href: "/publish", label: "Publish a ride", Icon: Seat },
  { href: "/trips", label: "Your trips", Icon: Ticket },
  { href: "/account", label: "Profile", Icon: User },
];

function SidebarUser({ onClose }: { onClose: () => void }) {
  const { isSignedIn, user, signOut } = useAuthUser();

  if (!isSignedIn || !user) {
    return (
      <div className="border-t border-line p-4">
        <Link href="/sign-in" onClick={onClose} className="btn btn-primary w-full">
          Log in or sign up
        </Link>
      </div>
    );
  }

  const name = user.name;
  const email = user.email;

  return (
    <div className="border-t border-line">
      <Link href="/account" onClick={onClose} className="flex items-center gap-3 p-4 hover:bg-bgsoft">
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt={name} className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span
            className="grid h-11 w-11 place-items-center rounded-full font-bold text-white text-[17px]!"
            style={{ background: avatarColor(name) }}
          >
            {initials(name)}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="truncate text-xs text-muted">{email}</div>
        </div>
      </Link>
      <button
        onClick={() => signOut("/")}
        className="flex w-full items-center gap-3 px-4 pb-4 text-left text-[15px] font-semibold text-[#c0392b]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Sign out
      </button>
    </div>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[280px] max-w-[82vw] flex-col bg-white shadow-[var(--shadow-lg)] transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu"
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <Link href="/" onClick={onClose} className="flex items-center gap-2 text-xl font-bold text-sherpa">
            <Logo width={30} height={30} />
            <span>
              Bla<span className="text-blue">Blue</span>
            </span>
          </Link>
          <button onClick={onClose} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-bgsoft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${
                  active ? "bg-bgtint text-blue" : "text-sherpa hover:bg-bgsoft"
                }`}
              >
                <Icon width={20} height={20} />
                {label}
              </Link>
            );
          })}
          <Link
            href="/#help"
            onClick={onClose}
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-sherpa hover:bg-bgsoft"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
            </svg>
            Help & support
          </Link>
        </nav>

        <SidebarUser onClose={onClose} />
      </aside>
    </>
  );
}
