import { formatSigned } from "./format";
import type { Change } from "./series";

/** A flat change counts as positive, matching Apple Stocks. */
export function isPositive(change: Change): boolean {
  return change.amount >= 0;
}

export function trendColor(positive: boolean): string {
  return positive ? "var(--color-up)" : "var(--color-down)";
}

export function trendText(change: Change): string {
  return isPositive(change) ? "text-up" : "text-down";
}

export type PillMode = "percent" | "amount";

export function formatChange(change: Change, mode: PillMode): string {
  return mode === "percent" ? formatSigned(change.percent, "%") : formatSigned(change.amount);
}
