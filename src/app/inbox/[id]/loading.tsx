/* Instant chat skeleton — paints the moment the user taps a thread so
   navigation feels native, while the server fetches the thread + messages
   in the background. Matches the real layout so the swap is barely
   noticeable. */
export default function Loading() {
  return (
    <div className="wrap max-w-[760px] py-6 md:py-10">
      <div className="mb-3 h-4 w-20 animate-pulse rounded bg-bgsoft" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="h-6 w-40 animate-pulse rounded bg-bgsoft" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-bgsoft" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-bgsoft" />
      </div>
      <div className="flex h-[60vh] flex-col rounded-2xl border border-line bg-white">
        <div className="flex-1 space-y-3 overflow-hidden p-4">
          {[
            { mine: false, w: "60%" },
            { mine: true, w: "45%" },
            { mine: false, w: "70%" },
            { mine: true, w: "30%" },
            { mine: false, w: "55%" },
          ].map((b, i) => (
            <div key={i} className={`flex ${b.mine ? "justify-end" : "justify-start"}`}>
              <div className="h-9 animate-pulse rounded-2xl bg-bgsoft" style={{ width: b.w }} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-line p-3">
          <div className="h-10 flex-1 animate-pulse rounded-full bg-bgsoft" />
          <div className="h-10 w-16 animate-pulse rounded-full bg-bgsoft" />
        </div>
      </div>
    </div>
  );
}
