"""Verifier client for the zkPassport privacy credential system on Midnight.

Python cannot decode Midnight's on-chain contract state directly, so this module
is a thin, well-typed client over a backend verification gateway (a Node
service) that does the decoding. The client speaks plain HTTP+JSON and hands
back small, typed result objects.

Two interchangeable clients are provided:

* :class:`ZkPassport` — synchronous, backed by :class:`httpx.Client`.
* :class:`AsyncZkPassport` — asynchronous, backed by :class:`httpx.AsyncClient`.

Both share the same request-building and response-parsing logic, so their
behaviour is identical apart from ``await``.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional

import httpx

from .models import AgeVerification, UniqueVerification

__all__ = [
    "ZkPassport",
    "AsyncZkPassport",
    "ZkPassportError",
    "DEFAULT_CONTRACT",
    "DEFAULT_GATEWAY",
]

#: The live Midnight *preprod* passport contract address.
DEFAULT_CONTRACT = "240e0ab5307bb8f8724b2f17eecbe6afd7025b8871d721c14f920db7c5dfec1e"

#: Default base URL of the local verification gateway.
DEFAULT_GATEWAY = "http://localhost:8787"


class ZkPassportError(RuntimeError):
    """Raised when a gateway request fails at the network or HTTP layer.

    Attributes:
        status_code: The HTTP status code, when the failure was an HTTP error
            response (``None`` for transport-level failures such as timeouts).
    """

    def __init__(self, message: str, *, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class _Request:
    """A gateway request, independent of sync vs. async transport."""

    method: str
    path: str
    params: Optional[Dict[str, Any]] = None


class _RequestBuilder:
    """Builds gateway requests and parses responses.

    This is the single source of truth shared by both the sync and async
    clients so their wire behaviour cannot drift apart.
    """

    def __init__(self, contract_address: str) -> None:
        self._contract = contract_address

    # -- request construction ------------------------------------------------

    @staticmethod
    def session() -> _Request:
        return _Request("POST", "/session")

    def age(self, session_id: str, threshold: int) -> _Request:
        return _Request(
            "GET",
            f"/verify/age/{session_id}",
            {"threshold": int(threshold), "contract": self._contract},
        )

    def unique(self, session_id: str) -> _Request:
        return _Request(
            "GET",
            f"/verify/unique/{session_id}",
            {"contract": self._contract},
        )

    @staticmethod
    def health() -> _Request:
        return _Request("GET", "/health")

    # -- response parsing ----------------------------------------------------

    @staticmethod
    def parse_session(payload: Mapping[str, Any]) -> str:
        session_id = payload.get("sessionId")
        if not isinstance(session_id, str) or not session_id:
            raise ZkPassportError("Gateway did not return a sessionId.")
        return session_id

    @staticmethod
    def parse_age(payload: Mapping[str, Any]) -> AgeVerification:
        return AgeVerification.from_json(payload)

    @staticmethod
    def parse_unique(payload: Mapping[str, Any]) -> UniqueVerification:
        return UniqueVerification.from_json(payload)


def _json_or_raise(response: httpx.Response) -> Dict[str, Any]:
    """Return the JSON body or raise :class:`ZkPassportError` on any failure."""
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(response)
        raise ZkPassportError(
            f"Gateway returned {response.status_code}: {detail}",
            status_code=response.status_code,
        ) from exc
    try:
        data = response.json()
    except ValueError as exc:  # pragma: no cover - defensive
        raise ZkPassportError("Gateway returned a non-JSON response.") from exc
    if not isinstance(data, dict):  # pragma: no cover - defensive
        raise ZkPassportError("Gateway returned an unexpected JSON shape.")
    return data


def _extract_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text or response.reason_phrase
    if isinstance(body, dict):
        for key in ("error", "reason", "message"):
            value = body.get(key)
            if value:
                return str(value)
    return str(body)


def _base_url(gateway: str) -> str:
    return gateway.rstrip("/")


class ZkPassport:
    """Synchronous verifier client for the zkPassport gateway.

    Example:
        >>> zk = ZkPassport()
        >>> sid = zk.new_session()
        >>> result = zk.verify_age_over(sid, threshold=18)
        >>> result.verified
        True
    """

    def __init__(
        self,
        contract_address: str = DEFAULT_CONTRACT,
        gateway: str = DEFAULT_GATEWAY,
        timeout: float = 20.0,
    ) -> None:
        self.contract_address = contract_address
        self.gateway = _base_url(gateway)
        self._builder = _RequestBuilder(contract_address)
        self._client = httpx.Client(base_url=self.gateway, timeout=timeout)

    # -- lifecycle -----------------------------------------------------------

    def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        self._client.close()

    def __enter__(self) -> "ZkPassport":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # -- transport -----------------------------------------------------------

    def _send(self, request: _Request) -> Dict[str, Any]:
        try:
            response = self._client.request(
                request.method, request.path, params=request.params
            )
        except httpx.HTTPError as exc:
            raise ZkPassportError(f"Request to gateway failed: {exc}") from exc
        return _json_or_raise(response)

    # -- sessions ------------------------------------------------------------

    def new_session(self) -> str:
        """Create a fresh session id via the gateway (``POST /session``)."""
        return self._builder.parse_session(self._send(self._builder.session()))

    @staticmethod
    def new_session_local() -> str:
        """Generate a session id locally, without contacting the gateway.

        Returns 32 cryptographically-secure random bytes as a 64-character
        lowercase hex string.
        """
        return secrets.token_hex(32)

    # -- verification --------------------------------------------------------

    def verify_age_over(self, session_id: str, threshold: int = 18) -> AgeVerification:
        """Check whether the session proves ``age >= threshold``."""
        payload = self._send(self._builder.age(session_id, threshold))
        return self._builder.parse_age(payload)

    def verify_unique_human(self, session_id: str) -> UniqueVerification:
        """Check whether the session proves a unique, registered human."""
        payload = self._send(self._builder.unique(session_id))
        return self._builder.parse_unique(payload)

    # -- misc ----------------------------------------------------------------

    def health(self) -> Dict[str, Any]:
        """Return the gateway's health payload (``GET /health``)."""
        return self._send(self._builder.health())


class AsyncZkPassport:
    """Asynchronous verifier client for the zkPassport gateway.

    Example:
        >>> async with AsyncZkPassport() as zk:
        ...     sid = await zk.new_session()
        ...     result = await zk.verify_age_over(sid, threshold=18)
    """

    def __init__(
        self,
        contract_address: str = DEFAULT_CONTRACT,
        gateway: str = DEFAULT_GATEWAY,
        timeout: float = 20.0,
    ) -> None:
        self.contract_address = contract_address
        self.gateway = _base_url(gateway)
        self._builder = _RequestBuilder(contract_address)
        self._client = httpx.AsyncClient(base_url=self.gateway, timeout=timeout)

    # -- lifecycle -----------------------------------------------------------

    async def aclose(self) -> None:
        """Close the underlying HTTP connection pool."""
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncZkPassport":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    # -- transport -----------------------------------------------------------

    async def _send(self, request: _Request) -> Dict[str, Any]:
        try:
            response = await self._client.request(
                request.method, request.path, params=request.params
            )
        except httpx.HTTPError as exc:
            raise ZkPassportError(f"Request to gateway failed: {exc}") from exc
        return _json_or_raise(response)

    # -- sessions ------------------------------------------------------------

    async def new_session(self) -> str:
        """Create a fresh session id via the gateway (``POST /session``)."""
        payload = await self._send(self._builder.session())
        return self._builder.parse_session(payload)

    @staticmethod
    def new_session_local() -> str:
        """Generate a session id locally, without contacting the gateway."""
        return secrets.token_hex(32)

    # -- verification --------------------------------------------------------

    async def verify_age_over(
        self, session_id: str, threshold: int = 18
    ) -> AgeVerification:
        """Check whether the session proves ``age >= threshold``."""
        payload = await self._send(self._builder.age(session_id, threshold))
        return self._builder.parse_age(payload)

    async def verify_unique_human(self, session_id: str) -> UniqueVerification:
        """Check whether the session proves a unique, registered human."""
        payload = await self._send(self._builder.unique(session_id))
        return self._builder.parse_unique(payload)

    # -- misc ----------------------------------------------------------------

    async def health(self) -> Dict[str, Any]:
        """Return the gateway's health payload (``GET /health``)."""
        return await self._send(self._builder.health())
