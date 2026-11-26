export interface ClosePoint {
  date: string;
  close: number;
}

export interface PricePoint extends ClosePoint {
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface Change {
  amount: number;
  percent: number;
}

export type RangeSource = "daily" | "weekly";

export interface ChartRange {
  id: string;
  label: string;
  source: RangeSource;
  /** Months to look back from the latest point; "ytd" = since Jan 1; neither months nor days = everything. */
  months?: number | "ytd";
  days?: number;
}

/** Daily data on the free tier only covers ~100 trading days, so longer ranges read the weekly series. */
export const CHART_RANGES: readonly ChartRange[] = [
  { id: "1W", label: "Past week", source: "daily", days: 7 },
  { id: "1M", label: "Past month", source: "daily", months: 1 },
  { id: "3M", label: "Past 3 months", source: "daily", months: 3 },
  { id: "6M", label: "Past 6 months", source: "weekly", months: 6 },
  { id: "YTD", label: "Year to date", source: "weekly", months: "ytd" },
  { id: "1Y", label: "Past year", source: "weekly", months: 12 },
  { id: "5Y", label: "Past 5 years", source: "weekly", months: 60 },
  { id: "ALL", label: "All time", source: "weekly" },
];

/** The period the homepage list and tiles summarize (sparkline, change pill and red/green all agree on it). */
export const LIST_RANGE = CHART_RANGES[1];

/** Ranges whose source series has enough points to draw. */
export function availableRanges(series: Record<RangeSource, readonly unknown[]>): ChartRange[] {
  return CHART_RANGES.filter((range) => series[range.source].length > 1);
}

/** Axis label granularity: days for daily ranges, months up to a year, years beyond. */
export function axisDateStyle(range: ChartRange): "short" | "month" | "year" {
  if (range.source === "daily") return "short";
  return range.months === 60 || !range.months ? "year" : "month";
}

function rangeCutoff(range: ChartRange, latestDate: string): string | undefined {
  const cutoff = new Date(`${latestDate}T00:00:00Z`);
  if (range.days) cutoff.setUTCDate(cutoff.getUTCDate() - range.days);
  else if (range.months === "ytd") cutoff.setUTCMonth(0, 1);
  else if (range.months) cutoff.setUTCMonth(cutoff.getUTCMonth() - range.months);
  else return undefined;
  return cutoff.toISOString().slice(0, 10);
}

/**
 * Points within the range, ascending. The first point is the last close at or before the cutoff,
 * so the change from first to last is the performance over the whole period.
 */
export function sliceRange<T extends { date: string }>(points: readonly T[], range: ChartRange): T[] {
  const latest = points.at(-1);
  const cutoff = latest && rangeCutoff(range, latest.date);
  if (!cutoff) return [...points];
  const startIndex = points.findLastIndex((point) => point.date <= cutoff);
  return points.slice(Math.max(startIndex, 0));
}

export function changeBetween(from: number, to: number): Change {
  const amount = to - from;
  return { amount, percent: from === 0 ? 0 : (amount / from) * 100 };
}

export function rangeChange(points: readonly { close: number }[]): Change {
  return changeBetween(points[0]?.close ?? 0, points.at(-1)?.close ?? 0);
}

export function averageVolume(points: readonly PricePoint[]): number | undefined {
  return points.length ? points.reduce((sum, point) => sum + point.volume, 0) / points.length : undefined;
}

/** Day-over-day change for each point (the first point has no previous day). */
export function withDailyChange<T extends ClosePoint>(points: readonly T[]): (T & { change?: Change })[] {
  return points.map((point, index) => ({
    ...point,
    change: index > 0 ? changeBetween(points[index - 1].close, point.close) : undefined,
  }));
}

export interface Plot {
  x: number;
  y: number;
}

/** Maps a value to a y coordinate (growing downward), leaving `inset` px above the max and below the min. */
export function yScale(min: number, max: number, height: number, inset = 0): (value: number) => number {
  const span = max - min || 1;
  return (value) => inset + (1 - (value - min) / span) * (height - inset * 2);
}

/** Inverse of yScale: the value at a y coordinate. */
export function valueAtY(min: number, max: number, height: number, inset = 0): (y: number) => number {
  const span = max - min || 1;
  return (y) => min + (1 - (y - inset) / (height - inset * 2)) * span;
}

/** Simple moving average of closes; undefined until `period` points are available. */
export function movingAverage(points: readonly ClosePoint[], period: number): (number | undefined)[] {
  let sum = 0;
  return points.map((point, index) => {
    sum += point.close - (index >= period ? points[index - period].close : 0);
    return index >= period - 1 ? sum / period : undefined;
  });
}

/** Spread values evenly across `width` and scale them into `height`. */
export function plotValues(values: readonly number[], width: number, height: number, inset = 0): Plot[] {
  const toY = yScale(Math.min(...values), Math.max(...values), height, inset);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, index) => ({ x: index * step, y: toY(value) }));
}

export function linePath(plots: readonly Plot[]): string {
  return plots.map(({ x, y }, index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("");
}

export function areaPath(plots: readonly Plot[], height: number): string {
  const first = plots[0];
  const last = plots.at(-1);
  if (!first || !last) return "";
  return `${linePath(plots)}L${last.x.toFixed(2)} ${height}L${first.x.toFixed(2)} ${height}Z`;
}

/** Round axis values (1, 2, 2.5 or 5 × 10ⁿ apart) covering roughly [min, max]. */
export function niceTicks(min: number, max: number, approxCount = 4): number[] {
  const raw = (max - min) / approxCount || 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((multiple) => raw / magnitude <= multiple) ?? 10) * magnitude;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max; tick += step) ticks.push(Number(tick.toFixed(10)));
  return ticks;
}
