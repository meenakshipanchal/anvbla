import { NextRequest, NextResponse } from "next/server";
import { CITIES } from "@/lib/data";

/* Place autocomplete proxy — MERGES multiple providers for dense coverage.
   It queries every available provider in parallel, then round-robin interleaves
   their results (1 from each in turn) and dedupes — so you get the union of
   their data (localities, streets, landmarks, states). Providers, by priority:
     • Mappls (MapMyIndia)  — if MAPPLS_CLIENT_ID/SECRET set (densest India data)
     • Google Places (New)  — if GOOGLE_MAPS_API_KEY set (best global, needs billing)
     • Geoapify             — if GEOAPIFY_API_KEY set (free 3k/day)
     • Photon (OSM)         — free, no key, typeahead-optimised
     • Nominatim (OSM)      — free, no key, strong on streets/addresses
     • City list            — last-resort fallback
   All keys stay server-side. */

type Prediction = { id: string; main: string; secondary: string };

// ---- Google Places (New) ----
type GooglePrediction = {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
};
type GoogleResponse = { suggestions?: { placePrediction?: GooglePrediction }[] };

async function fromGoogle(q: string, key: string): Promise<Prediction[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({ input: q, includedRegionCodes: ["in"], languageCode: "en" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as GoogleResponse;
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is GooglePrediction => !!p)
    .map((p) => ({
      id: p.placeId ?? p.text?.text ?? "",
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((p) => p.main);
}

// ---- Photon (OpenStreetMap) ----
type PhotonFeature = {
  properties?: {
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};
type PhotonResponse = { features?: PhotonFeature[] };

// Photon labels coarse results with osm_key=place and osm_value in this set —
// they're whole administrative areas, not precise pickup spots.
const PHOTON_COARSE_VALUES = new Set([
  "country", "state", "region", "province", "county", "city", "town", "village", "municipality", "district",
]);

async function fromPhoton(q: string): Promise<Prediction[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lang=en&lat=22.5&lon=79`;
  const res = await fetch(url, { headers: { "User-Agent": "BlaBlue/1.0 (carpooling)" } });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const data = (await res.json()) as PhotonResponse;
  return (data.features ?? [])
    .filter((f) => f.properties?.countrycode === "IN")
    .filter((f) => {
      const p = f.properties!;
      // Drop pure city/state/county admin results — keep streets, landmarks, buildings.
      if (p.osm_key === "place" && p.osm_value && PHOTON_COARSE_VALUES.has(p.osm_value)) return false;
      return true;
    })
    .map((f) => {
      const p = f.properties!;
      const main = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || p.street || p.city || "";
      const secondary = [p.city, p.district || p.county, p.state, p.country]
        .filter((v, i, a) => v && v !== main && a.indexOf(v) === i)
        .join(", ");
      return { id: `photon-${p.osm_id ?? main}`, main, secondary };
    })
    .filter((p) => p.main);
}

// ---- Nominatim (OpenStreetMap) ----
type NominatimItem = { osm_id?: number; name?: string; display_name?: string };

async function fromNominatim(q: string): Promise<Prediction[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    q
  )}&format=jsonv2&addressdetails=1&limit=8&countrycodes=in`;
  const res = await fetch(url, { headers: { "User-Agent": "BlaBlue/1.0 (carpooling app; +https://blablue.app)" } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = (await res.json()) as NominatimItem[];
  return data
    .map((it) => {
      const parts = (it.display_name ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const main = it.name || parts[0] || "";
      const secondary = parts.filter((p) => p !== main).slice(0, 3).join(", ");
      return { id: `nom-${it.osm_id ?? main}`, main, secondary };
    })
    .filter((p) => p.main);
}

// ---- Geoapify (free 3k/day) ----
type GeoapifyResponse = {
  features?: {
    properties?: {
      place_id?: string;
      name?: string;
      address_line1?: string;
      address_line2?: string;
      result_type?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  }[];
};

// Geoapify's coarse buckets — pickup spots shouldn't be a whole city or state.
const GEOAPIFY_COARSE_TYPES = new Set(["country", "state", "county", "city", "postcode"]);

async function fromGeoapify(q: string, key: string): Promise<Prediction[]> {
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
    q
  )}&filter=countrycode:in&limit=10&format=geojson&apiKey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geoapify ${res.status}`);
  const data = (await res.json()) as GeoapifyResponse;
  return (data.features ?? [])
    .filter((f) => !GEOAPIFY_COARSE_TYPES.has(f.properties?.result_type ?? ""))
    .map((f) => {
      const p = f.properties ?? {};
      const main = p.address_line1 || p.name || p.city || "";
      const secondary = p.address_line2 || [p.city, p.state, p.country].filter(Boolean).join(", ");
      return { id: `geo-${p.place_id ?? main}`, main, secondary };
    })
    .filter((p) => p.main);
}

// ---- Mappls / MapMyIndia (densest India data; OAuth2 token, cached) ----
let mapplsToken: { value: string; exp: number } | null = null;

async function getMapplsToken(id: string, secret: string): Promise<string> {
  if (mapplsToken && mapplsToken.exp > Date.now() + 60_000) return mapplsToken.value;
  const res = await fetch("https://outpost.mappls.com/api/security/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  if (!res.ok) throw new Error(`mappls token ${res.status}`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("mappls: no access_token");
  mapplsToken = { value: data.access_token, exp: Date.now() + (data.expires_in ?? 86400) * 1000 };
  return mapplsToken.value;
}

type MapplsResponse = { suggestedLocations?: { placeName?: string; placeAddress?: string; eLoc?: string }[] };

async function fromMappls(q: string, id: string, secret: string): Promise<Prediction[]> {
  const token = await getMapplsToken(id, secret);
  const url = `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(q)}&region=ind`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`mappls ${res.status}`);
  const data = (await res.json()) as MapplsResponse;
  return (data.suggestedLocations ?? [])
    .map((s) => ({ id: `mappls-${s.eLoc ?? s.placeName}`, main: s.placeName ?? "", secondary: s.placeAddress ?? "" }))
    .filter((p) => p.main);
}

function fromCityList(q: string): Prediction[] {
  return CITIES.filter((c) => c.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 6)
    .map((c) => ({ id: `city-${c}`, main: c, secondary: "India" }));
}

// Merge provider results (union for density), dedupe look-alikes, then rank by
// how well each matches the query so the best hits surface first (round-robin
// alone mixed good + junk equally, which felt broken).
function mergePredictions(lists: Prediction[][], q: string, limit = 6): Prediction[] {
  const seen = new Set<string>();
  const all: Prediction[] = [];
  for (const list of lists) {
    for (const p of list) {
      if (!p.main) continue;
      const key = `${p.main}|${p.secondary}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
  }

  const ql = q.toLowerCase().trim();
  const words = ql.split(/\s+/).filter(Boolean);
  const score = (p: Prediction): number => {
    const main = p.main.toLowerCase();
    const hay = `${p.main} ${p.secondary}`.toLowerCase();
    let s = 0;
    if (main === ql) s += 1000;
    else if (main.startsWith(ql)) s += 500;
    else if (main.includes(ql)) s += 200;
    for (const w of words) {
      if (main.startsWith(w)) s += 60;
      else if (main.includes(w)) s += 30;
      else if (hay.includes(w)) s += 10;
    }
    s -= main.length; // prefer concise, precise names
    return s;
  };

  return all.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ predictions: [] as Prediction[] });

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const mapplsId = process.env.MAPPLS_CLIENT_ID;
  const mapplsSecret = process.env.MAPPLS_CLIENT_SECRET;

  // Run providers in parallel; results are merged + relevance-ranked below.
  // Nominatim is fuzzy + slow + rate-limited, so we only use it as a free
  // densifier when no Geoapify key is present (Geoapify replaces its role with
  // cleaner, structured results + pincodes).
  const tasks: Promise<Prediction[]>[] = [];
  if (mapplsId && mapplsSecret) tasks.push(fromMappls(q, mapplsId, mapplsSecret));
  if (googleKey) tasks.push(fromGoogle(q, googleKey));
  if (geoapifyKey) tasks.push(fromGeoapify(q, geoapifyKey));
  tasks.push(fromPhoton(q));
  if (!geoapifyKey) tasks.push(fromNominatim(q));

  const settled = await Promise.allSettled(tasks);
  const lists = settled.map((s) => (s.status === "fulfilled" ? s.value : []));

  let predictions = mergePredictions(lists, q);
  if (predictions.length === 0) predictions = fromCityList(q);

  return NextResponse.json({ predictions, source: "merged" });
}
