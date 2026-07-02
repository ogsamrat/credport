"""FastAPI integration for plug-and-play zkPassport gating.

This module is optional: it is only imported when you actually call
:func:`require_age_over` / :func:`require_unique_human`, and it imports
``fastapi`` lazily so the base ``zkpassport`` package works without FastAPI
installed. Install the extra with ``pip install "zkpassport[fastapi]"``.

Typical use::

    from fastapi import FastAPI, Depends
    from zkpassport.fastapi import require_age_over

    app = FastAPI()

    @app.get("/adults-only")
    def adults_only(age = Depends(require_age_over(18))):
        return {"ok": True, "asOfDate": age.as_of_date}
"""

from __future__ import annotations

from typing import Any, Callable, Optional

from .client import ZkPassport
from .models import AgeVerification, UniqueVerification

__all__ = [
    "require_age_over",
    "require_unique_human",
    "DEFAULT_SESSION_HEADER",
]

#: Header the dependencies read the opaque session id from by default.
DEFAULT_SESSION_HEADER = "x-zkpassport-session"


def _import_fastapi() -> Any:
    try:
        import fastapi  # noqa: WPS433 (intentional lazy import)
    except ModuleNotFoundError as exc:  # pragma: no cover - env dependent
        raise RuntimeError(
            "FastAPI is required for zkpassport.fastapi. "
            'Install it with: pip install "zkpassport[fastapi]"'
        ) from exc
    return fastapi


def _read_session(request: Any, header: str) -> str:
    """Extract the session id from a request header or raise HTTP 400."""
    fastapi = _import_fastapi()
    session_id = request.headers.get(header)
    if not session_id:
        raise fastapi.HTTPException(
            status_code=400,
            detail=f"Missing '{header}' header (zkPassport session id).",
        )
    return session_id


def require_age_over(
    threshold: int = 18,
    session_header: str = DEFAULT_SESSION_HEADER,
    zk: Optional[ZkPassport] = None,
) -> Callable[..., AgeVerification]:
    """Build a FastAPI dependency that gates a route on ``age >= threshold``.

    The returned callable reads the opaque session id from ``session_header``,
    asks the gateway to verify the predicate, and:

    * raises ``HTTPException(400)`` if the header is missing,
    * raises ``HTTPException(403)`` if the predicate is not verified,
    * otherwise returns the :class:`~zkpassport.models.AgeVerification`.

    Args:
        threshold: Minimum age to require.
        session_header: Request header carrying the session id.
        zk: A :class:`~zkpassport.client.ZkPassport` instance to reuse. If
            omitted, a default client (local gateway, preprod contract) is
            created lazily.

    Returns:
        A dependency callable suitable for ``Depends(...)``.
    """
    client = zk if zk is not None else ZkPassport()

    def dependency(request: Any) -> AgeVerification:
        fastapi = _import_fastapi()
        session_id = _read_session(request, session_header)
        result = client.verify_age_over(session_id, threshold=threshold)
        if not result.verified:
            raise fastapi.HTTPException(
                status_code=403,
                detail=result.reason or f"Age >= {threshold} not verified.",
            )
        return result

    return _with_request_param(dependency)


def require_unique_human(
    session_header: str = DEFAULT_SESSION_HEADER,
    zk: Optional[ZkPassport] = None,
) -> Callable[..., UniqueVerification]:
    """Build a FastAPI dependency that gates a route on proof-of-personhood.

    Mirrors :func:`require_age_over` but checks ``verify_unique_human``.
    """
    client = zk if zk is not None else ZkPassport()

    def dependency(request: Any) -> UniqueVerification:
        fastapi = _import_fastapi()
        session_id = _read_session(request, session_header)
        result = client.verify_unique_human(session_id)
        if not result.verified:
            raise fastapi.HTTPException(
                status_code=403,
                detail=result.reason or "Unique human not verified.",
            )
        return result

    return _with_request_param(dependency)


def _with_request_param(func: Callable[..., Any]) -> Callable[..., Any]:
    """Annotate ``request`` as a ``starlette.Request`` for FastAPI injection.

    Done at call time so importing this module never eagerly imports FastAPI.
    """
    fastapi = _import_fastapi()
    from starlette.requests import Request  # noqa: WPS433 (lazy)

    func.__annotations__ = dict(func.__annotations__)
    func.__annotations__["request"] = Request
    # Touch fastapi so linters keep the import meaningful.
    assert fastapi is not None
    return func
