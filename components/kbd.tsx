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
