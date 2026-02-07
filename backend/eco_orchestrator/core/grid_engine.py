# Grid engine: orchestrates API calls, caching, and region selection.
import os
from typing import Any

from core.redis import RedisCache
from core.energy_providers import (
    fetch_region_snapshot,
    build_region_snapshot,
    fetch_emaps_latest,
    fetch_emaps_power_breakdown,
    fetch_watttime_index,
    fetch_watttime_forecast,
    get_watttime_token,
)

# Cache config (override via env)
GRID_CACHE_TTL = int(os.getenv("GRID_CACHE_TTL", 300))   # 5 minutes
GRID_KEY_PREFIX = "grid:"

# Module-level Redis instance.  If Redis is down the wrapper
# returns None / False for every operation — the app still works,
# it just hits the APIs every time.
_redis = RedisCache(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    default_ttl=GRID_CACHE_TTL,
)


# ------------------------------------------------------------------
# Cache helpers
# ------------------------------------------------------------------

def _cache_get(zone: str) -> dict | None:
    """Try to pull a cached snapshot for a zone."""
    return _redis.get(f"{GRID_KEY_PREFIX}{zone}")


def _cache_set(zone: str, data: dict) -> bool:
    """Store a snapshot in Redis with the grid TTL."""
    return _redis.set(f"{GRID_KEY_PREFIX}{zone}", data, ttl=GRID_CACHE_TTL)


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

def get_region_data(em_zone: str, wt_region: str) -> dict:
    """
    Return the combined EM + WT snapshot for a single region.
    Cache-aware: checks Redis first, fetches live on miss.
    """
    cached = _cache_get(em_zone)
    if cached is not None:
        cached["_from_cache"] = True
        return cached

    snapshot = fetch_region_snapshot(em_zone, wt_region)
    _cache_set(em_zone, snapshot)
    return snapshot


def get_multi_region_data(regions: list[dict[str, str]]) -> list[dict]:
    """
    Fetch snapshots for multiple regions.
    Each item must have keys: em_zone, wt_region.
    """
    return [get_region_data(r["em_zone"], r["wt_region"]) for r in regions]


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
    }


def get_grid_map() -> dict:
    """
    Grid map overview for the /grid/map endpoint.
    Returns snapshots for a default set of US regions.
    """
    map_cache = _redis.get(f"{GRID_KEY_PREFIX}__map__")
    if map_cache is not None:
        return map_cache

    default_regions = [
        {"em_zone": "US-CAL-CISO",  "wt_region": "CAISO_NORTH"},
        {"em_zone": "US-TEX-ERCO",  "wt_region": "ERCOT_NORTHCENTRAL"},
        {"em_zone": "US-NY-NYIS",   "wt_region": "NYISO_NYC"},
        {"em_zone": "US-MIDW-MISO", "wt_region": "PJM_CHICAGO"},
        {"em_zone": "US-SE-SOCO",   "wt_region": "SOCO"},
    ]

    snapshots = get_multi_region_data(default_regions)
    resp = {"regions": snapshots}
    _redis.set(f"{GRID_KEY_PREFIX}__map__", resp, ttl=GRID_CACHE_TTL)
    return resp
