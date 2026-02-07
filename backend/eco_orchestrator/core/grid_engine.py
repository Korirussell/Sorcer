# Grid engine: orchestrates API calls, caching, and region selection.
from typing import Any

from core.energy_providers import (
    fetch_region_snapshot,
    build_region_snapshot,
    fetch_emaps_latest,
    fetch_emaps_power_breakdown,
    fetch_watttime_index,
    fetch_watttime_forecast,
    get_watttime_token,
)

# Cache TTL in seconds.  Will be used as Redis EX value.
GRID_CACHE_TTL_SECONDS = 300  # 5 minutes

# Redis key prefix for grid snapshots
GRID_KEY_PREFIX = "grid:"


# ------------------------------------------------------------------
# Cache layer (stubs until Redis is wired in)
# ------------------------------------------------------------------

def _cache_get(key: str) -> dict | None:
    """Fetch a cached snapshot by key.  Stub: always misses."""
    return None


def _cache_set(key: str, data: dict, ttl: int = GRID_CACHE_TTL_SECONDS) -> None:
    """Store a snapshot in cache.  Stub: no-op."""
    pass


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

def get_region_data(em_zone: str, wt_region: str) -> dict:
    """
    Return the combined EM + WT snapshot for a single region.
    Checks cache first; on miss fetches live and stores.
    """
    cache_key = f"{GRID_KEY_PREFIX}{em_zone}"

    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    snapshot = fetch_region_snapshot(em_zone, wt_region)
    _cache_set(cache_key, snapshot)
    return snapshot


def get_multi_region_data(regions: list[dict[str, str]]) -> list[dict]:
    """
    Fetch snapshots for multiple regions.
    Each item in `regions` must have keys: em_zone, wt_region.
    Returns a list of flat Redis-ready dicts.
    """
    results: list[dict] = []
    for r in regions:
        snapshot = get_region_data(r["em_zone"], r["wt_region"])
        results.append(snapshot)
    return results


def get_grid_carbon(em_zone: str, wt_region: str) -> dict:
    """
    Simplified accessor that returns just the key carbon metrics
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
    Get grid map overview for the /grid/map endpoint.
    Returns snapshots for a default set of regions.
    """
    cached = _cache_get(f"{GRID_KEY_PREFIX}__map__")
    if cached is not None:
        return cached

    default_regions = [
        {"em_zone": "US-CAL-CISO",  "wt_region": "CAISO_NORTH"},
        {"em_zone": "US-TEX-ERCO",  "wt_region": "ERCOT_NORTHCENTRAL"},
        {"em_zone": "US-NY-NYIS",   "wt_region": "NYISO_NYC"},
        {"em_zone": "US-MIDW-MISO", "wt_region": "PJM_CHICAGO"},
        {"em_zone": "US-SE-SOCO",   "wt_region": "SOCO"},
    ]

    snapshots = get_multi_region_data(default_regions)
    resp = {"regions": snapshots}
    _cache_set(f"{GRID_KEY_PREFIX}__map__", resp)
    return resp
