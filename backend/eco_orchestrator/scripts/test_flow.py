"""
Run the full backend flow: prompt -> compress -> triage -> LLM -> receipt.
Shows what we do to the prompt and the final answer.

  cd backend/eco_orchestrator
  python scripts/test_flow.py

With real LLM: set GOOGLE_API_KEY in .env.
With mock LLM (no key/quota needed): set TEST_FLOW_MOCK_LLM=1 in env or .env.
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


async def main():
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
    print("=" * 60)
    print("Flow completed successfully.")
    return result


if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY") and os.getenv("TEST_FLOW_MOCK_LLM", "").strip() not in ("1", "true", "yes"):
        print("ERROR: Set GOOGLE_API_KEY in .env, or set TEST_FLOW_MOCK_LLM=1 to run with mock LLM.")
        sys.exit(1)
    asyncio.run(main())
