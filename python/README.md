# zkpassport

**Verifier client for the [zkPassport](https://github.com/zkpassport/zkpassport) privacy credential system on the [Midnight](https://midnight.network) blockchain.**

A user proves a predicate — say `age >= 18` — **once**, against the passport
contract on Midnight. After that, *any* dApp can consume a `verified ✓` for an
opaque session id, learning only that one bit. Never the birthdate. Never the
document. Just: *"this session is 18+: true."*

This package lets a Python backend gate on that bit.

> Python can't decode Midnight's on-chain contract state directly, so `zkpassport`
> is a thin, well-typed client over a backend **verification gateway** (a small
> Node service) that does the decoding. You point the client at the gateway URL;
> it hands you back typed results.

---

## Install

```bash
pip install zkpassport
# with the FastAPI integration:
pip install "zkpassport[fastapi]"
```

Requires Python 3.9+. The only runtime dependency is `httpx`.

---

## Quickstart

```python
from zkpassport import ZkPassport

zk = ZkPassport(gateway="http://localhost:8787")   # defaults to Midnight preprod contract
session_id = zk.new_session()                       # hand this id to the user's wallet flow
# ... the user proves `age >= 18` against the passport contract on Midnight ...
result = zk.verify_age_over(session_id, threshold=18)
print(result.verified)                              # True  — and that's ALL you learn
```

`verify_age_over` returns an `AgeVerification`:

```python
AgeVerification(verified=True, threshold=18, as_of_date=20260704, reason=None)
```

`as_of_date` is the reference date (a `YYYYMMDD` integer). `reason` is populated
only when `verified` is `False`.

There's also proof-of-personhood:

```python
u = zk.verify_unique_human(session_id)
u.verified, u.nullifier    # (True, "<opaque per-contract nullifier>")
```

### No gateway handy? Generate a session id locally

```python
ZkPassport.new_session_local()   # 32 secure random bytes -> 64-char hex, no network
```

### Async

Same API, with `await`:

```python
from zkpassport import AsyncZkPassport

async with AsyncZkPassport(gateway="http://localhost:8787") as zk:
    sid = await zk.new_session()
    result = await zk.verify_age_over(sid, threshold=18)
```

---

## FastAPI gate

Drop a dependency onto any route to gate it on `age >= threshold`. Import is
lazy, so the base package works fine without FastAPI installed.

```python
from fastapi import FastAPI, Depends
from zkpassport import ZkPassport
from zkpassport.fastapi import require_age_over

zk = ZkPassport(gateway="http://localhost:8787")
app = FastAPI()

@app.get("/adults-only")
def adults_only(age = Depends(require_age_over(18, zk=zk))):
    # Only reached when the session proved 18+. Otherwise a 403 was already raised.
    return {"access": "granted", "asOfDate": age.as_of_date}
```

The dependency reads the session id from the `x-zkpassport-session` request
header (configurable), calls the gateway, and:

- `400` if the header is missing,
- `403` if the predicate is not verified,
- otherwise injects the `AgeVerification` and runs your handler.

A runnable version lives in [`examples/gate.py`](examples/gate.py).

---

## Why this is a privacy win

Traditional age checks demand your date of birth (or a scan of your ID), then
store it. zkPassport inverts that:

- The credential holder proves the **predicate** on Midnight using a
  zero-knowledge proof. The birthdate never leaves their device.
- The contract exposes a single verified bit against an **opaque session id**.
- Your backend consumes that bit. It never sees — and cannot derive — the
  underlying data.

**One bit. Composable across every dApp. The birthdate stays secret.**

---

## Configuration

| Argument           | Default                                | Meaning                                  |
| ------------------ | -------------------------------------- | ---------------------------------------- |
| `contract_address` | live Midnight **preprod** passport contract | which passport contract to read |
| `gateway`          | `http://localhost:8787`                | base URL of the verification gateway     |
| `timeout`          | `20.0`                                 | per-request timeout in seconds           |

The default contract address targets Midnight **preprod**. Point `gateway` at
wherever your verification gateway is deployed.

Network/HTTP failures raise `ZkPassportError` (with `.status_code` set for HTTP
error responses).

---

## License

Apache-2.0.
