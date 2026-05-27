import { NextRequest, NextResponse } from "next/server";
import { geoapifyStaticUrl } from "@/lib/geo";

/* Proxies a Geoapify static map so the API key never reaches the browser.
   Usage: /api/staticmap?flat=..&flng=..&tlat=..&tlng=.. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const flat = Number(sp.get("flat"));
  const flng = Number(sp.get("flng"));
  const tlat = Number(sp.get("tlat"));
  const tlng = Number(sp.get("tlng"));
  if ([flat, flng, tlat, tlng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  const url = geoapifyStaticUrl({ lat: flat, lng: flng }, { lat: tlat, lng: tlng });
  if (!url) return NextResponse.json({ error: "Maps not configured." }, { status: 404 });

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "Map unavailable." }, { status: 502 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Map fetch failed." }, { status: 502 });
  }
}
