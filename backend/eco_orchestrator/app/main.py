# API Entry point & Routes
import sys
from pathlib import Path

# Ensure package root is on path so app/core resolve when run from repo root
_package_root = Path(__file__).resolve().parent.parent
if str(_package_root) not in sys.path:
    sys.path.insert(0, str(_package_root))

# Load .env so GOOGLE_API_KEY etc. are set before any core code runs
from dotenv import load_dotenv
load_dotenv(_package_root / ".env")

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.worker import monitor_deferred_tasks
from app.routers import action, agent, discovery, governance, intelligence, transparency, test

app = FastAPI(title="Carbon-Aware AI Orchestrator", version="0.1.0")

# Allow frontend on another origin (e.g. localhost:3000) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(discovery.router)
app.include_router(action.router)
app.include_router(agent.router)
app.include_router(transparency.router)
app.include_router(intelligence.router)
app.include_router(governance.router)
app.include_router(test.router)

@app.on_event("startup")
async def startup_event():
    # create_task runs the worker loop without blocking the API
    asyncio.create_task(monitor_deferred_tasks())

@app.get("/health")
def health():
    return {"status": "ok"}
