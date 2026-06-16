import {
  CompiledPassportContract,
  ledger,
  pureCircuits,
  type Ledger,
  type PassportPrivateState,
} from 'credport-contract';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { firstValueFrom, map, type Observable } from 'rxjs';
import {
  passportPrivateStateId,
  type DeployedPassportContract,
  type PassportLogger,
  type PassportProviders,
} from './types.js';
import { randomBytes } from './encoding.js';

/**
 * A handle to a deployed passport contract. Construct via {@link PassportAPI.deploy}
 * or {@link PassportAPI.join}, then use the role facades (`Issuer`, `Holder`,
 * `Verifier`) on top of it.
 */
export class PassportAPI {
  private constructor(
    public readonly deployedContract: DeployedPassportContract,
    public readonly providers: PassportProviders,
    public readonly logger?: PassportLogger,
  ) {
    this.contractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.contractAddress);
    this.ledgerState$ = providers.publicDataProvider
      .contractStateObservable(this.contractAddress, { type: 'latest' })
      .pipe(map((contractState) => ledger(contractState.data)));
  }

  readonly contractAddress: ContractAddress;

  /** Live view of the public (ledger) state. */
  readonly ledgerState$: Observable<Ledger>;

  /** One-shot snapshot of the public (ledger) state. */
  ledgerState(): Promise<Ledger> {
    return firstValueFrom(this.ledgerState$);
  }

  /** Current private state (never leaves this machine). */
  async privateState(): Promise<PassportPrivateState> {
    const state = await this.providers.privateStateProvider.get(passportPrivateStateId);
    return state ?? {};
  }

  /** @internal Persists updated private state. */
  async setPrivateState(state: PassportPrivateState): Promise<void> {
    await this.providers.privateStateProvider.set(passportPrivateStateId, state);
  }

  /**
   * Deploys a fresh passport contract. The deployer becomes the admin and the
   * first trusted issuer: an issuer secret key is generated (or reused from
   * private state) and its public key is registered in the on-chain issuer set.
   */
  static async deploy(
    providers: PassportProviders,
    options?: { issuerSecretKey?: Uint8Array; logger?: PassportLogger },
  ): Promise<PassportAPI> {
    const issuerSecretKey = options?.issuerSecretKey ?? randomBytes(32);
    const issuerPublicKey = pureCircuits.publicKey(issuerSecretKey);
    options?.logger?.info({ deployContract: 'passport' });

    const deployed = await deployContract(providers, {
      compiledContract: CompiledPassportContract,
      privateStateId: passportPrivateStateId,
      initialPrivateState: { issuerSecretKey } satisfies PassportPrivateState,
      args: [issuerPublicKey],
    });

    options?.logger?.info({
      contractDeployed: deployed.deployTxData.public.contractAddress,
    });
    return new PassportAPI(deployed, providers, options?.logger);
  }

  /** Joins an already-deployed passport contract at `contractAddress`. */
  static async join(
    providers: PassportProviders,
    contractAddress: ContractAddress,
    options?: { logger?: PassportLogger },
  ): Promise<PassportAPI> {
    options?.logger?.info({ joinContract: contractAddress });

    providers.privateStateProvider.setContractAddress(contractAddress);
    const existing = await providers.privateStateProvider.get(passportPrivateStateId);

    const deployed = await findDeployedContract(providers, {
      contractAddress,
      compiledContract: CompiledPassportContract,
      privateStateId: passportPrivateStateId,
      initialPrivateState: existing ?? {},
    });

    return new PassportAPI(deployed, providers, options?.logger);
  }
}
