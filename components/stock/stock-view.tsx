"use client";

import { createPortal } from "react-dom";
import { useAdvancedView } from "../advanced/advanced-view-context";
import { ChartRangeProvider } from "./range-tabs";

/**
 * Adds the advanced workspace on top of a stock's standard page. The standard page stays mounted and
 * visible underneath (only its chart plot hides, to hand off to the candle chart), so switching back costs
 * no relayout. The workspace is portalled to <body> to cover the viewport regardless of the mobile sheet.
 */
export function StockView({ standard, advanced }: { standard: React.ReactNode; advanced: React.ReactNode }) {
  const { active } = useAdvancedView();
  return (
    <ChartRangeProvider>
      {standard}
      {active && createPortal(advanced, document.body)}
    </ChartRangeProvider>
  );
}
