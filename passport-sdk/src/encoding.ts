import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';

export { toHex, fromHex };

/** Cryptographically random bytes (browser + Node WebCrypto). */
export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

/** Fresh opaque 32-byte session id, hex-encoded. */
export const newSessionId = (): string => toHex(randomBytes(32));

export const asBytes = (value: string | Uint8Array): Uint8Array =>
  typeof value === 'string' ? fromHex(value) : value;

/**
 * Coerces an arbitrary scope identifier into a 32-byte value. A 64-char hex
 * string (e.g. a contract address) is used verbatim; anything else is hashed
 * to 32 bytes via SHA-256 so any dApp-chosen string works as a scope.
 */
export const scopeToBytes = async (scope: string | Uint8Array): Promise<Uint8Array> => {
  if (scope instanceof Uint8Array) return fit32(scope);
  if (/^[0-9a-fA-F]{64}$/.test(scope)) return fromHex(scope);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope));
  return new Uint8Array(digest);
};

const fit32 = (bytes: Uint8Array): Uint8Array => {
  if (bytes.length === 32) return bytes;
  const out = new Uint8Array(32);
  out.set(bytes.slice(0, 32));
  return out;
};

/** Canonical form of a legal name for hashing: lowercase, single-spaced, trimmed. */
export const normalizeName = (name: string): string =>
  name.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

/**
 * Deterministic 32-byte hash of a normalized name. The issuer commits to this
 * at issuance; a verifier computes it from the name it is checking. The circuit
 * only ever compares the two hashes, so the name itself stays private.
 */
export const nameHash = async (name: string): Promise<Uint8Array> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zkp:name:' + normalizeName(name)));
  return new Uint8Array(digest);
};

/**
 * Encodes a date as YYYYMMDD (UTC). This encoding makes age arithmetic exact:
 * age >= t  <=>  asOfDate >= birthDate + t * 10000.
 */
export const yyyymmdd = (date: Date | string): bigint => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${String(date)}`);
  }
  return BigInt(d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate());
};

/** Parses a YYYYMMDD number back into a UTC date. */
export const fromYyyymmdd = (value: number | bigint): Date => {
  const n = Number(value);
  return new Date(Date.UTC(Math.floor(n / 10000), Math.floor((n % 10000) / 100) - 1, n % 100));
};

/** Whole calendar days between two dates (a - b). */
export const daysBetween = (a: Date, b: Date): number =>
  Math.round((a.getTime() - b.getTime()) / 86_400_000);
