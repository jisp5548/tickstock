"use client";

import { usePillMode } from "@/lib/preferences";
import type { Change } from "@/lib/series";
import { formatChange, isPositive } from "@/lib/trend";

/** Solid green/red pill; shows % or $ per the user's global preference. */
export function ChangePill({ change }: { change: Change }) {
  const [mode] = usePillMode();
  return (
    <span
      className={`tabular inline-flex min-w-[4.75rem] justify-end rounded-md px-1.5 py-0.5 text-sm font-semibold text-white ${
        isPositive(change) ? "bg-up-pill" : "bg-down-pill"
      }`}
    >
      {formatChange(change, mode)}
    </span>
  );
}
