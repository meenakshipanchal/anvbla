/* Shown instantly when the user taps Search — page shell renders without
   waiting on the Firestore collection-group query. Real results swap in
   when the server stream finishes. */
export default function Loading() {
  return (
    <>
      <div className="bg-sherpa py-4">
        <div className="wrap">
          <div className="h-12 animate-pulse rounded-2xl bg-white/30" />
        </div>
      </div>
      <div className="wrap">
        <div className="grid gap-7 py-8 md:grid-cols-[280px_1fr]">
          <aside className="card hidden h-fit self-start p-5 md:block">
            <div className="h-5 w-20 animate-pulse rounded bg-bgsoft" />
            <div className="mt-4 grid gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-bgsoft" />
              ))}
            </div>
          </aside>
          <main>
            <div className="mb-5 h-6 w-48 animate-pulse rounded bg-bgsoft" />
            <div className="mb-4 h-11 w-full animate-pulse rounded-xl bg-bgsoft" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card h-40 animate-pulse bg-bgsoft" />
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
