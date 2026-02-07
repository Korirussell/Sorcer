import json
import os
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.llm_client import LLMClient

router = APIRouter(tags=["test"])

client = LLMClient()

MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "server_model_map.json")
with open(MAP_PATH) as f:
    REGION_MAP = json.load(f)


class TestPromptRequest(BaseModel):
    prompt: str
    model_id: str
    location: str


@router.get("/test/models")
def get_available_models():
    return REGION_MAP


@router.post("/test/prompt")
async def test_prompt(req: TestPromptRequest):
    start = time.time()
    try:
        response = await client.generate(
            prompt=req.prompt,
            model_id=req.model_id,
            location=req.location,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    elapsed = round(time.time() - start, 2)
    return {
        "response": response,
        "model_id": req.model_id,
        "location": req.location,
        "latency_seconds": elapsed,
    }
