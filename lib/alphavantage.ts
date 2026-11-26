import "server-only";
import type { PricePoint, RangeSource } from "./series";

const BASE_URL = "https://www.alphavantage.co/query";
/** The free tier rejects bursts; spacing calls keeps a cold homepage from tripping the limit. */
const MIN_GAP_MS = 1_100;

/** The API is unreachable for now (no key, daily quota spent, burst limit). Callers fall back to cached data. */
export class UpstreamUnavailableError extends Error {}
export class SymbolNotFoundError extends Error {}

let queue: Promise<unknown> = Promise.resolve();

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined).then(() => new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS)));
  return run;
}

async function query(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) throw new UpstreamUnavailableError("ALPHAVANTAGE_API_KEY is not set");

  const url = `${BASE_URL}?${new URLSearchParams({ ...params, apikey: apiKey })}`;
  const body = await throttled(async () => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new UpstreamUnavailableError(`AlphaVantage responded ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  });

  // Rate limits and premium-only notices arrive as HTTP 200 with a single message field.
  const notice = body.Information ?? body.Note;
  if (typeof notice === "string") throw new UpstreamUnavailableError(notice);
  if (typeof body["Error Message"] === "string") throw new SymbolNotFoundError(params.symbol);
  return body;
}

const SERIES_REQUEST = {
  daily: { function: "TIME_SERIES_DAILY", key: "Time Series (Daily)" },
  weekly: { function: "TIME_SERIES_WEEKLY", key: "Weekly Time Series" },
} as const satisfies Record<RangeSource, { function: string; key: string }>;

type RawBar = Record<"1. open" | "2. high" | "3. low" | "4. close" | "5. volume", string>;

export async function fetchSeries(symbol: string, source: RangeSource): Promise<PricePoint[]> {
  const request = SERIES_REQUEST[source];
  const body = await query({ function: request.function, symbol });
  const bars = (body[request.key] ?? {}) as Record<string, RawBar>;
  return Object.entries(bars)
    .map(([date, bar]) => ({
      date,
      open: Number(bar["1. open"]),
      high: Number(bar["2. high"]),
      low: Number(bar["3. low"]),
      close: Number(bar["4. close"]),
      volume: Number(bar["5. volume"]),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface CompanyOverview {
  symbol: string;
  /** Who supplied the profile. Older snapshot entries predate this field and are AlphaVantage's. */
  provider?: "Alpha Vantage" | "Financial Modeling Prep";
  assetType?: string;
  name?: string;
  description?: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  beta?: number;
  dividendYield?: number;
  week52High?: number;
  week52Low?: number;
}

const MISSING_VALUES = new Set(["", "None", "-", "N/A"]);

function text(value: string | undefined): string | undefined {
  return value === undefined || MISSING_VALUES.has(value) ? undefined : value;
}

function num(value: string | undefined): number | undefined {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Sector and industry arrive in all caps ("INFORMATION TECHNOLOGY SERVICES"). */
function titleCase(value: string | undefined): string | undefined {
  return text(value)?.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function fetchOverview(symbol: string): Promise<CompanyOverview> {
  const raw = (await query({ function: "OVERVIEW", symbol })) as Record<string, string>;
  // Unknown symbols return an empty object rather than an error message.
  if (!raw.Symbol) throw new SymbolNotFoundError(symbol);
  return {
    symbol: raw.Symbol,
    provider: "Alpha Vantage",
    assetType: text(raw.AssetType),
    name: text(raw.Name),
    description: text(raw.Description),
    exchange: text(raw.Exchange),
    currency: text(raw.Currency),
    sector: titleCase(raw.Sector),
    industry: titleCase(raw.Industry),
    marketCap: num(raw.MarketCapitalization),
    peRatio: num(raw.PERatio),
    eps: num(raw.EPS),
    beta: num(raw.Beta),
    dividendYield: num(raw.DividendYield),
    week52High: num(raw["52WeekHigh"]),
    week52Low: num(raw["52WeekLow"]),
  };
}

export interface SymbolMatch {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

export async function fetchSymbolSearch(keywords: string): Promise<SymbolMatch[]> {
  const body = await query({ function: "SYMBOL_SEARCH", keywords });
  const matches = (body.bestMatches ?? []) as Record<string, string>[];
  return matches.map((match) => ({
    symbol: match["1. symbol"],
    name: match["2. name"],
    type: match["3. type"],
    region: match["4. region"],
  }));
}
