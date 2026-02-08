"""
Run the full backend flow: prompt -> compress -> triage -> LLM -> receipt.
Shows what we do to the prompt and the final answer.

  cd backend/eco_orchestrator
  python scripts/test_flow.py

With real LLM: set Vertex AI (GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT) or GOOGLE_API_KEY in .env.
With mock LLM (no key/quota needed): set TEST_FLOW_MOCK_LLM=1 in env or .env.
Verbose mode: set TEST_FLOW_VERBOSE=1 for pre-check + extra logs.
No Redis or Postgres required.
"""
import asyncio
import os
import sys
from pathlib import Path

# Package root
_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from dotenv import load_dotenv
load_dotenv(_root / ".env")

VERBOSE = os.getenv("TEST_FLOW_VERBOSE", "").strip() in ("1", "true", "yes")

# Minimal request object for orchestrator
class Req:
    prompt: str
    user_id: str
    project_id: str
    is_urgent: bool = False
    bypass_eco: bool = False
    deadline = None

    def __init__(self, prompt, user_id="test", project_id="test"):
        self.prompt = prompt
        self.user_id = user_id
        self.project_id = project_id


def _run_precheck():
    """Print environment status: Redis, WattTime, Electricity Maps."""
    print("\n" + "=" * 60)
    print("PRE-CHECK (env / services)")
    print("=" * 60)

    # Redis
    try:
        from core.redis import RedisCache
        r = RedisCache(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", 6379)))
        if r.redis_client:
            print("  Redis: CONNECTED (cache enabled)")
        else:
            print("  Redis: NOT RUNNING (no-op mode). Start: docker run -p 6379:6379 redis")
    except Exception as e:
        print(f"  Redis: ERROR - {e}")

    # WattTime
    from core.energy_providers import get_watttime_token
    wt = get_watttime_token()
    if wt:
        print("  WattTime: CONFIGURED (token available)")
    else:
        print("  WattTime: NOT CONFIGURED (set WATTTIME_TOKEN or WATTTIME_USERNAME/WATTTIME_PASSWORD)")

    # Electricity Maps
    em_token = os.getenv("ELECTRICITYMAPS_TOKEN")
    if em_token:
        print("  Electricity Maps: CONFIGURED (token available)")
    else:
        print("  Electricity Maps: NOT CONFIGURED (set ELECTRICITYMAPS_TOKEN)")

    # Default grid region (Atlanta, GA area)
    em_zone = os.getenv("DEFAULT_GRID_EM_ZONE", "US-SE-SOCO")
    wt_region = os.getenv("DEFAULT_GRID_WT_REGION", "SOCO")
    print(f"  Default grid region: em_zone={em_zone} | wt_region={wt_region} (Atlanta, GA)")
    print("=" * 60 + "\n")


async def main():
    if VERBOSE:
        import logging
        logging.basicConfig(level=logging.INFO)
        from loguru import logger
        logger.remove()
        logger.add(sys.stderr, level="INFO")
        _run_precheck()

    from core.compression import EcoCompressor
    from core.classifier import ComplexityScorer
    from core.orchestrator import EcoOrchestrator

    use_mock = os.getenv("TEST_FLOW_MOCK_LLM", "").strip() in ("1", "true", "yes")
    orch = EcoOrchestrator()
    if use_mock:
        from unittest.mock import AsyncMock
        async def _mock_generate(prompt, model_name):
            return f"[MOCK] Answer: 2 + 2 = 4 (prompt was {len(prompt)} chars)."
        orch.client.generate = AsyncMock(side_effect=_mock_generate)
        orch.client.raw_llm_generate = AsyncMock(side_effect=_mock_generate)

    prompt = "Please could you kindly tell me what 2 + 2 equals in one short sentence? Thank you!"
    req = Req(prompt=prompt)

    print("=" * 60)
    print("BACKEND FLOW TEST" + (" (MOCK LLM)" if use_mock else ""))
    print("=" * 60)
    print("\n1. ORIGINAL PROMPT:")
    print(f"   {req.prompt!r}")
    print(f"   (length: {len(req.prompt)} chars)")

    # Show compression
    compressor = EcoCompressor(aggressive=True)
    comp = compressor.compress(req.prompt)
    print("\n2. AFTER COMPRESSION (what we send to the LLM):")
    print(f"   {comp['compressed_text']!r}")
    print(f"   tokens: {comp['original_count']} -> {comp['final_count']} (saved {comp['saved_tokens']})")

    # Triage
    scorer = ComplexityScorer()
    triage = scorer.score(comp["compressed_text"])
    print(f"\n3. TRIAGE: tier = {triage['tier']} (complexity score: {triage['total_score']})")

    # Full flow via orchestrator (cache check -> compress -> triage -> LLM -> receipt)
    print("\n4. CALLING ORCHESTRATOR (cache -> compress -> triage -> LLM -> receipt)...")
    result = await orch.process(req)

    print("\n5. RESULT:")
    print(f"   status: {result.get('status', '?')}")
    print(f"   response (LLM answer): {result.get('response', '')!r}")
    print(f"   receipt_id: {result.get('receipt_id', 'N/A')}")
    print(f"   eco_stats: {result.get('eco_stats', {})}")
    if VERBOSE:
        eco = result.get("eco_stats", {})
        print(f"\n6. GRID CONTEXT (from flow):")
        print(f"   Grid intensity used for CO2 calc: ~{eco.get('actual_co2', '?')} g CO2 (from eco_stats)")
        print(f"   Best region: default ({os.getenv('DEFAULT_GRID_EM_ZONE', 'US-SE-SOCO')} / Atlanta, GA) - see logs above for API/fallback")
    print("=" * 60)
    print("Flow completed successfully.")
    return result


def _has_llm_creds() -> bool:
    mock = os.getenv("TEST_FLOW_MOCK_LLM", "").strip() in ("1", "true", "yes")
    if mock:
        return True
    if os.getenv("GOOGLE_API_KEY"):
        return True
    creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    return bool(creds and project)


if __name__ == "__main__":
    if not _has_llm_creds():
        print("ERROR: Set Vertex AI (GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT) or GOOGLE_API_KEY, "
              "or TEST_FLOW_MOCK_LLM=1 for mock.")
        sys.exit(1)
    asyncio.run(main())
