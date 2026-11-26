"use client";

import { useRouter } from "next/navigation";

/**
 * Whether the current page was reached by an in-app link. Module state survives client navigations
 * but resets on a full load, which is exactly when there is no in-app page to go back to.
 */
let cameFromApp = false;

export function markInAppNavigation(): void {
  cameFromApp = true;
}

/** Go back to the list: pop history when we came from it, otherwise replace (deep links land on home). */
export function useBackToList(): () => void {
  const router = useRouter();
  return () => (cameFromApp ? router.back() : router.replace("/"));
}
