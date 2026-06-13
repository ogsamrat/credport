/*
 * The passport's private state and witness implementations.
 *
 * Everything in this file lives ONLY on the user's machine. Witness values are
 * fed into local proof generation; they are never transmitted or written
 * on-chain. The circuits constrain them against public commitments instead.
 */

import type { Ledger } from './managed/passport/contract/index.js';
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

/** The verified attributes + opening of an issued credential. */
export type PassportCredential = {
  /** Birth date encoded as YYYYMMDD (e.g. 20001231). */
  readonly birthDate: bigint;
  /** ISO 3166-1 numeric country code (e.g. 276 = Germany). */
  readonly country: bigint;
  /** Accredited-investor flag. */
  readonly accredited: boolean;
  /** 32-byte hash of the holder's legal name (precomputed; the name itself stays out of state). */
  readonly nameHash: Uint8Array;
  /** Commitment randomness binding these attributes to the on-chain commitment. */
  readonly salt: Uint8Array;
};

/**
 * Private state for the passport contract. All fields are optional because a
 * participant may hold only one role: an issuer has `issuerSecretKey`, a
 * credential holder has `userSecretKey` (+ `credential` once issued).
 */
export type PassportPrivateState = {
  readonly userSecretKey?: Uint8Array;
  readonly issuerSecretKey?: Uint8Array;
  readonly credential?: PassportCredential;
};

export const createPassportPrivateState = (
  state: PassportPrivateState = {},
): PassportPrivateState => state;

type Ctx = WitnessContext<Ledger, PassportPrivateState>;

const requireUserKey = (ps: PassportPrivateState): Uint8Array => {
  if (!ps.userSecretKey) {
    throw new Error('No holder secret key in private state — call holder.enroll() first.');
  }
  return ps.userSecretKey;
};

const requireIssuerKey = (ps: PassportPrivateState): Uint8Array => {
  if (!ps.issuerSecretKey) {
    throw new Error('No issuer secret key in private state — this wallet is not an issuer.');
  }
  return ps.issuerSecretKey;
};

const requireCredential = (ps: PassportPrivateState): PassportCredential => {
  if (!ps.credential) {
    throw new Error('No credential in private state — store an issued credential first.');
  }
  return ps.credential;
};

export const witnesses = {
  issuerSecretKey: ({ privateState }: Ctx): [PassportPrivateState, Uint8Array] => [
    privateState,
    requireIssuerKey(privateState),
  ],

  userSecretKey: ({ privateState }: Ctx): [PassportPrivateState, Uint8Array] => [
    privateState,
    requireUserKey(privateState),
  ],

  credentialBirthDate: ({ privateState }: Ctx): [PassportPrivateState, bigint] => [
    privateState,
    requireCredential(privateState).birthDate,
  ],

  credentialCountry: ({ privateState }: Ctx): [PassportPrivateState, bigint] => [
    privateState,
    requireCredential(privateState).country,
  ],

  credentialAccredited: ({ privateState }: Ctx): [PassportPrivateState, boolean] => [
    privateState,
    requireCredential(privateState).accredited,
  ],

  credentialNameHash: ({ privateState }: Ctx): [PassportPrivateState, Uint8Array] => [
    privateState,
    requireCredential(privateState).nameHash,
  ],

  credentialSalt: ({ privateState }: Ctx): [PassportPrivateState, Uint8Array] => [
    privateState,
    requireCredential(privateState).salt,
  ],

  /**
   * Builds the Merkle authentication path for the holder's commitment from
   * the (public) on-chain tree. The path itself doesn't reveal anything — it
   * is only used inside the local proof.
   */
  credentialAuthPath: (
    { privateState, ledger }: Ctx,
    commitment: Uint8Array,
  ): [PassportPrivateState, ReturnType<Ledger['credentials']['pathForLeaf']>] => {
    const path = ledger.credentials.findPathForLeaf(commitment);
    if (!path) {
      throw new Error(
        'Credential commitment not found in the on-chain registry — has it been issued?',
      );
    }
    return [privateState, path];
  },
};
