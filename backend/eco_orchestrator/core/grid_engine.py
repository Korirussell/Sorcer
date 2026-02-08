# Grid engine: orchestrates API calls, caching, and region selection.
import os
from datetime import datetime, timezone, timedelta
from typing import Any

from loguru import logger
from core.redis import RedisCache
from core.energy_providers import (
    fetch_region_snapshot,
    build_region_snapshot,
    fetch_emaps_latest,
    fetch_emaps_power_breakdown,
    fetch_watttime_index,
    fetch_watttime_forecast,
    fetch_watttime_raw,
    parse_watttime_response,
    get_watttime_token,
)

# Cache config (override via env)
GRID_CACHE_TTL = int(os.getenv("GRID_CACHE_TTL", 600))   # 10 min TTL for Redis key
GRID_CACHE_THRESHOLD_MINUTES = int(os.getenv("GRID_CACHE_THRESHOLD_MINUTES", "10"))
GRID_KEY_PREFIX = "grid:"

# Module-level Redis instance.  If Redis is down the wrapper
# returns None / False for every operation — the app still works,
# it just hits the APIs every time.
_redis = RedisCache(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    default_ttl=GRID_CACHE_TTL,
)

# In-memory fallback when Redis is disabled (stores fetched_at for threshold check)
_memory_cache: dict[str, dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_fetched_at(data: dict) -> datetime | None:
    """Parse fetched_at from cached data. Returns None if missing or invalid."""
    raw = data.get("fetched_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _is_cache_fresh(data: dict) -> bool:
    """True if cached data was fetched within GRID_CACHE_THRESHOLD_MINUTES."""
    fetched = _parse_fetched_at(data)
    if fetched is None:
        return False
    threshold = timedelta(minutes=GRID_CACHE_THRESHOLD_MINUTES)
    return datetime.now(timezone.utc) - fetched <= threshold


# ------------------------------------------------------------------
# Cache helpers
# ------------------------------------------------------------------

def _cache_get(key: str) -> dict | None:
    """Try Redis first, then memory. Returns data only if fresh (within threshold)."""
    redis_key = f"{GRID_KEY_PREFIX}{key}"
    data = _redis.get(redis_key)
    source = "redis"
    if data is None:
        data = _memory_cache.get(key)
        source = "memory"
    if data is not None and _is_cache_fresh(data):
        if isinstance(data, dict):
            data["_from_cache"] = True
        logger.info(f"Grid cache HIT | key={key} | source={source} | fetched_at={data.get('fetched_at', '?')}")
        return data
    if data is not None:
        logger.info(f"Grid cache STALE | key={key} | fetched_at={data.get('fetched_at', '?')} | re-fetching")
    return None


def _cache_set(key: str, data: dict) -> bool:
    """Store snapshot with fetched_at. Use both Redis and memory fallback."""
    if "fetched_at" not in data:
        data = {**data, "fetched_at": _now_iso()}
    _redis.set(f"{GRID_KEY_PREFIX}{key}", data, ttl=GRID_CACHE_TTL)
    _memory_cache[key] = data
    return True


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

def get_region_data(em_zone: str, wt_region: str) -> dict:
    """
    Return the combined EM + WT snapshot for a single region.
    Cache-aware: if fetched_at is within GRID_CACHE_THRESHOLD_MINUTES, use cache.
    Otherwise re-fetch from API, store, return.
    """
    cached = _cache_get(em_zone)
    if cached is not None:
        return cached

    logger.info(f"Grid API fetch | em_zone={em_zone} | wt_region={wt_region}")
    snapshot = fetch_region_snapshot(em_zone, wt_region)
    if "fetched_at" not in snapshot:
        snapshot["fetched_at"] = _now_iso()
    _cache_set(em_zone, snapshot)
    intensity = snapshot.get("carbon_intensity_g_per_kwh")
    logger.info(f"Grid API done | zone={em_zone} | carbon_intensity={intensity} | from_cache=False")
    return snapshot


def get_multi_region_data(regions: list[dict[str, str]]) -> list[dict]:
    """
    Fetch snapshots for multiple regions.
    Each item must have keys: em_zone, wt_region.
    """
    return [get_region_data(r["em_zone"], r["wt_region"]) for r in regions]


# Default region: Atlanta, Georgia (SOCO / Southern Company grid). Env override supported.
DEFAULT_EM_ZONE = os.getenv("DEFAULT_GRID_EM_ZONE", "US-SE-SOCO")
DEFAULT_WT_REGION = os.getenv("DEFAULT_GRID_WT_REGION", "SOCO")


def get_grid_carbon(em_zone: str, wt_region: str) -> dict:
    """
    Simplified accessor — returns just the key carbon metrics
    for a region.  Used by intelligence.py for server selection.
    """
    snap = get_region_data(em_zone, wt_region)
    return {
        "zone": snap.get("zone", em_zone),
        "carbon_intensity_g_per_kwh": snap.get("carbon_intensity_g_per_kwh"),
        "fossil_free_pct": snap.get("fossil_free_pct"),
        "renewable_pct": snap.get("renewable_pct"),
        "watttime_percentile": snap.get("watttime_percentile"),
        "watttime_moer_lbs_per_mwh": snap.get("watttime_moer_lbs_per_mwh"),
        "consumption_breakdown": snap.get("consumption_breakdown"),
        "production_breakdown": snap.get("production_breakdown"),
    }


def get_default_grid_data() -> dict:
    """
    Returns grid data for the default region (used by orchestrator when no user location).
    carbon_intensity_g_per_kwh: for logger and deferral threshold.
    grid_source: power mix for receipts (e.g. wind/solar/gas %).
    _source: where data came from (electricity_maps | watttime | fallback).
    """
    logger.info(f"Grid default region | em_zone={DEFAULT_EM_ZONE} | wt_region={DEFAULT_WT_REGION} (no user location)")
    carbon = get_grid_carbon(DEFAULT_EM_ZONE, DEFAULT_WT_REGION)
    intensity = carbon.get("carbon_intensity_g_per_kwh")
    zone = carbon.get("zone", DEFAULT_EM_ZONE)

    if intensity is not None:
        logger.info(f"Grid BEST region (API) | zone={zone} | carbon_intensity={intensity} g/kWh | source=api")
    else:
        intensity = 100.0  # fallback when APIs fail
        logger.warning(f"Grid API FAILED | no carbon data from WattTime/Electricity Maps | using FALLBACK intensity={intensity} g/kWh | Set WATTTIME_USERNAME/WATTTIME_PASSWORD or ELECTRICITYMAPS_TOKEN")

    # Build grid_source from production/consumption breakdown or use defaults
    prod = carbon.get("production_breakdown") or carbon.get("consumption_breakdown")
    if prod and isinstance(prod, dict):
        grid_source = {
            "wind": prod.get("wind", 0) or 0,
            "solar": prod.get("solar", 0) or 0,
            "hydro": prod.get("hydro", 0) or 0,
            "nuclear": prod.get("nuclear", 0) or 0,
            "gas": prod.get("gas", 0) or 0,
            "coal": prod.get("coal", 0) or 0,
        }
        source_label = "electricity_maps"
    else:
        grid_source = {"wind": 60, "solar": 22, "gas": 18}
        source_label = "fallback"

    return {
        "carbon_intensity_g_per_kwh": intensity,
        "zone": zone,
        "grid_source": grid_source,
        "_source": source_label,
    }


def get_grid_map() -> dict:
    """
    Grid map overview for the /grid/map endpoint.
    Returns snapshots for a default set of US regions.
    Uses timestamp-based cache: if last checked within THRESHOLD min, return cache.
    """
    map_cache = _cache_get("__map__")
    if map_cache is not None:
        return map_cache

    default_regions = [
        {"em_zone": "US-CAL-CISO",  "wt_region": "CAISO_NORTH"},
        {"em_zone": "US-TEX-ERCO",  "wt_region": "ERCOT_NORTHCENTRAL"},
        {"em_zone": "US-NY-NYIS",   "wt_region": "NYISO_NYC"},
        {"em_zone": "US-MIDW-MISO", "wt_region": "PJM_CHICAGO"},
        {"em_zone": "US-SE-SOCO",   "wt_region": "SOCO"},
        {"em_zone": "US-NW-PACW",   "wt_region": "PACW"},         # Pacific NW (The Dalles, Hillsboro, Quincy)
        {"em_zone": "US-SW-AZPS",   "wt_region": "AZPS"},         # Arizona (Phoenix)
    ]

    raw_snapshots = get_multi_region_data(default_regions)
    # Format for GET /grid/map: { name, score, breakdown, ... }
    regions = [_snapshot_to_map_region(s) for s in raw_snapshots]
    resp = {"regions": regions, "fetched_at": _now_iso()}
    _cache_set("__map__", resp)
    return resp


def _intensity_to_score(intensity_g_per_kwh: float | None) -> int:
    """Convert carbon intensity (g/kWh) to 0-100 sustainability score.

    Lower intensity = higher score.  ~0 → 100, ~1000+ → 0.
    Returns 50 (neutral) when intensity data is unavailable.
    """
    if intensity_g_per_kwh is None:
        return 50
    if intensity_g_per_kwh <= 0:
        return 100
    score = max(0, min(100, 100 - (intensity_g_per_kwh / 10)))
    return int(score)


def _snapshot_to_map_region(snap: dict) -> dict:
    """Transform snapshot to API format: name, score, breakdown."""
    zone = snap.get("zone", "unknown")
    intensity = snap.get("carbon_intensity_g_per_kwh")
    wt_percentile = snap.get("watttime_percentile")
    if wt_percentile is not None:
        # Invert: lower percentile = cleaner grid = higher score. Clamp to 0-100.
        score = int(max(0, min(100, 100 - wt_percentile)))
    else:
        score = _intensity_to_score(intensity)
    prod = snap.get("production_breakdown") or snap.get("consumption_breakdown")
    breakdown = {}
    if prod and isinstance(prod, dict):
        breakdown = {k: v or 0 for k, v in prod.items() if isinstance(v, (int, float))}
    if not breakdown:
        breakdown = {"wind": 0, "solar": 0, "gas": 0, "coal": 0, "nuclear": 0, "hydro": 0}
    return {
        "name": zone,
        "score": score,
        "breakdown": breakdown,
        "carbon_intensity_g_per_kwh": intensity,
        "zone": zone,
    }
