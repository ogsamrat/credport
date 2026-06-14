# credport-contract

Compiled Compact contract bindings for [credport](https://www.npmjs.com/package/credport), the
reusable zero-knowledge identity credential on Midnight.

This package is a dependency of `credport` and `credport-react`. Most users do not install it
directly. It ships the generated TypeScript bindings (`pureCircuits`, `ledger`, `Contract`) and the
witness definitions. It does not ship the zero-knowledge proving keys, which are large and only
needed by proving apps; those are available in the
[repository](https://github.com/ogsamrat/zkPassport) under `contract/src/managed`.

```bash
npm install credport
```

Apache-2.0.
