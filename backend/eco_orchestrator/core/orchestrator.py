from datetime import datetime, timedelta

from core.compression import EcoCompressor
from core.classifier import ComplexityScorer
from core.llm_client import LLMClient
from core.logger import GreenLogger
from core.cache import check_if_prompt_is_in_cache, add_prompt_to_cache
from core.database import EcoDatabase
from core.receipt_store import set_receipt as store_receipt
from loguru import logger
from core.grid_engine import get_default_grid_data


class EcoOrchestrator:
    def __init__(self):
        self.compressor = EcoCompressor()
        self.scorer = ComplexityScorer()
        self.client = LLMClient()
        self.logger = GreenLogger()
        self.ledger = {}
        self.db = EcoDatabase()

    async def process(self, req):
        # Bypass: direct LLM, no eco logic
        if getattr(req, "bypass_eco", False):
            raw = await self.client.raw_llm_generate(req.prompt, "gemini-2.0-flash")
            return {
                "status": "complete",
                "response": raw,
                "receipt_id": None,
                "eco_stats": {"warning": "No CO2 savings applied"},
            }

        # 0: Check cache (hash then semantic)
        cached = check_if_prompt_is_in_cache(req.prompt)
        if cached is not None:
            return {
                "status": "complete",
                "response": cached.get("response", ""),
                "receipt_id": cached.get("receipt_id"),
                "eco_stats": {**(cached.get("eco_stats") or {}), "was_cached": True},
            }

        # 1: Compress
        comp = self.compressor.compress(req.prompt)

        # 2: Triage (temporary: force cheapest model for testing)
        triage = self.scorer.score(comp["compressed_text"])
        tier = "gemini-2.0-flash"  # cheapest (new API); revert to triage["tier"] for production

        # 3: Grid + optional deferral (data-driven: cache + API, fallback when APIs fail)
        grid_data = get_default_grid_data()
        grid_intensity = grid_data["carbon_intensity_g_per_kwh"]
        grid_source = grid_data["grid_source"]
        grid_zone = grid_data.get("zone", "unknown")
        grid_source_label = grid_data.get("_source", "?")
        logger.info(f"Orchestrator grid | zone={grid_zone} | intensity={grid_intensity} g/kWh | source={grid_source_label} | defer_threshold=200")
        GRID_THRESHOLD = 200
        deadline = getattr(req, "deadline", None) or (datetime.utcnow() + timedelta(hours=24))
        if not getattr(req, "is_urgent", False) and grid_intensity > GRID_THRESHOLD:
            try:
                task_id = await self.db.add_task_to_queue(
                    comp["compressed_text"], tier, deadline, GRID_THRESHOLD
                )
                return {"status": "deferred", "task_id": str(task_id), "message": "Queued for green window."}
            except Exception:
                # DB down or tables missing: run immediately instead of failing
                pass

        # 4: Execute
        raw_response = await self.client.generate(comp["compressed_text"], tier)

        # 5: Log & receipt (logger expects original_tokens / final_tokens)
        impact = self.logger.calculate_savings(
            {
                "original_tokens": comp["original_count"],
                "final_tokens": comp["final_count"],
                "model": tier,
            },
            grid_intensity,
        )

        receipt_id = f"rec_{id(raw_response)}"
        self.ledger[receipt_id] = impact

        # Store for transparency layer (GET /receipt, GET /analytics/nutrition)
        store_receipt(
            receipt_id,
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "server_location": "us-central1 (Iowa)",
                "model_used": tier,
                "baseline_co2_est": impact.get("baseline_co2", 4.2),
                "actual_co2": impact.get("actual_co2", 1.8),
                "net_savings": impact.get("co2_saved_grams", 2.4),
                "was_cached": False,
                "energy_kwh": impact.get("energy_kwh", 0.004),
                "grid_source": grid_source,
            },
        )

        # Cache for future identical prompts
        add_prompt_to_cache(
            req.prompt,
            {"response": raw_response, "receipt_id": receipt_id, "eco_stats": impact},
        )

        return {
            "response": raw_response,
            "receipt_id": receipt_id,
            "eco_stats": impact,
        }