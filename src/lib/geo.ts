import "server-only";

/* Server-side geocoding via Geoapify (key stays on the server). Used to stamp
   coordinates on a ride at publish time — powers the route map and, later,
   geo-based route matching. */

export type LatLng = { lat: number; lng: number };

export async function geocode(text: string): Promise<LatLng | null> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key || !text.trim()) return null;
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      text
    )}&filter=countrycode:in&limit=1&format=json&apiKey=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { lat?: number; lon?: number }[] };
    const r = data.results?.[0];
    if (!r || typeof r.lat !== "number" || typeof r.lon !== "number") return null;
    return { lat: r.lat, lng: r.lon };
  } catch {
    return null;
  }
}

// Build the (server-only) Geoapify static-map URL for a from→to pair.
export function geoapifyStaticUrl(from: LatLng, to: LatLng, w = 640, h = 320): string | null {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return null;
  const marker = [
    `lonlat:${from.lng},${from.lat};type:material;color:%230071eb;size:large;icon:cloud`,
    `lonlat:${to.lng},${to.lat};type:material;color:%23054752;size:large`,
  ].join("|");
  const geometry = `polyline:${from.lng},${from.lat},${to.lng},${to.lat};linecolor:%230071eb;linewidth:4;lineopacity:0.7`;
  const minLon = Math.min(from.lng, to.lng);
  const maxLon = Math.max(from.lng, to.lng);
  const minLat = Math.min(from.lat, to.lat);
  const maxLat = Math.max(from.lat, to.lat);
  const padLon = (maxLon - minLon) * 0.35 + 0.05;
  const padLat = (maxLat - minLat) * 0.35 + 0.05;
  const area = `rect:${minLon - padLon},${minLat - padLat},${maxLon + padLon},${maxLat + padLat}`;
  return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${w}&height=${h}&area=${area}&marker=${marker}&geometry=${geometry}&apiKey=${key}`;
}

/* Fetch the actual driving route between two points as an array of [lat, lng]
   pairs. Uses Geoapify Routing (free tier 3,000/day). Returns null if no key
   is set or the API fails — caller falls back to a straight line. */
export async function routePath(from: LatLng, to: LatLng): Promise<[number, number][] | null> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return null;
  try {
    const url =
      `https://api.geoapify.com/v1/routing?waypoints=${from.lat},${from.lng}|${to.lat},${to.lng}` +
      `&mode=drive&apiKey=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { geometry?: { type: string; coordinates: number[][] | number[][][] } }[];
    };
    const geom = data.features?.[0]?.geometry;
    if (!geom) return null;
    // Geoapify returns MultiLineString (coordinates: number[][][]); flatten to one path.
    const rings: number[][][] =
      geom.type === "MultiLineString"
        ? (geom.coordinates as number[][][])
        : [geom.coordinates as number[][]];
    const path: [number, number][] = [];
    for (const ring of rings) for (const [lng, lat] of ring) path.push([lat, lng]);
    return path.length > 1 ? path : null;
  } catch {
    return null;
  }
}

// Haversine distance in km — for future partial-route matching.
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough ETA: road distance ≈ straight-line × 1.3 at ~50 km/h average.
// Returns trip duration ("3h 20m"), arrival clock time, and km.
export function estimateEta(from: LatLng, to: LatLng, depTime: string): { dur: string; arr: string; km: number } {
  const km = Math.round(distanceKm(from, to) * 1.3);
  const mins = Math.max(5, Math.round((km / 50) * 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;

  const [hh, mm] = depTime.split(":").map(Number);
  const total = (Number.isNaN(hh) ? 0 : hh) * 60 + (Number.isNaN(mm) ? 0 : mm) + mins;
  const arrH = Math.floor((total % (24 * 60)) / 60);
  const arrM = total % 60;
  const arr = `${String(arrH).padStart(2, "0")}:${String(arrM).padStart(2, "0")}`;
  return { dur, arr, km };
}
