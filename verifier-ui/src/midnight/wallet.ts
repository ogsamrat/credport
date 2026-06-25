/*
 * Lace wallet connection via the Midnight DApp Connector API (4.x).
 * Adapted from example-bboard's BrowserDeployedBoardManager.
 */
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

const getFirstCompatibleWallet = (): InitialAPI | undefined => {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Finds a compatible Midnight Lace wallet on the page and connects to it.
 * The user approves the connection in the extension popup.
 */
export const connectToWallet = async (networkId: string): Promise<ConnectedAPI> => {
  let initialAPI: InitialAPI | undefined;
  for (let attempt = 0; attempt < 20 && !initialAPI; attempt++) {
    initialAPI = getFirstCompatibleWallet();
    if (!initialAPI) await sleep(100);
  }
  if (!initialAPI) {
    throw new Error(
      'Could not find the Midnight Lace wallet (connector API 4.x). Is the extension installed and enabled?',
    );
  }

  const connectedAPI = await initialAPI.connect(networkId);
  await connectedAPI.getConnectionStatus();
  return connectedAPI;
};
