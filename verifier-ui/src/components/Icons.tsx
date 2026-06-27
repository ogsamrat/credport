/* Minimal line icons, currentColor, no emoji. */
type P = { size?: number; className?: string };

const base = (size: number): React.CSSProperties => ({
  display: 'inline-block',
  verticalAlign: 'middle',
  flexShrink: 0,
  width: size,
  height: size,
});

export const Check = ({ size = 14, className }: P) => (
  <svg viewBox="0 0 16 16" fill="none" style={base(size)} className={className} aria-hidden="true">
    <path d="M3.5 8.6l2.9 2.9L12.6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Lock = ({ size = 16, className }: P) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size)} className={className} aria-hidden="true">
    <rect x="4" y="9" width="12" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Upload = ({ size = 18, className }: P) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size)} className={className} aria-hidden="true">
    <path d="M10 13V4M6.5 7.2L10 3.6l3.5 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 13.5v1.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ArrowRight = ({ size = 16, className }: P) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size)} className={className} aria-hidden="true">
    <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Wallet = ({ size = 18, className }: P) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size)} className={className} aria-hidden="true">
    <rect x="3" y="5" width="14" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="13.5" cy="11.5" r="1" fill="currentColor" />
  </svg>
);
