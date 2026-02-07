# Grouped endpoints: grid / carbon
from fastapi import APIRouter

router = APIRouter(prefix="/grid", tags=["grid"])


@router.get("/")
def grid_status():
    return {"status": "ok"}
