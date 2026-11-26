import { useId } from "react";
import { areaPath, linePath, plotValues } from "@/lib/series";
import { trendColor } from "@/lib/trend";

const WIDTH = 72;
const HEIGHT = 32;

interface SparklineProps {
  values: readonly number[];
  positive: boolean;
  className?: string;
}

/** Static mini chart (no interactivity), so it renders on the server. Stretches to fill its box. */
export function Sparkline({ values, positive, className }: SparklineProps) {
  const gradientId = useId();
  const plots = plotValues(values, WIDTH, HEIGHT, 2);
  const color = trendColor(positive);
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path className="area-fill" d={areaPath(plots, HEIGHT)} fill={`url(#${gradientId})`} />
      <path d={linePath(plots)} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
