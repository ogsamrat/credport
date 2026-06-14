import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type AgeVerification = { threshold: bigint; asOfDate: bigint };

export type IdentityVerification = { threshold: bigint; asOfDate: bigint };

export type Witnesses<PS> = {
  issuerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  userSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  credentialBirthDate(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  credentialCountry(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  credentialAccredited(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  credentialNameHash(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  credentialSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  credentialAuthPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
                     commitment_0: Uint8Array): [PS, { leaf: Uint8Array,
                                                       path: { sibling: { field: bigint
                                                                        },
                                                               goes_left: boolean
                                                             }[]
                                                     }];
}

export type ImpureCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array,
                  enrollNullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>,
         revNullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addIssuer(context: __compactRuntime.CircuitContext<PS>,
            newIssuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveAgeOver(context: __compactRuntime.CircuitContext<PS>,
               sessionId_0: Uint8Array,
               threshold_0: bigint,
               asOfDate_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveIdentity(context: __compactRuntime.CircuitContext<PS>,
                sessionId_0: Uint8Array,
                threshold_0: bigint,
                asOfDate_0: bigint,
                claimedNameHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveUniqueHuman(context: __compactRuntime.CircuitContext<PS>,
                   sessionId_0: Uint8Array,
                   scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array,
                  enrollNullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>,
         revNullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addIssuer(context: __compactRuntime.CircuitContext<PS>,
            newIssuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveAgeOver(context: __compactRuntime.CircuitContext<PS>,
               sessionId_0: Uint8Array,
               threshold_0: bigint,
               asOfDate_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveIdentity(context: __compactRuntime.CircuitContext<PS>,
                sessionId_0: Uint8Array,
                threshold_0: bigint,
                asOfDate_0: bigint,
                claimedNameHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveUniqueHuman(context: __compactRuntime.CircuitContext<PS>,
                   sessionId_0: Uint8Array,
                   scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array): Uint8Array;
  enrollmentNullifier(sk_0: Uint8Array): Uint8Array;
  scopedNullifier(sk_0: Uint8Array, scope_0: Uint8Array): Uint8Array;
  revocationNullifier(commitment_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
  attributesHash(birthDate_0: bigint,
                 country_0: bigint,
                 accredited_0: boolean,
                 nameHash_0: Uint8Array): Uint8Array;
  credentialCommitment(subject_0: Uint8Array,
                       attrsHash_0: Uint8Array,
                       salt_0: Uint8Array): Uint8Array;
  proveResidency(sessionId_0: Uint8Array, countryCode_0: bigint): [];
  proveAccredited(sessionId_0: Uint8Array): [];
}

export type Circuits<PS> = {
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  enrollmentNullifier(context: __compactRuntime.CircuitContext<PS>,
                      sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  scopedNullifier(context: __compactRuntime.CircuitContext<PS>,
                  sk_0: Uint8Array,
                  scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  revocationNullifier(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array,
                      salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  attributesHash(context: __compactRuntime.CircuitContext<PS>,
                 birthDate_0: bigint,
                 country_0: bigint,
                 accredited_0: boolean,
                 nameHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       subject_0: Uint8Array,
                       attrsHash_0: Uint8Array,
                       salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array,
                  enrollNullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>,
         revNullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addIssuer(context: __compactRuntime.CircuitContext<PS>,
            newIssuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveAgeOver(context: __compactRuntime.CircuitContext<PS>,
               sessionId_0: Uint8Array,
               threshold_0: bigint,
               asOfDate_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveIdentity(context: __compactRuntime.CircuitContext<PS>,
                sessionId_0: Uint8Array,
                threshold_0: bigint,
                asOfDate_0: bigint,
                claimedNameHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveUniqueHuman(context: __compactRuntime.CircuitContext<PS>,
                   sessionId_0: Uint8Array,
                   scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveResidency(context: __compactRuntime.CircuitContext<PS>,
                 sessionId_0: Uint8Array,
                 countryCode_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveAccredited(context: __compactRuntime.CircuitContext<PS>,
                  sessionId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly admin: Uint8Array;
  issuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  credentials: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  enrollmentNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  revocationNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly issuedCount: bigint;
  ageVerifications: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): AgeVerification;
    [Symbol.iterator](): Iterator<[Uint8Array, AgeVerification]>
  };
  uniqueHumanVerifications: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  identityVerifications: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): IdentityVerification;
    [Symbol.iterator](): Iterator<[Uint8Array, IdentityVerification]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initialIssuer_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
