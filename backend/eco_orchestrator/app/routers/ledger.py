# Grouped endpoints: ledger / receipts & budgets
from fastapi import APIRouter

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/")
def ledger_summary():
    return {"entries": []}
