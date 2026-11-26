/** A price line that keeps drawing itself while the stock loads, framed by skeletons of the real layout. */
export default function StockLoading() {
  return (
    <div aria-busy aria-label="Loading stock" className="space-y-12">
      <div className="flex items-center gap-4">
        <span className="skeleton size-14 rounded-2xl" />
        <span className="space-y-2">
          <span className="skeleton block h-8 w-24 rounded-lg" />
          <span className="skeleton block h-4 w-44 rounded" />
        </span>
      </div>
      <div>
        <span className="skeleton block h-11 w-40 rounded-lg" />
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="mt-6 h-64 w-full md:h-80" aria-hidden>
          <defs>
            <linearGradient id="loading-stroke" x1="0" x2="1">
              <stop offset="0%" stopColor="var(--color-blue)" stopOpacity={0} />
              <stop offset="50%" stopColor="var(--color-azure)" />
              <stop offset="100%" stopColor="var(--color-up)" />
            </linearGradient>
          </defs>
          <path
            d="M0 92 L30 84 L55 88 L80 70 L105 76 L130 58 L150 64 L175 45 L200 52 L225 38 L250 46 L275 30 L300 36 L325 22 L350 28 L375 14 L400 18"
            pathLength={1}
            strokeDasharray="0.55 0.45"
            fill="none"
            stroke="url(#loading-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="animate-draw"
          />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="skeleton h-5 rounded" />
        ))}
      </div>
    </div>
  );
}
