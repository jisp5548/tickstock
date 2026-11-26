import Link from "next/link";

export default function StockNotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">No such ticker</h1>
        <p className="text-muted">AlphaVantage has no data for that symbol. Try searching instead.</p>
        <Link href="/" className="inline-flex h-10 items-center rounded-full bg-blue px-5 text-sm font-semibold text-white">
          Back to watchlist
        </Link>
      </div>
    </div>
  );
}
