# credport-react

Drop-in identity gating for any React app, powered by a reusable zero-knowledge credential on
[Midnight](https://midnight.network).

A user verifies their identity once with an issuer and holds the credential privately. Your app
asks them to prove a fact (name matches, age is at least N) and receives only a `verified` result.
The name and birthdate are never disclosed.

[![npm](https://img.shields.io/npm/v/credport-react.svg)](https://www.npmjs.com/package/credport-react)

```bash
npm install credport-react credport
```

## The five-line integration

```tsx
import { ProveAgeGate } from 'credport-react';

<ProveAgeGate
  contractAddress={CONTRACT}   // one deployment serves every app
  connect={connectWallet}      // returns Midnight.js providers for the wallet
  threshold={18}
>
  <MembersOnly />              {/* shown only on a verified result */}
</ProveAgeGate>;
```

`connect` is your wallet wiring. It returns the Midnight.js providers (indexer, proof server,
wallet) for the connected Lace or 1AM wallet. See [`credport`](https://www.npmjs.com/package/credport)
and the [repository](https://github.com/ogsamrat/zkPassport) for the provider recipe.

## Headless hook

```tsx
import { useCredport } from 'credport-react';

function Gate() {
  const zk = useCredport({ contractAddress, connect, threshold: 18 });
  return zk.status === 'verified'
    ? <SecretContent />
    : <button onClick={() => zk.proveAgeOver()} disabled={zk.status === 'proving'}>
        {zk.status === 'proving' ? 'Proving' : 'Prove 18+'}
      </button>;
}
```

`useCredport` returns `{ status, error, result, isReady, ready, proveAgeOver, reset }`, where
`status` moves through `idle`, `connecting`, `ready`, `proving`, and `verified` or `rejected`.

## Why it is composable

The credential contract is deployed once and is a network-wide primitive. Any number of apps import
this package, point at the same `contractAddress`, and gate on a verified result, with no wallet and
no user data on the verifying side. Verify once, prove anywhere.

Apache-2.0.
