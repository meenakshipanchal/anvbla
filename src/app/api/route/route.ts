import { NextRequest, NextResponse } from "next/server";
import { routePath } from "@/lib/geo";

/* Returns the driving route polyline between two points as JSON:
   { path: [[lat, lng], ...] }. The Geoapify key stays on the server. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const flat = Number(sp.get("flat"));
  const flng = Number(sp.get("flng"));
  const tlat = Number(sp.get("tlat"));
  const tlng = Number(sp.get("tlng"));
  if ([flat, flng, tlat, tlng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  const path = await routePath({ lat: flat, lng: flng }, { lat: tlat, lng: tlng });
  if (!path) return NextResponse.json({ error: "Route unavailable." }, { status: 502 });

  return NextResponse.json(
    { path },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
  );
}
