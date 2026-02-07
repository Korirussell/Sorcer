# Governance: budget and leaderboard
from fastapi import APIRouter

router = APIRouter(tags=["governance"])


@router.get("/budget/status/{project_id}")
def get_budget_status(project_id: str):
    resp = {
        "limit_g": 5000,
        "used_g": 1200,
        "remaining_percent": 76.0,
        "policy_active": "Standard",
    }
    return resp


@router.get("/leaderboard")
def get_leaderboard(filter: str = ""):
    resp = {
        "rankings": [
            {"name": "Engineering", "saved_kg": 24.5},
            {"name": "Marketing", "saved_kg": 18.2},
        ]
    }
    return resp
