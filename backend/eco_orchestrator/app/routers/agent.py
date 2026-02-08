# Agent: Carbon-Aware Planning Sandbox
# POST /agent/plan         — single-shot green execution strategy.
# POST /agent/project      — multi-step agentic project planner.
# POST /agent/execute-step — actually run a planned step through the LLM.

from __future__ import annotations

import hashlib
import math
import random
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.grid_engine import (
    get_grid_map,
    get_default_grid_data,
    DEFAULT_EM_ZONE,
)
from core.llm_client import LLMClient

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/agent", tags=["agent"])

# ---------------------------------------------------------------------------
# Pydantic Schemas — single-shot plan (/plan)
# ---------------------------------------------------------------------------


class PlanRequest(BaseModel):
    """Input schema for the single-shot planning agent."""

    prompt: str = Field(..., min_length=1, description="Developer spec / prompt to plan for")
    max_carbon_g: float = Field(..., gt=0, description="Carbon budget in grams CO2")
    deadline: str = Field(
        ...,
        description="ISO-8601 deadline by which the task must complete",
    )


class GreenPlan(BaseModel):
    """Output schema — the proposed green execution strategy."""

    status: str = "proposed"
    estimated_now_g: float = Field(..., description="Estimated CO2 (g) if executed immediately")
    optimized_future_g: float = Field(..., description="Estimated CO2 (g) in the optimal green window")
    savings_g: float = Field(..., description="CO2 savings (g) by deferring")
    selected_window: str = Field(..., description="ISO-8601 datetime of the recommended green window")
    model_choice: str = Field(..., description="LLM model the agent recommends")
    inner_monologue: List[str] = Field(
        ...,
        description="Step-by-step reasoning trace from the planning agent",
    )


# ---------------------------------------------------------------------------
# Pydantic Schemas — project planner (/project)
# ---------------------------------------------------------------------------


class ProjectRequest(BaseModel):
    """Input schema for an agentic project."""

    name: str = Field(..., min_length=1, description="Project name")
    description: str = Field(..., min_length=1, description="Human-readable project description")
    deadline: str = Field(..., description="ISO-8601 deadline for the entire project")
    carbon_limit_g: float = Field(..., gt=0, description="Total carbon budget (g CO2) for the project")
    prompt: str = Field(..., min_length=1, description="High-level developer prompt / spec")


class StepPlan(BaseModel):
    """One agentic step within a project plan."""

    step_number: int = Field(..., description="1-based step index")
    title: str = Field(..., description="Short human-readable name for the step")
    prompt: str = Field(..., description="The LLM prompt that would be sent for this step")
    description: str = Field(..., description="What this step accomplishes")
    model_choice: str = Field(..., description="Recommended model for this step")
    scheduled_window: str = Field(..., description="ISO-8601 datetime when this step is scheduled")
    estimated_carbon_g: float = Field(..., description="Projected CO2 (g) for this step")
    estimated_tokens: int = Field(..., description="Projected token count for this step")
    reasoning: List[str] = Field(..., description="Inner-monologue trace for this step")


class ProjectPlan(BaseModel):
    """Full project plan returned to the frontend."""

    name: str
    description: str
    deadline: str
    carbon_limit_g: float
    prompt: str
    status: str = "proposed"
    total_estimated_carbon_g: float = Field(
        ..., description="Sum of estimated_carbon_g across all steps",
    )
    total_savings_g: float = Field(
        ..., description="Total CO2 saved vs. running everything immediately",
    )
    steps: List[StepPlan]
    inner_monologue: List[str] = Field(
        ..., description="Top-level reasoning trace for the whole project",
    )


# ---------------------------------------------------------------------------
# AgentPlanner — the "fudge" engine
# ---------------------------------------------------------------------------


# Model catalogue used for heuristic selection.
_MODEL_CATALOGUE = [
    {"name": "gemini-2.0-flash",   "energy_kwh_per_1k_tok": 0.0006, "quality": "fast"},
    {"name": "gemini-1.5-pro",     "energy_kwh_per_1k_tok": 0.0025, "quality": "high"},
    {"name": "claude-3-haiku",     "energy_kwh_per_1k_tok": 0.0005, "quality": "fast"},
    {"name": "claude-3.5-sonnet",  "energy_kwh_per_1k_tok": 0.0020, "quality": "high"},
    {"name": "gpt-4o-mini",        "energy_kwh_per_1k_tok": 0.0007, "quality": "fast"},
]

# Template phases used to decompose a project prompt into agentic steps.
# Each entry: (title, description_template, prompt_template, weight, quality_hint)
#   weight  — relative share of the total token budget
#   quality — "high" phases get a stronger model when budget allows
_PHASE_TEMPLATES: list[tuple[str, str, str, float, str]] = [
    (
        "Research & Requirements",
        "Analyze the specification and gather contextual knowledge needed to execute: '{summary}'.",
        "You are a senior architect. Analyze the following spec and produce a structured requirements document with acceptance criteria.\n\nSpec: {prompt}",
        0.10,
        "high",
    ),
    (
        "Architecture & Design",
        "Produce a system design, data-flow diagram, and technology selection for the project.",
        "Given the requirements below, design the system architecture. Include component diagram, data flow, API contracts, and technology choices.\n\nRequirements: {prompt}",
        0.15,
        "high",
    ),
    (
        "Implementation",
        "Generate production-grade code artefacts according to the design.",
        "Implement the following design as clean, well-documented code. Follow best practices for error handling, typing, and testing.\n\nDesign: {prompt}",
        0.40,
        "high",
    ),
    (
        "Testing & Validation",
        "Create and execute test suites to verify correctness and edge-case coverage.",
        "Write comprehensive unit and integration tests for the implementation below. Cover edge cases and failure modes.\n\nImplementation summary: {prompt}",
        0.20,
        "fast",
    ),
    (
        "Documentation & Deployment",
        "Generate user-facing documentation, deployment manifests, and a rollout plan.",
        "Produce README documentation, deployment configuration (Docker/CI), and a step-by-step rollout plan for the project below.\n\nProject: {prompt}",
        0.15,
        "fast",
    ),
]


class AgentPlanner:
    """
    Mock planning engine.

    Supports two modes:
      • **Single-shot** (`generate_plan`) — one prompt → one GreenPlan.
      • **Project**     (`generate_project`) — one prompt → decomposed
        multi-step ProjectPlan with per-step scheduling and carbon budgets.

    Neither mode ever calls an LLM.
    """

    # Rough per-token energy (kWh) used when no model is selected yet.
    _BASELINE_KWH_PER_TOKEN = 0.0015

    # ------------------------------------------------------------------
    # Public: single-shot plan
    # ------------------------------------------------------------------

    def generate_plan(self, req: PlanRequest) -> GreenPlan:
        """Return a fully-populated ``GreenPlan`` for *req*."""
        monologue: list[str] = []

        deadline_dt = self._parse_deadline(req.deadline)

        # --- Step 1: estimate token count from prompt ----------------
        estimated_tokens = self._estimate_tokens(req.prompt)
        monologue.append(
            f"Step 1: Analyzing request — '{self._summarize(req.prompt)}' "
            f"(estimated ~{estimated_tokens:,} tokens for generation)."
        )

        # --- Step 2: current grid intensity --------------------------
        grid = get_default_grid_data()
        current_intensity = grid.get("carbon_intensity_g_per_kwh", 420.0)
        zone = grid.get("zone", DEFAULT_EM_ZONE)
        monologue.append(
            f"Step 2: Grid intensity for {zone} is {current_intensity:.0f} g CO₂/kWh — "
            f"{'elevated' if current_intensity > 300 else 'moderate' if current_intensity > 150 else 'low'}."
        )

        # --- Step 3: find the greenest window before deadline --------
        green_window, green_intensity = self._find_green_window(
            deadline_dt, current_intensity,
        )
        monologue.append(
            f"Step 3: Identified green window at {green_window.strftime('%Y-%m-%dT%H:%M:%SZ')} "
            f"({green_intensity:.0f} g CO₂/kWh) — "
            f"{self._relative_label(green_window)} before the deadline."
        )

        # --- Step 4: pick a model that fits the budget ---------------
        model = self._select_model(
            estimated_tokens, green_intensity, req.max_carbon_g,
        )
        energy_per_tok = model["energy_kwh_per_1k_tok"] / 1000
        monologue.append(
            f"Step 4: Selected model '{model['name']}' "
            f"({model['quality']}-tier, {model['energy_kwh_per_1k_tok']} kWh/1k tokens) "
            f"to stay within the {req.max_carbon_g:.1f} g CO₂ budget."
        )

        # --- Step 5: compute CO₂ estimates ---------------------------
        estimated_now_g = self._co2_grams(
            estimated_tokens, energy_per_tok, current_intensity,
        )
        optimized_future_g = self._co2_grams(
            estimated_tokens, energy_per_tok, green_intensity,
        )
        savings_g = round(estimated_now_g - optimized_future_g, 4)

        pct = (savings_g / estimated_now_g * 100) if estimated_now_g else 0
        monologue.append(
            f"Step 5: Deferring saves {savings_g:.2f} g CO₂ "
            f"({pct:.1f}% reduction). Proposing plan within budget "
            f"({'PASS' if optimized_future_g <= req.max_carbon_g else 'OVER BUDGET — review deadline or budget'})."
        )

        return GreenPlan(
            status="proposed",
            estimated_now_g=round(estimated_now_g, 4),
            optimized_future_g=round(optimized_future_g, 4),
            savings_g=savings_g,
            selected_window=green_window.strftime("%Y-%m-%dT%H:%M:%SZ"),
            model_choice=model["name"],
            inner_monologue=monologue,
        )

    # ------------------------------------------------------------------
    # Public: multi-step project plan
    # ------------------------------------------------------------------

    def generate_project(self, req: ProjectRequest) -> ProjectPlan:
        """Decompose a project prompt into scheduled agentic steps."""
        top_monologue: list[str] = []

        deadline_dt = self._parse_deadline(req.deadline)
        now = datetime.now(timezone.utc)
        total_hours = max(1.0, (deadline_dt - now).total_seconds() / 3600)

        # ---- grid snapshot ------------------------------------------
        grid = get_default_grid_data()
        current_intensity: float = grid.get("carbon_intensity_g_per_kwh", 420.0)
        zone: str = grid.get("zone", DEFAULT_EM_ZONE)

        top_monologue.append(
            f"Received project '{req.name}': {self._summarize(req.prompt, 80)}."
        )
        top_monologue.append(
            f"Grid intensity for {zone} is {current_intensity:.0f} g CO₂/kWh. "
            f"Total time budget: {total_hours:.1f} h. Carbon limit: {req.carbon_limit_g:.2f} g."
        )

        # ---- total token estimate for the whole project -------------
        total_tokens = self._estimate_tokens(req.prompt)
        # Scale up — a full project generates more output than a single call
        total_tokens = int(total_tokens * len(_PHASE_TEMPLATES) * 0.7)
        top_monologue.append(
            f"Estimated total generation: ~{total_tokens:,} tokens across "
            f"{len(_PHASE_TEMPLATES)} phases."
        )

        # ---- find green windows for scheduling ----------------------
        # We generate a series of windows spread across the timeline,
        # each nudged toward low-intensity slots.
        green_base_dt, green_intensity = self._find_green_window(
            deadline_dt, current_intensity,
        )
        top_monologue.append(
            f"Best green window found at {green_base_dt.strftime('%Y-%m-%dT%H:%M:%SZ')} "
            f"({green_intensity:.0f} g CO₂/kWh). Scheduling steps around it."
        )

        # ---- build individual steps ---------------------------------
        steps: list[StepPlan] = []
        cumulative_carbon = 0.0
        cumulative_immediate_carbon = 0.0
        prompt_summary = self._summarize(req.prompt, 120)

        for idx, (title, desc_tpl, prompt_tpl, weight, quality_hint) in enumerate(
            _PHASE_TEMPLATES
        ):
            step_num = idx + 1
            step_tokens = max(128, int(total_tokens * weight))

            # Per-step carbon budget (proportional share of total limit)
            step_carbon_budget = req.carbon_limit_g * weight

            # Choose the best model for this step within its slice of budget
            model = self._select_model(
                step_tokens, green_intensity, step_carbon_budget,
            )
            kwh_per_tok = model["energy_kwh_per_1k_tok"] / 1000

            # CO₂ if run in the green window
            step_carbon = round(
                self._co2_grams(step_tokens, kwh_per_tok, green_intensity), 4,
            )
            # CO₂ if run right now
            step_immediate_carbon = round(
                self._co2_grams(step_tokens, kwh_per_tok, current_intensity), 4,
            )
            cumulative_carbon += step_carbon
            cumulative_immediate_carbon += step_immediate_carbon

            # Schedule: space steps evenly but bias toward the green window
            phase_fraction = idx / max(len(_PHASE_TEMPLATES) - 1, 1)
            offset_hours = total_hours * (0.1 + 0.8 * phase_fraction)
            # Nudge toward the green base if it falls in range
            green_offset = (green_base_dt - now).total_seconds() / 3600
            blend = 0.6  # 60 % toward the green window
            offset_hours = offset_hours * (1 - blend) + green_offset * blend
            offset_hours = max(0.0, min(offset_hours, total_hours - 0.5))
            scheduled_dt = now + timedelta(hours=offset_hours)

            # Fill templates
            step_description = desc_tpl.format(summary=prompt_summary)
            step_prompt = prompt_tpl.format(prompt=req.prompt)

            # Per-step reasoning
            reasoning = [
                f"Phase {step_num}/{len(_PHASE_TEMPLATES)}: {title}.",
                f"Allocated {weight * 100:.0f}% of token budget → ~{step_tokens:,} tokens.",
                f"Model: {model['name']} ({model['quality']}-tier, "
                f"{model['energy_kwh_per_1k_tok']} kWh/1k tok).",
                f"Scheduled at {scheduled_dt.strftime('%Y-%m-%dT%H:%M:%SZ')} "
                f"(grid ≈ {green_intensity:.0f} g CO₂/kWh).",
                f"Estimated carbon: {step_carbon:.4f} g CO₂ "
                f"(vs. {step_immediate_carbon:.4f} g if run now — "
                f"saves {max(0, step_immediate_carbon - step_carbon):.4f} g).",
            ]

            steps.append(
                StepPlan(
                    step_number=step_num,
                    title=title,
                    prompt=step_prompt,
                    description=step_description,
                    model_choice=model["name"],
                    scheduled_window=scheduled_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    estimated_carbon_g=step_carbon,
                    estimated_tokens=step_tokens,
                    reasoning=reasoning,
                )
            )

        total_savings = round(cumulative_immediate_carbon - cumulative_carbon, 4)
        pct = (
            (total_savings / cumulative_immediate_carbon * 100)
            if cumulative_immediate_carbon
            else 0
        )

        budget_verdict = (
            "within budget"
            if cumulative_carbon <= req.carbon_limit_g
            else "OVER BUDGET — consider extending deadline or raising limit"
        )
        top_monologue.append(
            f"Total optimized carbon: {cumulative_carbon:.4f} g CO₂ "
            f"({budget_verdict}). "
            f"Savings vs. immediate execution: {total_savings:.4f} g ({pct:.1f}%)."
        )

        return ProjectPlan(
            name=req.name,
            description=req.description,
            deadline=req.deadline,
            carbon_limit_g=req.carbon_limit_g,
            prompt=req.prompt,
            status="proposed",
            total_estimated_carbon_g=round(cumulative_carbon, 4),
            total_savings_g=total_savings,
            steps=steps,
            inner_monologue=top_monologue,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_deadline(raw: str) -> datetime:
        """Parse an ISO-8601 string into a timezone-aware datetime."""
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid deadline format: {raw!r}. Use ISO-8601.",
            ) from exc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if dt <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=422,
                detail="Deadline must be in the future.",
            )
        return dt

    @staticmethod
    def _estimate_tokens(prompt: str) -> int:
        """Deterministic-ish token estimate from the prompt text.

        Uses a simple hash-seeded heuristic so the same prompt always
        yields the same number — no randomness for reproducibility.
        """
        base = max(256, len(prompt.split()) * 12)
        # Seed a multiplier from the prompt hash so it looks "smart"
        h = int(hashlib.sha256(prompt.encode()).hexdigest()[:8], 16)
        multiplier = 1.0 + (h % 400) / 1000  # 1.0 – 1.4×
        return int(base * multiplier)

    @staticmethod
    def _summarize(prompt: str, max_len: int = 60) -> str:
        """Truncate prompt for display in monologue."""
        return prompt[:max_len] + ("..." if len(prompt) > max_len else "")

    @staticmethod
    def _co2_grams(tokens: int, kwh_per_token: float, intensity_g_kwh: float) -> float:
        """CO₂ (grams) = tokens × energy-per-token (kWh) × grid intensity (g/kWh)."""
        return tokens * kwh_per_token * intensity_g_kwh

    # ------------------------------------------------------------------

    def _find_green_window(
        self,
        deadline: datetime,
        current_intensity: float,
    ) -> tuple[datetime, float]:
        """Locate the lowest-intensity window before *deadline*.

        First attempts to use real grid-map data.  If unavailable, falls
        back to a plausible synthetic curve (overnight trough).
        """
        now = datetime.now(timezone.utc)
        hours_until = max(1, (deadline - now).total_seconds() / 3600)

        # Try real grid-map data for region intensities
        try:
            grid_map = get_grid_map()
            regions = grid_map.get("regions", [])
            if regions:
                best = min(
                    regions,
                    key=lambda r: r.get("carbon_intensity_g_per_kwh") or 9999,
                )
                best_intensity = best.get("carbon_intensity_g_per_kwh")
                if best_intensity and best_intensity < current_intensity:
                    # Place the window at the midpoint of the available time
                    window_dt = now + timedelta(hours=hours_until * 0.6)
                    return window_dt, float(best_intensity)
        except Exception:
            pass  # grid map may fail — fall through to synthetic

        # Synthetic overnight trough: assume intensity drops ~40-65%
        # during off-peak hours (2 AM – 5 AM local).
        drop_factor = 0.35 + (random.Random(int(hours_until * 100)).random() * 0.25)
        future_intensity = current_intensity * drop_factor

        # Pick a window biased toward the latter half of the available time
        offset_hours = hours_until * random.Random(42).uniform(0.55, 0.85)
        window_dt = now + timedelta(hours=offset_hours)
        return window_dt, round(future_intensity, 2)

    # ------------------------------------------------------------------

    def _select_model(
        self,
        tokens: int,
        intensity: float,
        budget_g: float,
    ) -> dict:
        """Pick the highest-quality model whose projected CO₂ fits *budget_g*."""
        # Sort: prefer high-quality, then lowest energy
        candidates = sorted(
            _MODEL_CATALOGUE,
            key=lambda m: (m["quality"] != "high", m["energy_kwh_per_1k_tok"]),
        )
        for model in candidates:
            kwh_per_tok = model["energy_kwh_per_1k_tok"] / 1000
            co2 = self._co2_grams(tokens, kwh_per_tok, intensity)
            if co2 <= budget_g:
                return model
        # Fallback: cheapest model regardless of quality
        return min(candidates, key=lambda m: m["energy_kwh_per_1k_tok"])

    @staticmethod
    def _relative_label(dt: datetime) -> str:
        """Human-friendly relative-time label."""
        delta = dt - datetime.now(timezone.utc)
        hours = delta.total_seconds() / 3600
        if hours < 1:
            return f"in ~{int(delta.total_seconds() / 60)} minutes"
        if hours < 24:
            return f"in ~{hours:.1f} hours"
        return f"in ~{hours / 24:.1f} days"


# ---------------------------------------------------------------------------
# Pydantic Schemas — step execution (/execute-step)
# ---------------------------------------------------------------------------


class ExecuteStepRequest(BaseModel):
    """Input: which step to run and with what prompt / model."""

    prompt: str = Field(..., min_length=1, description="The LLM prompt for this step")
    model_choice: str = Field(..., description="Model identifier to use")
    step_number: int = Field(..., ge=1, description="1-based step index (for tracking)")
    title: str = Field("", description="Step title (echoed back for convenience)")


class ExecuteStepResponse(BaseModel):
    """Output: the LLM's actual response plus carbon accounting."""

    step_number: int
    title: str
    model_used: str
    output: str = Field(..., description="Raw LLM response text")
    elapsed_ms: int = Field(..., description="Wall-clock time for the LLM call")
    estimated_carbon_g: float = Field(..., description="Estimated CO2 for this call")
    executed_at: str = Field(..., description="ISO-8601 timestamp of execution")


# Singleton planner + LLM client
_planner = AgentPlanner()
_llm = LLMClient()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/plan", response_model=GreenPlan)
def create_plan(req: PlanRequest):
    """
    **Simulation Sandbox** — Carbon-Aware Agentic Planning (single-shot).

    Accepts a developer prompt and carbon constraints, then returns a
    hypothetical *Green Execution Strategy*.  No LLM calls are made;
    this endpoint only **plans**, it does not **execute**.
    """
    return _planner.generate_plan(req)


@router.post("/project", response_model=ProjectPlan)
def create_project_plan(req: ProjectRequest):
    """
    **Agentic Project Planner** — decomposes a project into scheduled steps.

    Accepts a project name, description, prompt, deadline, and carbon limit.
    Returns a full ``ProjectPlan`` with individually-scheduled agentic steps,
    each carrying its own sub-prompt, model recommendation, carbon estimate,
    and reasoning trace.  No LLM calls are made.
    """
    return _planner.generate_project(req)


# Map catalogue display names → real Vertex AI model IDs.
# If a name already matches a real ID it passes through unchanged.
_MODEL_ALIAS: dict[str, str] = {
    "claude-3.5-sonnet": "gemini-2.5-flash",
    "claude-3-haiku": "gemini-2.0-flash",
    "gpt-4o-mini": "gemini-2.0-flash",
    "gemini-1.5-pro": "gemini-2.5-pro",
}
_FALLBACK_MODEL = "gemini-2.0-flash"


@router.post("/execute-step", response_model=ExecuteStepResponse)
async def execute_step(req: ExecuteStepRequest):
    """
    **Execute a planned step** — sends the step's prompt to the recommended
    LLM and returns the real response with carbon accounting.
    """
    # Resolve catalogue name → real Vertex AI model ID
    requested = req.model_choice or _FALLBACK_MODEL
    model = _MODEL_ALIAS.get(requested, requested)

    start = time.perf_counter()
    try:
        output = await _llm.generate(prompt=req.prompt, model_name=model)
    except Exception as exc:
        # If the resolved model still fails, retry with the safe fallback
        if model != _FALLBACK_MODEL:
            try:
                model = _FALLBACK_MODEL
                output = await _llm.generate(prompt=req.prompt, model_name=model)
            except Exception as exc2:
                raise HTTPException(
                    status_code=502,
                    detail=f"LLM call failed ({model}): {exc2}",
                ) from exc2
        else:
            raise HTTPException(
                status_code=502,
                detail=f"LLM call failed ({model}): {exc}",
            ) from exc
    elapsed_ms = int((time.perf_counter() - start) * 1000)

    # Rough carbon estimate: tokens × energy × grid intensity
    grid = get_default_grid_data()
    intensity = grid.get("carbon_intensity_g_per_kwh", 420.0)

    # Estimate tokens from prompt + output length
    prompt_tokens = max(1, len(req.prompt.split()) * 1.3)
    output_tokens = max(1, len(output.split()) * 1.3)
    total_tokens = int(prompt_tokens + output_tokens)

    # Find energy per token for the model used
    model_entry = next(
        (m for m in _MODEL_CATALOGUE if m["name"] == model),
        {"energy_kwh_per_1k_tok": 0.001},
    )
    kwh_per_tok = model_entry["energy_kwh_per_1k_tok"] / 1000
    estimated_carbon_g = round(total_tokens * kwh_per_tok * intensity, 4)

    return ExecuteStepResponse(
        step_number=req.step_number,
        title=req.title,
        model_used=model,
        output=output,
        elapsed_ms=elapsed_ms,
        estimated_carbon_g=estimated_carbon_g,
        executed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
