import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { Contract, Witnesses, PassportPrivateState } from 'credport-contract';

/** Key under which the passport's private state is stored in the private-state provider. */
export const passportPrivateStateId = 'passportPrivateState';
export type PassportPrivateStateId = typeof passportPrivateStateId;

export type PassportContract = Contract<PassportPrivateState, Witnesses<PassportPrivateState>>;

export type PassportCircuitKeys = Exclude<keyof PassportContract['impureCircuits'], number | symbol>;

export type PassportProviders = MidnightProviders<
  PassportCircuitKeys,
  PassportPrivateStateId,
  PassportPrivateState
>;

export type DeployedPassportContract = FoundContract<PassportContract>;

/** Real-world attributes an issuer attests to. Only ever held client-side. */
export interface CredentialAttributes {
  /** Legal name, as verified from the document. Bound into the credential. */
  readonly name: string;
  /** Date of birth. */
  readonly birthDate: Date | string;
  /** ISO 3166-1 numeric country code (e.g. 276 = Germany). Defaults to 0. */
  readonly country?: number;
  /** Accredited-investor flag. Defaults to false. */
  readonly accredited?: boolean;
}

/**
 * A portable, JSON-serializable credential handed from issuer to holder after
 * off-chain identity verification. Contains the attribute plaintext and the
 * commitment opening — it is SECRET and belongs only on the holder's device.
 */
export interface CredentialFile {
  readonly version: 1;
  readonly contractAddress: string;
  /** Holder's public key (hex). */
  readonly subjectPublicKey: string;
  /** Credential commitment recorded on-chain (hex). */
  readonly commitment: string;
  /** Commitment randomness (hex). */
  readonly salt: string;
  /** 32-byte name hash (hex) bound into the commitment. */
  readonly nameHash: string;
  readonly attributes: {
    /** Legal name, held only in this file (never on-chain). */
    readonly name: string;
    /** YYYYMMDD */
    readonly birthDate: number;
    readonly country: number;
    readonly accredited: boolean;
  };
}

/** Returned by holder-side prove calls. Hand the sessionId to the verifying dApp. */
export interface ProofReceipt {
  /** Opaque session identifier (hex) the verification is recorded under. */
  readonly sessionId: string;
  readonly txHash?: string;
  readonly blockHeight?: number;
}

/** What a consuming dApp learns — and ALL it learns. */
export interface AgeVerificationResult {
  readonly verified: boolean;
  /** Age threshold that was proven (only when verified). */
  readonly threshold?: number;
  /** Date (YYYYMMDD) the proof was evaluated against (only when verified). */
  readonly asOfDate?: number;
  /** Populated when verification failed. */
  readonly reason?: string;
}

export interface UniqueHumanVerificationResult {
  readonly verified: boolean;
  /** Stable pseudonymous nullifier — same human, same nullifier; identity unknown. */
  readonly nullifier?: string;
  readonly reason?: string;
}

/** Result of an identity proof: name matched AND age met, in one shot. */
export interface IdentityVerificationResult {
  readonly verified: boolean;
  /** Age threshold proven (only when verified). */
  readonly threshold?: number;
  /** Date (YYYYMMDD) the proof was evaluated against (only when verified). */
  readonly asOfDate?: number;
  readonly reason?: string;
}

/** Minimal logger the SDK accepts (structurally compatible with pino & console). */
export interface PassportLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}
