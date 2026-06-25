/*
 * Assembles the Midnight.js providers around a connected Lace wallet:
 * indexer (public data), local proof server (ZK proofs), ZK config served
 * from this app's origin, wallet (balance + sign), and node submission.
 *
 * Wiring mirrors example-bboard's browser manager 1:1.
 */
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type Binding,
  type Proof,
  type SignatureEnabled,
  Transaction,
  type FinalizedTransaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  passportPrivateStateId,
  type PassportCircuitKeys,
  type PassportProviders,
} from 'credport';
import type { PassportPrivateState } from 'credport-contract';
import { localStoragePrivateStateProvider } from './local-storage-private-state-provider.js';
import { connectToWallet } from './wallet.js';

void passportPrivateStateId;

export interface WalletSession {
  readonly providers: PassportProviders;
  readonly connectedAPI: ConnectedAPI;
  readonly networkId: string;
  readonly indexerUri: string;
  readonly indexerWsUri: string;
  readonly proverServerUri: string | undefined;
  readonly shieldedCoinPublicKey: string;
}

export const initializeWalletSession = async (): Promise<WalletSession> => {
  const networkId = (import.meta.env.VITE_NETWORK_ID as string | undefined) ?? 'preprod';
  const connectedAPI = await connectToWallet(networkId);

  const config = await connectedAPI.getConfiguration();

  // REQUIRED before building ANY transaction: midnight-js normalizes the
  // wallet's Bech32m keys against this global network id, and throws without
  // it. Use the wallet-reported id so it matches the keys' HRP.
  setNetworkId(config.networkId);

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  if (!config.proverServerUri) {
    throw new Error(
      'Lace has no proof server configured. Set Settings » Midnight » Proof server to Local (http://localhost:6300).',
    );
  }

  const zkConfigProvider = new FetchZkConfigProvider<PassportCircuitKeys>(
    window.location.origin,
    fetch.bind(window),
  );

  const providers: PassportProviders = {
    privateStateProvider: localStoragePrivateStateProvider<
      typeof passportPrivateStateId,
      PassportPrivateState
    >(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey(): string {
        return shieldedAddresses.shieldedCoinPublicKey;
      },
      getEncryptionPublicKey(): string {
        return shieldedAddresses.shieldedEncryptionPublicKey;
      },
      balanceTx: async (tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction> => {
        void ttl;
        const received = await connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };

  return {
    providers,
    connectedAPI,
    networkId,
    indexerUri: config.indexerUri,
    indexerWsUri: config.indexerWsUri,
    proverServerUri: config.proverServerUri,
    shieldedCoinPublicKey: shieldedAddresses.shieldedCoinPublicKey,
  };
};
