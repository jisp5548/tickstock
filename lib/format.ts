export const NOT_AVAILABLE = "N/A";

const priceFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const dateFormats = {
  long: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
  short: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }),
  year: new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }),
};

export type DateStyle = keyof typeof dateFormats;

export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

export function formatSigned(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${priceFormat.format(Math.abs(value))}${suffix}`;
}

export function formatCompact(value: number): string {
  return compactFormat.format(value);
}

/**
 * Trading days arrive as YYYY-MM-DD and are read as UTC midnight so they never shift a day;
 * any other date string (e.g. news timestamps) is parsed as-is.
 */
export function formatDate(date: string, style: DateStyle = "long"): string {
  return dateFormats[style].format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date));
}
