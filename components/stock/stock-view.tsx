"use client";

import { Activity } from "react";
import { createPortal } from "react-dom";
import { useAdvancedView } from "../advanced/advanced-view-context";
import { ChartRangeProvider } from "./range-tabs";

/**
 * Swaps a stock between its standard page and the advanced workspace. The standard page stays mounted
 * (hidden via Activity) so its state survives the round trip, and the workspace is portalled to <body>
 * so it can cover the viewport regardless of the mobile sheet around the page.
 */
export function StockView({ standard, advanced }: { standard: React.ReactNode; advanced: React.ReactNode }) {
  const { active } = useAdvancedView();
  return (
    <ChartRangeProvider>
      <Activity mode={active ? "hidden" : "visible"}>{standard}</Activity>
      {active && createPortal(advanced, document.body)}
    </ChartRangeProvider>
  );
}
