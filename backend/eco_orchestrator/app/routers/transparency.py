# Transparency and Analytics: verifiable impact and nutrition label
from fastapi import APIRouter

router = APIRouter(tags=["transparency"])


@router.get("/receipt/{receipt_id}")
def get_receipt(receipt_id: str):
    resp = {
        "timestamp": "ISO-TIMESTAMP",
        "server_location": "us-central1 (Iowa)",
        "model_used": "gemini-1.5-flash",
        "baseline_co2_est": 4.2,
        "actual_co2": 1.8,
        "net_savings": 2.4,
        "was_cached": False,
    }
    return resp


@router.get("/analytics/nutrition/{receipt_id}")
def get_analytics_nutrition(receipt_id: str):
    resp = {
        "energy_kwh": 0.004,
        "grid_source": {
            "wind": 60,
            "solar": 22,
            "gas": 18,
        },
        "og_co2": 4.2,
        "end_co2": 1.8,
        "net_savings": 2.4,
    }
    return resp
