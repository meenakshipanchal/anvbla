"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PinFrom, PinTo, Cal, User, Search } from "./Icons";
import { getCurrentPlace } from "@/lib/geolocate";
import { formatPlace } from "@/lib/place";
import { toast } from "@/lib/toast";

type Prediction = { id: string; main: string; secondary: string };

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

type Props = {
  from?: string;
  to?: string;
  date?: string;
  seats?: string;
  variant?: "hero" | "bar";
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Each field is a soft tile on mobile and a borderless segment on desktop.
const FIELD =
  "flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-bgsoft px-3 py-2 md:gap-2.5 md:bg-transparent md:px-3.5 md:py-2.5";

// Compact uppercase label — short form on mobile, full label from md up.
function FieldLabel({ short, full }: { short: string; full: string }) {
  return (
    <label className="block truncate text-[10px] font-semibold uppercase tracking-tight text-muted md:text-[11px] md:tracking-wide">
      <span className="md:hidden">{short}</span>
      <span className="hidden md:inline">{full}</span>
    </label>
  );
}

function CityField({
  icon,
  shortLabel,
  label,
  value,
  onChange,
  placeholder,
  className = "",
  currentLocation = false,
}: {
  icon: React.ReactNode;
  shortLabel: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  currentLocation?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [locating, setLocating] = useState(false);
  const skipRef = useRef(false); // skip the fetch triggered by selecting a suggestion
  const seqRef = useRef(0); // only the latest request may update the list

  async function useMyLocation() {
    setLocating(true);
    try {
      const place = await getCurrentPlace();
      skipRef.current = true;
      onChange(place);
      setPreds([]);
    } catch (e) {
      toast((e as Error).message || "Couldn’t get your location.");
    } finally {
      setLocating(false);
    }
  }

  // Debounced, race-safe place autocomplete (merged providers via /api/places).
  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setPreds([]);
      return;
    }
    const ctrl = new AbortController();
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (seq === seqRef.current) setPreds(data.predictions ?? []); // ignore stale responses
      } catch {
        /* aborted or offline */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  function select(p: Prediction) {
    skipRef.current = true;
    onChange(formatPlace(p.main, p.secondary));
    setPreds([]);
  }

  // Accept exactly what the user typed when their place isn't in the list.
  function useTyped() {
    skipRef.current = true;
    onChange(value.trim());
    setPreds([]);
    setFocus(false);
  }

  return (
    <div className={`relative ${FIELD} ${className}`}>
      <span className="shrink-0 text-blue">{icon}</span>
      <div className="min-w-0 flex-1">
        <FieldLabel short={shortLabel} full={label} />
        <input
          className="field-input min-w-0 text-[13px] md:text-[0.95rem]"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
        />
      </div>
      {focus && (currentLocation || preds.length > 0 || value.trim().length >= 2) && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-line bg-white shadow-md">
          {currentLocation && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                useMyLocation();
              }}
              className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-[13px] font-semibold text-blue hover:bg-bgtint"
            >
              <LocateIcon />
              {locating ? "Getting your location…" : "Use current location"}
            </button>
          )}
          {preds.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              type="button"
              className="flex w-full items-start gap-2 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-bgtint"
              onMouseDown={(e) => {
                e.preventDefault();
                select(p);
              }}
            >
              <PinTo width={16} height={16} className="mt-0.5 shrink-0 text-blue" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-snug break-words">{p.main}</span>
                {p.secondary && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted break-words">{p.secondary}</span>
                )}
              </span>
            </button>
          ))}
          {value.trim().length >= 2 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                useTyped();
              }}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-[13px] font-medium hover:bg-bgtint"
            >
              <PinTo width={16} height={16} className="shrink-0 text-blue" />
              <span className="min-w-0 flex-1 break-words">
                Use “<span className="font-semibold">{value.trim()}</span>”
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchCard(props: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(props.from ?? "");
  const [to, setTo] = useState(props.to ?? "");
  const [date, setDate] = useState(props.date || todayISO());
  const [seats, setSeats] = useState(props.seats ?? "1");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ from: from.trim(), to: to.trim(), date, seats });
    router.push(`/search?${params.toString()}`);
  }

  const shadow = props.variant === "bar" ? "shadow-md" : "shadow-[var(--shadow-lg)]";

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      // Mobile: 2-col grid (From/To full width, Date+Seats share a row). Desktop: one horizontal bar.
      className={`mt-0 grid max-w-[980px] grid-cols-2 gap-1.5 rounded-2xl bg-white p-2 text-ink md:flex md:flex-wrap md:items-stretch md:gap-1.5 md:rounded-[22px] md:p-2.5 ${shadow}`}
    >
      <CityField
        icon={<PinFrom />}
        shortLabel="From"
        label="Leaving from"
        value={from}
        onChange={setFrom}
        placeholder="Pickup point"
        className="col-span-2"
        currentLocation
      />
      <div className="hidden bg-line md:block md:h-auto md:w-px md:self-stretch" />
      <CityField
        icon={<PinTo />}
        shortLabel="To"
        label="Going to"
        value={to}
        onChange={setTo}
        placeholder="Drop-off point"
        className="col-span-2"
      />
      <div className="hidden bg-line md:block md:h-auto md:w-px md:self-stretch" />

      <div className={FIELD}>
        <span className="shrink-0 text-blue">
          <Cal />
        </span>
        <div className="min-w-0 flex-1">
          <FieldLabel short="Date" full="Date" />
          <input
            type="date"
            className="field-input min-w-0 text-[13px] md:text-[0.95rem]"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="hidden bg-line md:block md:h-auto md:w-px md:self-stretch" />

      <div className={FIELD}>
        <span className="shrink-0 text-blue">
          <User />
        </span>
        <div className="min-w-0 flex-1">
          <FieldLabel short="Seats" full="Passengers" />
          <select className="field-input min-w-0 text-[13px] md:text-[0.95rem]" value={seats} onChange={(e) => setSeats(e.target.value)}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} passenger{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary col-span-2 shrink-0 items-center justify-center self-stretch rounded-xl py-2.5 md:col-auto md:px-7"
      >
        <Search />
        <span>Search</span>
      </button>
    </form>
  );
}
