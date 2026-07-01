/*
 * Headless provider assembly for Node: builds a Midnight wallet from a BIP39
 * mnemonic (the same derivation Lace uses), wraps it as a Midnight.js wallet
 * provider, and wires the full provider set against preprod + the local
 * Docker proof server. Mirrors example-bboard's CLI wiring.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  FluentWalletBuilder,
  MidnightWalletProvider,
  initializeMidnightProviders,
  type EnvironmentConfiguration,
} from '@midnight-ntwrk/testkit-js';
import { filter, firstValueFrom, tap, throttleTime } from 'rxjs';
import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { Logger } from 'pino';
import type { PassportProviders } from 'credport';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Preprod endpoints + the local Docker proof server (no testcontainers). */
export const preprodEnv = (proofServer = 'http://localhost:6300'): EnvironmentConfiguration => ({
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  proofServer,
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
});

/** Absolute path to the compiled contract's ZK artifacts (keys + zkir). */
export const zkConfigPath = resolve(HERE, '..', '..', 'contract', 'src', 'managed', 'passport');

type UnshieldedKeystore = { getPublicKey(): unknown; signData(payload: Uint8Array): string };

const isComplete = (progress: unknown): boolean => {
  const c = progress as { isStrictlyComplete?: () => boolean } | undefined;
  return typeof c?.isStrictlyComplete === 'function' ? c.isStrictlyComplete() : false;
};

/** Resolves once the wallet holds spendable DUST (fees), or rejects on timeout. */
const waitForSpendableDust = async (
  logger: Logger,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any,
  timeoutMs: number,
): Promise<void> => {
  const dustBalance = (s: any): bigint => {
    try {
      return (s.dust.balance(new Date(Date.now())) as bigint) ?? 0n;
    } catch {
      return 0n;
    }
  };
  const ready = firstValueFrom(
    wallet.state().pipe(
      throttleTime(3_000),
      tap((s: any) =>
        logger.info(
          `sync: shielded=${isComplete(s.shielded?.state?.progress)} ` +
            `unshielded=${isComplete(s.unshielded?.progress)} ` +
            `dust=${isComplete(s.dust?.state?.progress)} dustBalance=${dustBalance(s)}`,
        ),
      ),
      filter((s: any) => dustBalance(s) > 0n && isComplete(s.unshielded?.progress)),
    ),
  );
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`No spendable DUST after ${timeoutMs}ms`)), timeoutMs),
  );
  await Promise.race([ready, timer]);
  logger.info('✅ Spendable DUST available — wallet ready to pay fees.');
};

export interface DeployerSession {
  readonly providers: PassportProviders;
  readonly walletProvider: MidnightWalletProvider;
  readonly coinPublicKey: string;
}

/**
 * Builds a funded, synced wallet from `mnemonic` and returns ready-to-use
 * passport providers. Blocks until the wallet has synced and holds funds.
 */
export const initDeployerSession = async (
  logger: Logger,
  mnemonic: string,
  proofServer?: string,
): Promise<DeployerSession> => {
  setNetworkId('preprod');
  const env = preprodEnv(proofServer);

  const dustOptions = {
    ledgerParams: LedgerParameters.initialParameters(),
    additionalFeeOverhead: 1_000n,
    feeBlocksMargin: 5,
  };

  logger.info('Building wallet from mnemonic…');
  // Duplicate nested installs of the wallet-sdk types make these objects
  // resolve to structurally-identical-but-distinct declared types, so we
  // bridge them with `any` at the call boundary — the runtime values are the
  // correct instances produced by the builder.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { wallet, seeds, keystore } = (await FluentWalletBuilder.forEnvironment(env)
    .withDustOptions(dustOptions as any)
    .withMnemonic(mnemonic.trim())
    .buildWithoutStarting()) as unknown as {
    wallet: any;
    seeds: { masterSeed: string; shielded: Uint8Array; dust: Uint8Array };
    keystore: UnshieldedKeystore;
  };

  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust);

  const walletProvider = await MidnightWalletProvider.withWallet(
    logger,
    env,
    wallet,
    zswapSecretKeys as any,
    dustSecretKey as any,
    keystore as any,
  );

  logger.info('Starting wallet…');
  await walletProvider.start(false);

  // The strict "all three sub-wallets fully synced" gate can exceed the SDK's
  // 90s default on preprod. For deploying we only need spendable DUST, so wait
  // on that directly (with a generous cap), logging balances as they arrive.
  await waitForSpendableDust(logger, wallet, 12 * 60_000);

  const providers = initializeMidnightProviders<string, any>(walletProvider, env, {
    privateStateStoreName: 'zkpassport-private-state',
    zkConfigPath,
  }) as unknown as PassportProviders;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return {
    providers,
    walletProvider,
    coinPublicKey: walletProvider.getCoinPublicKey().toString(),
  };
};
