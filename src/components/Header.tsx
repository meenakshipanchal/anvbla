"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, Search, Seat, Menu } from "./Icons";
import AuthButtons from "./AuthButtons";
import Sidebar from "./Sidebar";
import type { AuthUser } from "@/lib/useAuthUser";

const LINKS = [
  { href: "/search", label: "Search", Icon: Search },
  { href: "/publish", label: "Publish a ride", Icon: Seat },
];

export default function Header({ initialUser = null }: { initialUser?: AuthUser | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur">
        <div className="wrap flex h-[70px] items-center gap-2">
          <button
            className="grid h-11 w-11 place-items-center rounded-xl hover:bg-bgsoft lg:hidden"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu />
          </button>

          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-sherpa">
            <Logo />
            <span>
              Bla<span className="text-blue">Blue</span>
            </span>
          </Link>

          <span className="flex-1" />

          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2.5 font-semibold ${
                    active ? "text-blue" : "text-sherpa"
                  } hover:bg-bgsoft`}
                >
                  <Icon width={18} height={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
            <Link href="/#help" className="rounded-full px-3.5 py-2.5 font-semibold text-sherpa hover:bg-bgsoft">
              Help
            </Link>
          </nav>

          <AuthButtons initialUser={initialUser} />
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
