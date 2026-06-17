import { pureCircuits } from 'credport-contract';
import type { PassportAPI } from './api.js';
import type { CredentialAttributes, CredentialFile } from './types.js';
import { asBytes, nameHash, randomBytes, toHex, yyyymmdd } from './encoding.js';

/**
 * Issuer role: attests real-world attributes after off-chain verification
 * (KYC, document check, proof-of-personhood — whatever the deployment demands)
 * and records ONLY an opaque commitment on-chain.
 */
export class Issuer {
  constructor(private readonly api: PassportAPI) {}

  /** The issuer's public key, as registered in the on-chain issuer set. */
  async publicKey(): Promise<Uint8Array> {
    const ps = await this.api.privateState();
    if (!ps.issuerSecretKey) {
      throw new Error('This session has no issuer key. Deploy the contract or call importSecretKey().');
    }
    return pureCircuits.publicKey(ps.issuerSecretKey);
  }

  /** Imports an issuer secret key into private state (e.g. when joining a contract). */
  async importSecretKey(secretKey: string | Uint8Array): Promise<void> {
    const ps = await this.api.privateState();
    await this.api.setPrivateState({ ...ps, issuerSecretKey: asBytes(secretKey) });
  }

  /**
   * Issues a credential for a subject the issuer has verified off-chain.
   *
   * The subject supplies their public key and humanity nullifier (both derived
   * from their secret, which they never share). The chain records only the
   * commitment and the nullifier — never the attributes.
   *
   * @returns The credential file to hand to the subject over a private channel.
   */
  async issueCredential(
    attributes: CredentialAttributes,
    subject: { publicKey: string | Uint8Array; enrollmentNullifier: string | Uint8Array },
  ): Promise<CredentialFile> {
    const birthDate = yyyymmdd(attributes.birthDate);
    const country = BigInt(attributes.country ?? 0);
    const accredited = attributes.accredited ?? false;
    const nh = await nameHash(attributes.name);

    const subjectPk = asBytes(subject.publicKey);
    const enrollNullifier = asBytes(subject.enrollmentNullifier);
    const salt = randomBytes(32);

    const attrsHash = pureCircuits.attributesHash(birthDate, country, accredited, nh);
    const commitment = pureCircuits.credentialCommitment(subjectPk, attrsHash, salt);

    this.api.logger?.info({ issueCredential: { commitment: toHex(commitment) } });
    const txData = await this.api.deployedContract.callTx.issueCredential(
      commitment,
      enrollNullifier,
    );
    this.api.logger?.info({ issued: { txHash: txData.public.txHash } });

    return {
      version: 1,
      contractAddress: this.api.contractAddress,
      subjectPublicKey: toHex(subjectPk),
      commitment: toHex(commitment),
      salt: toHex(salt),
      nameHash: toHex(nh),
      attributes: {
        name: attributes.name,
        birthDate: Number(birthDate),
        country: Number(country),
        accredited,
      },
    };
  }

  /**
   * Revokes an issued credential. The revocation nullifier is derived from the
   * credential's private salt (which the issuer generated at issuance), so only
   * the issuing issuer can revoke it — it is not computable from public data.
   */
  async revoke(credential: Pick<CredentialFile, 'commitment' | 'salt'>): Promise<void> {
    const revNullifier = pureCircuits.revocationNullifier(
      asBytes(credential.commitment),
      asBytes(credential.salt),
    );
    await this.api.deployedContract.callTx.revoke(revNullifier);
  }

  /** Admin-only: registers an additional trusted issuer public key. */
  async addIssuer(newIssuerPublicKey: string | Uint8Array): Promise<void> {
    await this.api.deployedContract.callTx.addIssuer(asBytes(newIssuerPublicKey));
  }
}
