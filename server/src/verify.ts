/*
 * Read-only verification gateway. Decodes the passport contract's public
 * ledger state (via the compiled contract + indexer) so non-JS clients — the
 * Python package, the website demo, any backend — can consume a `verified ✓`
 * without running Midnight.js themselves.
 */
import { Verifier, newSessionId } from 'credport';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

let networkReady = false;
const ensureNetwork = () => {
  if (!networkReady) {
    setNetworkId('preprod');
    networkReady = true;
  }
};

export const makeSessionId = (): string => newSessionId();

export async function verifyAgeOver(
  contractAddress: string,
  sessionId: string,
  minThreshold = 18,
  maxSkewDays = 3650,
) {
  ensureNetwork();
  const verifier = Verifier.connect(contractAddress);
  return verifier.verifyAgeOver(sessionId, minThreshold, maxSkewDays);
}

export async function verifyUniqueHuman(contractAddress: string, sessionId: string) {
  ensureNetwork();
  const verifier = Verifier.connect(contractAddress);
  return verifier.verifyUniqueHuman(sessionId);
}
