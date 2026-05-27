"use client";

import { useEffect, useRef, useState } from "react";
import { PinTo } from "./Icons";
import { getCurrentPlace } from "@/lib/geolocate";
import { formatPlace } from "@/lib/place";
import { toast } from "@/lib/toast";
import PinPicker from "./PinPicker";

/* Reusable place-autocomplete text input — same merged /api/places source as the
   search bar (Geoapify + Photon, relevance-ranked). Debounced + race-safe.
   Pass `currentLocation` to show a "Use current location" option. */

type Prediction = { id: string; main: string; secondary: string };

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export default function PlaceInput({
  value,
  onChange,
  placeholder,
  className,
  currentLocation = false,
  pickOnMap = false,
}: {
  value: string;
  // coords are passed when the value came from a precise source (map pin / GPS);
  // text-only entries omit them so the server can geocode the label.
  onChange: (v: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  currentLocation?: boolean;
  pickOnMap?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [locating, setLocating] = useState(false);
  const [picking, setPicking] = useState(false);
  const skipRef = useRef(false); // skip the fetch caused by selecting a suggestion
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
        if (seq === seqRef.current) setPreds(data.predictions ?? []);
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
    <div className="relative">
      <input
        className={className}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
      />
      {focus && (currentLocation || pickOnMap || preds.length > 0 || value.trim().length >= 2) && (
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
          {pickOnMap && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setPicking(true);
                setFocus(false);
              }}
              className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-[13px] font-semibold text-blue hover:bg-bgtint"
            >
              <PinTo width={16} height={16} className="shrink-0" />
              Pick exact spot on map
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
      {picking && (
        <PinPicker
          initial={{ lat: 28.6139, lng: 77.209 }}
          onCancel={() => setPicking(false)}
          onPick={(spot) => {
            skipRef.current = true;
            onChange(spot.address, { lat: spot.lat, lng: spot.lng });
            setPreds([]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
