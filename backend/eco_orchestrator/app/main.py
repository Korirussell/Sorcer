from fastapi import FastAPI, BackgroundTasks, HTTPException
from typing import List

# Import your custom modules (The "EZ" Library)
from app.schemas import actions, analytics, discovery
from core.orchestrator import EcoOrchestrator
from core.grid_engine import GridIntelligence

app = FastAPI(title="Carbon-Aware AI Orchestration Layer")
orchestrator = EcoOrchestrator()
grid_intel = GridIntelligence()

# --- 1. DISCOVERY ---
@app.get("/user/{u_id}/summary", response_model=discovery.UserSummary)
async def get_user_summary(u_id: str):
    """Initial dashboard load: returns IDs and high-level savings."""
    return await orchestrator.get_user_summary(u_id)

@app.get("/chat/{c_id}/history", response_model=discovery.ChatHistory)
async def get_chat_history(c_id: str):
    """Fetches full message history and per-chat efficiency stats."""
    return await orchestrator.get_chat_history(c_id)

# --- 2. ACTION ---
@app.post("/orchestrate", response_model=actions.OrchestrateResponse)
async def orchestrate_request(req: actions.OrchestrateRequest, background_tasks: BackgroundTasks):
    """The main flow: Scans, prunes, routes, or defers the prompt."""
    result = await orchestrator.process(req)
    if result.deferred:
        # Schedule a background job to monitor the grid for this task
        background_tasks.add_task(orchestrator.monitor_deferred_task, result.task_id)
    return result

@app.post("/bypass")
async def bypass_eco(req: actions.BypassRequest):
    """Emergency direct LLM call with 'Carbon Debt' logging."""
    return await orchestrator.direct_call(req)

# --- 3. INSIGHTS ---
@app.get("/receipt/{r_id}", response_model=analytics.Receipt)
async def get_receipt(r_id: str):
    """Proof of Green: Verifiable details for a specific prompt."""
    return await orchestrator.ledger.get_receipt(r_id)

@app.get("/analytics/nutrition/{r_id}", response_model=analytics.EnergyLabel)
async def get_nutrition_label(r_id: str):
    """The 'Energy Nutrition Label' data for the UI badge."""
    return await orchestrator.get_nutrition(r_id)

# --- 4. INTELLIGENCE ---
@app.get("/grid/map", response_model=List[discovery.GridRegion])
async def get_green_map():
    """Returns global cloud regions ranked by current greenness."""
    return await grid_intel.get_global_scores()

@app.post("/analyze/prompt")
async def pre_check_prompt(prompt: actions.PromptInput):
    """Pre-send 'Password Strength' UI for prompt efficiency."""
    return await orchestrator.optimizer.analyze_efficiency(prompt)



# --- 5. DEFERRED EXECUTION ---
@app.post("/deferred/execute/{task_id}")
async def execute_deferred_task(task_id: str, force: bool = False):
    """Manually trigger a paused task or check its status."""
    return await orchestrator.execute_deferred(task_id, force)

# --- 6. GOVERNANCE & SOCIAL ---
@app.get("/budget/status/{project_id}")
async def get_project_budget(project_id: str):
    """Returns the carbon 'Gas Tank' for a project."""
    return await orchestrator.ledger.get_budget_status(project_id)

@app.get("/leaderboard")
async def get_leaderboard(filter_by: str = "department"):
    """Rankings for the greenest users/teams."""
    return await orchestrator.ledger.get_leaderboard(filter_by)

@app.get("/analytics/fun-stats")
async def get_global_fun_stats():
    """Returns the '18 iPhones' style comparisons."""
    return await orchestrator.ledger.get_fun_stats()