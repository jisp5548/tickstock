/** Rows/tiles enter one after another; the cap keeps the last one from waiting too long. */
export function staggerDelay(index: number, stepMs = 30): React.CSSProperties {
  return { animationDelay: `${Math.min(index * stepMs, 360)}ms` };
}
