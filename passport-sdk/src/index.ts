/**
 * credport — a reusable ZK credential passport for Midnight.
 *
 * Verify once, prove predicates anywhere:
 *
 * ```ts
 * // issuer (after off-chain KYC)
 * const api = await PassportAPI.deploy(providers);
 * const issuer = new Issuer(api);
 * const holder = new Holder(api);
 * const enrollment = await holder.enroll();
 * const credential = await issuer.issueCredential({ birthDate: '2000-05-14' }, enrollment);
 * await holder.store(credential);
 *
 * // any dApp, anywhere — no wallet, no proof server, no private data
 * const verifier = Verifier.connect(api.contractAddress);
 * const sessionId = verifier.newSessionId();
 * await holder.proveAgeOver(18, { sessionId });          // user's machine
 * const { verified } = await verifier.verifyAgeOver(sessionId); // dApp: verified ✓
 * ```
 */

export { PassportAPI } from './api.js';
export { Issuer } from './issuer.js';
export { Holder } from './holder.js';
export { Verifier } from './verifier.js';
export { PREPROD, PREVIEW, type PassportNetworkConfig } from './config.js';
export {
  newSessionId,
  randomBytes,
  toHex,
  fromHex,
  yyyymmdd,
  fromYyyymmdd,
  nameHash,
  normalizeName,
} from './encoding.js';
export * from './types.js';
