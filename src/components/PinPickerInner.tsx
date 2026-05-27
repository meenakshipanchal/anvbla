"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

function pinIcon() {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
       <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.16 24.84 0 16 0z" fill="#0071eb"/>
       <circle cx="16" cy="16" r="6" fill="#fff"/>
     </svg>`
  );
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}

function PanTo({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 16), { duration: 0.4 });
  }, [map, center]);
  return null;
}

/* Leaflet measures its container at init; inside a centered modal that size
   isn't final yet, so tiles never load. Force a re-measure once the dialog
   has settled, and again on window resize. */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const ticks = [50, 200, 500].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      ticks.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

function TapToMove({ onMove }: { onMove: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMove({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PinPickerInner({
  initial,
  onPick,
  onCancel,
}: {
  initial: LatLng;
  onPick: (p: LatLng, address: string) => void;
  onCancel: () => void;
}) {
  const [pos, setPos] = useState<LatLng>(initial);
  const [address, setAddress] = useState<string>("Locating…");
  const [busy, setBusy] = useState(false);
  const seqRef = useRef(0);

  // On open, jump to the user's actual GPS location — Gurgaon, Goa, wherever
  // they are right now — instead of the generic India fallback the parent
  // passes as `initial`. Silently no-ops if permission is denied/unavailable.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    setBusy(true);
    const id = navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    return () => {
      // getCurrentPosition has no canceller; the callback ignores stale resolves
      // because the component would already be unmounted.
      void id;
    };
  }, []);

  useEffect(() => {
    const seq = ++seqRef.current;
    setAddress("Looking up address…");
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places/reverse?lat=${pos.lat}&lng=${pos.lng}`);
        const d = await r.json();
        if (seq === seqRef.current) setAddress(d.place || "Unknown location");
      } catch {
        if (seq === seqRef.current) setAddress("Couldn’t resolve address");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [pos]);

  async function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setBusy(true);
    try {
      const p = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
    } catch {
      /* user denied / unavailable */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 grid place-items-center bg-black/50 p-3 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lg)]"
        style={{ maxHeight: "min(85vh, 640px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-bgsoft"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="font-semibold">Pick exact spot</div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={busy}
              className="rounded-full bg-bgtint px-3 py-1.5 font-semibold text-blue disabled:opacity-60"
            >
              {busy ? "Locating…" : "Use my location"}
            </button>
          </div>
        </div>

        <div className="relative" style={{ height: 360 }}>
          <MapContainer center={[pos.lat, pos.lng]} zoom={16} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={[pos.lat, pos.lng]}
              icon={pinIcon()}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  setPos({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
            <TapToMove onMove={setPos} />
            <PanTo center={pos} />
            <InvalidateSize />
          </MapContainer>
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-white">
            Tap or drag the pin
          </div>
        </div>

        <div className="border-t border-line p-3">
          <div className="nav-label mb-1 font-semibold text-muted">PRECISE ADDRESS</div>
          <div className="mb-3 font-semibold break-words">{address}</div>
          <button
            type="button"
            onClick={() => onPick(pos, address)}
            className="btn btn-primary w-full"
          >
            Confirm this spot
          </button>
        </div>
      </div>
    </div>
  );
}
