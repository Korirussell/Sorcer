# Discovery: dashboard and initial user state
from uuid import UUID

from fastapi import APIRouter

router = APIRouter(tags=["discovery"])


@router.get("/user/{user_id}/summary")
def get_user_summary(user_id: UUID):
    resp = {
        "chat_ids": ["uuid_chat1", "uuid_chat2"],
        "project_ids": ["proj_marketing", "proj_dev"],
        "pending_tasks_count": 3,
        "total_user_savings_g": 450.5,
    }
    return resp


@router.get("/chat/{chat_id}/history")
def get_chat_history(chat_id: UUID):
    resp = {
        "messages": [
            {"role": "user", "content": "string", "receipt_id": "rec_1"},
            {"role": "assistant", "content": "string", "receipt_id": "rec_1"},
        ],
        "total_chat_co2_saved_g": 12.4,
        "efficiency_score": 0.94,
    }
    return resp
