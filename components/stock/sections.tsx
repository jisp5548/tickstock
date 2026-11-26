import type { CompanyOverview } from "@/lib/alphavantage";
import { formatCompact, formatDate, formatPrice, NOT_AVAILABLE } from "@/lib/format";
import { getNews } from "@/lib/market";
import { CHART_RANGES, sliceRange, type PricePoint } from "@/lib/series";
import type { WatchlistEntry } from "@/lib/watchlist";
import { Logo } from "../logo";
import { staggerDelay } from "../stagger";
import { ExpandableText } from "./expandable-text";

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 font-display text-xl font-medium tracking-tight">{children}</h2>;
}

interface StockHeaderProps {
  symbol: string;
  entry?: WatchlistEntry;
  overview?: CompanyOverview;
}

export function StockHeader({ symbol, entry, overview }: StockHeaderProps) {
  const details = [overview?.exchange, overview?.currency].filter(Boolean).join(" · ");
  return (
    <header className="flex items-center gap-4">
      <Logo symbol={symbol} light={entry?.lightLogo} size="lg" morph />
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{symbol}</h1>
        <p className="truncate text-sm text-muted">
          {overview?.name ?? entry?.name ?? symbol}
          {details && <span className="text-muted/70"> · {details}</span>}
        </p>
      </div>
    </header>
  );
}

const ONE_YEAR = CHART_RANGES.find((range) => range.id === "1Y")!;

interface KeyStatsProps {
  daily: PricePoint[];
  weekly: PricePoint[];
  overview?: CompanyOverview;
}

/** Apple-style statistics grid. Rows without data are dropped; the section hides entirely if none remain. */
export function KeyStats({ daily, weekly, overview }: KeyStatsProps) {
  const latest = daily.at(-1);
  const lastYear = sliceRange(weekly, ONE_YEAR);
  const averageVolume = daily.length ? daily.reduce((sum, point) => sum + point.volume, 0) / daily.length : undefined;
  const yearHigh = overview?.week52High ?? (lastYear.length ? Math.max(...lastYear.map((point) => point.high)) : undefined);
  const yearLow = overview?.week52Low ?? (lastYear.length ? Math.min(...lastYear.map((point) => point.low)) : undefined);

  const stats: [string, number | undefined, (value: number) => string][] = [
    ["Open", latest?.open, formatPrice],
    ["High", latest?.high, formatPrice],
    ["Low", latest?.low, formatPrice],
    ["Volume", latest?.volume, formatCompact],
    ["Avg Volume", averageVolume, formatCompact],
    ["Market Cap", overview?.marketCap, formatCompact],
    ["52W High", yearHigh, formatPrice],
    ["52W Low", yearLow, formatPrice],
    ["P/E", overview?.peRatio, formatPrice],
    ["EPS", overview?.eps, formatPrice],
    ["Beta", overview?.beta, formatPrice],
    ["Yield", overview?.dividendYield, (value) => `${formatPrice(value * 100)}%`],
  ];
  const shown = stats.filter((stat): stat is [string, number, (value: number) => string] => stat[1] !== undefined);
  if (!shown.length) return null;

  return (
    <section>
      <SectionHeading>Statistics</SectionHeading>
      <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map(([label, value, format]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-2.5 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="tabular font-medium">{format(value)}</dd>
          </div>
        ))}
      </dl>
      {latest && <p className="mt-3 text-xs text-muted">Day figures from the {formatDate(latest.date)} session.</p>}
    </section>
  );
}

/** The required company fields; anything missing reads "N/A". */
export function CompanyProfile({ symbol, overview }: { symbol: string; overview?: CompanyOverview }) {
  const fields: [string, string | undefined][] = [
    ["Symbol", overview?.symbol ?? symbol],
    ["Name", overview?.name],
    ["Asset Type", overview?.assetType],
    ["Exchange", overview?.exchange],
    ["Sector", overview?.sector],
    ["Industry", overview?.industry],
    ["Market Cap", overview?.marketCap === undefined ? undefined : `$${formatCompact(overview.marketCap)}`],
  ];
  return (
    <section>
      <SectionHeading>About</SectionHeading>
      {overview?.description ? (
        <ExpandableText text={overview.description} />
      ) : (
        <p className="text-sm text-muted">Description: {NOT_AVAILABLE}</p>
      )}
      <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-2 sm:[&>div:last-child:nth-child(odd)]:col-span-2">
        {fields.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 bg-stage px-4 py-3 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className={`text-right font-medium ${value ? "" : "text-muted"}`}>{value ?? NOT_AVAILABLE}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export async function News({ symbol, companyName }: { symbol: string; companyName: string }) {
  const news = await getNews(symbol, companyName);
  return (
    <section>
      <SectionHeading>News</SectionHeading>
      {news.status !== "ok" || news.data.length === 0 ? (
        <p className="text-sm text-muted">No recent news available right now.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {news.data.map((article, index) => (
            <li key={article.url} className="animate-row-in" style={staggerDelay(index, 40)}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="squircle flex h-full flex-col gap-2 rounded-2xl bg-panel p-4 ring-1 ring-white/[0.06] transition-[background-color,scale] duration-150 ease-out [--radius:16px] hover:bg-raised active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 text-xs text-muted">
                  {article.favicon && (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party favicon hosts
                    <img src={article.favicon} alt="" width={14} height={14} className="size-3.5 rounded-sm" loading="lazy" />
                  )}
                  <span className="truncate">{article.source}</span>
                  {article.publishedAt && <span className="shrink-0">· {formatDate(article.publishedAt, "short")}</span>}
                </span>
                <span className="line-clamp-3 font-semibold text-balance">{article.title}</span>
                <span className="line-clamp-2 text-sm text-muted">{article.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NewsSkeleton() {
  return (
    <section aria-hidden>
      <SectionHeading>News</SectionHeading>
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="space-y-2.5 rounded-2xl bg-panel p-4">
            <span className="skeleton block h-3 w-28 rounded" />
            <span className="skeleton block h-4 w-full rounded" />
            <span className="skeleton block h-4 w-3/4 rounded" />
            <span className="skeleton block h-3 w-full rounded" />
          </li>
        ))}
      </ul>
    </section>
  );
}
