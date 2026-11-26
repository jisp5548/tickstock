import { formatPrice } from "@/lib/format";
import { getQuoteSummary } from "@/lib/market";
import { LIST_RANGE } from "@/lib/series";
import { formatChange, isPositive, trendText } from "@/lib/trend";
import type { WatchlistEntry } from "@/lib/watchlist";
import { ChangePill } from "./change-pill";
import { Logo } from "./logo";
import { Sparkline } from "./sparkline";
import { staggerDelay } from "./stagger";
import { StockLink } from "./stock-link";

interface QuoteViewProps {
  entry: WatchlistEntry;
  index: number;
}

export async function WatchlistRow({ entry, index }: QuoteViewProps) {
  const quote = await getQuoteSummary(entry);
  return (
    <li className="animate-row-in" style={staggerDelay(index)}>
      <StockLink
        symbol={entry.symbol}
        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-[background-color,scale] duration-150 ease-out hover:bg-white/[0.04] active:scale-[0.98]"
        activeClassName="bg-raised hover:bg-raised"
      >
        <Logo symbol={entry.symbol} light={entry.lightLogo} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-tight">{entry.symbol}</span>
          <span className="block truncate text-xs text-muted">{entry.name}</span>
        </span>
        {quote.status === "ok" ? (
          <>
            <Sparkline
              values={quote.data.periodCloses}
              positive={isPositive(quote.data.periodChange)}
              className="h-8 w-[4.5rem] shrink-0"
            />
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="tabular text-sm font-semibold">{formatPrice(quote.data.price)}</span>
              <ChangePill change={quote.data.periodChange} />
            </span>
          </>
        ) : (
          <span className="text-xs text-muted">No data</span>
        )}
      </StockLink>
    </li>
  );
}

export function WatchlistRowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5" aria-hidden>
      <span className="skeleton size-9 rounded-[10px]" />
      <span className="flex-1 space-y-1.5">
        <span className="skeleton block h-3.5 w-12 rounded" />
        <span className="skeleton block h-3 w-24 rounded" />
      </span>
      <span className="skeleton h-6 w-[4.5rem] rounded" />
      <span className="space-y-1.5">
        <span className="skeleton block h-3.5 w-16 rounded" />
        <span className="skeleton block h-5 w-[4.75rem] rounded-md" />
      </span>
    </li>
  );
}

export async function QuoteTile({ entry, index }: QuoteViewProps) {
  const quote = await getQuoteSummary(entry);
  return (
    <li className="animate-row-in" style={staggerDelay(index, 25)}>
      <StockLink
        symbol={entry.symbol}
        className="squircle flex h-full flex-col gap-4 rounded-2xl bg-panel p-4 ring-1 ring-white/[0.06] transition-[background-color,scale,box-shadow] duration-150 ease-out [--radius:16px] hover:bg-raised hover:ring-white/10 active:scale-[0.98]"
      >
        <span className="flex items-center gap-3">
          <Logo symbol={entry.symbol} light={entry.lightLogo} size="md" morph />
          <span className="min-w-0">
            <span className="block font-semibold tracking-tight">{entry.symbol}</span>
            <span className="block truncate text-xs text-muted">{entry.name}</span>
          </span>
        </span>
        {quote.status === "ok" ? (
          <>
            <span className="flex items-end justify-between gap-2">
              <span className="tabular font-display text-2xl font-medium tracking-tight">{formatPrice(quote.data.price)}</span>
              <ChangePill change={quote.data.periodChange} />
            </span>
            <Sparkline
              values={quote.data.periodCloses}
              positive={isPositive(quote.data.periodChange)}
              className="h-14 w-full"
            />
            <span className="flex justify-between text-xs text-muted">
              <span>{LIST_RANGE.label}</span>
              <span className="tabular">
                Today <span className={trendText(quote.data.dayChange)}>{formatChange(quote.data.dayChange, "percent")}</span>
              </span>
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">Prices unavailable right now.</span>
        )}
      </StockLink>
    </li>
  );
}

export function QuoteTileSkeleton() {
  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-panel p-4" aria-hidden>
      <span className="flex items-center gap-3">
        <span className="skeleton size-11 rounded-xl" />
        <span className="space-y-1.5">
          <span className="skeleton block h-3.5 w-12 rounded" />
          <span className="skeleton block h-3 w-24 rounded" />
        </span>
      </span>
      <span className="skeleton h-7 w-28 rounded" />
      <span className="skeleton h-14 w-full rounded" />
    </li>
  );
}
