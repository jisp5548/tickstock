"use client";

import { usePathname } from "next/navigation";
import { addTransitionType, createContext, startTransition, use, useState, ViewTransition } from "react";
import { useIsMobile, usePrefersReducedMotion } from "@/lib/use-media-query";

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

/** Shared-element morphs run on desktop only: full-screen snapshots are too heavy for phone GPUs. */
function useMorphs(): boolean {
  const mobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  return !mobile && !reducedMotion;
}

/**
 * <ViewTransition> where morphs are on; plain children elsewhere. React starts a view transition whenever a
 * <ViewTransition> boundary mounts, so on phones the boundary itself must be absent, not just unnamed.
 */
export function MorphTransition({ name, children }: { name: string; children: React.ReactNode }) {
  return useMorphs() ? <ViewTransition name={name}>{children}</ViewTransition> : children;
}

/**
 * Owns the standard ↔ advanced switch. It always renders as a non-blocking transition, so a tap or key
 * press responds immediately and the workspace mounts in interruptible slices. On desktop that same
 * transition drives the view-transition morph (the type lets CSS time entering and leaving differently);
 * on phones the workspace just slides up as one compositor-only layer.
 */
export function AdvancedViewProvider({ children }: { children: React.ReactNode }) {
  const available = usePathname().startsWith("/stock/");
  const [enabled, setEnabled] = useState(false);
  // Leaving stock pages ends advanced mode, so returning to a stock later starts in the standard view.
  if (enabled && !available) setEnabled(false);

  function setActive(next: boolean) {
    startTransition(() => {
      addTransitionType(next ? "advanced-enter" : "advanced-exit");
      setEnabled(next && available);
    });
  }

  return <AdvancedViewContext value={{ available, active: enabled && available, setActive }}>{children}</AdvancedViewContext>;
}
