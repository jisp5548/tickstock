"use client";

import { useEffect, useState } from "react";

const CYCLE_MS = 2400;

/** Placeholder overlay that cycles through example queries; render it only while the input is empty. */
export function AnimatedPlaceholder({ phrases, prefix }: { phrases: readonly string[]; prefix: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % phrases.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <span aria-hidden className="pointer-events-none absolute left-9 text-base text-muted">
      {prefix}
      <span key={index} className="inline-block animate-placeholder">
        {phrases[index]}
      </span>
    </span>
  );
}
