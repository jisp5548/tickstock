"use client";

import { useSyncExternalStore } from "react";
import { usePillMode } from "@/lib/preferences";
import { useOpenPalette } from "./command-palette";
import { Kbd } from "./kbd";

const noopSubscribe = () => () => {};

function useModifierLabel(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
}

/** Looks like a search field but opens the command palette, so search lives in exactly one place. */
export function SearchTrigger() {
  const openPalette = useOpenPalette();
  const modifier = useModifierLabel();
  return (
    <button
      type="button"
      onClick={openPalette}
      className="flex h-11 w-full items-center gap-2 rounded-2xl bg-raised px-3 text-left text-muted transition-[background-color,scale] duration-150 ease-out hover:bg-[#2c2c2c] active:scale-[0.99]"
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>
      <span className="flex-1">Search</span>
      <Kbd>{modifier}K</Kbd>
    </button>
  );
}

/** Switches every change pill between percent and dollars (Apple's tap-the-pill behavior, as a labelled control). */
export function PillModeToggle() {
  const [mode, toggle] = usePillMode();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Show changes in ${mode === "percent" ? "dollars" : "percent"}`}
      className="hit-slop relative flex h-7 items-center rounded-full bg-raised p-0.5 text-xs font-semibold"
    >
      {(["percent", "amount"] as const).map((option) => (
        <span
          key={option}
          className={`grid h-6 w-7 place-items-center rounded-full transition-colors duration-200 ${
            mode === option ? "bg-blue text-white" : "text-muted"
          }`}
        >
          {option === "percent" ? "%" : "$"}
        </span>
      ))}
    </button>
  );
}

const SNAPSHOT_AGE_MS = 86_400_000;

/** Flags data older than a day (i.e. served from the committed snapshot). Evaluated in the browser so cached pages stay honest. */
export function SnapshotBadge({ fetchedAt }: { fetchedAt: string }) {
  const old = useSyncExternalStore(noopSubscribe, () => Date.now() - Date.parse(fetchedAt) > SNAPSHOT_AGE_MS, () => false);
  return old && <span className="ml-1.5 rounded-full bg-white/[0.08] px-1.5 py-px text-[11px]">Cached snapshot</span>;
}
