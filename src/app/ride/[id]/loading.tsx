/* Instant skeleton while the ride detail page fetches its row + bookings +
   reviews. Matches the real layout so the swap-in is barely noticeable. */
export default function Loading() {
  return (
    <div className="wrap">
      <div className="mt-4 h-14 animate-pulse rounded-xl bg-bgsoft" />
      <div className="grid gap-7 pb-16 pt-4 md:grid-cols-[1fr_360px]">
        <div>
          <div className="card mb-4 h-44 animate-pulse bg-bgsoft p-4" />
          <div className="card mb-4 h-32 animate-pulse bg-bgsoft p-4" />
          <div className="card h-40 animate-pulse bg-bgsoft p-6" />
        </div>
        <div className="card h-72 animate-pulse bg-bgsoft p-6" />
      </div>
    </div>
  );
}
