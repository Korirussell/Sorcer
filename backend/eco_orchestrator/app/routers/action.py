# Action: core processing and routing
from fastapi import APIRouter

router = APIRouter(tags=["action"])


@router.post("/orchestrate")
def orchestrate():
    resp = {
        "status": "complete",
        "chat_id": "user_id_uuid",
        "response": "string",
        "receipt_id": "rec_uuid",
        "deferred": False,
    }
    return resp


@router.post("/deferred/execute/{task_id}")
def deferred_execute(task_id: str):
    resp = {
        "status": "processing",
        "new_eta": "ISO-TIMESTAMP",
        "current_grid_intensity": 140.2,
    }
    return resp


@router.post("/bypass")
def bypass():
    resp = {
        "response": "string",
        "warning": "No CO2 savings applied",
        "potential_savings_lost": "1.4g",
    }
    return resp
