# BlaBlue 🚗💙

An **installable PWA** carpooling web app for India — an original, BlaBlaCar-inspired replica built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4**.

> Not affiliated with BlaBlaCar. All code, copy, the logo, icons and data are original; only the general layout, feature set and brand-style palette take inspiration from blablacar.in.

## Features

- **Home** — hero search, value props, popular routes, "how it works", stats, app section, FAQ accordion.
- **Search results** (`/search`) — server-rendered ride list with route/seat matching, live client-side filters (instant booking, verified, amenities, departure time) and sorting.
- **Ride detail** (`/ride/[id]`) — itinerary, driver, comfort/amenities, and a booking widget with seat picker + instant/request flow.
- **Publish a ride** (`/publish`) — driver form with a live earnings preview.
- **PWA** — installable (`manifest.webmanifest` + maskable icons), `beforeinstallprompt` install banner, a service worker (`public/sw.js`) with app-shell caching, and an offline fallback page.

## Run it

```bash
npm install      # first time only (deps already installed by scaffold)
npm run dev      # http://localhost:3000  (dev)
# or, to test the real PWA / service worker:
npm run build && npm run start
```

> The service worker only fully kicks in over `next start` (production) or HTTPS. In Chrome, open **DevTools → Application** to see the manifest, install the app, and test offline mode.

## Project layout

```
src/
  app/            # routes: / , /search , /ride/[id] , /publish
  components/     # Header, Footer, SearchCard, RideCard, BookingWidget, Faq, Icons, PwaProvider
  lib/            # data.ts (cities/rides/routes/faqs + helpers), toast.ts
public/
  manifest.webmanifest, sw.js, offline.html, icons/
scripts/make-icons.mjs   # regenerates PWA icons (needs `sharp`)
```

## Notes

- Rides, drivers and routes are **mock data** in `src/lib/data.ts`. Booking/publishing show a toast (no backend).
- Brand palette (in `globals.css`): signature blue `#0071eb`, highlighter blue `#2dbeff`, new green `#9ef769`, sherpa teal `#054752`.
