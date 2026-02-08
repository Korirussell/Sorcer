from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel

from core.orchestrator import EcoOrchestrator
from core.receipt_store import set_receipt as store_receipt
from core.grid_engine import get_default_grid_data

router = APIRouter(tags=["action"])
orchestrator = EcoOrchestrator()


class OrchestrateRequest(BaseModel):
    prompt: str
    user_id: str
    project_id: str
    is_urgent: bool = False
    bypass_eco: bool = False
    deadline: Optional[datetime] = None


@router.post("/orchestrate")
async def orchestrate(req: OrchestrateRequest):
    try:
        results = await orchestrator.process(req)
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e) or "LLM unavailable (check API key and quota)",
        )

    if results.get("status") == "deferred":
        return {
            "status": "deferred",
            "chat_id": f"{req.user_id}_uuid",
            "response": "",
            "receipt_id": None,
            "deferred": True,
            "task_id": results["task_id"],
            "message": results["message"],
        }

    return {
        "status": "complete",
        "chat_id": f"{req.user_id}_uuid",
        "response": results.get("response", ""),
        "receipt_id": results.get("receipt_id") or "rec_uuid",
        "deferred": False,
        "eco_stats": results.get("eco_stats", {}),
    }


@router.post("/deferred/execute/{task_id}")
async def deferred_execute(task_id: str):
    try:
        task_id_int = int(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="task_id must be an integer")

    try:
        task = await orchestrator.db.get_task_by_id(task_id_int)
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if task is None or task.get("status") != "deferred":
        raise HTTPException(status_code=404, detail="Task not found or already completed")

    try:
        prompt_text = task["prompt"]
        model_tier = task["model_tier"]
        raw_response = await orchestrator.client.generate(prompt_text, model_tier)
    except Exception:
        raise HTTPException(status_code=503, detail="LLM call failed")

    comp = orchestrator.compressor.compress(prompt_text)
    grid_data = get_default_grid_data()
    grid_intensity = grid_data["carbon_intensity_g_per_kwh"]
    grid_source = grid_data["grid_source"]
    impact = orchestrator.logger.calculate_savings(
        {
            "original_tokens": comp["original_count"],
            "final_tokens": comp["final_count"],
            "model": model_tier,
        },
        grid_intensity,
    )

    try:
        await orchestrator.db.complete_task(task_id_int, raw_response, impact)
    except Exception:
        raise HTTPException(status_code=503, detail="Failed to complete task in database")

    receipt_id = f"rec_deferred_{task_id}"
    grid_zone = grid_data.get("zone", "unknown")
    store_receipt(
        receipt_id,
        {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "server_location": "us-central1 (Iowa)",
            "grid_zone": grid_zone,
            "model_used": model_tier,
            "baseline_co2_est": impact.get("baseline_co2", 4.2),
            "actual_co2": impact.get("actual_co2", 1.8),
            "net_savings": impact.get("co2_saved_grams", 2.4),
            "efficiency_multiplier": impact.get("efficiency_multiplier"),
            "wh_saved": impact.get("wh_saved"),
            "was_cached": False,
            "energy_kwh": impact.get("energy_kwh", 0.004),
            "grid_source": grid_source,
        },
    )

    return {
        "status": "complete",
        "new_eta": datetime.utcnow().isoformat() + "Z",
        "current_grid_intensity": grid_intensity,
        "response": raw_response,
        "receipt_id": receipt_id,
        "eco_stats": impact,
    }


@router.post("/bypass")
async def bypass(prompt: str = Body(..., embed=True)):
    """Direct LLM access without eco optimizations. Computes potential_savings_lost vs orchestrate."""
    try:
        raw_response = await orchestrator.client.raw_llm_generate(prompt, "gemini-2.0-flash")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e) or "LLM unavailable")

    comp = orchestrator.compressor.compress(prompt)
    grid_data = get_default_grid_data()
    grid_intensity = grid_data["carbon_intensity_g_per_kwh"]
    original_tokens = comp["original_count"]
    final_tokens = comp["final_count"]

    # Bypass: full prompt to Flash. Orchestrate would have: compressed prompt to Flash.
    wh_per_token_flash = orchestrator.logger.WH_PER_TOKEN_FLASH
    bypass_co2 = (original_tokens * wh_per_token_flash / 1000) * grid_intensity
    orchestrate_co2 = (final_tokens * wh_per_token_flash / 1000) * grid_intensity
    potential_savings_lost = round(bypass_co2 - orchestrate_co2, 4)

    return {
        "response": raw_response,
        "warning": "No CO2 savings applied (bypass mode)",
        "potential_savings_lost_g": potential_savings_lost,
    }