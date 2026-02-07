# Intelligence: pre-check and grid data
from fastapi import APIRouter

router = APIRouter(tags=["intelligence"])


@router.post("/analyze/prompt")
def analyze_prompt():
    resp = {
        "score": 85,
        "suggestions": ["Remove redundant adjectives"],
        "potential_co2_savings": "0.8g",
    }
    return resp


@router.get("/grid/map")
def get_grid_map():
    resp = {
        "regions": [
            {
                "name": "us-central1",
                "score": 92,
                "breakdown": {"solar": 80, "nuclear": 12, "coal": 8},
            }
        ]
    }
    return resp
