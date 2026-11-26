import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PriceChart } from "@/components/stock/price-chart";
import { PriceHistory } from "@/components/stock/price-history";
import { CompanyProfile, KeyStats, News, NewsSkeleton, SectionHeading, StockHeader } from "@/components/stock/sections";
import { getOverview, getSeries } from "@/lib/market";
import { withDailyChange, type PricePoint } from "@/lib/series";
import { findWatchlistEntry, WATCHLIST } from "@/lib/watchlist";

const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,12}$/;

export function generateStaticParams() {
  return WATCHLIST.map(({ symbol }) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps<"/stock/[symbol]">): Promise<Metadata> {
  return { title: decodeURIComponent((await params).symbol).toUpperCase() };
}

/** Only date and close cross to the client chart; full OHLCV stays on the server. */
function toClosePoints(points: PricePoint[]) {
  return points.map(({ date, close }) => ({ date, close }));
}

export default async function StockPage({ params }: PageProps<"/stock/[symbol]">) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) notFound();

  const [daily, weekly, overviewResult] = await Promise.all([
    getSeries(symbol, "daily"),
    getSeries(symbol, "weekly"),
    getOverview(symbol),
  ]);
  if (daily.status === "not-found") notFound();

  const dailyPoints = daily.status === "ok" ? daily.data : [];
  const weeklyPoints = weekly.status === "ok" ? weekly.data : [];
  // ETFs and some listings have prices but no OVERVIEW; the page still renders with "N/A" fields.
  const overview = overviewResult.status === "ok" ? overviewResult.data : undefined;
  const entry = findWatchlistEntry(symbol);

  return (
    <>
      <StockHeader symbol={symbol} entry={entry} overview={overview} />
      <PriceChart daily={toClosePoints(dailyPoints)} weekly={toClosePoints(weeklyPoints)} />
      <KeyStats daily={dailyPoints} weekly={weeklyPoints} overview={overview} />
      <Suspense fallback={<NewsSkeleton />}>
        <News symbol={symbol} companyName={overview?.name ?? entry?.name ?? symbol} />
      </Suspense>
      <CompanyProfile symbol={symbol} overview={overview} />
      <section>
        <SectionHeading>Historical prices</SectionHeading>
        <PriceHistory
          rows={withDailyChange(dailyPoints)
            .map(({ date, close, volume, change }) => ({ date, close, volume, change }))
            .reverse()}
        />
      </section>
    </>
  );
}
