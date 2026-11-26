import "server-only";
import { UpstreamUnavailableError } from "./alphavantage";

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt?: string;
  favicon?: string;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  favicon?: string;
}

export async function fetchNews(symbol: string, companyName: string): Promise<NewsArticle[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new UpstreamUnavailableError("TAVILY_API_KEY is not set");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: `${companyName} (${symbol}) stock`,
      topic: "news",
      days: 7,
      max_results: 6,
      include_favicon: true,
    }),
  });
  if (!response.ok) throw new UpstreamUnavailableError(`Tavily responded ${response.status}`);

  const { results = [] } = (await response.json()) as { results?: TavilyResult[] };
  return results.map((result) => ({
    title: result.title,
    url: result.url,
    source: new URL(result.url).hostname.replace(/^www\./, ""),
    summary: result.content,
    publishedAt: result.published_date,
    favicon: result.favicon,
  }));
}
