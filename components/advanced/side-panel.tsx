"use client";

import { useCallback } from "react";
import type { CompanyOverview } from "@/lib/alphavantage";
import { formatCompact, formatDate, formatPrice, formatSigned } from "@/lib/format";
import { averageVolume, type Change, type PricePoint } from "@/lib/series";
import { trendText } from "@/lib/trend";
import type { WatchlistEntry } from "@/lib/watchlist";
import { Logo } from "../logo";
import { StockLink } from "../stock-link";

export interface WatchlistQuote extends WatchlistEntry {
  price?: number;
  dayChange?: Change;
}

/** TradingView-style watchlist table (last price and today's move). */
export function WatchlistTable({ quotes }: { quotes: WatchlistQuote[] }) {
  // Bring the open symbol's row into view (it is marked aria-current by StockLink).
  const scrollActiveIntoView = useCallback((list: HTMLUListElement | null) => {
    list?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <section aria-label="Watchlist" className="flex min-h-0 flex-col">
      <h2 className="px-4 pt-3 pb-2 text-sm font-semibold">Watchlist</h2>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 pb-1.5 text-[11px] text-muted">
        <span>Symbol</span>
        <span className="w-16 text-right">Last</span>
        <span className="w-12 text-right">Chg</span>
        <span className="w-14 text-right">Chg%</span>
      </div>
      <ul ref={scrollActiveIntoView} className="tabular min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-2 text-[13px]">
        {quotes.map((quote) => (
          <li key={quote.symbol}>
            <StockLink
              symbol={quote.symbol}
              className="grid h-9 grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 rounded-lg px-2.5 ring-inset transition-colors duration-100 hover:bg-white/[0.05]"
              activeClassName="bg-white/[0.06] ring-1 ring-azure/70"
            >
              <span className="truncate font-semibold">{quote.symbol}</span>
              <span className="w-16 text-right">{quote.price === undefined ? "—" : formatPrice(quote.price)}</span>
              <span className={`w-12 text-right ${quote.dayChange ? trendText(quote.dayChange) : "text-muted"}`}>
                {quote.dayChange ? formatSigned(quote.dayChange.amount) : "—"}
              </span>
              <span className={`w-14 text-right ${quote.dayChange ? trendText(quote.dayChange) : "text-muted"}`}>
                {quote.dayChange ? formatSigned(quote.dayChange.percent, "%") : "—"}
              </span>
            </StockLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface DetailsCardProps {
  symbol: string;
  entry?: WatchlistEntry;
  overview?: CompanyOverview;
  daily: PricePoint[];
  dayChange?: Change;
}

/** Selected-symbol card: identity, last close, volume vs. average and where the price sits in its 52-week range. */
export function DetailsCard({ symbol, entry, overview, daily, dayChange }: DetailsCardProps) {
  const latest = daily.at(-1);
  const avgVolume = averageVolume(daily);
  const classification = [overview?.sector, overview?.industry].filter(Boolean).join(" · ");
  const stats: [string, string | undefined][] = [
    ["Market cap", overview?.marketCap === undefined ? undefined : formatCompact(overview.marketCap)],
    ["P/E", overview?.peRatio === undefined ? undefined : formatPrice(overview.peRatio)],
    ["EPS", overview?.eps === undefined ? undefined : formatPrice(overview.eps)],
    ["Beta", overview?.beta === undefined ? undefined : formatPrice(overview.beta)],
    ["Yield", overview?.dividendYield === undefined ? undefined : `${formatPrice(overview.dividendYield * 100)}%`],
  ];

  return (
    <section aria-label={`${symbol} details`} className="space-y-4 px-4 pt-4 pb-5">
      <div className="flex items-center gap-3">
        <Logo symbol={symbol} light={entry?.lightLogo} />
        <div className="min-w-0">
          <p className="font-display text-lg font-medium tracking-tight">{symbol}</p>
          <p className="truncate text-xs text-muted">
            {overview?.name ?? entry?.name ?? symbol}
            {overview?.exchange && ` · ${overview.exchange}`}
          </p>
        </div>
      </div>
      {classification && <p className="text-xs text-muted">{classification}</p>}

      {latest && (
        <div>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="tabular font-display text-3xl font-medium tracking-tight">{formatPrice(latest.close)}</span>
            <span className="text-xs text-muted">{overview?.currency ?? "USD"}</span>
            {dayChange && (
              <span className={`tabular text-sm font-semibold ${trendText(dayChange)}`}>
                {formatSigned(dayChange.amount)} {formatSigned(dayChange.percent, "%")}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">At close · {formatDate(latest.date)}</p>
        </div>
      )}

      {latest && avgVolume !== undefined && (
        <Meter
          label="Volume"
          value={formatCompact(latest.volume)}
          rightLabel="Avg volume"
          rightValue={formatCompact(avgVolume)}
          ratio={latest.volume / (latest.volume + avgVolume)}
        />
      )}
      {latest && overview?.week52Low !== undefined && overview.week52High !== undefined && (
        <Meter
          label="52W low"
          value={formatPrice(overview.week52Low)}
          rightLabel="52W high"
          rightValue={formatPrice(overview.week52High)}
          ratio={(latest.close - overview.week52Low) / (overview.week52High - overview.week52Low || 1)}
          marker
        />
      )}

      <dl className="tabular grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {stats
          .filter((stat): stat is [string, string] => stat[1] !== undefined)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

interface MeterProps {
  label: string;
  value: string;
  rightLabel: string;
  rightValue: string;
  /** 0–1: split point of a two-tone bar, or the marker position when `marker` is set. */
  ratio: number;
  marker?: boolean;
}

function Meter({ label, value, rightLabel, rightValue, ratio, marker = false }: MeterProps) {
  const percent = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
  return (
    <div className="tabular text-xs">
      <div className="flex justify-between text-muted">
        <span>{label}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>{value}</span>
        <span>{rightValue}</span>
      </div>
      <div className="relative mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-white/10">
        {marker ? (
          <span className="absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full bg-azure" style={{ left: percent }} />
        ) : (
          <>
            <span className="h-full bg-blue" style={{ width: percent }} />
            <span className="h-full flex-1 bg-azure/50" />
          </>
        )}
      </div>
    </div>
  );
}
