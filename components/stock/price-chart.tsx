"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";
import { formatDate, formatPrice, type DateStyle } from "@/lib/format";
import { useAreaFill } from "@/lib/preferences";
import {
  areaPath,
  changeBetween,
  CHART_RANGES,
  LIST_RANGE,
  linePath,
  niceTicks,
  plotValues,
  sliceRange,
  yScale,
  type ChartRange,
  type ClosePoint,
} from "@/lib/series";
import { formatChange, isPositive, trendColor, trendText } from "@/lib/trend";
import { Kbd } from "../kbd";

/** The SVG is drawn in a fixed coordinate box and stretched to fit; labels are HTML positioned in percentages. */
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 300;
const INSET = 16;
const X_LABEL_COUNT = 5;

function axisDateStyle(range: ChartRange): DateStyle {
  if (range.source === "daily") return "short";
  return range.months === 60 || !range.months ? "year" : "month";
}

interface PriceChartProps {
  daily: ClosePoint[];
  weekly: ClosePoint[];
}

export function PriceChart({ daily, weekly }: PriceChartProps) {
  const series = { daily, weekly };
  const available = CHART_RANGES.filter((range) => series[range.source].length > 1);
  const [rangeId, setRangeId] = useState(available.includes(LIST_RANGE) ? LIST_RANGE.id : available[0]?.id);
  const [hoverIndex, setHoverIndex] = useState<number>();
  const [fillOn, toggleFill] = useAreaFill();
  const gradientId = useId();
  const tabsId = useId();

  const range = available.find((candidate) => candidate.id === rangeId);
  if (!range) {
    return (
      <div className="grid h-72 place-items-center rounded-3xl bg-panel text-sm text-muted">
        Price history is unavailable right now. Check back later.
      </div>
    );
  }

  const points = sliceRange(series[range.source], range);
  const closes = points.map((point) => point.close);
  const plots = plotValues(closes, VIEW_WIDTH, VIEW_HEIGHT, INSET);
  const start = points[0];
  const focus = points[hoverIndex ?? points.length - 1];
  const change = changeBetween(start.close, focus.close);
  const color = trendColor(isPositive(change));

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const toY = yScale(min, max, VIEW_HEIGHT, INSET);
  const yTicks = niceTicks(min, max);
  const xLabelIndexes = Array.from({ length: X_LABEL_COUNT }, (_, i) => Math.round((i * (points.length - 1)) / (X_LABEL_COUNT - 1)));
  const percentX = (index: number) => (index / Math.max(points.length - 1, 1)) * 100;
  const percentY = (value: number) => (toY(value) / VIEW_HEIGHT) * 100;

  function indexFromPointer(event: React.PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    return Math.round(ratio * (points.length - 1));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (event.key === "Escape") setHoverIndex(undefined);
    if (!step) return;
    event.preventDefault();
    setHoverIndex((current = points.length - 1) => Math.min(Math.max(current + step, 0), points.length - 1));
  }

  return (
    <section aria-label="Price chart">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div aria-live="polite">
          <p className="tabular font-display text-4xl font-medium tracking-tight md:text-5xl">{formatPrice(focus.close)}</p>
          <p className="tabular mt-1 text-sm">
            <span className={`font-semibold ${trendText(change)}`}>
              {formatChange(change, "amount")} ({formatChange(change, "percent")})
            </span>{" "}
            <span className="text-muted">{hoverIndex === undefined ? range.label : formatDate(focus.date)}</span>
          </p>
        </div>
        <div role="tablist" aria-label="Chart range" className="flex rounded-full bg-panel p-1">
          {CHART_RANGES.map((option) => {
            const selected = option.id === range.id;
            const disabled = !available.includes(option);
            return (
              <button
                key={option.id}
                role="tab"
                type="button"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => {
                  setRangeId(option.id);
                  setHoverIndex(undefined);
                }}
                className="relative h-8 min-w-9 rounded-full px-2 text-xs font-semibold text-muted transition-colors duration-150 enabled:hover:text-ink disabled:opacity-35 aria-selected:text-white"
              >
                {selected && (
                  <motion.span
                    layoutId={tabsId}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                    className="absolute inset-0 rounded-full bg-blue"
                  />
                )}
                <span className="relative">{option.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="img"
        aria-label={`${range.label}: ${formatPrice(start.close)} to ${formatPrice(points.at(-1)!.close)}. Use arrow keys to inspect prices.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={(event) => setHoverIndex(indexFromPointer(event))}
        onPointerDown={(event) => setHoverIndex(indexFromPointer(event))}
        onPointerLeave={() => setHoverIndex(undefined)}
        className="relative mt-6 mr-14 h-64 touch-pan-y rounded-lg outline-offset-4 select-none focus-visible:outline-2 focus-visible:outline-azure md:h-80"
      >
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <line key={tick} x1={0} x2={VIEW_WIDTH} y1={toY(tick)} y2={toY(tick)} stroke="var(--color-rule)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} x2={VIEW_WIDTH} y1={toY(start.close)} y2={toY(start.close)} stroke="var(--color-muted)" strokeOpacity={0.5} strokeDasharray="1 4" vectorEffect="non-scaling-stroke" />
          {/* Keyed by range so a new range re-runs the left-to-right reveal. */}
          <g key={range.id} className="animate-reveal">
            <path className="area-fill" d={areaPath(plots, VIEW_HEIGHT)} fill={`url(#${gradientId})`} />
            <path d={linePath(plots)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {yTicks.map((tick) => (
          <span key={tick} className="tabular absolute left-full ml-3 -translate-y-1/2 text-[11px] text-muted" style={{ top: `${percentY(tick)}%` }}>
            {formatPrice(tick)}
          </span>
        ))}
        {xLabelIndexes.map((index, i) => (
          <span
            key={`${index}-${i}`}
            className={`absolute top-full mt-2 text-[11px] whitespace-nowrap text-muted ${i === 0 ? "" : i === X_LABEL_COUNT - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${percentX(index)}%` }}
          >
            {formatDate(points[index].date, axisDateStyle(range))}
          </span>
        ))}

        {hoverIndex !== undefined && (
          <>
            <span className="pointer-events-none absolute inset-y-0 w-px bg-white/40" style={{ left: `${percentX(hoverIndex)}%` }} />
            <span
              className="pointer-events-none absolute size-3 -translate-1/2 rounded-full ring-2 ring-stage"
              style={{ left: `${percentX(hoverIndex)}%`, top: `${percentY(focus.close)}%`, background: color }}
            />
          </>
        )}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={toggleFill}
          aria-pressed={fillOn}
          className="flex h-8 items-center gap-2 rounded-full bg-panel pr-2 pl-3 text-xs font-medium text-muted transition-colors duration-150 hover:text-ink aria-pressed:text-ink"
        >
          <span className={`size-2 rounded-full transition-colors duration-200 ${fillOn ? "bg-azure" : "bg-white/25"}`} />
          Shading
          <Kbd>F</Kbd>
        </button>
      </div>
    </section>
  );
}
