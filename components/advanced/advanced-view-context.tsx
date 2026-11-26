"use client";

import { usePathname } from "next/navigation";
import { addTransitionType, createContext, startTransition, use, useState } from "react";

interface AdvancedView {
  /** Advanced view is only offered on stock pages. */
  available: boolean;
  active: boolean;
  setActive: (next: boolean) => void;
}

const AdvancedViewContext = createContext<AdvancedView>({ available: false, active: false, setActive: () => {} });

export function useAdvancedView(): AdvancedView {
  return use(AdvancedViewContext);
}

/**
 * Owns the standard ↔ advanced switch. Toggling runs inside startTransition, which is what lets React's
 * <ViewTransition> boundaries morph every shared element (watchlist, search, chart, price, ranges) in one go.
 */
export function AdvancedViewProvider({ children }: { children: React.ReactNode }) {
  const available = usePathname().startsWith("/stock/");
  const [enabled, setEnabled] = useState(false);
  // Leaving stock pages ends advanced mode, so returning to a stock later starts in the standard view.
  if (enabled && !available) setEnabled(false);

  // The transition type lets CSS time entering (longer, expressive) and leaving (shorter) differently.
  const setActive = (next: boolean) =>
    startTransition(() => {
      addTransitionType(next ? "advanced-enter" : "advanced-exit");
      setEnabled(next && available);
    });
  return <AdvancedViewContext value={{ available, active: enabled && available, setActive }}>{children}</AdvancedViewContext>;
}
