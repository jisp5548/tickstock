"use client";

import { motion } from "motion/react";
import { createContext, use, useId, useState, ViewTransition } from "react";
import { CHART_RANGES, LIST_RANGE, type ChartRange } from "@/lib/series";

type RangeState = [string, (id: string) => void];

const ChartRangeContext = createContext<RangeState>([LIST_RANGE.id, () => {}]);

/** One selected range per stock page, shared by the standard and advanced charts so switching views keeps it. */
export function ChartRangeProvider({ children }: { children: React.ReactNode }) {
  const state = useState(LIST_RANGE.id);
  return <ChartRangeContext value={state}>{children}</ChartRangeContext>;
}

/** The selected range if it has data, otherwise the first range that does. */
export function useChartRange(available: readonly ChartRange[]): [ChartRange | undefined, (id: string) => void] {
  const [rangeId, setRangeId] = use(ChartRangeContext);
  return [available.find((range) => range.id === rangeId) ?? available[0], setRangeId];
}

interface RangeTabsProps {
  selected: ChartRange;
  available: readonly ChartRange[];
  onSelect: (id: string) => void;
  className?: string;
}

/** Segmented range picker whose blue indicator slides (springs, so rapid clicks redirect it mid-flight). */
export function RangeTabs({ selected, available, onSelect, className = "" }: RangeTabsProps) {
  const indicatorId = useId();
  return (
    <ViewTransition name="stock-ranges">
      <div role="tablist" aria-label="Chart range" className={`flex ${className}`}>
        {CHART_RANGES.map((option) => {
          const isSelected = option.id === selected.id;
          return (
            <button
              key={option.id}
              role="tab"
              type="button"
              aria-selected={isSelected}
              disabled={!available.includes(option)}
              onClick={() => onSelect(option.id)}
              className="relative h-8 min-w-9 rounded-full px-2 text-xs font-semibold text-muted transition-colors duration-150 enabled:hover:text-ink disabled:opacity-35 aria-selected:text-white"
            >
              {isSelected && (
                <motion.span
                  layoutId={indicatorId}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="absolute inset-0 rounded-full bg-blue"
                />
              )}
              <span className="relative">{option.id}</span>
            </button>
          );
        })}
      </div>
    </ViewTransition>
  );
}
