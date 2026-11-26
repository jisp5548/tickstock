export interface WatchlistEntry {
  symbol: string;
  name: string;
  /** The logo artwork is white, so it needs a dark tile instead of the default light one. */
  lightLogo?: boolean;
}

/** The 15 tickers shown on the homepage. Names live here so the list renders without an extra OVERVIEW call per stock. */
export const WATCHLIST: readonly WatchlistEntry[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc.", lightLogo: true },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "KO", name: "The Coca-Cola Company" },
  { symbol: "DIS", name: "The Walt Disney Company", lightLogo: true },
  { symbol: "IBM", name: "International Business Machines", lightLogo: true },
];

export function findWatchlistEntry(symbol: string): WatchlistEntry | undefined {
  return WATCHLIST.find((entry) => entry.symbol === symbol);
}
