"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FILL_KEY, PILL_KEY } from "./preference-keys";
import type { PillMode } from "./trend";

const CHANGE_EVENT = "tickstock:preference";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A string preference persisted per browser. Server render (and blocked storage) uses `fallback`. */
function usePreference<T extends string>(key: string, fallback: T, onSet?: (value: T) => void): [T, (value: T) => void] {
  const value = useSyncExternalStore(subscribe, () => (read(key) as T | null) ?? fallback, () => fallback);
  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage can be unavailable (private mode); the change still applies to this page view via onSet.
      }
      onSet?.(next);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key, onSet],
  );
  return [value, setValue];
}

type Fill = "on" | "off";

/** Mirrored onto <html data-fill>, which CSS uses to hide every `.area-fill` (the root layout sets it before first paint). */
function applyFill(fill: Fill): void {
  document.documentElement.dataset.fill = fill;
}

export function useAreaFill(): [boolean, () => void] {
  const [fill, setFill] = usePreference<Fill>(FILL_KEY, "on", applyFill);
  return [fill === "on", () => setFill(fill === "on" ? "off" : "on")];
}


export function usePillMode(): [PillMode, () => void] {
  const [mode, setMode] = usePreference<PillMode>(PILL_KEY, "percent");
  return [mode, () => setMode(mode === "percent" ? "amount" : "percent")];
}
