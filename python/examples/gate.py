"""A tiny runnable FastAPI app with a zkPassport age-gated route.

Run it::

    pip install "zkpassport[fastapi]" uvicorn
    uvicorn examples.gate:app --reload

Then, assuming the verification gateway is running on http://localhost:8787:

    # ask the gateway (or a wallet flow) for a session id first, then:
    curl -H "x-zkpassport-session: <64-hex-session-id>" http://localhost:8000/adults-only

The route only ever learns a single bit — "age >= 18: true" — never a birthdate.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI

from zkpassport import ZkPassport
from zkpassport.models import AgeVerification
from zkpassport.fastapi import require_age_over

# Point the client at your verification gateway. Defaults to the local gateway
# and the live Midnight preprod passport contract.
zk = ZkPassport(gateway="http://localhost:8787")

app = FastAPI(title="zkPassport age-gate demo")


@app.get("/")
def index() -> dict:
    return {
        "try": "GET /adults-only with header 'x-zkpassport-session: <session id>'",
        "session": "POST /new-session to mint a local session id for testing",
    }


@app.post("/new-session")
def new_session() -> dict:
    """Mint a session id the caller then proves against on Midnight."""
    return {"sessionId": zk.new_session_local()}


@app.get("/adults-only")
def adults_only(
    age: AgeVerification = Depends(require_age_over(18, zk=zk)),
) -> dict:
    """Gated route: reachable only for sessions proven to be 18+.

    On success FastAPI injects the AgeVerification; on failure the dependency
    has already raised HTTPException(403) and this body never runs.
    """
    return {
        "access": "granted",
        "predicate": f"age >= {age.threshold}",
        "asOfDate": age.as_of_date,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
