# Intelligence: pre-check and grid data
from fastapi import APIRouter

from core.grid_engine import get_grid_map as _get_grid_map

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
    return _get_grid_map()
