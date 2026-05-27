"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

function pinIcon(color: string) {
  // Inline SVG marker — avoids leaflet's default-icon webpack quirk.
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
       <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
       <circle cx="14" cy="14" r="5" fill="#fff"/>
     </svg>`
  );
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

function FitBounds({ path }: { path: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (path.length < 2) return;
    map.fitBounds(L.latLngBounds(path), { padding: [32, 32] });
  }, [map, path]);
  return null;
}

export default function RouteMapInner({
  from,
  to,
}: {
  from: LatLng;
  to: LatLng;
}) {
  const [path, setPath] = useState<LatLng[]>([from, to]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/route?flat=${from[0]}&flng=${from[1]}&tlat=${to[0]}&tlng=${to[1]}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { path?: LatLng[] } | null) => {
        if (!cancelled && d?.path && d.path.length > 1) setPath(d.path);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <MapContainer
      center={from}
      zoom={11}
      scrollWheelZoom={false}
      style={{ width: "100%", aspectRatio: "16 / 9" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={path} pathOptions={{ color: "#0071eb", weight: 5, opacity: 0.85 }} />
      <Marker position={from} icon={pinIcon("#0071eb")} />
      <Marker position={to} icon={pinIcon("#054752")} />
      <FitBounds path={path} />
    </MapContainer>
  );
}
