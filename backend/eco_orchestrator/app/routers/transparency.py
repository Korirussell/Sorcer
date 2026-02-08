# Transparency and Analytics: verifiable impact and nutrition label
from fastapi import APIRouter

from core.receipt_store import get_receipt as get_stored_receipt, get_nutrition as get_stored_nutrition

router = APIRouter(tags=["transparency"])

STUB_RECEIPT = {
    "timestamp": "ISO-TIMESTAMP",
    "server_location": "us-central1 (Iowa)",
    "model_used": "gemini-2.0-flash",
    "baseline_co2_est": 4.2,
    "actual_co2": 1.8,
    "net_savings": 2.4,
    "efficiency_multiplier": 12.8,
    "wh_saved": 0.159,
    "was_cached": False,
}
STUB_NUTRITION = {
    "energy_kwh": 0.004,
    "grid_source": {"wind": 60, "solar": 22, "gas": 18},
    "og_co2": 4.2,
    "end_co2": 1.8,
    "net_savings": 2.4,
    "efficiency_multiplier": 12.8,
    "wh_saved": 0.159,
}


@router.get("/receipt/{receipt_id}")
def get_receipt(receipt_id: str):
    stored = get_stored_receipt(receipt_id)
    if stored is not None:
        return {**STUB_RECEIPT, **stored}
    return STUB_RECEIPT


@router.get("/analytics/nutrition/{receipt_id}")
def get_analytics_nutrition(receipt_id: str):
    stored = get_stored_nutrition(receipt_id)
    if stored is not None:
        return stored
    return STUB_NUTRITION
