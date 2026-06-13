/*
 * credport-contract — compiled passport contract + witnesses, packaged for
 * consumption by the SDK (mirrors the structure of midnightntwrk/example-bboard).
 */

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export * from './managed/passport/contract/index.js';
export * from './witnesses.js';

import * as CompiledPassport from './managed/passport/contract/index.js';
import { witnesses, type PassportPrivateState } from './witnesses.js';

export const CompiledPassportContract = CompiledContract.make<
  CompiledPassport.Contract<PassportPrivateState>
>('Passport', CompiledPassport.Contract<PassportPrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./managed/passport'),
);
