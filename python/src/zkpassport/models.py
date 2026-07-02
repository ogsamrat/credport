"""Typed result models returned by the zkPassport verifier client.

These dataclasses are intentionally thin, faithful mirrors of the JSON the
backend verification gateway returns. They never carry the underlying
credential data (a birthdate, a document number, ...) — only the single
verified bit plus the public predicate parameters.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional

__all__ = ["AgeVerification", "UniqueVerification"]


@dataclass(frozen=True)
class AgeVerification:
    """Result of an ``age >= threshold`` predicate check.

    Attributes:
        verified: Whether the contract state proves the holder is at least
            ``threshold`` years old.
        threshold: The age threshold that was checked (e.g. ``18``).
        as_of_date: The reference date the proof was evaluated against, encoded
            as a ``YYYYMMDD`` integer (e.g. ``20260704``). ``None`` if absent.
        reason: A human-readable explanation, present only when ``verified`` is
            ``False``.
    """

    verified: bool
    threshold: Optional[int] = None
    as_of_date: Optional[int] = None
    reason: Optional[str] = None

    @classmethod
    def from_json(cls, data: Mapping[str, Any]) -> "AgeVerification":
        """Build an :class:`AgeVerification` from a gateway JSON payload."""
        return cls(
            verified=bool(data.get("verified", False)),
            threshold=_opt_int(data.get("threshold")),
            as_of_date=_opt_int(data.get("asOfDate")),
            reason=_opt_str(data.get("reason")),
        )


@dataclass(frozen=True)
class UniqueVerification:
    """Result of a "unique human" (proof-of-personhood) check.

    Attributes:
        verified: Whether the session corresponds to a distinct, registered
            human under the passport contract.
        nullifier: An opaque per-contract nullifier that is stable for a given
            person but reveals nothing about their identity. ``None`` if absent.
        reason: A human-readable explanation, present only when ``verified`` is
            ``False``.
    """

    verified: bool
    nullifier: Optional[str] = None
    reason: Optional[str] = None

    @classmethod
    def from_json(cls, data: Mapping[str, Any]) -> "UniqueVerification":
        """Build a :class:`UniqueVerification` from a gateway JSON payload."""
        return cls(
            verified=bool(data.get("verified", False)),
            nullifier=_opt_str(data.get("nullifier")),
            reason=_opt_str(data.get("reason")),
        )


def _opt_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _opt_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    return str(value)
