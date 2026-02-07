# API Entry point & Routes
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import action, discovery, governance, intelligence, transparency

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
app.include_router(transparency.router)
app.include_router(intelligence.router)
app.include_router(governance.router)


@app.get("/health")
def health():
    return {"status": "ok"}
