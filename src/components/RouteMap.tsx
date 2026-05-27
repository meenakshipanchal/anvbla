"use client";

import dynamic from "next/dynamic";

/* Leaflet touches `window` at module load, so the actual map must be
   client-only. next/dynamic with ssr:false is only valid inside a client
   component (Next 16 rule), hence this thin wrapper. */
const RouteMapInner = dynamic(() => import("./RouteMapInner"), {
  ssr: false,
  loading: () => (
    <div className="grid w-full place-items-center bg-bgsoft text-muted" style={{ aspectRatio: "16 / 9" }}>
      Loading map…
    </div>
  ),
});

export default function RouteMap({
  fromLat,
  fromLng,
  toLat,
  toLng,
}: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}) {
  return <RouteMapInner from={[fromLat, fromLng]} to={[toLat, toLng]} />;
}
