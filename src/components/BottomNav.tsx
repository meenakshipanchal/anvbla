"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, Search, Ticket, Plus, Mail } from "./Icons";
import { toast } from "@/lib/toast";

// Order: Home · Trips · Search (center FAB) · Publish · Inbox
const TABS = [
  { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  { href: "/trips", label: "Your trips", Icon: Ticket, match: (p: string) => p.startsWith("/trips") },
  {
    href: "/search",
    label: "Search",
    Icon: Search,
    match: (p: string) => p.startsWith("/search") || p.startsWith("/ride"),
    center: true,
  },
  { href: "/publish", label: "Publish", Icon: Plus, match: (p: string) => p.startsWith("/publish") },
  { href: "/inbox", label: "Inbox", Icon: Mail, match: (p: string) => p.startsWith("/inbox") },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [requests, setRequests] = useState(0);
  const [unread, setUnread] = useState(0);
  // Previous counts — used to detect a RISE (= new activity) so we can toast.
  const prevRef = useRef({ requests: 0, unread: 0, primed: false });

  // Continuous in-app notifications: poll every 5s while the tab is visible.
  // Pauses when the tab is hidden to save battery + API quota.
  useEffect(() => {
    let alive = true;
    let timer: number | null = null;

    async function tick() {
      if (!alive || document.hidden) return;
      try {
        const r = await fetch("/api/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { requests: number; unread: number };
        if (!alive) return;

        const prev = prevRef.current;
        if (prev.primed) {
          if (d.requests > prev.requests) {
            const delta = d.requests - prev.requests;
            toast(`${delta} new ride request${delta > 1 ? "s" : ""}`);
          }
          if (d.unread > prev.unread) {
            toast("New message");
          }
        }
        prevRef.current = { requests: d.requests, unread: d.unread, primed: true };
        setRequests(d.requests);
        setUnread(d.unread);
      } catch {
        /* network blip — try again next tick */
      }
    }

    tick();
    timer = window.setInterval(tick, 5000);

    // Fire an immediate refresh when the tab becomes visible again (covers
    // the case where the user comes back after a long pause).
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  // Tab title prefix — same trick Slack/Discord use to draw the eye even
  // when BlaBlue isn't the focused tab. e.g. "(2) BlaBlue — Inbox".
  useEffect(() => {
    const total = requests + unread;
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
  }, [requests, unread]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-white/95 shadow-[0_-6px_24px_rgba(5,71,82,0.10)] backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 items-end gap-1 px-3 pt-3">
        {TABS.map(({ href, label, Icon, match, center }) => {
          const active = match(pathname);

          if (center) {
            return (
              <Link key={href} href={href} aria-label={label} className="flex flex-col items-center gap-2">
                <span className="-mt-9 grid h-15 w-15 place-items-center rounded-full bg-[linear-gradient(145deg,#2dbeff,#0071eb)] text-white shadow-[0_8px_20px_rgba(0,113,235,0.45)] ring-4 ring-white transition active:scale-95">
                  <Icon width={28} height={28} />
                </span>
                <span className="nav-label font-semibold text-blue">{label}</span>
              </Link>
            );
          }

          return (
            <Link key={href} href={href} className="group flex flex-col items-center gap-2">
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-full transition ${
                  active ? "bg-sky-soft text-blue" : "text-muted group-hover:text-blue"
                }`}
              >
                <Icon width={24} height={24} />
                {href === "/trips" && requests > 0 && (
                  <span className="nav-label absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#e11d48] px-1 font-bold text-white">
                    {requests}
                  </span>
                )}
                {href === "/inbox" && unread > 0 && (
                  <span className="nav-label absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#e11d48] px-1 font-bold text-white">
                    {unread}
                  </span>
                )}
              </span>
              <span className={`nav-label font-medium ${active ? "font-semibold text-blue" : "text-muted"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
