# Grouped endpoints: orchestration
from fastapi import APIRouter

router = APIRouter(prefix="/orchestrate", tags=["orchestrate"])


@router.get("/")
def list_flows():
    return {"flows": []}
