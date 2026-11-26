import "server-only";
import { fetchOverview, fetchSeries, type CompanyOverview } from "./alphavantage";
import type { PricePoint, RangeSource } from "./series";
import { fetchNews, type NewsArticle } from "./tavily";

const HOUR = 3_600_000;

/** One persisted upstream resource: where it is stored, how long it stays fresh, and how to fetch it. */
export interface Source<T> {
  key: string;
  maxAgeMs: number;
  load: () => Promise<T>;
}

export function seriesSource(symbol: string, source: RangeSource): Source<PricePoint[]> {
  return { key: `${source}/${symbol}`, maxAgeMs: 12 * HOUR, load: () => fetchSeries(symbol, source) };
}

/** Fundamentals move slowly; a week-old overview is fine and saves quota for prices. */
export function overviewSource(symbol: string): Source<CompanyOverview> {
  return { key: `overview/${symbol}`, maxAgeMs: 7 * 24 * HOUR, load: () => fetchOverview(symbol) };
}

export function newsSource(symbol: string, companyName: string): Source<NewsArticle[]> {
  return { key: `news/${symbol}`, maxAgeMs: 6 * HOUR, load: () => fetchNews(symbol, companyName) };
}
