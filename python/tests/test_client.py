"""Tests for the zkPassport verifier client.

All HTTP is faked with :class:`httpx.MockTransport`; nothing here touches the
real network or a running gateway.
"""

from __future__ import annotations

import re

import httpx
import pytest

from zkpassport import (
    AgeVerification,
    AsyncZkPassport,
    UniqueVerification,
    ZkPassport,
    ZkPassportError,
)

HEX64 = re.compile(r"^[0-9a-f]{64}$")


def _client_with(handler, **kwargs) -> ZkPassport:
    """Return a ZkPassport whose httpx.Client uses a mock transport."""
    zk = ZkPassport(gateway="http://gateway.test", **kwargs)
    zk._client = httpx.Client(
        base_url=zk.gateway, transport=httpx.MockTransport(handler)
    )
    return zk


def _async_client_with(handler, **kwargs) -> AsyncZkPassport:
    zk = AsyncZkPassport(gateway="http://gateway.test", **kwargs)
    zk._client = httpx.AsyncClient(
        base_url=zk.gateway, transport=httpx.MockTransport(handler)
    )
    return zk


# -- local session id ---------------------------------------------------------


def test_new_session_local_is_64_hex_chars():
    sid = ZkPassport.new_session_local()
    assert HEX64.match(sid), sid
    assert len(sid) == 64
    # Two calls should not collide.
    assert sid != ZkPassport.new_session_local()


# -- new_session over the gateway --------------------------------------------


def test_new_session_posts_and_parses():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["method"] = request.method
        seen["path"] = request.url.path
        return httpx.Response(200, json={"sessionId": "a" * 64})

    with _client_with(handler) as zk:
        sid = zk.new_session()

    assert sid == "a" * 64
    assert seen["method"] == "POST"
    assert seen["path"] == "/session"


# -- verify_age_over ----------------------------------------------------------


def test_verify_age_over_parses_verified_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["threshold"] = request.url.params.get("threshold")
        captured["contract"] = request.url.params.get("contract")
        return httpx.Response(
            200,
            json={
                "verified": True,
                "threshold": 18,
                "asOfDate": 20260704,
            },
        )

    with _client_with(handler, contract_address="deadbeef") as zk:
        result = zk.verify_age_over("s" * 64, threshold=18)

    assert isinstance(result, AgeVerification)
    assert result.verified is True
    assert result.threshold == 18
    assert result.as_of_date == 20260704
    assert result.reason is None
    # Query wiring is correct.
    assert captured["path"] == "/verify/age/" + "s" * 64
    assert captured["threshold"] == "18"
    assert captured["contract"] == "deadbeef"


def test_verify_age_over_returns_false_on_negative():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "verified": False,
                "threshold": 21,
                "asOfDate": 20260704,
                "reason": "holder is under 21",
            },
        )

    with _client_with(handler) as zk:
        result = zk.verify_age_over("s" * 64, threshold=21)

    assert result.verified is False
    assert result.threshold == 21
    assert result.reason == "holder is under 21"


# -- verify_unique_human ------------------------------------------------------


def test_verify_unique_human_parses():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"verified": True, "nullifier": "0xabc123"}
        )

    with _client_with(handler) as zk:
        result = zk.verify_unique_human("s" * 64)

    assert isinstance(result, UniqueVerification)
    assert result.verified is True
    assert result.nullifier == "0xabc123"


# -- error handling -----------------------------------------------------------


def test_http_error_raises_zkpassport_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(502, json={"reason": "verify failed"})

    with _client_with(handler) as zk:
        with pytest.raises(ZkPassportError) as excinfo:
            zk.verify_age_over("s" * 64)

    assert excinfo.value.status_code == 502
    assert "verify failed" in str(excinfo.value)


def test_transport_error_raises_zkpassport_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    with _client_with(handler) as zk:
        with pytest.raises(ZkPassportError):
            zk.new_session()


# -- async client -------------------------------------------------------------


@pytest.mark.asyncio
async def test_async_verify_age_over():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"verified": True, "threshold": 18})

    zk = _async_client_with(handler)
    try:
        result = await zk.verify_age_over("s" * 64)
    finally:
        await zk.aclose()

    assert result.verified is True
    assert result.threshold == 18


# -- FastAPI dependency -------------------------------------------------------


def test_fastapi_dependency_allows_and_blocks():
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from zkpassport.fastapi import require_age_over

    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        # First request: verified. Second: not verified.
        if calls["count"] == 1:
            return httpx.Response(
                200, json={"verified": True, "threshold": 18, "asOfDate": 20260704}
            )
        return httpx.Response(
            200,
            json={"verified": False, "threshold": 18, "reason": "under 18"},
        )

    zk = _client_with(handler)

    app = fastapi.FastAPI()

    @app.get("/adults-only")
    def adults_only(age: AgeVerification = fastapi.Depends(require_age_over(18, zk=zk))):
        return {"ok": True, "asOfDate": age.as_of_date}

    client = TestClient(app)

    # Verified -> 200
    ok = client.get("/adults-only", headers={"x-zkpassport-session": "s" * 64})
    assert ok.status_code == 200
    assert ok.json() == {"ok": True, "asOfDate": 20260704}

    # Not verified -> 403
    blocked = client.get("/adults-only", headers={"x-zkpassport-session": "s" * 64})
    assert blocked.status_code == 403
    assert "under 18" in blocked.json()["detail"]


def test_fastapi_dependency_missing_header_is_400():
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from zkpassport.fastapi import require_age_over

    def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover
        return httpx.Response(200, json={"verified": True})

    zk = _client_with(handler)
    app = fastapi.FastAPI()

    @app.get("/adults-only")
    def adults_only(age: AgeVerification = fastapi.Depends(require_age_over(18, zk=zk))):
        return {"ok": True}

    client = TestClient(app)
    resp = client.get("/adults-only")  # no session header
    assert resp.status_code == 400
