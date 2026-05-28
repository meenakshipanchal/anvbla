"use client";

import { useEffect, useState } from "react";
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

function formatPlate(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const out: string[] = [];
  let i = 0;
  let part = "";
  while (i < s.length && part.length < 2 && /[A-Z]/.test(s[i])) part += s[i++];
  if (part) out.push(part);
  part = "";
  while (i < s.length && part.length < 2 && /\d/.test(s[i])) part += s[i++];
  if (part) out.push(part);
  part = "";
  while (i < s.length && part.length < 2 && /[A-Z]/.test(s[i])) part += s[i++];
  if (part) out.push(part);
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

// Wizard step keys — order here drives the screen sequence.
const STEPS = [
  "from",
  "to",
  "when",
  "eta",
  "seatsPrice",
  "vehicle",
  "plate",
  "route",
  "comfort",
  "note",
  "review",
] as const;
type StepKey = (typeof STEPS)[number];

export default function PublishForm({
  // Server-prefetched fallback from /publish/page.tsx — the user's most recent
  // published ride from Firestore. Used when localStorage has no entry (fresh
  // browser/device), so the "Republish last ride?" prompt works cross-device.
  serverLastRide,
}: {
  serverLastRide?: SavedRide | null;
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState<number>(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
  const [arrTime, setArrTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastRide, setLastRide] = useState<SavedRide | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    // Prefer the per-browser snapshot (most recent action by THIS user on
    // THIS device) — falls back to the server-prefetched ride for first-time
    // visitors on a new browser.
    try {
      const raw = localStorage.getItem(LAST_RIDE_KEY);
      if (raw) {
        setLastRide(JSON.parse(raw) as SavedRide);
        return;
      }
    } catch {
      /* ignore */
    }
    if (serverLastRide) setLastRide(serverLastRide);
  }, [serverLastRide]);

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
    setLastRide(null);
    setStep(STEPS.length - 1); // jump straight to review when reusing
  }

  // Validate the current step before advancing. Returns an error message or
  // null. Keeping validation per-step means the user can never get past a
  // screen with bad data, and "Continue" stays disabled accordingly.
  function validateStep(key: StepKey): string | null {
    switch (key) {
      case "from":
        return from.trim() ? null : "Please add the pickup location.";
      case "to":
        return to.trim() ? null : "Please add the drop-off location.";
      case "when":
        if (!date) return "Please pick a date.";
        if (!time) return "Please pick a departure time.";
        return null;
      case "eta":
        return arrTime ? null : "Please add the estimated arrival time.";
      case "seatsPrice":
        if (!seats) return "Please choose how many seats are available.";
        if (!price || Number(price) < 0) return "Please enter a price per seat.";
        return null;
      case "plate":
        if (!plate.trim()) return "Please enter the number plate.";
        if (!PLATE_REGEX.test(plate.trim()))
          return "Number plate must look like 'HR 26 AB 1234'.";
        return null;
      case "route":
        return routeVia.trim() ? null : "Please add the route you're taking.";
      default:
        return null;
    }
  }

  function goNext() {
    const err = validateStep(STEPS[step]);
    if (err) {
      setError(err);
      toast(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setError(null);
    // Final defensive check — every step has been validated already, but the
    // backend should still get a clean payload.
    for (const key of STEPS) {
      const err = validateStep(key);
      if (err) {
        setError(err);
        toast(err);
        return;
      }
    }
    setLoading(true);
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
        const errPayload = await res.json().catch(() => ({}));
        setError(errPayload.error || "Couldn't publish your ride. Please try again.");
        toast(errPayload.error || "Couldn't publish your ride.");
        return;
      }
      const { id } = await res.json();
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
      setError("Network error — please try again.");
      toast("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Thinner border (1px instead of 1.5px) — softer than the previous outlined
  // look. Focus state is the only place colour shows up on inputs.
  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition focus:border-blue";

  const stepKey = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto mb-12 max-w-[560px] px-4 pt-8 sm:pt-12">
      {/* Progress — single thin bar, no duplicate "Step X of N" text */}
      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-bgsoft">
        <div
          className="h-full rounded-full bg-blue transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Reuse-last banner — borderless, no tint, only on step 1 */}
      {step === 0 && lastRide && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate text-muted">
            Republish{" "}
            <span className="font-semibold text-ink">
              {lastRide.from} → {lastRide.to}
            </span>?
          </span>
          <span className="flex shrink-0 gap-3">
            <button type="button" onClick={reuseLast} className="font-semibold text-blue hover:underline">
              Use it
            </button>
            <button type="button" onClick={() => setLastRide(null)} className="font-semibold text-muted hover:underline">
              New
            </button>
          </span>
        </div>
      )}

      {/* Step content — no card border or shadow; the screen IS the card */}
      <div>
        {stepKey === "from" && (
          <Screen
            title="Where are you leaving from?"
            hint="Tap the locate icon or pick a spot on the map for exact pickup."
          >
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
          </Screen>
        )}

        {stepKey === "to" && (
          <Screen
            title="Where are you going?"
            hint="Tap the locate icon or pick a spot on the map for exact drop-off."
          >
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
          </Screen>
        )}

        {stepKey === "when" && (
          <Screen title="When are you leaving?">
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Departure time</label>
                <input
                  type="time"
                  className={inputCls}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </Screen>
        )}

        {stepKey === "eta" && (
          <Screen
            title="When will you arrive?"
            hint="Your best estimate. Passengers see this on the ride card."
          >
            <input
              type="time"
              className={inputCls}
              value={arrTime}
              onChange={(e) => setArrTime(e.target.value)}
            />
            {durHint && (
              <p className="mt-3 rounded-lg bg-sky-soft px-3 py-2 text-sm font-semibold text-blue">
                Trip duration: ~{durHint}
              </p>
            )}
          </Screen>
        )}

        {stepKey === "seatsPrice" && (
          <Screen title="How many seats & at what price?">
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Seats available</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setSeats(String(n))}
                      className={`min-w-12 rounded-full border px-4 py-2 font-semibold transition ${
                        seats === String(n)
                          ? "border-blue text-blue"
                          : "border-line text-ink hover:border-sky"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Price per seat (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  className={inputCls}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 499"
                />
              </div>
            </div>
          </Screen>
        )}

        {stepKey === "vehicle" && (
          <Screen title="What are you driving?">
            <div className="grid grid-cols-2 gap-3">
              {([
                ["car", "Car", Car],
                ["auto", "Auto", Auto],
              ] as const).map(([val, label, Icon]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setVehicle(val)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border px-3 py-7 transition ${
                    vehicle === val ? "border-blue text-blue" : "border-line"
                  }`}
                >
                  <Icon width={32} height={32} />
                  <span className="font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </Screen>
        )}

        {stepKey === "plate" && (
          <Screen
            title="Your vehicle details"
            hint="Plate is required — it lets passengers spot your vehicle at pickup."
          >
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Number plate <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  type="text"
                  maxLength={13}
                  className={inputCls}
                  value={plate}
                  onChange={(e) => setPlate(formatPlate(e.target.value))}
                  placeholder="HR 26 AB 1234"
                />
                <p className="mt-1.5 text-xs text-muted">Format: SS NN XX NNNN</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Car model (optional)</label>
                <input
                  type="text"
                  className={inputCls}
                  value={car}
                  onChange={(e) => setCar(e.target.value)}
                  placeholder="e.g. Maruti Swift"
                />
              </div>
            </div>
          </Screen>
        )}

        {stepKey === "route" && (
          <Screen
            title="Which route are you taking?"
            hint="Helps passengers know which way you're going."
          >
            <div className="grid gap-4">
              <input
                type="text"
                className={inputCls}
                value={routeVia}
                onChange={(e) => setRouteVia(e.target.value)}
                placeholder="e.g. via NH8 · Manesar · Kotputli"
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Stops on the way (optional)</label>
                <select className={inputCls} value={stops} onChange={(e) => setStops(e.target.value)}>
                  <option value="">Not specified</option>
                  <option value="0">Non-stop</option>
                  <option value="1">1 stop</option>
                  <option value="2">2 stops</option>
                  <option value="3">3+ stops</option>
                </select>
              </div>
            </div>
          </Screen>
        )}

        {stepKey === "comfort" && (
          <Screen
            title="Ride comfort"
            hint="Tap any that apply. Passengers filter on these."
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              {AMENITIES.map(({ key, label }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-[15px] transition ${
                    amenities[key] ? "border-blue text-blue" : "border-line"
                  }`}
                >
                  <span>{label}</span>
                  {amenities[key] && <span className="text-blue">✓</span>}
                </button>
              ))}
            </div>
          </Screen>
        )}

        {stepKey === "note" && (
          <Screen
            title="Anything else passengers should know?"
            hint="Optional — skip if you have nothing to add."
          >
            <textarea
              className={inputCls}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Pickup details, luggage space, breaks along the way…"
            />
            <input
              type="text"
              className={`${inputCls} mt-3`}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Additional points (e.g. one short stop, light luggage only)…"
            />
          </Screen>
        )}

        {stepKey === "review" && (
          <Screen title="Review & publish">
            <ul className="grid gap-2 text-[15px]">
              <ReviewRow label="From" value={from} />
              <ReviewRow label="To" value={to} />
              <ReviewRow label="Date" value={new Date(date).toDateString()} />
              <ReviewRow label="Departure" value={time} />
              <ReviewRow label="Arrival ETA" value={arrTime} hint={durHint ? `~${durHint}` : undefined} />
              <ReviewRow label="Seats" value={`${seats}`} />
              <ReviewRow label="Price / seat" value={`₹${price}`} />
              <ReviewRow label="Vehicle" value={`${vehicle === "auto" ? "Auto" : "Car"}${car ? ` · ${car}` : ""}`} />
              <ReviewRow label="Plate" value={plate} />
              <ReviewRow label="Route" value={routeVia} />
              {stops && (
                <ReviewRow
                  label="Stops"
                  value={stops === "0" ? "Non-stop" : `${stops} stop${stops === "1" ? "" : "s"}`}
                />
              )}
              <ReviewRow
                label="Comfort"
                value={
                  AMENITIES.filter((a) => amenities[a.key])
                    .map((a) => a.label)
                    .join(" · ") || "—"
                }
              />
              {(note || extra) && <ReviewRow label="Note" value={[note, extra].filter(Boolean).join(" · ")} />}
            </ul>
            {error && (
              <p className="mt-4 rounded-lg bg-[#fdecec] px-3 py-2 text-sm font-semibold text-[#c0392b]">{error}</p>
            )}
          </Screen>
        )}
      </div>

      {/* Step-level error banner (non-review steps) */}
      {error && !isLast && (
        <div role="alert" className="mt-3 rounded-xl bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#c0392b]">
          {error}
        </div>
      )}

      {/* Footer actions */}
      <div className="sticky bottom-0 mt-6 -mx-4 border-t border-line bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-6">
        {!isLast ? (
          <button type="button" onClick={goNext} className="btn btn-primary btn-lg w-full">
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="btn btn-primary btn-lg w-full disabled:opacity-60"
          >
            {loading ? "Publishing…" : "Publish ride"}
          </button>
        )}
        {isLast && (
          <button type="button" onClick={goBack} className="mt-2 w-full py-2 font-semibold text-muted">
            ← Edit
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Helpers — kept inline so the wizard stays self-contained.
   ────────────────────────────────────────────────────────────── */
function Screen({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-1 font-bold tracking-tight">{title}</h2>
      {hint && <p className="mb-5 text-sm text-muted">{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </div>
  );
}

function ReviewRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="text-right">
        <span className="font-semibold">{value || "—"}</span>
        {hint && <span className="ml-1 text-muted">{hint}</span>}
      </span>
    </li>
  );
}
