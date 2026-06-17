import { pureCircuits } from 'credport-contract';
import type { PassportAPI } from './api.js';
import type { CredentialFile, ProofReceipt } from './types.js';
import { asBytes, fromHex, nameHash, newSessionId, randomBytes, scopeToBytes, toHex, yyyymmdd } from './encoding.js';

/**
 * Holder role: owns a credential in private state and proves predicates about
 * it. Proofs are generated locally (via the proof server); the attributes
 * themselves never leave this machine.
 */
export class Holder {
  constructor(private readonly api: PassportAPI) {}

  /**
   * Ensures this holder has a secret key, and returns the public values the
   * issuer needs during enrollment. The secret key itself stays local.
   *
   * `enrollmentNullifier` is the issuer-time dedup tag. For real sybil
   * resistance the issuer should instead derive it from a KYC-unique
   * identifier and de-duplicate humans off-chain; the holder-derived value
   * here is for the self-serve demo.
   */
  async enroll(): Promise<{ publicKey: string; enrollmentNullifier: string }> {
    let ps = await this.api.privateState();
    if (!ps.userSecretKey) {
      ps = { ...ps, userSecretKey: randomBytes(32) };
      await this.api.setPrivateState(ps);
    }
    const sk = ps.userSecretKey!;
    return {
      publicKey: toHex(pureCircuits.publicKey(sk)),
      enrollmentNullifier: toHex(pureCircuits.enrollmentNullifier(sk)),
    };
  }

  /**
   * Stores an issued credential into private state, first validating that it
   * actually opens to this holder's secret key (i.e. the commitment matches).
   */
  async store(credential: CredentialFile): Promise<void> {
    const ps = await this.api.privateState();
    if (!ps.userSecretKey) {
      throw new Error('Call enroll() before storing a credential.');
    }

    const subjectPk = pureCircuits.publicKey(ps.userSecretKey);
    if (toHex(subjectPk) !== credential.subjectPublicKey) {
      throw new Error('Credential subject does not match this holder\'s key.');
    }

    const nh = new Uint8Array(fromHex(credential.nameHash));
    const attrsHash = pureCircuits.attributesHash(
      BigInt(credential.attributes.birthDate),
      BigInt(credential.attributes.country),
      credential.attributes.accredited,
      nh,
    );
    const commitment = pureCircuits.credentialCommitment(
      subjectPk,
      attrsHash,
      fromHex(credential.salt),
    );
    if (toHex(commitment) !== credential.commitment) {
      throw new Error('Credential commitment mismatch — file is corrupt or was tampered with.');
    }

    await this.api.setPrivateState({
      ...ps,
      credential: {
        birthDate: BigInt(credential.attributes.birthDate),
        country: BigInt(credential.attributes.country),
        accredited: credential.attributes.accredited,
        nameHash: nh,
        // Normalize to a plain Uint8Array — fromHex may return a Node Buffer,
        // whose toJSON() breaks private-state (de)serialization round-trips.
        salt: new Uint8Array(fromHex(credential.salt)),
      },
    });
  }

  /** True when a credential is present in local private state. */
  async hasCredential(): Promise<boolean> {
    const ps = await this.api.privateState();
    return ps.credential !== undefined;
  }

  /**
   * Proves `age >= threshold` in zero knowledge and records the result under
   * an opaque session id that any dApp can consume as a `verified ✓`.
   *
   * Discloses: the session id, the threshold, the as-of date, and one boolean
   * fact (old enough). Never the birthdate.
   */
  async proveAgeOver(
    threshold: number,
    options?: { sessionId?: string | Uint8Array; asOfDate?: Date },
  ): Promise<ProofReceipt> {
    const sessionId = options?.sessionId ? asBytes(options.sessionId) : fromHex(newSessionId());
    const asOfDate = yyyymmdd(options?.asOfDate ?? new Date());

    this.api.logger?.info({ proveAgeOver: { threshold, asOfDate: Number(asOfDate) } });
    const txData = await this.api.deployedContract.callTx.proveAgeOver(
      sessionId,
      BigInt(threshold),
      asOfDate,
    );

    return {
      sessionId: toHex(sessionId),
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight,
    };
  }

  /**
   * Proves IDENTITY in one shot: that the holder's credentialed name matches
   * `name` AND that age >= `threshold` as of today. Discloses only the two
   * boolean facts; the birthdate and the name itself stay on this device.
   */
  async proveIdentity(
    name: string,
    threshold: number,
    options?: { sessionId?: string | Uint8Array; asOfDate?: Date },
  ): Promise<ProofReceipt> {
    const sessionId = options?.sessionId ? asBytes(options.sessionId) : fromHex(newSessionId());
    const asOfDate = yyyymmdd(options?.asOfDate ?? new Date());
    const claimedNameHash = await nameHash(name);

    this.api.logger?.info({ proveIdentity: { threshold, asOfDate: Number(asOfDate) } });
    const txData = await this.api.deployedContract.callTx.proveIdentity(
      sessionId,
      BigInt(threshold),
      asOfDate,
      claimedNameHash,
    );
    return {
      sessionId: toHex(sessionId),
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight,
    };
  }

  /**
   * Proves this holder is a unique credentialed human within a dApp `scope`,
   * revealing only a per-scope pseudonymous nullifier (same human + same scope
   * ⇒ same nullifier; different scopes are unlinkable, and none links to
   * issuance). `scope` is typically the consuming dApp's contract address.
   */
  async proveUniqueHuman(
    scope: string | Uint8Array,
    options?: { sessionId?: string | Uint8Array },
  ): Promise<ProofReceipt> {
    const sessionId = options?.sessionId ? asBytes(options.sessionId) : fromHex(newSessionId());
    const txData = await this.api.deployedContract.callTx.proveUniqueHuman(
      sessionId,
      await scopeToBytes(scope),
    );
    return {
      sessionId: toHex(sessionId),
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight,
    };
  }
}
