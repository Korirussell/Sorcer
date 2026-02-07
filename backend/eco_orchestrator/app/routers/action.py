from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body
from pydantic import BaseModel

from core.orchestrator import EcoOrchestrator

router = APIRouter(tags=["action"])
orchestrator = EcoOrchestrator()


class OrchestrateRequest(BaseModel):
    prompt: str
    user_id: str
    project_id: str
    is_urgent: bool = False
    bypass_eco: bool = False
    deadline: Optional[datetime] = None


@router.post("/orchestrate")
async def orchestrate(req: OrchestrateRequest):
    results = await orchestrator.process(req)

    if results.get("status") == "deferred":
        return {
            "status": "deferred",
            "chat_id": f"{req.user_id}_uuid",
            "response": "",
            "receipt_id": None,
            "deferred": True,
            "task_id": results["task_id"],
            "message": results["message"],
        }

    return {
        "status": "complete",
        "chat_id": f"{req.user_id}_uuid",
        "response": results.get("response", ""),
        "receipt_id": results.get("receipt_id") or "rec_uuid",
        "deferred": False,
        "eco_stats": results.get("eco_stats", {}),
    }


@router.post("/deferred/execute/{task_id}")
async def deferred_execute(task_id: str):
    resp = {
        "status": "processing",
        "new_eta": "2026-02-07T05:00:00Z",
        "current_grid_intensity": 140.2,
    }
    return resp


@router.post("/bypass")
async def bypass(prompt: str = Body(..., embed=True)):
    resp = {
        "response": f"Direct response for: {prompt}",
        "warning": "No CO2 savings applied",
        "potential_savings_lost": "1.4g",
    }
    return resp