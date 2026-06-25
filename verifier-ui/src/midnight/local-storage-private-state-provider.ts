/*
 * A PrivateStateProvider persisted in the browser's localStorage, so the
 * holder's credential survives page refreshes. Private state NEVER leaves
 * this origin, persistence is purely local.
 *
 * Interface + scoping mirror example-bboard's in-memory provider.
 */
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  ExportPrivateStatesOptions,
  ExportSigningKeysOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

const STATES_KEY = 'zkpassport:private-states';
const KEYS_KEY = 'zkpassport:signing-keys';

// JSON codec that survives Uint8Array and bigint round-trips.
const encode = (value: unknown): string =>
  JSON.stringify(value, (_k, v) => {
    if (v instanceof Uint8Array) {
      return { __u8: Array.from(v, (b) => b.toString(16).padStart(2, '0')).join('') };
    }
    if (typeof v === 'bigint') {
      return { __big: v.toString() };
    }
    return v;
  });

const decode = <T>(value: string): T =>
  JSON.parse(value, (_k, v) => {
    if (v && typeof v === 'object') {
      if (typeof v.__u8 === 'string') {
        const hex = v.__u8 as string;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        return bytes;
      }
      // A Node Buffer serializes to {type:'Buffer',data:[...]} because its own
      // toJSON() runs before our replacer (so it never reached the __u8 branch
      // on encode). Restore it to a Uint8Array so witnesses return Bytes<N>.
      if (v.type === 'Buffer' && Array.isArray(v.data)) return new Uint8Array(v.data);
      if (typeof v.__big === 'string') return BigInt(v.__big);
    }
    return v;
  }) as T;

type StatesShape = Record<ContractAddress, Record<string, string>>;

const loadStates = (): StatesShape => {
  try {
    return JSON.parse(localStorage.getItem(STATES_KEY) ?? '{}') as StatesShape;
  } catch {
    return {};
  }
};

const saveStates = (states: StatesShape): void => {
  localStorage.setItem(STATES_KEY, JSON.stringify(states));
};

const loadKeys = (): Record<ContractAddress, SigningKey> => {
  try {
    return JSON.parse(localStorage.getItem(KEYS_KEY) ?? '{}') as Record<ContractAddress, SigningKey>;
  } catch {
    return {};
  }
};

const saveKeys = (keys: Record<ContractAddress, SigningKey>): void => {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
};

export const localStoragePrivateStateProvider = <
  PSI extends PrivateStateId,
  PS = unknown,
>(): PrivateStateProvider<PSI, PS> => {
  let contractAddress: ContractAddress | null = null;

  const requireContractAddress = (): ContractAddress => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() first.');
    }
    return contractAddress;
  };

  const scoped = (address: ContractAddress): Record<string, string> => loadStates()[address] ?? {};

  return {
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },
    set(key: PSI, state: PS): Promise<void> {
      const address = requireContractAddress();
      const states = loadStates();
      states[address] = { ...(states[address] ?? {}), [key]: encode(state) };
      saveStates(states);
      return Promise.resolve();
    },
    get(key: PSI): Promise<PS | null> {
      const raw = scoped(requireContractAddress())[key];
      return Promise.resolve(raw === undefined ? null : decode<PS>(raw));
    },
    remove(key: PSI): Promise<void> {
      const address = requireContractAddress();
      const states = loadStates();
      if (states[address]) {
        delete states[address][key];
        saveStates(states);
      }
      return Promise.resolve();
    },
    clear(): Promise<void> {
      const address = requireContractAddress();
      const states = loadStates();
      delete states[address];
      saveStates(states);
      return Promise.resolve();
    },
    setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      const keys = loadKeys();
      keys[address] = signingKey;
      saveKeys(keys);
      return Promise.resolve();
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return Promise.resolve(loadKeys()[address] ?? null);
    },
    removeSigningKey(address: ContractAddress): Promise<void> {
      const keys = loadKeys();
      delete keys[address];
      saveKeys(keys);
      return Promise.resolve();
    },
    clearSigningKeys(): Promise<void> {
      saveKeys({});
      return Promise.resolve();
    },
    exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      void options;
      const address = requireContractAddress();
      return Promise.resolve({
        format: 'midnight-private-state-export',
        encryptedPayload: encode({ contractAddress: address, states: scoped(address) }),
        salt: 'zkpassport-local-storage-provider',
      });
    },
    importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      const address = requireContractAddress();
      const conflictStrategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ states?: Record<string, string> }>(exportData.encryptedPayload);
      const incoming = payload.states ?? {};
      const states = loadStates();
      const existing = states[address] ?? {};
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const [stateId, serialized] of Object.entries(incoming)) {
        if (stateId in existing) {
          if (conflictStrategy === 'skip') {
            skipped += 1;
            continue;
          }
          if (conflictStrategy === 'error') {
            return Promise.reject(new Error(`Private state conflict for '${stateId}'`));
          }
          overwritten += 1;
        } else {
          imported += 1;
        }
        existing[stateId] = serialized;
      }

      states[address] = existing;
      saveStates(states);
      return Promise.resolve({ imported, skipped, overwritten });
    },
    exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      void options;
      return Promise.resolve({
        format: 'midnight-signing-key-export',
        encryptedPayload: encode({ keys: loadKeys() }),
        salt: 'zkpassport-local-storage-provider',
      });
    },
    importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      const conflictStrategy = options?.conflictStrategy ?? 'error';
      const payload = decode<{ keys?: Record<ContractAddress, SigningKey> }>(
        exportData.encryptedPayload,
      );
      const incoming = payload.keys ?? {};
      const keys = loadKeys();
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const [address, signingKey] of Object.entries(incoming)) {
        if (address in keys) {
          if (conflictStrategy === 'skip') {
            skipped += 1;
            continue;
          }
          if (conflictStrategy === 'error') {
            return Promise.reject(new Error(`Signing key conflict for '${address}'`));
          }
          overwritten += 1;
        } else {
          imported += 1;
        }
        keys[address] = signingKey;
      }

      saveKeys(keys);
      return Promise.resolve({ imported, skipped, overwritten });
    },
  };
};
