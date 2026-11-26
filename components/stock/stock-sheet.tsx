"use client";

import { useBackToList } from "@/lib/navigation";
import { useIsMobile } from "@/lib/use-media-query";
import { Sheet } from "../sheet";

/**
 * Phones: the stock page is a sheet over the still-mounted list (like iPhone Stocks); pulling it down
 * previews the list underneath and dismissing goes back to it. Desktop: a plain content column.
 */
export function StockSheet({ children }: { children: React.ReactNode }) {
  const mobile = useIsMobile();
  const backToList = useBackToList();
  return (
    <Sheet
      draggable={mobile}
      onDismiss={backToList}
      backdropClassName="fixed inset-0 z-30 touch-none bg-black/60 md:hidden"
      className="max-md:fixed max-md:inset-x-0 max-md:top-[calc(env(safe-area-inset-top)+0.75rem)] max-md:bottom-0 max-md:z-40 max-md:flex max-md:animate-sheet-in max-md:flex-col max-md:rounded-t-[28px] max-md:bg-panel max-md:ring-1 max-md:ring-white/10"
    >
      <div className="mx-auto w-full max-w-5xl space-y-12 px-5 pb-[max(3rem,env(safe-area-inset-bottom))] max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-contain md:px-10 md:pt-10">
        {children}
      </div>
    </Sheet>
  );
}
