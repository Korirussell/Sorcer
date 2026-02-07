"""
Shared in-memory receipt store so orchestrator can write and transparency router can read.
"""
from datetime import datetime
from typing import Any

_store: dict[str, dict[str, Any]] = {}


def set_receipt(receipt_id: str, data: dict[str, Any]) -> None:
    _store[receipt_id] = {**data, "timestamp": data.get("timestamp") or datetime.utcnow().isoformat() + "Z"}


def get_receipt(receipt_id: str) -> dict[str, Any] | None:
    return _store.get(receipt_id)


def get_nutrition(receipt_id: str) -> dict[str, Any] | None:
    """Return nutrition-label shape from stored receipt or None."""
    r = _store.get(receipt_id)
    if not r:
        return None
    return {
        "energy_kwh": r.get("energy_kwh", 0.004),
        "grid_source": r.get("grid_source", {"wind": 60, "solar": 22, "gas": 18}),
        "og_co2": r.get("baseline_co2_est", r.get("baseline_co2", 4.2)),
        "end_co2": r.get("actual_co2", 1.8),
        "net_savings": r.get("net_savings", 2.4),
    }
