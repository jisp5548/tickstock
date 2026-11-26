"use server";

import { searchSymbols } from "@/lib/market";

const MAX_QUERY_LENGTH = 40;

/** Symbol search across all markets. Limited to US listings, since the free tier only has overviews for those. */
export async function searchMarkets(query: string) {
  const keywords = query.trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);
  const result = await searchSymbols(keywords);
  if (result.status !== "ok") return result;
  return { ...result, data: result.data.filter((match) => match.region === "United States") };
}
