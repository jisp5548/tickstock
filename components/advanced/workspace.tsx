"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CompanyOverview } from "@/lib/alphavantage";
import { isPlainShortcut } from "@/lib/keyboard";
import { EASE_IN, EASE_OUT } from "@/lib/motion";
import { useAreaFill } from "@/lib/preferences";
import { usePrefersReducedMotion } from "@/lib/use-media-query";
import { availableRanges, axisDateStyle, movingAverage, sliceRange, type PricePoint } from "@/lib/series";
import type { WatchlistEntry } from "@/lib/watchlist";
import { useOpenPalette } from "../command-palette";
import {
  CandlesIcon,
  CrosshairIcon,
  FitIcon,
  IndicatorsIcon,
  LineIcon,
  RulerIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "../icons";
import { Kbd, ModKbd } from "../kbd";
import { RangeTabs, useChartRange } from "../stock/range-tabs";
import { MorphTransition, useAdvancedView } from "./advanced-view-context";
import { CandleChart, zoomWindow, type BarWindow, type ChartStyle, type ChartTool, type Overlay } from "./candle-chart";
import { DetailsCard, WatchlistTable, type WatchlistQuote } from "./side-panel";

const BUTTON_ZOOM = 1.5;

const MOVING_AVERAGES = [
  { key: "ma20", label: "MA 20", color: "var(--color-apricot)", period: 20 },
  { key: "ma50", label: "MA 50", color: "var(--color-azure)", period: 50 },
] as const;

const INDICATORS = [{ key: "volume", label: "Volume", color: "var(--color-muted)" }, ...MOVING_AVERAGES] as const;

type IndicatorKey = (typeof INDICATORS)[number]["key"];

interface AdvancedWorkspaceProps {
  symbol: string;
  entry?: WatchlistEntry;
  overview?: CompanyOverview;
  daily: PricePoint[];
  weekly: PricePoint[];
  quotes: WatchlistQuote[];
}

/**
 * TradingView-style workspace: toolbar on top, tool rail on the left, the chart in the middle, ranges below
 * and watchlist + symbol details on the right. Panels float on black with hairline gaps, unlike the standard
 * view's single column. On desktop the chart morphs in from the standard chart and the toolbar and side
 * panel slide in (all transform/opacity); everything else arrives with the page crossfade.
 */
export function AdvancedWorkspace({ symbol, entry, overview, daily, weekly, quotes }: AdvancedWorkspaceProps) {
  const { setActive } = useAdvancedView();
  const openPalette = useOpenPalette();
  const [fillOn, toggleFill] = useAreaFill();
  const reducedMotion = usePrefersReducedMotion();
  const series = { daily, weekly };
  const available = availableRanges(series);
  const [range, setRangeId] = useChartRange(available);
  const [style, setStyle] = useState<ChartStyle>("candles");
  const [tool, setTool] = useState<ChartTool>("crosshair");
  const [enabled, setEnabled] = useState<Record<IndicatorKey, boolean>>({ volume: true, ma20: true, ma50: false });
  const [zoomedWindow, setZoomedWindow] = useState<BarWindow>();

  const source = range?.source === "weekly" ? weekly : daily;
  const points = useMemo(() => (range ? sliceRange(source, range) : []), [source, range]);
  const barWindow = zoomedWindow ?? { from: 0, to: points.length - 1 };
  const overlays = useMemo<Overlay[]>(() => {
    // Averages run over the whole series so the line is already warmed up at the left edge of the range.
    const offset = source.length - points.length;
    return MOVING_AVERAGES.filter((average) => enabled[average.key]).map((average) => ({
      label: average.label,
      color: average.color,
      values: movingAverage(source, average.period).slice(offset),
    }));
  }, [source, points.length, enabled]);

  const zoom = (factor: number) => setZoomedWindow(zoomWindow(barWindow, points.length, factor));

  // The workspace covers the page; stop the page underneath from scrolling. A layout effect applies the lock
  // before the view transition snapshots the new state, so nothing reflows mid-animation.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  // Tool shortcuts. Re-subscribed every render so `zoom` always sees the current window.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isPlainShortcut(event)) return;
      const key = event.key.toLowerCase();
      if (key === "c") setTool("crosshair");
      else if (key === "m") setTool("measure");
      else if (key === "=" || key === "+") zoom(1 / BUTTON_ZOOM);
      else if (key === "-") zoom(BUTTON_ZOOM);
      else if (key === "0") setZoomedWindow(undefined);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const interval = range?.source === "daily" ? "1D" : "1W";
  const legendTitle = [overview?.name ?? entry?.name ?? symbol, interval, overview?.exchange].filter(Boolean).join(" · ");

  return (
    <div
      role="region"
      aria-label={`${symbol} advanced view`}
      className="fixed inset-0 z-50 grid max-md:animate-workspace-in auto-rows-min grid-cols-1 gap-1 overflow-y-auto bg-black p-1 pt-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.25rem,env(safe-area-inset-bottom))] md:grid-cols-[3rem_minmax(0,1fr)_20rem] md:grid-rows-[3rem_minmax(0,1fr)_2.75rem] md:overflow-hidden"
    >
      <MorphTransition name="adv-toolbar">
        <header className="flex h-12 items-center gap-1 overflow-x-auto rounded-xl bg-stage px-2 md:col-span-3 md:h-auto">
          <button
            type="button"
            onClick={openPalette}
            className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-raised px-3 text-sm font-semibold transition-[background-color,scale] duration-150 ease-out hover:bg-[#2c2c2c] active:scale-[0.97]"
          >
            <SearchIcon className="size-4 text-muted" />
            {symbol}
            <ModKbd letter="K" />
          </button>
          <Divider />
          <Segmented
            label="Chart style"
            value={style}
            onChange={setStyle}
            options={[
              { value: "candles", label: "Candles", icon: <CandlesIcon /> },
              { value: "line", label: "Line", icon: <LineIcon /> },
            ]}
          />
          <IndicatorsMenu enabled={enabled} onToggle={(key) => setEnabled({ ...enabled, [key]: !enabled[key] })} />
          <ToolbarButton
            onClick={toggleFill}
            pressed={fillOn}
            disabled={style !== "line"}
            title={style === "line" ? undefined : "Shading applies to the line style"}
          >
            Shading <Kbd>F</Kbd>
          </ToolbarButton>
          <span className="flex-1" />
          <ToolbarButton onClick={() => setActive(false)}>
            Standard view <Kbd>V</Kbd>
          </ToolbarButton>
        </header>
      </MorphTransition>

      <nav aria-label="Chart tools" className="hidden flex-col items-center gap-1 rounded-xl bg-stage py-2 md:col-start-1 md:row-span-2 md:row-start-2 md:flex">
        <RailButton label="Crosshair" shortcut="C" active={tool === "crosshair"} onClick={() => setTool("crosshair")}>
          <CrosshairIcon className="size-5" />
        </RailButton>
        <RailButton label="Measure" shortcut="M" active={tool === "measure"} onClick={() => setTool("measure")}>
          <RulerIcon className="size-5" />
        </RailButton>
        <span className="my-1 h-px w-6 bg-rule" />
        <RailButton label="Zoom in" shortcut="+" onClick={() => zoom(1 / BUTTON_ZOOM)}>
          <ZoomInIcon className="size-5" />
        </RailButton>
        <RailButton label="Zoom out" shortcut="−" onClick={() => zoom(BUTTON_ZOOM)}>
          <ZoomOutIcon className="size-5" />
        </RailButton>
        <RailButton label="Fit all" shortcut="0" onClick={() => setZoomedWindow(undefined)}>
          <FitIcon className="size-5" />
        </RailButton>
      </nav>

      <MorphTransition name="stock-chart">
        <section aria-label="Chart" className="relative h-[52dvh] overflow-hidden rounded-xl bg-stage md:col-start-2 md:row-start-2 md:h-auto">
          {range ? (
            <div className="absolute inset-x-2 top-2 bottom-1">
              <CandleChart
                points={points}
                window={barWindow}
                onWindowChange={setZoomedWindow}
                style={style}
                tool={tool}
                showVolume={enabled.volume}
                overlays={overlays}
                legendTitle={legendTitle}
                dateStyle={axisDateStyle(range)}
                intro={!reducedMotion}
              />
            </div>
          ) : (
            <p className="grid h-full place-items-center text-sm text-muted">Price history is unavailable right now.</p>
          )}
        </section>
      </MorphTransition>

      <footer className="flex h-11 items-center justify-between gap-3 overflow-x-auto rounded-xl bg-stage px-2 md:col-start-2 md:row-start-3 md:h-auto">
        {range && (
          <RangeTabs
            selected={range}
            available={available}
            onSelect={(id) => {
              setRangeId(id);
              setZoomedWindow(undefined);
            }}
            className="gap-0.5"
          />
        )}
        <span className="tabular shrink-0 text-xs text-muted max-sm:hidden">
          {interval === "1D" ? "Daily" : "Weekly"} bars · {barWindow.to - barWindow.from + 1} shown
        </span>
      </footer>

      <MorphTransition name="adv-panel">
        {/* On phones the panel starts below the fold; content-visibility skips its layout and paint until scrolled to. */}
        <aside className="flex flex-col overflow-hidden rounded-xl bg-stage [contain-intrinsic-size:auto_40rem] max-md:[content-visibility:auto] md:col-start-3 md:row-span-2 md:row-start-2 md:overflow-y-auto">
          <div className="flex max-h-80 min-h-0 flex-col md:max-h-none md:flex-1">
            <WatchlistTable quotes={quotes} />
          </div>
          <div className="h-px shrink-0 bg-rule" />
          <DetailsCard
            symbol={symbol}
            entry={entry}
            overview={overview}
            daily={daily}
            dayChange={quotes.find((quote) => quote.symbol === symbol)?.dayChange}
          />
        </aside>
      </MorphTransition>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-rule" />;
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
}

function ToolbarButton({ pressed, className = "", ...props }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...props}
      className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-[background-color,color,scale] duration-150 ease-out enabled:hover:bg-white/[0.06] enabled:hover:text-ink enabled:active:scale-[0.97] disabled:opacity-40 aria-pressed:text-ink ${className}`}
    />
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: React.ReactNode }[];
}

function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-lg bg-white/[0.04] p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
          className="grid h-8 w-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:text-ink aria-checked:bg-raised aria-checked:text-ink"
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

interface RailButtonProps {
  label: string;
  shortcut: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** Icon button with a tooltip naming the tool and its shortcut (appears after a short hover, leaves faster). */
function RailButton({ label, shortcut, active, onClick, children }: RailButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="group relative grid size-10 place-items-center rounded-lg text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.06] hover:text-ink active:scale-[0.94] aria-pressed:bg-blue/15 aria-pressed:text-azure"
    >
      {children}
      <span className="pointer-events-none absolute left-full z-10 ml-2 flex origin-left scale-95 items-center gap-2 rounded-lg bg-raised px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-ink opacity-0 shadow-lg transition-[opacity,scale] duration-100 ease-in group-hover:scale-100 group-hover:opacity-100 group-hover:delay-300 group-hover:duration-150 group-hover:ease-out">
        {label}
        <Kbd>{shortcut}</Kbd>
      </span>
    </button>
  );
}

interface IndicatorsMenuProps {
  enabled: Record<IndicatorKey, boolean>;
  onToggle: (key: IndicatorKey) => void;
}

/** Dropdown that opens from its trigger at 0.95 scale in 160ms and leaves in 100ms. */
function IndicatorsMenu({ enabled, onToggle }: IndicatorsMenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    // Registered on document so it runs (and stops propagation) before the window-level Esc that exits advanced view.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const count = Object.values(enabled).filter(Boolean).length;
  return (
    <div ref={container} className="relative shrink-0">
      <ToolbarButton aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <IndicatorsIcon />
        Indicators
        {count > 0 && <span className="tabular rounded-full bg-blue px-1.5 text-[11px] font-semibold text-white">{count}</span>}
      </ToolbarButton>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1, ease: EASE_IN } }}
            // `fixed` with no offsets keeps its in-flow position but escapes the toolbar's horizontal-scroll clipping.
            className="fixed z-20 mt-1 w-48 origin-top-left rounded-xl bg-raised p-1 shadow-2xl ring-1 ring-white/10"
          >
            {INDICATORS.map((indicator) => (
              <button
                key={indicator.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={enabled[indicator.key]}
                onClick={() => onToggle(indicator.key)}
                className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-100 hover:bg-white/[0.06]"
              >
                <span
                  className={`grid size-4 place-items-center rounded border transition-colors duration-150 ${
                    enabled[indicator.key] ? "border-blue bg-blue" : "border-white/25"
                  }`}
                >
                  {enabled[indicator.key] && (
                    <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path d="m2.5 6 2.5 2.5 4.5-5" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 text-left">{indicator.label}</span>
                <span className="h-0.5 w-4 rounded-full" style={{ background: indicator.color }} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
