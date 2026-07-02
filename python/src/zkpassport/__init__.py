"""zkPassport — verifier client for the Midnight privacy credential system.

A user proves a predicate (e.g. ``age >= 18``) once against the passport
contract on Midnight. Any dApp — including a Python backend using this package —
can then consume a ``verified ✓`` for an opaque session id, learning only that
one bit and never the underlying data (such as a birthdate).

Because Python cannot decode Midnight's on-chain contract state, this package is
a thin, well-typed client to a backend verification gateway, plus local
session-id generation and an optional FastAPI integration.

Public API::

    from zkpassport import ZkPassport, AsyncZkPassport
    from zkpassport import AgeVerification, UniqueVerification, ZkPassportError

The FastAPI helpers live in :mod:`zkpassport.fastapi` and are imported
separately so the base package has no FastAPI dependency.
"""

from __future__ import annotations

from .client import (
    DEFAULT_CONTRACT,
    DEFAULT_GATEWAY,
    AsyncZkPassport,
    ZkPassport,
    ZkPassportError,
)
from .models import AgeVerification, UniqueVerification

__version__ = "0.1.0"

__all__ = [
    "ZkPassport",
    "AsyncZkPassport",
    "ZkPassportError",
    "AgeVerification",
    "UniqueVerification",
    "DEFAULT_CONTRACT",
    "DEFAULT_GATEWAY",
    "__version__",
]
