"use client";

import { animate, motion, useDragControls, useMotionValue, useTransform, type HTMLMotionProps } from "motion/react";
import { EASE_IN } from "@/lib/motion";

/** Pull distance (px) or flick speed (px/s) that commits a dismiss. */
const DISMISS_OFFSET = 120;
const DISMISS_VELOCITY = 600;

interface SheetProps extends Omit<HTMLMotionProps<"div">, "drag" | "children"> {
  onDismiss: () => void;
  /**
   * Off on desktop, where the same markup renders as a plain panel (the grabber bar is CSS-hidden at md+).
   * Dragging starts only from the grabber bar, so the body can still scroll normally.
   */
  draggable: boolean;
  children: React.ReactNode;
  backdropClassName?: string;
}

/**
 * Bottom sheet that follows the finger and dismisses on a long pull or a flick. While pulling, the
 * backdrop fades so the page underneath previews what dismissing returns to.
 */
export function Sheet({ onDismiss, draggable, children, backdropClassName = "", style, ...props }: SheetProps) {
  const controls = useDragControls();
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 400], [1, 0]);

  async function dismiss() {
    await animate(y, window.innerHeight, { duration: 0.2, ease: EASE_IN });
    onDismiss();
  }

  return (
    <>
      <motion.div aria-hidden className={backdropClassName} style={{ opacity: backdropOpacity }} onClick={dismiss} />
      <motion.div
        {...props}
        drag={draggable ? "y" : false}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) void dismiss();
        }}
        style={{ ...style, y }}
      >
        <div
          onPointerDown={(event) => draggable && controls.start(event)}
          className="relative flex h-11 shrink-0 touch-none items-start justify-center pt-2 md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-white/25" />
          <button
            type="button"
            onClick={dismiss}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Close"
            className="hit-slop absolute top-2 right-3 grid size-7 place-items-center rounded-full bg-white/10 text-muted"
          >
            <svg viewBox="0 0 12 12" className="size-3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </>
  );
}
