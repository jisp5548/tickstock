import { Suspense } from "react";
import { formatDate } from "@/lib/format";
import { getSeries } from "@/lib/market";
import { LIST_RANGE } from "@/lib/series";
import { WATCHLIST } from "@/lib/watchlist";
import { WatchlistRow, WatchlistRowSkeleton } from "./quote-views";
import { PillModeToggle, SearchTrigger, SnapshotBadge } from "./sidebar-controls";

/** The stock list: the whole homepage on phones, a persistent left panel on larger screens. */
export function Sidebar() {
  return (
    <aside className="flex flex-col pt-[env(safe-area-inset-top)] md:sticky md:top-0 md:h-dvh md:w-[22rem] md:shrink-0 md:border-r md:border-rule">
      <header className="space-y-4 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight">Tickstock</h1>
            <p className="text-sm text-muted">{LIST_RANGE.label} performance</p>
          </div>
          <PillModeToggle />
        </div>
        <SearchTrigger />
      </header>
      <ul className="flex-1 px-2 md:overflow-y-auto md:overscroll-contain">
        {WATCHLIST.map((entry, index) => (
          <Suspense key={entry.symbol} fallback={<WatchlistRowSkeleton />}>
            <WatchlistRow entry={entry} index={index} />
          </Suspense>
        ))}
      </ul>
      <footer className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted">
        <Suspense fallback={<span className="skeleton inline-block h-3 w-32 rounded" />}>
          <DataFreshness />
        </Suspense>
        <p>Prices: Alpha Vantage · News: Tavily · Logos &amp; profiles: FMP</p>
      </footer>
    </aside>
  );
}

/** When prices are from the committed snapshot (API quota spent), say so rather than passing them off as live. */
async function DataFreshness() {
  const series = await getSeries(WATCHLIST[0].symbol, "daily");
  if (series.status !== "ok") return <p>Prices unavailable right now</p>;
  const latest = series.data.at(-1);
  return (
    <p>
      Prices as of {latest ? formatDate(latest.date) : "—"}
      <SnapshotBadge fetchedAt={series.fetchedAt} />
    </p>
  );
}
