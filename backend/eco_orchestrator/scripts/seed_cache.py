"""Seed the hash-based and semantic caches with example prompt/response pairs.

Usage:
    cd backend/eco_orchestrator
    python scripts/seed_cache.py          # seed both caches
    python scripts/seed_cache.py --hash   # hash cache only
    python scripts/seed_cache.py --semantic  # semantic cache only
    python scripts/seed_cache.py --clear  # flush caches first, then seed

Requires a running Redis instance (see REDIS_HOST / REDIS_PORT env vars).
"""

import sys
import os

# Allow running from repo root or from scripts/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.cache import (
    add_hash_cache,
    add_semantic_cache,
    kv_cache,
    llmcache,
)
from loguru import logger

# ---------------------------------------------------------------------------
# Seed data: realistic prompt / response / receipt combos
# ---------------------------------------------------------------------------

SEED_ENTRIES = [
    {
        "prompt": "What is carbon offsetting?",
        "response": (
            "Carbon offsetting is the process of compensating for carbon dioxide "
            "emissions by funding projects that reduce or remove an equivalent amount "
            "of CO₂ from the atmosphere, such as reforestation or renewable energy initiatives."
        ),
    },
    {
        "prompt": "Explain the greenhouse effect in simple terms.",
        "response": (
            "The greenhouse effect is when certain gases in Earth's atmosphere trap heat "
            "from the sun, keeping the planet warm enough to support life. Too much of these "
            "gases causes global warming."
        ),
    },
    {
        "prompt": "How does renewable energy reduce emissions?",
        "response": (
            "Renewable energy sources like solar, wind, and hydro generate electricity "
            "without burning fossil fuels, which eliminates the CO₂ emissions that would "
            "otherwise be released during power generation."
        ),
    },
    {
        "prompt": "What is a carbon footprint?",
        "response": (
            "A carbon footprint is the total amount of greenhouse gases, primarily CO₂, "
            "that are emitted directly or indirectly by an individual, organization, event, "
            "or product throughout its lifecycle."
        ),
    },
    {
        "prompt": "Why is deforestation bad for the environment?",
        "response": (
            "Deforestation removes trees that absorb CO₂, releases stored carbon back into "
            "the atmosphere, destroys biodiversity, disrupts water cycles, and contributes "
            "significantly to climate change."
        ),
    },
    {
        "prompt": "How much CO2 does a typical AI query produce?",
        "response": (
            "A single large-language-model query produces roughly 1–5 grams of CO₂ depending "
            "on model size, hardware, and grid carbon intensity. Smaller models on clean grids "
            "can be under 1 gram."
        ),
    },
    {
        "prompt": "What are the benefits of energy-efficient coding?",
        "response": (
            "Energy-efficient coding reduces CPU cycles and memory usage, which lowers power "
            "consumption in data centers. This translates directly into reduced carbon emissions "
            "and lower operational costs."
        ),
    },
    {
        "prompt": "How can I make my software more sustainable?",
        "response": (
            "You can make software more sustainable by optimizing algorithms, reducing unnecessary "
            "API calls, using efficient data structures, caching results, choosing green cloud "
            "regions, and right-sizing infrastructure."
        ),
    },
    {
        "prompt": "What is green computing?",
        "response": (
            "Green computing is the practice of designing, manufacturing, using, and disposing "
            "of computing resources in ways that reduce their environmental impact, including "
            "energy-efficient hardware, sustainable data centers, and eco-aware software design."
        ),
    },
    {
        "prompt": "Explain carbon intensity of the power grid.",
        "response": (
            "Carbon intensity measures how much CO₂ is emitted per kilowatt-hour of electricity "
            "generated. It varies by region and time of day based on the mix of fossil fuels, "
            "nuclear, and renewables powering the grid."
        ),
    },
]


def _build_cache_value(entry: dict) -> dict:
    """Build the value dict matching what orchestrator.process() stores."""
    receipt_id = f"rec_seed_{abs(hash(entry['prompt'])) % 100000}"
    return {
        "response": entry["response"],
        "receipt_id": receipt_id,
        "eco_stats": {
            "co2_saved_grams": 2.1,
            "baseline_co2": 4.0,
            "actual_co2": 1.9,
            "efficiency_multiplier": 2.1,
            "wh_saved": 0.003,
            "energy_kwh": 0.002,
        },
    }


def seed_hash_cache() -> int:
    """Seed the hash-based (exact-match) cache. Returns count of entries written."""
    if kv_cache is None or kv_cache.redis_client is None:
        logger.warning("Hash cache unavailable (Redis not connected). Skipping hash seed.")
        return 0
    count = 0
    for entry in SEED_ENTRIES:
        value = _build_cache_value(entry)
        ok = add_hash_cache(entry["prompt"], value)
        if ok:
            count += 1
            logger.info(f"  [hash] seeded: {entry['prompt'][:60]}...")
        else:
            logger.warning(f"  [hash] FAILED: {entry['prompt'][:60]}...")
    return count


def seed_semantic_cache() -> int:
    """Seed the semantic (vector) cache. Returns count of entries written."""
    if llmcache is None:
        logger.warning("Semantic cache unavailable (redisvl not installed or not configured). Skipping semantic seed.")
        return 0
    count = 0
    for entry in SEED_ENTRIES:
        value = _build_cache_value(entry)
        ok = add_semantic_cache(entry["prompt"], value)
        if ok:
            count += 1
            logger.info(f"  [semantic] seeded: {entry['prompt'][:60]}...")
        else:
            logger.warning(f"  [semantic] FAILED: {entry['prompt'][:60]}...")
    return count


def clear_caches():
    """Flush both caches."""
    if kv_cache and kv_cache.redis_client:
        keys = kv_cache.get_all_keys("prompt:hash:*")
        for k in keys:
            kv_cache.delete(k)
        logger.info(f"Cleared {len(keys)} hash-cache keys.")
    if llmcache is not None:
        try:
            if hasattr(llmcache, "clear"):
                llmcache.clear()
                logger.info("Cleared semantic cache.")
        except Exception as e:
            logger.warning(f"Could not clear semantic cache: {e}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    args = set(sys.argv[1:])
    do_hash = "--hash" in args or not args - {"--clear"}
    do_semantic = "--semantic" in args or not args - {"--clear"}

    if "--clear" in args:
        logger.info("Clearing caches before seeding...")
        clear_caches()

    total = 0
    if do_hash:
        logger.info(f"Seeding hash cache with {len(SEED_ENTRIES)} entries...")
        total += seed_hash_cache()
    if do_semantic:
        logger.info(f"Seeding semantic cache with {len(SEED_ENTRIES)} entries...")
        total += seed_semantic_cache()

    logger.info(f"Done. {total} cache entries written.")
