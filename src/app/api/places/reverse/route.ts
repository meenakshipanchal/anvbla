import { NextRequest, NextResponse } from "next/server";

/* Reverse geocode lat/lng → a PRECISE address (housenumber + street + locality
   + city). Geoapify's `formatted` when keyed, else Photon (OSM). Returns { place }. */

type GeoapifyReverse = {
  results?: {
    housenumber?: string;
    street?: string;
    suburb?: string;
    neighbourhood?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    formatted?: string;
  }[];
};
type PhotonReverse = {
  features?: {
    properties?: {
      name?: string;
      housenumber?: string;
      street?: string;
      suburb?: string;
      neighbourhood?: string;
      district?: string;
      city?: string;
      state?: string;
      postcode?: string;
    };
  }[];
};

// Drop the trailing country and any 6-digit pincode segment, but KEEP everything
// before the city — that's the precise stuff the rider/driver actually needs.
function trimAddress(full: string): string {
  return full
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !/^\d{6}$/.test(s) && !/^india$/i.test(s))
    .join(", ");
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) return NextResponse.json({ place: "" });

  const geoKey = process.env.GEOAPIFY_API_KEY;
  try {
    if (geoKey) {
      const r = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${geoKey}`
      );
      if (r.ok) {
        const d = (await r.json()) as GeoapifyReverse;
        const p = d.results?.[0];
        if (p) {
          // Prefer Geoapify's pre-built `formatted` (full street-level address);
          // fall back to assembling housenumber + street + locality ourselves.
          const built =
            p.formatted ||
            [
              [p.housenumber, p.street].filter(Boolean).join(" "),
              p.suburb || p.neighbourhood || p.address_line1,
              p.city || p.county,
              p.state,
            ]
              .filter(Boolean)
              .join(", ");
          const place = trimAddress(built);
          if (place) return NextResponse.json({ place });
        }
      }
    }
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`, {
      headers: { "User-Agent": "BlaBlue/1.0 (carpooling)" },
    });
    const d = (await r.json()) as PhotonReverse;
    const pr = d.features?.[0]?.properties;
    const built = pr
      ? [
          [pr.housenumber, pr.street].filter(Boolean).join(" ") || pr.name,
          pr.suburb || pr.neighbourhood,
          pr.district || pr.city,
          pr.state,
        ]
          .filter(Boolean)
          .join(", ")
      : "";
    return NextResponse.json({ place: trimAddress(built) });
  } catch {
    return NextResponse.json({ place: "" });
  }
}
