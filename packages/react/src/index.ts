/**
 * credport-react — drop-in age-gating for any React dApp on Midnight.
 *
 * ```tsx
 * import { ProveAgeGate } from 'credport-react';
 *
 * <ProveAgeGate contractAddress={CONTRACT} connect={connectWallet} threshold={18}>
 *   <MembersOnlyContent />
 * </ProveAgeGate>
 * ```
 *
 * `connect` returns Midnight.js `PassportProviders` for the user's wallet.
 * The birthdate never leaves the user's device — your dApp receives only a
 * `verified` boolean.
 */
export { useCredport } from './useCredport.js';
export type {
  UseCredport,
  UseCredportOptions,
  CredportStatus,
} from './useCredport.js';
export { ProveAgeGate } from './ProveAgeGate.js';
export type { ProveAgeGateProps } from './ProveAgeGate.js';
export type {
  AgeVerificationResult,
  PassportProviders,
} from 'credport';
