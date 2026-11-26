"use client";

import { useSyncExternalStore } from "react";
import { subscribeNever } from "@/lib/browser-value";

/** Keyboard shortcut hint. Hidden on touch-only devices, where there's no keyboard to press it on. */
export function Kbd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.08] px-1.5 font-sans text-[11px] font-medium text-muted [@media(hover:none)]:hidden ${className}`}
    >
      {children}
    </kbd>
  );
}

/** ⌘K on Apple platforms, Ctrl K elsewhere (server render assumes ⌘). */
export function ModKbd({ letter, className }: { letter: string; className?: string }) {
  const modifier = useSyncExternalStore(
    subscribeNever,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
  return (
    <Kbd className={className}>
      {modifier}
      {letter}
    </Kbd>
  );
}
