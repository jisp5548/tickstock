"use client";

import { useSyncExternalStore } from "react";

/** Matches Tailwind's `md` breakpoint: below it the app uses sheets instead of side-by-side panels. */
const QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
