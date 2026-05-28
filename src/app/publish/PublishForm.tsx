"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import PlaceInput from "@/components/PlaceInput";
import { Car, Auto } from "@/components/Icons";

const LAST_RIDE_KEY = "bb-last-ride";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Standard Indian plate: SS NN XX NNNN (e.g. HR 26 AB 1234).
const PLATE_REGEX = /^[A-Z]{2}\s\d{1,2}\s[A-Z]{1,2}\s\d{4}$/;

// Live formatter — as the driver types, normalise to the SS NN XX NNNN groups.
function formatPlate(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const out: string[] = [];
  let i = 0;
  let part = "";
  // State code (2 letters)
  while (i < s.length && part.length < 2 && /[A-Z]/.test(s[i])) part += s[i++];
  if (part) out.push(part);
  // RTO code (up to 2 digits)
  part = "";
  while (i < s.length && part.length < 2 && /\d/.test(s[i])) part += s[i++];
  if (part) out.push(part);
  // Series (up to 2 letters)
  part = "";
  while (i < s.length && part.length < 2 && /[A-Z]/.test(s[i])) part += s[i++];
  if (part) out.push(part);
  // Vehicle number (up to 4 digits)
  part = "";
  while (i < s.length && part.length < 4 && /\d/.test(s[i])) part += s[i++];
  if (part) out.push(part);
  return out.join(" ");
}

type AmenityKey = "instant" | "ac" | "music" | "pets" | "maxTwo" | "womenOnly" | "lgbtq";
const AMENITIES: { key: AmenityKey; label: string }[] = [
  { key: "instant", label: "Instant booking" },
  { key: "ac", label: "Air conditioning" },
  { key: "music", label: "Music on board" },
  { key: "pets", label: "Pets allowed" },
  { key: "maxTwo", label: "Max 2 in the back" },
  { key: "womenOnly", label: "♀ Women only" },
  { key: "lgbtq", label: "🏳️‍🌈 LGBTQ+ friendly" },
];

type SavedRide = {
  from: string;
  to: string;
  time: string;
  arr: string;
  seats: string;
  price: string;
  note: string;
  extra: string;
  car: string;
  plate: string;
  stops: string;
  routeVia: string;
  vehicle: "car" | "auto";
  amenities: Record<AmenityKey, boolean>;
};

export default function PublishForm() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Precise coords when the user picked a spot on the map (or used GPS) —
  // we send these along so the ride is pinned to that exact location,
  // not the area centroid that text geocoding would return.
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("08:00");
  const [seats, setSeats] = useState("3");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [extra, setExtra] = useState("");
  const [car, setCar] = useState("");
  const [plate, setPlate] = useState("");
  const [stops, setStops] = useState("");
  const [routeVia, setRouteVia] = useState("");
  const [vehicle, setVehicle] = useState<"car" | "auto">("car");
  const [amenities, setAmenities] = useState<Record<AmenityKey, boolean>>({
    instant: true,
    ac: true,
    music: false,
    pets: false,
    maxTwo: false,
    womenOnly: false,
    lgbtq: false,
  });
  const [arrTime, setArrTime] = useState(""); // ETA — typed by the driver
  const [loading, setLoading] = useState(false);
  const [lastRide, setLastRide] = useState<SavedRide | null>(null);
  // Latest blocking error — rendered as a prominent banner at the top of the
  // form so the driver doesn't have to scroll hunting for a tiny toast that
  // disappeared. Set by both client-side validation and the server response.
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Scroll the form into view + clear `error` whenever it changes (so the
  // banner is always visible when something goes wrong).
  function reportError(msg: string) {
    setError(msg);
    toast(msg);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Trip duration derived purely from the driver's typed departure + arrival.
  const durHint = (() => {
    if (!time || !arrTime) return "";
    const [dh, dm] = time.split(":").map(Number);
    const [ah, am] = arrTime.split(":").map(Number);
    if ([dh, dm, ah, am].some(Number.isNaN)) return "";
    let diff = ah * 60 + am - (dh * 60 + dm);
    if (diff <= 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
  })();

  const toggle = (k: AmenityKey) => setAmenities((a) => ({ ...a, [k]: !a[k] }));

  // Offer to republish the driver's previous ride (saved locally).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_RIDE_KEY);
      if (raw) setLastRide(JSON.parse(raw) as SavedRide);
    } catch {
      /* ignore */
    }
  }, []);

  // Prefill the whole form from the last ride — every field stays editable.
  function reuseLast() {
    if (!lastRide) return;
    setFrom(lastRide.from);
    setTo(lastRide.to);
    setTime(lastRide.time);
    setArrTime(lastRide.arr ?? "");
    setSeats(lastRide.seats);
    setPrice(lastRide.price);
    setNote(lastRide.note);
    setExtra(lastRide.extra ?? "");
    setCar(lastRide.car ?? "");
    setPlate(lastRide.plate ?? "");
    setStops(lastRide.stops ?? "");
    setRouteVia(lastRide.routeVia ?? "");
    setVehicle(lastRide.vehicle ?? "car");
    setAmenities(lastRide.amenities);
    setLastRide(null); // hide the banner once applied
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from || !to) return reportError("Please add both pickup and drop-off cities.");
    if (!arrTime) return reportError("Please add the estimated arrival time (ETA).");
    if (!plate.trim()) return reportError("Please enter the number plate.");
    if (!PLATE_REGEX.test(plate.trim()))
      return reportError("Number plate must look like 'HR 26 AB 1234' (SS NN XX NNNN).");
    if (!routeVia.trim()) return reportError("Please add the route you’re taking.");
    setLoading(true);
    // Fold the extra "additional points" into the note that passengers see.
    const fullNote = [note.trim(), extra.trim()].filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          fromLat: fromCoords?.lat,
          fromLng: fromCoords?.lng,
          toLat: toCoords?.lat,
          toLng: toCoords?.lng,
          date,
          time,
          arr: arrTime,
          seats,
          price,
          note: fullNote,
          car,
          plate,
          stops,
          routeVia,
          vehicle,
          ...amenities,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        reportError(err.error || "Couldn’t publish your ride. Please try again.");
        return;
      }
      const { id } = await res.json();
      // Remember this ride so the driver can republish it next time.
      try {
        localStorage.setItem(
          LAST_RIDE_KEY,
          JSON.stringify({
            from, to, time, arr: arrTime, seats, price, note, extra,
            car, plate, stops, routeVia, vehicle, amenities,
          })
        );
      } catch {
        /* ignore */
      }
      toast(`Ride published! ${from} → ${to}.`);
      router.push(`/ride/${id}`);
    } catch {
      reportError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line px-4 py-3 text-[15px] text-ink outline-none transition focus:border-blue";

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="relative z-10 mx-auto -mt-10 mb-12 max-w-[720px] scroll-mt-24 rounded-[22px] bg-white p-5 shadow-[var(--shadow-lg)] sm:-mt-16 sm:mb-16 sm:p-8"
    >
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-[#c0392b]/30 bg-[#fdecea] px-4 py-3 font-semibold text-[#c0392b]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span className="break-words">{error}</span>
        </div>
      )}

      {lastRide && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bgtint px-3 py-1.5 text-xs">
          <span className="min-w-0 truncate">
            <span className="font-semibold">Republish last ride?</span>{" "}
            <span className="text-muted">
              {lastRide.from} → {lastRide.to}
            </span>
          </span>
          <span className="flex shrink-0 gap-1.5">
            <button type="button" onClick={reuseLast} className="rounded-full bg-blue px-3 py-1 font-semibold text-white">
              Use
            </button>
            <button type="button" onClick={() => setLastRide(null)} className="px-2 py-1 font-semibold text-muted">
              New
            </button>
          </span>
        </div>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Leaving from</label>
          <PlaceInput
            value={from}
            onChange={(v, c) => {
              setFrom(v);
              setFromCoords(c ?? null);
            }}
            placeholder="Pickup location or address"
            className={inputCls}
            currentLocation
            pickOnMap
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Going to</label>
          <PlaceInput
            value={to}
            onChange={(v, c) => {
              setTo(v);
              setToCoords(c ?? null);
            }}
            placeholder="Drop-off location or address"
            className={inputCls}
            currentLocation
            pickOnMap
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Date</label>
          <input type="date" className={inputCls} value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Departure time</label>
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-semibold text-muted">Estimated arrival — ETA</label>
        <input
          type="time"
          required
          className={inputCls}
          value={arrTime}
          onChange={(e) => setArrTime(e.target.value)}
        />
        {durHint && <p className="mt-1.5 text-xs text-muted">Trip duration: ~{durHint}</p>}
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Seats available</label>
          <select className={inputCls} value={seats} onChange={(e) => setSeats(e.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} seat{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Price per seat (₹)</label>
          <input
            type="number"
            min={0}
            step={10}
            required
            className={inputCls}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 499"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-semibold text-muted">Vehicle type</label>
        <div className="grid grid-cols-2 gap-2.5">
          {([
            ["car", "Car", Car],
            ["auto", "Auto", Auto],
          ] as const).map(([val, label, Icon]) => (
            <label
              key={val}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 transition ${
                vehicle === val ? "border-blue bg-bgtint text-blue" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="vehicle"
                className="sr-only"
                checked={vehicle === val}
                onChange={() => setVehicle(val)}
              />
              <Icon width={18} height={18} />
              <span className="font-semibold">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-muted">Car model (optional)</label>
          <input
            type="text"
            className={inputCls}
            value={car}
            onChange={(e) => setCar(e.target.value)}
            placeholder="e.g. Maruti Swift"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-[13px] font-semibold text-muted">Number plate</label>
            <span className="nav-label rounded-full bg-blue px-1.5 py-0.5 font-semibold text-white">Required</span>
          </div>
          <input
            type="text"
            required
            maxLength={13}
            className={`${inputCls} bg-bgtint`}
            value={plate}
            onChange={(e) => setPlate(formatPlate(e.target.value))}
            placeholder="HR 26 AB 1234"
          />
          <p className="mt-1.5 text-xs text-muted">Format: SS NN XX NNNN (e.g. HR 26 AB 1234)</p>
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-[13px] font-semibold text-muted">Stops on the way (optional)</label>
        <select className={inputCls} value={stops} onChange={(e) => setStops(e.target.value)}>
          <option value="">Not specified</option>
          <option value="0">Non-stop</option>
          <option value="1">1 stop</option>
          <option value="2">2 stops</option>
          <option value="3">3+ stops</option>
        </select>
      </div>

      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="text-[13px] font-semibold text-muted">Which route are you taking?</label>
          <span className="nav-label rounded-full bg-blue px-1.5 py-0.5 font-semibold text-white">Required</span>
        </div>
        <input
          type="text"
          required
          className={`${inputCls} bg-bgtint`}
          value={routeVia}
          onChange={(e) => setRouteVia(e.target.value)}
          placeholder="e.g. via NH8 · Manesar · Kotputli"
        />
        <p className="mt-1.5 text-xs text-muted">
          Passengers will see this on your ride so they know which way you’re going.
        </p>
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-[13px] font-semibold text-muted">A note for passengers (optional)</label>
        <textarea
          className={inputCls}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Pickup details, luggage space, music, breaks along the way…"
        />
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-[13px] font-semibold text-muted">Ride comfort</label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {AMENITIES.map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] border-line px-4 py-3 text-[15px] transition has-[:checked]:border-blue has-[:checked]:bg-bgtint"
            >
              <input
                type="checkbox"
                className="h-4.5 w-4.5 accent-blue"
                checked={amenities[key]}
                onChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
        <input
          type="text"
          className={`${inputCls} mt-2.5`}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Additional points to mention (e.g. one short stop, light luggage only)…"
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full disabled:opacity-60">
        {loading ? "Publishing…" : "Publish ride"}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        It’s free to publish. We never take a cut of your travel costs.
      </p>
    </form>
  );
}
