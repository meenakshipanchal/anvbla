"use client";

import Link from "next/link";
import { useAuthUser, type AuthUser } from "@/lib/useAuthUser";
import { User } from "./Icons";
import UserMenu from "./UserMenu";

/* Server-seeded auth chrome — the layout passes the server-verified user
   from getCurrentUser() as `initialUser`, so the very first paint already
   shows the avatar instead of flashing "Log in" while the client SDK
   restores state. Firebase's onIdTokenChanged still kicks in afterwards
   and replaces this snapshot with the live user, but the visual hand-off
   is invisible. */
export default function AuthButtons({
  initialUser = null,
  onNavigate,
}: {
  initialUser?: AuthUser | null;
  onNavigate?: () => void;
}) {
  const { user } = useAuthUser();
  // Prefer the live client user (it has the freshest photo / display name),
  // but fall back to the server snapshot for the first frame after refresh.
  const effective = user ?? initialUser;

  if (effective) return <UserMenu initialUser={initialUser} />;

  return (
    <Link href="/sign-in" onClick={onNavigate} className="btn btn-outline">
      <User width={18} height={18} />
      <span>Log in</span>
    </Link>
  );
}
