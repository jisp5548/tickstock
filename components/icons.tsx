/** Small stroke icons shared across the UI. Size and color come from the parent (`size-4`, `currentColor`). */
type IconProps = { className?: string };

function Icon({ className = "size-4", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4" />
  </Icon>
);

export const CrosshairIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 2v5M10 13v5M2 10h5M13 10h5" />
  </Icon>
);

export const RulerIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 13 10-10 4 4-10 10z" />
    <path d="m6 10 1.5 1.5M8.5 7.5 10 9M11 5l1.5 1.5" />
  </Icon>
);

export const ZoomInIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4M6.5 9h5M9 6.5v5" />
  </Icon>
);

export const ZoomOutIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4M6.5 9h5" />
  </Icon>
);

export const FitIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
  </Icon>
);

export const CandlesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 2v3M6 13v5M14 2v5M14 14v4" />
    <rect x="4" y="5" width="4" height="8" rx="1" />
    <rect x="12" y="7" width="4" height="7" rx="1" />
  </Icon>
);

export const LineIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m2 15 5-6 4 3 7-8" />
  </Icon>
);

export const IndicatorsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 17h16M4 13l4-5 3 3 5-7" />
  </Icon>
);
