"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthUser, type AuthUser } from "@/lib/useAuthUser";
import { avatarColor, initials } from "@/lib/data";
import { User, Ticket, Seat } from "./Icons";

/* Account dropdown — server-seeded with the cookie-verified user so it
   paints the right avatar/name on the first frame after a refresh and
   doesn't briefly flash "Log in" while Firebase rehydrates. */
export default function UserMenu({ initialUser = null }: { initialUser?: AuthUser | null }) {
  const { user: liveUser, signOut } = useAuthUser();
  const user = liveUser ?? initialUser;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;

  const name = user.name;
  const email = user.email;

  function Avatar({ size }: { size: number }) {
    return user!.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user!.imageUrl}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    ) : (
      <span
        className="grid place-items-center rounded-full font-bold text-white text-[length:var(--avatar-fs)]!"
        style={
          {
            width: size,
            height: size,
            background: avatarColor(name),
            "--avatar-fs": `${Math.round(size * 0.4)}px`,
          } as React.CSSProperties
        }
      >
        {initials(name)}
      </span>
    );
  }

  const item = "flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] hover:bg-bgsoft";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-line"
        aria-label="Account menu"
      >
        <Avatar size={40} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-lg)]">
          <div className="flex items-center gap-3 p-4">
            <Avatar size={44} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-xs text-muted">{email}</div>
            </div>
          </div>

          <div className="border-t border-line">
            <Link href="/account" className={item} onClick={() => setOpen(false)}>
              <User width={18} height={18} className="text-blue" /> Profile
            </Link>
            <Link href="/trips" className={item} onClick={() => setOpen(false)}>
              <Ticket width={18} height={18} className="text-blue" /> Your trips
            </Link>
            <Link href="/publish" className={item} onClick={() => setOpen(false)}>
              <Seat width={18} height={18} className="text-blue" /> Publish a ride
            </Link>
          </div>

          <div className="border-t border-line">
            <button onClick={() => signOut("/")} className={`${item} font-semibold text-[#c0392b]`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
