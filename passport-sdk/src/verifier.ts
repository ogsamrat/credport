import { ledger, type Ledger } from 'credport-contract';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { firstValueFrom, map } from 'rxjs';
import type {
  AgeVerificationResult,
  IdentityVerificationResult,
  UniqueHumanVerificationResult,
} from './types.js';
import { asBytes, daysBetween, fromYyyymmdd, newSessionId, toHex } from './encoding.js';
import { PREPROD, type PassportNetworkConfig } from './config.js';

/**
 * Verifier role: what ANY consuming dApp needs — and all it needs.
 *
 * Deliberately requires NO wallet, NO proof server, and NO private state:
 * just an indexer connection and the passport contract address. A dApp
 * generates a session id, asks the user to prove against it, then reads
 * back an opaque `verified ✓`.
 */
export class Verifier {
  constructor(
    private readonly publicDataProvider: PublicDataProvider,
    public readonly contractAddress: string,
  ) {}

  /** Connects a verifier to a passport contract over just an indexer. */
  static connect(
    contractAddress: string,
    network: Pick<PassportNetworkConfig, 'indexer' | 'indexerWS'> = PREPROD,
  ): Verifier {
    return new Verifier(
      indexerPublicDataProvider(network.indexer, network.indexerWS),
      contractAddress,
    );
  }

  /** Fresh opaque session id to hand to the prover. */
  newSessionId(): string {
    return newSessionId();
  }

  private async ledgerState(): Promise<Ledger> {
    return firstValueFrom(
      this.publicDataProvider
        .contractStateObservable(this.contractAddress, { type: 'latest' })
        .pipe(map((contractState) => ledger(contractState.data))),
    );
  }

  /**
   * Checks whether `sessionId` carries a valid age verification.
   *
   * @param minThreshold Reject proofs made against a lower threshold.
   * @param maxSkewDays Reject proofs evaluated against a stale/future date.
   */
  async verifyAgeOver(
    sessionId: string | Uint8Array,
    minThreshold = 18,
    maxSkewDays = 2,
  ): Promise<AgeVerificationResult> {
    const state = await this.ledgerState();
    const key = asBytes(sessionId);

    if (!state.ageVerifications.member(key)) {
      return { verified: false, reason: 'no verification recorded for this session' };
    }

    const record = state.ageVerifications.lookup(key);
    const threshold = Number(record.threshold);
    const asOfDate = Number(record.asOfDate);

    if (threshold < minThreshold) {
      return {
        verified: false,
        threshold,
        asOfDate,
        reason: `proven threshold ${threshold} is below required ${minThreshold}`,
      };
    }

    const skew = Math.abs(daysBetween(new Date(), fromYyyymmdd(asOfDate)));
    if (skew > maxSkewDays) {
      return {
        verified: false,
        threshold,
        asOfDate,
        reason: `proof was evaluated against a date ${skew} days from today`,
      };
    }

    return { verified: true, threshold, asOfDate };
  }

  /**
   * Checks whether `sessionId` carries an identity verification (name matched
   * AND age met). A record only exists if both proofs passed, so its presence
   * is the result.
   *
   * @param minThreshold Reject proofs made against a lower age threshold.
   * @param maxSkewDays Reject proofs evaluated against a stale/future date.
   */
  async verifyIdentity(
    sessionId: string | Uint8Array,
    minThreshold = 18,
    maxSkewDays = 2,
  ): Promise<IdentityVerificationResult> {
    const state = await this.ledgerState();
    const key = asBytes(sessionId);

    if (!state.identityVerifications.member(key)) {
      return { verified: false, reason: 'no verification recorded for this session' };
    }

    const record = state.identityVerifications.lookup(key);
    const threshold = Number(record.threshold);
    const asOfDate = Number(record.asOfDate);

    if (threshold < minThreshold) {
      return { verified: false, threshold, asOfDate, reason: `proven threshold ${threshold} is below required ${minThreshold}` };
    }
    const skew = Math.abs(daysBetween(new Date(), fromYyyymmdd(asOfDate)));
    if (skew > maxSkewDays) {
      return { verified: false, threshold, asOfDate, reason: `proof was evaluated against a date ${skew} days from today` };
    }
    return { verified: true, threshold, asOfDate };
  }

  /**
   * Checks whether `sessionId` carries a unique-human verification and returns
   * the per-scope nullifier. Same human + same dApp scope ⇒ same nullifier
   * (enforce one-account-per-human by rejecting a nullifier you've seen before);
   * different scopes are unlinkable.
   */
  async verifyUniqueHuman(sessionId: string | Uint8Array): Promise<UniqueHumanVerificationResult> {
    const state = await this.ledgerState();
    const key = asBytes(sessionId);

    if (!state.uniqueHumanVerifications.member(key)) {
      return { verified: false, reason: 'no verification recorded for this session' };
    }
    return { verified: true, nullifier: toHex(state.uniqueHumanVerifications.lookup(key)) };
  }
}
