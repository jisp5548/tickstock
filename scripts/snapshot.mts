/**
 * Refresh the committed fallback data in data/cache for every watchlist stock.
 * Only missing or stale entries are fetched, so re-running it on later days fills in whatever the
 * 25-calls-per-day AlphaVantage quota cut short. Usage: npm run snapshot
 */
import { isStale, readEntry, refresh } from "../lib/file-cache";
import { newsSource, overviewSource, seriesSource, type Source } from "../lib/sources";
import { WATCHLIST } from "../lib/watchlist";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Keys can also come from the shell environment.
}

// Ordered by importance: the homepage needs every daily series before any detail page data.
const groups: Source<unknown>[][] = [
  WATCHLIST.map(({ symbol }) => seriesSource(symbol, "daily")),
  WATCHLIST.map(({ symbol }) => overviewSource(symbol)),
  WATCHLIST.map(({ symbol }) => seriesSource(symbol, "weekly")),
  WATCHLIST.map(({ symbol, name }) => newsSource(symbol, name)),
];

/** Missing entries first, then the oldest, so a quota-limited run rotates through every stock over the days. */
function age(source: Source<unknown>): number {
  const entry = readEntry(source.key);
  return entry ? Date.parse(entry.fetchedAt) : 0;
}

const sources = groups.flat();
const due = groups.flatMap((group) =>
  group
    .filter((source) => {
      const entry = readEntry(source.key);
      return !entry || isStale(entry, source.maxAgeMs);
    })
    .sort((a, b) => age(a) - age(b)),
);
console.log(`${due.length} of ${sources.length} entries need refreshing`);

for (const source of due) {
  try {
    await refresh(source);
    console.log(`✓ ${source.key}`);
  } catch (error) {
    console.error(`✗ ${source.key}: ${error instanceof Error ? error.message : error}`);
  }
}
