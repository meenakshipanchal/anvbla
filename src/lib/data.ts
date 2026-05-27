/* Shared types, city list, helpers and FAQ content for BlaBlue.
   All ride data is real and lives in Firestore (see src/lib/rides.ts). */

export type Ride = {
  id: string;
  from: string;
  fromSpot: string;
  to: string;
  toSpot: string;
  dep: string;
  arr: string;
  dur: string;
  price: number;
  seats: number;
  driver: string;
  rating: number;
  trips: number;
  car: string;
  plate?: string;
  stops?: number | null;
  routeVia?: string; // free-text route the driver plans to take (e.g. "via NH8, Manesar")
  vehicle?: "car" | "auto"; // chosen vehicle type — drives the icon shown on tiles
  instant: boolean;
  verified: boolean;
  maxTwo: boolean;
  ac: boolean;
  music: boolean;
  pets: boolean;
  smoking: boolean;
  womenOnly?: boolean;
  lgbtq?: boolean;
  date: string;
  // Set on real, user-published rides:
  driverId?: string;
  note?: string;
  createdAt?: number;
  // Coordinates (geocoded at publish) — power the route map + future matching.
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  // Driver marks the trip done once they reach the destination; unlocks reviews.
  completed?: boolean;
};

export const CITIES = [
  "Delhi", "Gurgaon", "Noida", "Jaipur", "Agra", "Chandigarh", "Lucknow",
  "Mumbai", "Pune", "Nashik", "Ahmedabad", "Surat", "Bangalore", "Mysore",
  "Chennai", "Coimbatore", "Hyderabad", "Vijayawada", "Kolkata", "Bhubaneswar",
  "Indore", "Bhopal", "Nagpur", "Kochi", "Goa", "Dehradun", "Amritsar", "Ludhiana",
];

const AVATAR_COLORS = ["#0071eb", "#054752", "#0a5d6b", "#2d8fbf", "#3c7a14", "#b5641e", "#7a3cb5"];

export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function rupees(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export const FAQS = [
  { q: "How do I book a carpool ride?", a: "Search your route and travel date, pick a ride that suits you, then request to book. Rides marked “Instant” confirm right away; others need a quick approval from the driver before your seat is locked in." },
  { q: "How much does carpooling cost?", a: "Drivers set a fair price per seat that simply helps cover fuel and tolls. You’ll always see the full price up front — no surprises at drop-off." },
  { q: "Is it safe to travel with strangers?", a: "Every member can verify their profile, phone and ID. Ratings and reviews from past trips, plus our member support team, help you ride with confidence." },
  { q: "Can I offer a ride and earn?", a: "Yes. If you’re driving anyway, publish your trip, set your seats and price, and share costs with passengers heading the same way." },
  { q: "What if my plans change?", a: "You can cancel from your bookings. Depending on how close it is to departure, you may receive a full or partial refund per our cancellation policy." },
];
