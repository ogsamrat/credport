# credport

Reusable zero-knowledge identity credentials on [Midnight](https://midnight.network).

A user verifies their real-world identity once with a trusted issuer, then holds the credential in
private state on their own device. From then on they can prove facts about it to any app, and the
app receives only a single result, `verified`, for an opaque session id. The name, the birthdate,
and the document are never disclosed to the app or written to the chain.

[![npm](https://img.shields.io/npm/v/credport.svg)](https://www.npmjs.com/package/credport)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/ogsamrat/zkPassport/blob/main/LICENSE)

```bash
npm install credport
```

## What you can prove

- `proveIdentity` : the holder's name matches a claimed name AND their age is at least a threshold, in one proof.
- `proveAgeOver` : age is at least a threshold, at any value you choose.
- `proveUniqueHuman` : one credentialed human, with a per-app scoped nullifier that is unlinkable across apps.

Every proof discloses only the boolean result. The underlying values stay on the holder's device.

## For a verifying app

A verifier needs no wallet, no proof server, and no access to user data. It needs only an indexer
connection and the contract address. It mints a session id, hands it to the user to prove against,
then reads back the result.

```ts
import { Verifier } from 'credport';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('preprod');

const CONTRACT = '1904b5a37fdcc8eeb62a479e9924de30b51d0e227bc43b045b21806254f994ba';
const verifier = Verifier.connect(CONTRACT);

// 1. Issue a session id and hand it to the user's wallet flow.
const sessionId = verifier.newSessionId();

// 2. The user proves on their own device (see "For a proving app").

// 3. Read the result. You learn only whether it holds.
const { verified, threshold } = await verifier.verifyIdentity(sessionId, 18);
if (verified) grantAccess();
```

`verifyAgeOver(sessionId, minThreshold)` and `verifyUniqueHuman(sessionId)` work the same way.

## For a proving app

The holder side needs a connected Midnight wallet (Lace or 1AM) with its providers. `PassportAPI`
wraps deploy, join, and the role facades.

```ts
import { PassportAPI, Issuer, Holder } from 'credport';

// providers: Midnight.js providers built around the connected wallet
const api = await PassportAPI.join(providers, CONTRACT);

// enroll once; the secret key never leaves the device
const holder = new Holder(api);
const enrollment = await holder.enroll();

// the issuer attests after an off-chain check, writing only a commitment
const issuer = new Issuer(api);
const credential = await issuer.issueCredential(
  { name: 'Erika Mustermann', birthDate: '2000-05-14', country: 276 },
  enrollment,
);
await holder.store(credential);

// later, prove name and age together against a verifier's session id
await holder.proveIdentity('Erika Mustermann', 18, { sessionId });
```

Building the wallet providers is app specific. See the reference wiring in the
[repository](https://github.com/ogsamrat/zkPassport) (`verifier-ui/src/midnight`).

## React

For a React app, [`credport-react`](https://www.npmjs.com/package/credport-react) gives you a
drop-in gate:

```tsx
import { ProveAgeGate } from 'credport-react';

<ProveAgeGate contractAddress={CONTRACT} connect={connectWallet} threshold={18}>
  <MembersOnly />
</ProveAgeGate>;
```

## Why it must be on Midnight

Privacy is load bearing, not decorative. Midnight keeps attributes on the holder's device as
first-class protocol citizens (witnesses), and the Compact language forces every value that reaches
the ledger to be disclosed explicitly, so nothing leaks by accident. Membership is proven against a
Merkle root, so a proof never reveals which credential it used, and it cannot be linked back to
issuance.

## Try it live

A full working demo runs on Midnight preprod. Connect a wallet, verify a document, issue a
credential, and prove your name and age with a single verified result. See the
[repository](https://github.com/ogsamrat/zkPassport) for the live URL and the end-to-end guide.

Apache-2.0.
