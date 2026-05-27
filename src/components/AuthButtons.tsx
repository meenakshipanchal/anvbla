"use client";

import Link from "next/link";
import { useAuthUser } from "@/lib/useAuthUser";
import { User } from "./Icons";
import UserMenu from "./UserMenu";

/* Rendered only when Clerk is configured, so the hooks always have a provider.
   Signed-in state covers BOTH Clerk (email) and Firebase (Google) users. */
export default function AuthButtons({ onNavigate }: { onNavigate?: () => void }) {
  const { isSignedIn } = useAuthUser();

  if (isSignedIn) return <UserMenu />;

  return (
    <Link href="/sign-in" onClick={onNavigate} className="btn btn-outline">
      <User width={18} height={18} />
      <span>Log in</span>
    </Link>
  );
}
