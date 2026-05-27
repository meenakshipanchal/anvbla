/* Shown instantly on navigation to /trips while the server fetches bookings.
   Pulse skeleton matches the real card shape so the swap is barely visible. */
export default function Loading() {
  return (
    <div className="wrap py-12 md:py-16">
      <div className="h-6 w-32 animate-pulse rounded bg-bgsoft" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-bgsoft" />
      <div className="mt-6 h-5 w-40 animate-pulse rounded bg-bgsoft" />
      <div className="mt-4 grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-bgsoft" />
        ))}
      </div>
    </div>
  );
}
