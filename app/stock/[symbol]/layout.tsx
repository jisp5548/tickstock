import { StockSheet } from "@/components/stock/stock-sheet";

/** The sheet lives in the layout so it stays put (no re-entry animation) while pages and loading states swap inside it. */
export default function StockLayout({ children }: LayoutProps<"/stock/[symbol]">) {
  return <StockSheet>{children}</StockSheet>;
}
