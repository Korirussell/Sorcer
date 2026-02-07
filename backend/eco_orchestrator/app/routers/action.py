from fastapi import APIRouter, Body
from core.compression import EcoCompressor
from pydantic import BaseModel

router = APIRouter(tags=["action"])

# Initialize once at the module level
compressor = EcoCompressor(aggressive=True)

# Define a quick schema for the request so FastAPI knows what to expect
class OrchestrateRequest(BaseModel):
    prompt: str
    user_id: str
    project_id: str
    is_urgent: bool = False

@router.post("/orchestrate")
async def orchestrate(req: OrchestrateRequest):
    #CALL FROM ORCHESTRATOR . PY
    
    
    # We can use the 'result' metadata to show off the savings
    resp = {
        "status": "complete",
        "chat_id": f"{req.user_id}_uuid",
        "response": f"Processed: {result['compressed_text']}",
        "receipt_id": "rec_uuid",
        "deferred": False,
        "eco_stats": {
            "tokens_saved": result["saved_tokens"],
            "reduction": f"{(result['saved_tokens'] / result['original_count']) * 100:.1f}%" if result['original_count'] > 0 else "0%"
        }
    }
    return resp

@router.post("/deferred/execute/{task_id}")
async def deferred_execute(task_id: str):
    resp = {
        "status": "processing",
        "new_eta": "2026-02-07T05:00:00Z",
        "current_grid_intensity": 140.2,
    }
    return resp

@router.post("/bypass")
async def bypass(prompt: str = Body(..., embed=True)):
    resp = {
        "response": f"Direct response for: {prompt}",
        "warning": "No CO2 savings applied",
        "potential_savings_lost": "1.4g",
    }
    return resp