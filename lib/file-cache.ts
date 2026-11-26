import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Source } from "./sources";

/**
 * Responses are persisted as JSON under data/cache. The committed files double as the snapshot the app
 * falls back to when AlphaVantage's 25-calls-per-day quota is spent.
 */
const CACHE_DIR = path.join(process.cwd(), "data", "cache");
/** After an upstream failure, don't retry the same key for a while (each retry spends quota). */
const RETRY_BACKOFF_MS = 15 * 60_000;
/**
 * On Vercel the filesystem is read-only and instances are short-lived, so a background refresh could never be
 * saved and every cold start would re-spend the daily quota. There, the committed snapshot is refreshed by a
 * daily GitHub Action instead (.github/workflows/snapshot.yml); missing entries still load live.
 */
const BACKGROUND_REFRESH = process.env.VERCEL !== "1";

export interface Cached<T> {
  data: T;
  fetchedAt: string;
}

export function isStale(entry: Cached<unknown>, maxAgeMs: number): boolean {
  return Date.now() - Date.parse(entry.fetchedAt) > maxAgeMs;
}

const inFlight = new Map<string, Promise<Cached<unknown>>>();
const lastFailure = new Map<string, number>();

function filePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

export function readEntry<T>(key: string): Cached<T> | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath(key), "utf8")) as Cached<T>;
  } catch {
    return undefined;
  }
}

function writeEntry(key: string, entry: Cached<unknown>): void {
  try {
    fs.mkdirSync(path.dirname(filePath(key)), { recursive: true });
    fs.writeFileSync(filePath(key), `${JSON.stringify(entry, null, 2)}\n`);
  } catch {
    // Read-only filesystems (e.g. serverless) still serve the committed snapshot.
  }
}

export function refresh<T>({ key, load }: Source<T>): Promise<Cached<T>> {
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<Cached<T>>;

  const request = load()
    .then((data) => {
      const entry = { data, fetchedAt: new Date().toISOString() };
      writeEntry(key, entry);
      return entry;
    })
    .catch((error: unknown) => {
      lastFailure.set(key, Date.now());
      throw error;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/**
 * Serve the stored entry immediately; if it is older than the source's max age, refresh it in the
 * background. Only blocks on the network when nothing is stored yet.
 */
export async function staleWhileRevalidate<T>(source: Source<T>): Promise<Cached<T>> {
  const stored = readEntry<T>(source.key);
  if (!stored) return refresh(source);

  if (BACKGROUND_REFRESH && isStale(stored, source.maxAgeMs) && Date.now() - (lastFailure.get(source.key) ?? 0) > RETRY_BACKOFF_MS) {
    refresh(source).catch(() => {
      // Keep serving the stored entry until upstream recovers.
    });
  }
  return stored;
}
