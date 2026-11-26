"use client";

import { useCallback, useState } from "react";

interface Size {
  width: number;
  height: number;
}

/**
 * Callback ref that tracks an element's size. It measures synchronously on attach (not just in the first
 * ResizeObserver callback) so content is already drawn when a view transition snapshots the new state.
 */
export function useElementSize<T extends HTMLElement>(): [(element: T | null) => () => void, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const ref = useCallback((element: T | null) => {
    if (!element) return () => {};
    const update = () =>
      setSize((current) =>
        current.width === element.clientWidth && current.height === element.clientHeight
          ? current
          : { width: element.clientWidth, height: element.clientHeight },
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}
