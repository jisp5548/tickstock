"use client";

import Image from "next/image";
import { useState, ViewTransition } from "react";

const SIZES = { sm: 36, md: 44, lg: 56 } as const;

/**
 * Soft tint shown in the tile while the logo loads (a blur-hash stand-in: logos are too small for
 * next/image's blur placeholder). Hue is derived from the ticker so it's stable across renders.
 */
function placeholderTint(symbol: string): string {
  const hue = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0) * 37, 0) % 360;
  return `hsl(${hue} 40% 45% / 0.6)`;
}

interface LogoProps {
  symbol: string;
  size?: keyof typeof SIZES;
  /** White artwork needs a dark tile. */
  light?: boolean;
  /**
   * Opt-in shared-element transition. Only give it to logos that unmount on navigation (homepage tiles)
   * and their destination (the detail header): two mounted logos with one name break the transition.
   */
  morph?: boolean;
}

export function Logo({ symbol, size = "sm", light = false, morph = false }: LogoProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pixels = SIZES[size];
  const tile = (
      <span
        style={
          {
            width: pixels,
            height: pixels,
            "--radius": `${pixels * 0.28}px`,
            backgroundColor: loaded || failed ? undefined : placeholderTint(symbol),
          } as React.CSSProperties
        }
        className={`squircle grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] transition-colors duration-300 ${
          light || failed ? "bg-raised ring-1 ring-rule ring-inset" : "bg-white"
        }`}
      >
        {failed ? (
          <span className="font-display text-xs font-medium text-muted">{symbol.slice(0, 2)}</span>
        ) : (
          <Image
            src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
            alt=""
            width={pixels}
            height={pixels}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`size-[72%] object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </span>
  );
  return morph ? <ViewTransition name={`logo-${symbol}`}>{tile}</ViewTransition> : tile;
}
