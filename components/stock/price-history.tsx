"use client";

import { useState } from "react";
import { formatCompact, formatDate, formatPrice, NOT_AVAILABLE } from "@/lib/format";
import type { Change } from "@/lib/series";
import { formatChange, trendText } from "@/lib/trend";
import { staggerDelay } from "../stagger";

const PAGE_SIZE = 15;

export interface HistoryRow {
  date: string;
  close: number;
  volume: number;
  change?: Change;
}

/** Daily closes, newest first, revealed a page at a time. */
export function PriceHistory({ rows }: { rows: HistoryRow[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  if (!rows.length) return <p className="text-sm text-muted">Historical prices are unavailable right now.</p>;

  return (
    <>
      <table className="tabular w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-rule">
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 text-right font-medium">Close</th>
            <th className="py-2 text-right font-medium">Volume</th>
            <th className="py-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, visible).map((row, index) => (
            <tr
              key={row.date}
              className="animate-row-in border-b border-white/[0.06]"
              style={staggerDelay(index % PAGE_SIZE, 15)}
            >
              <td className="py-2.5">{formatDate(row.date)}</td>
              <td className="py-2.5 text-right font-medium">{formatPrice(row.close)}</td>
              <td className="py-2.5 text-right text-muted">{formatCompact(row.volume)}</td>
              <td className={`py-2.5 text-right font-medium ${row.change ? trendText(row.change) : "text-muted"}`}>
                {row.change ? formatChange(row.change, "percent") : NOT_AVAILABLE}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible < rows.length && (
        <button
          type="button"
          onClick={() => setVisible(visible + PAGE_SIZE)}
          className="mt-4 h-10 w-full rounded-full bg-panel text-sm font-medium text-ink transition-[background-color,scale] duration-150 ease-out hover:bg-raised active:scale-[0.98]"
        >
          Show more ({rows.length - visible} left)
        </button>
      )}
    </>
  );
}
