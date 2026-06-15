/** Network configuration for the passport SDK. */
export interface PassportNetworkConfig {
  readonly networkId: string;
  /** Node RPC endpoint (transaction submission). */
  readonly node: string;
  /** Indexer GraphQL endpoint (chain state queries). */
  readonly indexer: string;
  /** Indexer GraphQL WebSocket endpoint (state subscriptions). */
  readonly indexerWS: string;
  /** Local proof server that generates ZK proofs. Never remote in practice. */
  readonly proofServer: string;
}

/** Midnight Preprod — final testing environment before mainnet. */
export const PREPROD: PassportNetworkConfig = {
  networkId: 'preprod',
  node: 'https://rpc.preprod.midnight.network',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  proofServer: 'http://localhost:6300',
};

/** Midnight Preview — early experimentation environment. */
export const PREVIEW: PassportNetworkConfig = {
  networkId: 'preview',
  node: 'https://rpc.preview.midnight.network',
  indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  proofServer: 'http://localhost:6300',
};
