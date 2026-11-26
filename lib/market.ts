import "server-only";
import { cacheLife } from "next/cache";
import { fetchSymbolSearch, SymbolNotFoundError, type CompanyOverview, type SymbolMatch } from "./alphavantage";
import { staleWhileRevalidate, type Cached } from "./file-cache";
import { changeBetween, rangeChange, sliceRange, LIST_RANGE, type Change, type PricePoint, type RangeSource } from "./series";
import { newsSource, overviewSource, seriesSource } from "./sources";
import type { NewsArticle } from "./tavily";
import type { WatchlistEntry } from "./watchlist";

export type Loaded<T> = ({ status: "ok" } & Cached<T>) | { status: "not-found" } | { status: "unavailable" };

/**
 * Turn a load into a result value instead of a throw, and pick the cache lifetime from the outcome:
 * successes stay cached for hours, failures only for minutes so a recovered quota is noticed quickly.
 * Kept in one helper (rather than repeated in each "use cache" function) so every source shares the policy;
 * it must only be called from inside a "use cache" function.
 */
async function settle<T>(load: Promise<Cached<T>>): Promise<Loaded<T>> {
  try {
    const entry = await load;
    cacheLife("hours");
    return { status: "ok", ...entry };
  } catch (error) {
    cacheLife("minutes");
    return { status: error instanceof SymbolNotFoundError ? "not-found" : "unavailable" };
  }
}

export async function getSeries(symbol: string, source: RangeSource): Promise<Loaded<PricePoint[]>> {
  "use cache";
  return settle(staleWhileRevalidate(seriesSource(symbol, source)));
}

export async function getOverview(symbol: string): Promise<Loaded<CompanyOverview>> {
  "use cache";
  return settle(staleWhileRevalidate(overviewSource(symbol)));
}

export async function getNews(symbol: string, companyName: string): Promise<Loaded<NewsArticle[]>> {
  "use cache";
  return settle(staleWhileRevalidate(newsSource(symbol, companyName)));
}

export async function searchSymbols(keywords: string): Promise<Loaded<SymbolMatch[]>> {
  "use cache";
  return settle(fetchSymbolSearch(keywords).then((data) => ({ data, fetchedAt: new Date().toISOString() })));
}

export interface QuoteSummary extends WatchlistEntry {
  price: number;
  dayChange: Change;
  /** Closes over LIST_RANGE, oldest first; the list's sparkline, pill and colors all describe this one period. */
  periodCloses: number[];
  periodChange: Change;
}

export async function getQuoteSummary(entry: WatchlistEntry): Promise<Loaded<QuoteSummary>> {
  const series = await getSeries(entry.symbol, "daily");
  if (series.status !== "ok") return series;
  if (series.data.length < 2) return { status: "unavailable" };

  const [previous, latest] = series.data.slice(-2);
  const periodPoints = sliceRange(series.data, LIST_RANGE);
  return {
    status: "ok",
    fetchedAt: series.fetchedAt,
    data: {
      ...entry,
      price: latest.close,
      dayChange: changeBetween(previous.close, latest.close),
      periodCloses: periodPoints.map((point) => point.close),
      periodChange: rangeChange(periodPoints),
    },
  };
}
