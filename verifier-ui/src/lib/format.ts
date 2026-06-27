export const short = (s: string, n = 10): string =>
  s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s;

export const EXPLORER = 'https://preprod.midnightexplorer.com/';

/** YYYYMMDD int (as stored on-chain) → human date. */
export const fromYyyymmdd = (n: number | undefined): string => {
  if (!n) return 'n/a';
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
