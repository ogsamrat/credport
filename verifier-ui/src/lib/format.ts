export const short = (s: string, n = 10): string =>
  s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s;

export const EXPLORER = 'https://preprod.midnightexplorer.com/';

/** Deep link to a contract on the preprod explorer (addresses are 0x-prefixed there). */
export const contractUrl = (address: string): string =>
  `https://preprod.midnightexplorer.com/contracts/0x${address}`;

/** YYYYMMDD int (as stored on-chain) → human date. */
export const fromYyyymmdd = (n: number | undefined): string => {
  if (!n) return 'n/a';
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
