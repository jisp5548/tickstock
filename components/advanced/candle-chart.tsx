"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { formatCompact, formatDate, formatPrice } from "@/lib/format";
import { areaPath, changeBetween, linePath, niceTicks, valueAtY, yScale, type PricePoint } from "@/lib/series";
import { formatChange, isPositive, trendColor } from "@/lib/trend";
import { useElementSize } from "@/lib/use-element-size";

const PRICE_AXIS_WIDTH = 72;
const TIME_AXIS_HEIGHT = 28;
const VOLUME_SHARE = 0.2;
const INSET = 14;
/** Space kept clear above the price area for the OHLC legend. */
const LEGEND_SPACE = 64;
const MIN_VISIBLE_BARS = 12;
/** How long the entrance holds the full-height line (the view-transition morph runs meanwhile), then unfolds. */
const INTRO_HOLD_MS = 340;
const UNFOLD_MS = 480;
const NO_OVERLAYS: Overlay[] = [];
const ZOOM_STEP = 1.15;

export type ChartStyle = "candles" | "line";
export type ChartTool = "crosshair" | "measure";

/** Visible bar window, inclusive indexes into `points`. */
export interface BarWindow {
  from: number;
  to: number;
}

export interface Overlay {
  label: string;
  color: string;
  values: (number | undefined)[];
}

/** Price ↔ y mapping for the price area, leaving LEGEND_SPACE clear at the top. */
function priceScale(min: number, max: number, priceHeight: number) {
  const scaleY = yScale(min, max, priceHeight - LEGEND_SPACE, INSET);
  const invertY = valueAtY(min, max, priceHeight - LEGEND_SPACE, INSET);
  return {
    toY: (value: number) => LEGEND_SPACE + scaleY(value),
    priceAt: (y: number) => invertY(y - LEGEND_SPACE),
  };
}

export function zoomWindow(window: BarWindow, total: number, factor: number, anchorRatio = 0.5): BarWindow {
  const span = window.to - window.from + 1;
  const next = Math.min(Math.max(Math.round(span * factor), Math.min(MIN_VISIBLE_BARS, total)), total);
  const anchor = window.from + anchorRatio * span;
  const from = Math.min(Math.max(Math.round(anchor - anchorRatio * next), 0), total - next);
  return { from, to: from + next - 1 };
}

interface CandleChartProps {
  points: PricePoint[];
  window: BarWindow;
  onWindowChange: (window: BarWindow) => void;
  style: ChartStyle;
  tool: ChartTool;
  showVolume: boolean;
  overlays: Overlay[];
  legendTitle: string;
  dateStyle: "short" | "month" | "year";
  /** Play the entrance: start as a full-height line, then unfold into the final layout. */
  intro: boolean;
}

/**
 * Entrance phases. "intro": a full-height line, shaped like the standard chart it morphs from, with axes,
 * legend and candles hidden. "unfold": the line stretches into the price band while candles, volume and
 * axes fade in. "settled": the line is removed.
 */
type Phase = "intro" | "unfold" | "settled";

interface Measurement {
  start: number;
  end: number;
}

export function CandleChart({ points, window, onWindowChange, style, tool, showVolume, overlays, legendTitle, dateStyle, intro }: CandleChartProps) {
  const [plotRef, size] = useElementSize<HTMLDivElement>();
  const plotElement = useRef<HTMLDivElement>(null);
  const attachPlot = useCallback(
    (element: HTMLDivElement | null) => {
      plotElement.current = element;
      return plotRef(element);
    },
    [plotRef],
  );
  const [pointer, setPointer] = useState<{ index: number; y: number }>();
  const [measurement, setMeasurement] = useState<Measurement>();
  const drag = useRef<{ x: number; window: BarWindow }>(undefined);
  const measuring = useRef(false);
  const [phase, setPhase] = useState<Phase>(intro ? "intro" : "settled");

  useEffect(() => {
    if (phase === "settled") return;
    const timer = setTimeout(() => setPhase(phase === "intro" ? "unfold" : "settled"), phase === "intro" ? INTRO_HOLD_MS : UNFOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const width = Math.max(size.width - PRICE_AXIS_WIDTH, 0);
  const height = Math.max(size.height - TIME_AXIS_HEIGHT, 0);
  const visible = points.slice(window.from, window.to + 1);
  const slot = visible.length ? width / visible.length : 0;
  const xOf = (index: number) => (index - window.from + 0.5) * slot;
  const indexAt = (x: number) => Math.min(Math.max(window.from + Math.floor(x / slot), window.from), window.to);

  const priceHeight = showVolume ? height * (1 - VOLUME_SHARE) : height;
  const visibleOverlayValues = overlays.flatMap((overlay) =>
    overlay.values.slice(window.from, window.to + 1).filter((value): value is number => value !== undefined),
  );
  const lows = style === "candles" ? visible.map((point) => point.low) : visible.map((point) => point.close);
  const highs = style === "candles" ? visible.map((point) => point.high) : visible.map((point) => point.close);
  const min = Math.min(...lows, ...visibleOverlayValues);
  const max = Math.max(...highs, ...visibleOverlayValues);
  const { toY, priceAt } = priceScale(min, max, priceHeight);
  // Intro: map the final price band onto the full plot height (the standard chart's shape). Removing the
  // transform during "unfold" stretches the series down into place.
  const bandHeight = priceHeight - LEGEND_SPACE - INSET * 2;
  const fullHeightStretch =
    bandHeight > 0
      ? `translate(0px, ${INSET}px) scale(1, ${(height - INSET * 2) / bandHeight}) translate(0px, ${-(LEGEND_SPACE + INSET)}px)`
      : undefined;

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const element = plotElement.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / Math.max(rect.width - PRICE_AXIS_WIDTH, 1), 0), 1);
      onWindowChange(zoomWindow(window, points.length, event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP, ratio));
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [window, points.length, onWindowChange]);

  if (!visible.length) return <div ref={plotRef} className="size-full" />;

  const rangeColor = trendColor(isPositive(changeBetween(visible[0].close, visible.at(-1)!.close)));

  const last = points.at(-1)!;
  const lastUp = last.close >= (points.at(-2)?.close ?? last.open);
  const hovered = pointer ? points[pointer.index] : last;
  const previous = points[(pointer?.index ?? points.length - 1) - 1];
  const hoveredChange = changeBetween(previous?.close ?? hovered.open, hovered.close);
  const hoveredColor = trendColor(isPositive(hoveredChange));

  const yTicks = niceTicks(min, max, 6);
  const xTickCount = Math.max(Math.floor(width / 110), 2);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => window.from + Math.round(((i + 0.5) * (visible.length - 1)) / xTickCount));

  function localPoint(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const { x } = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "measure") {
      measuring.current = true;
      setMeasurement({ start: indexAt(x), end: indexAt(x) });
    } else {
      drag.current = { x, window };
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const { x, y } = localPoint(event);
    const index = indexAt(Math.min(x, width - 1));
    setPointer({ index, y: Math.min(Math.max(y, 0), priceHeight) });
    if (measuring.current) setMeasurement((current) => current && { ...current, end: index });
    if (drag.current && slot) {
      const shift = Math.round((drag.current.x - x) / slot);
      const span = drag.current.window.to - drag.current.window.from;
      const from = Math.min(Math.max(drag.current.window.from + shift, 0), points.length - 1 - span);
      if (from !== window.from) onWindowChange({ from, to: from + span });
    }
  }

  function onPointerUp() {
    drag.current = undefined;
    measuring.current = false;
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && measurement) {
      event.stopPropagation();
      setMeasurement(undefined);
      return;
    }
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = Math.min(Math.max((pointer?.index ?? window.to) + step, window.from), window.to);
    setPointer({ index, y: toY(points[index].close) });
  }

  function measurementGeometry({ start, end }: Measurement) {
    const [from, to] = start <= end ? [start, end] : [end, start];
    const change = changeBetween(points[start].close, points[end].close);
    const y1 = toY(points[start].close);
    const y2 = toY(points[end].close);
    return { left: xOf(from) - slot / 2, right: xOf(to) + slot / 2, top: Math.min(y1, y2), bottom: Math.max(y1, y2), change, bars: to - from };
  }

  const measureBox = measurement && measurementGeometry(measurement);

  return (
    <div className="relative size-full" data-phase={phase}>
      <div
        ref={attachPlot}
        role="img"
        tabIndex={0}
        aria-label={`${legendTitle} chart. Arrow keys move the crosshair, scroll to zoom, drag to pan.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => !drag.current && setPointer(undefined)}
        onKeyDown={onKeyDown}
        className="absolute inset-0 cursor-crosshair touch-none outline-none select-none"
      >
        <svg width={size.width} height={size.height} className="absolute inset-0" aria-hidden>
          <defs>
            <linearGradient id="advanced-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={rangeColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={rangeColor} stopOpacity={0} />
            </linearGradient>
            <clipPath id="advanced-plot">
              <rect width={width} height={height} />
            </clipPath>
          </defs>

          <g className="chart-chrome">
            {yTicks.map((tick) => (
              <line key={tick} x1={0} x2={width} y1={toY(tick)} y2={toY(tick)} stroke="var(--color-rule)" strokeOpacity={0.55} />
            ))}
            {xTicks.map((index) => (
              <line key={index} x1={xOf(index)} x2={xOf(index)} y1={0} y2={height} stroke="var(--color-rule)" strokeOpacity={0.35} />
            ))}
          </g>

          <g clipPath="url(#advanced-plot)">
            <g className="chart-stretch" style={{ transform: phase === "intro" ? fullHeightStretch : undefined }}>
              <g className={style === "candles" ? "chart-fade-in" : undefined}>
                <SeriesLayer
                  points={points}
                  from={window.from}
                  to={window.to}
                  width={width}
                  height={height}
                  priceHeight={priceHeight}
                  min={min}
                  max={max}
                  style={style}
                  showVolume={showVolume}
                  overlays={overlays}
                  color={rangeColor}
                />
              </g>
              {/* Candle style starts as a plain line (what the standard chart shows) and dissolves into candles. */}
              {style === "candles" && phase !== "settled" && (
                <g className="chart-fade-out">
                  <SeriesLayer
                    points={points}
                    from={window.from}
                    to={window.to}
                    width={width}
                    height={height}
                    priceHeight={priceHeight}
                    min={min}
                    max={max}
                    style="line"
                    showVolume={false}
                    overlays={NO_OVERLAYS}
                    color={rangeColor}
                  />
                </g>
              )}
            </g>
            {measureBox && (
              <rect
                x={measureBox.left}
                y={measureBox.top}
                width={measureBox.right - measureBox.left}
                height={Math.max(measureBox.bottom - measureBox.top, 1)}
                fill={trendColor(isPositive(measureBox.change))}
                fillOpacity={0.14}
                stroke={trendColor(isPositive(measureBox.change))}
                strokeOpacity={0.6}
              />
            )}
          </g>

          <line
            className="chart-chrome"
            x1={0}
            x2={width}
            y1={toY(last.close)}
            y2={toY(last.close)}
            stroke={trendColor(lastUp)}
            strokeDasharray="2 3"
            strokeOpacity={0.8}
          />
          {pointer && (
            <g stroke="var(--color-muted)" strokeDasharray="4 4">
              <line x1={xOf(pointer.index)} x2={xOf(pointer.index)} y1={0} y2={height} />
              <line x1={0} x2={width} y1={pointer.y} y2={pointer.y} />
            </g>
          )}
        </svg>

        {yTicks.map((tick) => (
          <span key={tick} className="chart-chrome tabular absolute -translate-y-1/2 pl-2 text-[11px] text-muted" style={{ left: width, top: toY(tick) }}>
            {formatPrice(tick)}
          </span>
        ))}
        {xTicks.map((index) => (
          <span key={index} className="chart-chrome absolute -translate-x-1/2 pt-1.5 text-[11px] whitespace-nowrap text-muted" style={{ left: xOf(index), top: height }}>
            {formatDate(points[index].date, dateStyle)}
          </span>
        ))}

        <AxisTag className="chart-chrome" style={{ left: width, top: toY(last.close) }} background={trendColor(lastUp)}>
          {formatPrice(last.close)}
        </AxisTag>
        {pointer && (
          <>
            <AxisTag style={{ left: width, top: pointer.y }} background="var(--color-raised)">
              {formatPrice(priceAt(pointer.y))}
            </AxisTag>
            <span
              className="tabular absolute -translate-x-1/2 rounded bg-raised px-1.5 py-0.5 text-[11px] whitespace-nowrap"
              style={{ left: xOf(pointer.index), top: height + 4 }}
            >
              {formatDate(hovered.date)}
            </span>
          </>
        )}
        {measureBox && (
          <span
            className="tabular absolute -translate-x-1/2 -translate-y-full rounded-md bg-raised px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg"
            style={{ left: (measureBox.left + measureBox.right) / 2, top: measureBox.top - 6, color: trendColor(isPositive(measureBox.change)) }}
          >
            {formatChange(measureBox.change, "amount")} ({formatChange(measureBox.change, "percent")}) · {measureBox.bars} bars
          </span>
        )}
      </div>

      {/* OHLC legend: follows the crosshair, otherwise shows the latest bar. */}
      <div className="chart-chrome tabular pointer-events-none absolute top-2 left-3 space-y-1 text-xs">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-ink">{legendTitle}</span>
          {(["open", "high", "low", "close"] as const).map((field) => (
            // Phones only have room for the close.
            <span key={field} className={`text-muted ${field === "close" ? "" : "max-sm:hidden"}`}>
              {field[0].toUpperCase()} <span style={{ color: hoveredColor }}>{formatPrice(hovered[field])}</span>
            </span>
          ))}
          <span style={{ color: hoveredColor }}>
            {formatChange(hoveredChange, "amount")} ({formatChange(hoveredChange, "percent")})
          </span>
        </p>
        {showVolume && (
          <p className="text-muted">
            Vol <span className="text-ink">{formatCompact(hovered.volume)}</span>
          </p>
        )}
        {overlays.map((overlay) => {
          const value = overlay.values[pointer?.index ?? points.length - 1];
          return (
            <p key={overlay.label} className="text-muted">
              {overlay.label} <span style={{ color: overlay.color }}>{value === undefined ? "—" : formatPrice(value)}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}

interface AxisTagProps {
  children: React.ReactNode;
  background: string;
  style: React.CSSProperties;
  className?: string;
}

function AxisTag({ children, background, style, className = "" }: AxisTagProps) {
  return (
    <span
      className={`tabular absolute ml-1 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${className}`}
      style={{ ...style, background }}
    >
      {children}
    </span>
  );
}

interface SeriesLayerProps {
  points: PricePoint[];
  from: number;
  to: number;
  width: number;
  height: number;
  priceHeight: number;
  min: number;
  max: number;
  style: ChartStyle;
  showVolume: boolean;
  overlays: Overlay[];
  color: string;
}

/**
 * Candles, volume, line and moving averages. Memoized on primitive props so crosshair and legend updates
 * (every pointer move) don't rebuild hundreds of bars; it only redraws on zoom, pan, resize or settings.
 * Each colour is a single <path>, keeping the DOM to a handful of nodes even for ~1,350 weekly bars.
 */
const SeriesLayer = memo(function SeriesLayer({ points, from, to, width, height, priceHeight, min, max, style, showVolume, overlays, color }: SeriesLayerProps) {
  const { toY } = priceScale(min, max, priceHeight);
  const visible = points.slice(from, to + 1);
  const slot = width / visible.length;
  const xOf = (index: number) => (index - from + 0.5) * slot;
  const barWidth = Math.max(Math.min(slot * 0.7, 18), 1);
  const paths = { upBody: "", downBody: "", upWick: "", downWick: "", upVolume: "", downVolume: "" };
  const maxVolume = Math.max(...visible.map((point) => point.volume), 1);
  const volumeTop = height * (1 - VOLUME_SHARE * 0.85);
  visible.forEach((point, offset) => {
    const x = xOf(from + offset);
    const up = point.close >= point.open;
    if (style === "candles") {
      const top = toY(Math.max(point.open, point.close));
      const bottom = Math.max(toY(Math.min(point.open, point.close)), top + 1);
      paths[up ? "upWick" : "downWick"] += `M${x} ${toY(point.high)}V${toY(point.low)}`;
      paths[up ? "upBody" : "downBody"] += `M${x - barWidth / 2} ${top}h${barWidth}V${bottom}h${-barWidth}Z`;
    }
    if (showVolume) {
      const barTop = height - (point.volume / maxVolume) * (height - volumeTop);
      paths[up ? "upVolume" : "downVolume"] += `M${x - barWidth / 2} ${height}V${barTop}h${barWidth}V${height}Z`;
    }
  });

  function overlayPath(values: (number | undefined)[]): string {
    let path = "";
    let drawing = false;
    for (let index = from; index <= to; index++) {
      const value = values[index];
      if (value === undefined) {
        drawing = false;
        continue;
      }
      path += `${drawing ? "L" : "M"}${xOf(index).toFixed(1)} ${toY(value).toFixed(1)}`;
      drawing = true;
    }
    return path;
  }

  const linePlots = visible.map((point, offset) => ({ x: xOf(from + offset), y: toY(point.close) }));
  return (
    <>
      {showVolume && (
        <>
          <path d={paths.upVolume} fill="var(--color-up)" fillOpacity={0.28} />
          <path d={paths.downVolume} fill="var(--color-down)" fillOpacity={0.28} />
        </>
      )}
      {style === "candles" ? (
        <>
          <path d={paths.upWick} stroke="var(--color-up)" strokeWidth={1} />
          <path d={paths.downWick} stroke="var(--color-down)" strokeWidth={1} />
          <path d={paths.upBody} fill="var(--color-up)" />
          <path d={paths.downBody} fill="var(--color-down)" />
        </>
      ) : (
        <>
          <path className="area-fill" d={areaPath(linePlots, priceHeight)} fill="url(#advanced-area)" />
          <path d={linePath(linePlots)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>
      )}
      {overlays.map((overlay) => (
        <path key={overlay.label} d={overlayPath(overlay.values)} fill="none" stroke={overlay.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </>
  );
});
