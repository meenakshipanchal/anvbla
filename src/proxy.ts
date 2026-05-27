import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that require a signed-in user. /search is gated so we capture intent at
// the moment the user submits — while preserving their query (see `next` below).
const PROTECTED = ["/search", "/trips", "/account", "/publish", "/inbox"];

/* Auth is entirely Firebase (Google). Sign-in mints an httpOnly `__session`
   cookie (server-verified). Here we only do an OPTIMISTIC presence check (per
   Next's Proxy guidance); the cookie is cryptographically verified server-side
   in getCurrentUser(). When bouncing to sign-in we carry the original
   path+query as `next`, so the user returns exactly where they were — with
   their search pre-filled and never having to retype. */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return;

  const signedIn = !!req.cookies.get("__session")?.value;
  if (!signedIn) {
    const next = req.nextUrl.pathname + req.nextUrl.search;
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    // Run on everything except static files and Next internals…
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // …and always on API routes.
    "/(api|trpc)(.*)",
  ],
};
