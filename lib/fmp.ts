import "server-only";
import { SymbolNotFoundError, UpstreamUnavailableError, type CompanyOverview } from "./alphavantage";

/**
 * Financial Modeling Prep company profile, used only when AlphaVantage's Company Overview is unavailable
 * (it is a premium endpoint, so free keys never get it). Field names differ between FMP's `stable` and
 * legacy `v3` APIs, so both spellings are accepted.
 */
interface FmpProfile {
  symbol: string;
  companyName?: string;
  description?: string;
  exchange?: string;
  exchangeShortName?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  mktCap?: number;
  beta?: number;
  /** "low-high" over the last 52 weeks, e.g. "169.21-260.10". */
  range?: string;
  isEtf?: boolean;
  isFund?: boolean;
}

function assetType(profile: FmpProfile): string {
  if (profile.isEtf) return "ETF";
  return profile.isFund ? "Fund" : "Common Stock";
}

function yearRange(range: string | undefined): { week52Low?: number; week52High?: number } {
  const [low, high] = (range ?? "").split("-").map(Number);
  return Number.isFinite(low) && Number.isFinite(high) && high > 0 ? { week52Low: low, week52High: high } : {};
}

export async function fetchFmpProfile(symbol: string): Promise<CompanyOverview> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) throw new UpstreamUnavailableError("FMP_API_KEY is not set");

  const url = `https://financialmodelingprep.com/stable/profile?${new URLSearchParams({ symbol, apikey: apiKey })}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new UpstreamUnavailableError(`FMP responded ${response.status}`);

  const body = (await response.json()) as FmpProfile[] | { "Error Message"?: string };
  if (!Array.isArray(body)) throw new UpstreamUnavailableError(body["Error Message"] ?? "Unexpected FMP response");
  const profile = body[0];
  if (!profile) throw new SymbolNotFoundError(symbol);

  return {
    symbol: profile.symbol,
    provider: "Financial Modeling Prep",
    assetType: assetType(profile),
    name: profile.companyName || undefined,
    description: profile.description || undefined,
    exchange: profile.exchange || profile.exchangeShortName || undefined,
    currency: profile.currency || undefined,
    sector: profile.sector || undefined,
    industry: profile.industry || undefined,
    marketCap: profile.marketCap ?? profile.mktCap,
    beta: profile.beta,
    ...yearRange(profile.range),
  };
}
