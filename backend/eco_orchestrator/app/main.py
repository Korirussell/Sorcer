# API Entry point & Routes
from fastapi import FastAPI

from app.routers import grid, ledger, orchestrate

app = FastAPI(title="Eco Orchestrator", version="0.1.0")

app.include_router(orchestrate.router)
app.include_router(grid.router)
app.include_router(ledger.router)


@app.get("/health")
def health():
    return {"status": "ok"}
