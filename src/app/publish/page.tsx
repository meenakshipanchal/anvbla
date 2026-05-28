import PublishForm from "./PublishForm";
import { getCurrentUser } from "@/lib/session";
import { listRidesByDriver } from "@/lib/rides";

export const metadata = { title: "Publish a ride" };
// Always fetch the latest published ride for the prefill prompt.
export const dynamic = "force-dynamic";

/* Publish flow runs as a step-by-step wizard. The page wrapper stays minimal
   on purpose so the active step is the only thing in view — same idea as
   BlaBlaCar's mobile flow. */
export default async function PublishPage() {
  const user = await getCurrentUser();

  // Pull the user's most recently published ride from Firestore so the
  // "Republish last ride?" prompt works even on a fresh device / cleared
  // localStorage. PublishForm itself still prefers a localStorage snapshot
  // when present (newer + per-device); this is the cross-device fallback.
  const serverLastRide = await (async () => {
    if (!user) return null;
    const mine = await listRidesByDriver(user.uid);
    if (mine.length === 0) return null;
    const r = [...mine].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    return {
      from: r.from ?? "",
      to: r.to ?? "",
      time: r.dep ?? "",
      arr: r.arr ?? "",
      seats: String(r.seats ?? ""),
      price: String(r.price ?? ""),
      note: r.note ?? "",
      // The wizard splits notes into a main + extra field at submit time and
      // joins them with a newline. We can't split them back reliably, so
      // dump everything into note and leave extra blank.
      extra: "",
      car: r.car ?? "",
      plate: r.plate ?? "",
      stops: r.stops != null ? String(r.stops) : "",
      routeVia: r.routeVia ?? "",
      vehicle: (r.vehicle === "auto" ? "auto" : "car") as "car" | "auto",
      amenities: {
        instant: !!r.instant,
        ac: !!r.ac,
        music: !!r.music,
        pets: !!r.pets,
        maxTwo: !!r.maxTwo,
        womenOnly: !!r.womenOnly,
        lgbtq: !!r.lgbtq,
      },
    };
  })();

  return (
    <div className="pb-10">
      <header className="border-b border-line bg-white py-4">
        <div className="wrap">
          <h1 className="font-bold">Publish a ride</h1>
        </div>
      </header>
      <PublishForm serverLastRide={serverLastRide} />
    </div>
  );
}
