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

const MAX_ARTICLES = 6;
/** Quote/profile pages ("AAPL Stock Price & Quote") and Tavily's own entity pages are not news. */
const NOT_NEWS_TITLE = /stock price|quote|live chart/i;
const NOT_NEWS_HOSTS = new Set(["tavily.com"]);

/** Snippets arrive as page markdown; drop table pipes, heading marks and emphasis so they read as prose. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/[#|*_>`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "<company> news" finds articles; legal suffixes ("& Co.", "Inc.") and a leading "The" drag in profile and
 * quote pages instead (e.g. "JPMorgan Chase & Co." returned nothing usable, "JPMorgan Chase" returns Reuters).
 */
function newsQuery(companyName: string): string {
  const name = companyName.replace(/^The\s+/i, "").replace(/,?\s+(Inc\.?|Corporation|Corp\.?|& Co\.?|Co\.?)$/i, "");
  return `${name} news`;
}

export async function fetchNews(companyName: string): Promise<NewsArticle[]> {
  // Trimmed: a pasted trailing newline is invalid in an HTTP header and would make every request throw.
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) throw new UpstreamUnavailableError("TAVILY_API_KEY is not set");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      // Adding the ticker or "stock" to the query pulls quote pages instead of articles.
      query: newsQuery(companyName),
      topic: "news",
      days: 7,
      max_results: MAX_ARTICLES + 4,
      include_favicon: true,
    }),
  });
  if (!response.ok) throw new UpstreamUnavailableError(`Tavily responded ${response.status}`);

  const { results = [] } = (await response.json()) as { results?: TavilyResult[] };
  return results
    .map((result) => ({
      title: result.title,
      url: result.url,
      source: new URL(result.url).hostname.replace(/^www\./, ""),
      summary: toPlainText(result.content),
      publishedAt: result.published_date,
      favicon: result.favicon,
    }))
    .filter((article) => !NOT_NEWS_HOSTS.has(article.source) && !NOT_NEWS_TITLE.test(article.title))
    .slice(0, MAX_ARTICLES);
}
