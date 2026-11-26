"use client";

import { useState } from "react";

/** Long copy clamped to four lines with a "More" toggle. */
export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="text-sm leading-relaxed text-ink/85">
      <p className={expanded ? "" : "line-clamp-4"}>{text}</p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="hit-slop relative mt-1 font-medium text-azure"
      >
        {expanded ? "Less" : "More"}
      </button>
    </div>
  );
}
