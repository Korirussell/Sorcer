# Discovery: dashboard and initial user state
from uuid import UUID

from fastapi import APIRouter

from core.receipt_store import get_all_receipts

router = APIRouter(tags=["discovery"])


def _aggregate_savings() -> tuple[float, float]:
    """Sum net_savings (g CO2) and avg efficiency_multiplier from all receipts."""
    receipts = get_all_receipts()
    total_g = sum(r.get("net_savings", 0) or 0 for r in receipts)
    mults = [r.get("efficiency_multiplier") for r in receipts if r.get("efficiency_multiplier") is not None]
    avg_eff = sum(mults) / len(mults) if mults else 0.94
    return round(total_g, 1), round(avg_eff, 2)


@router.get("/user/{user_id}/summary")
def get_user_summary(user_id: UUID):
    total_savings_g, avg_efficiency = _aggregate_savings()
    resp = {
        "chat_ids": ["uuid_chat1", "uuid_chat2"],
        "project_ids": ["proj_marketing", "proj_dev"],
        "pending_tasks_count": 3,
        "total_user_savings_g": total_savings_g,
    }
    return resp


@router.get("/chat/{chat_id}/history")
def get_chat_history(chat_id: UUID):
    total_savings_g, avg_efficiency = _aggregate_savings()
    resp = {
        "messages": [
            {"role": "user", "content": "string", "receipt_id": "rec_1"},
            {"role": "assistant", "content": "string", "receipt_id": "rec_1"},
        ],
        "total_chat_co2_saved_g": total_savings_g,
        "efficiency_score": avg_efficiency,
    }
    return resp
