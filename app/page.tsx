import { Suspense } from "react";
import { QuoteTile, QuoteTileSkeleton } from "@/components/quote-views";
import { WATCHLIST } from "@/lib/watchlist";

/** Desktop overview grid. On phones the sidebar list is the homepage, as in Apple Stocks, so this is hidden. */
export default function HomePage() {
  return (
    <section className="px-8 py-10 max-md:hidden">
      <p className="text-sm text-muted">Watchlist · past-month performance</p>
      <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">Market overview</h2>
      <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
        {WATCHLIST.map((entry, index) => (
          <Suspense key={entry.symbol} fallback={<QuoteTileSkeleton />}>
            <QuoteTile entry={entry} index={index} />
          </Suspense>
        ))}
      </ul>
    </section>
  );
}
