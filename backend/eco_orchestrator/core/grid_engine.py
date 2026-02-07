# WattTime integration via energy_providers
from core.energy_providers import (
    fetch_watttime_raw,
    parse_watttime_response,
)

# Cache TTL in seconds. Future Redis integration will use this.
GRID_CACHE_TTL_SECONDS = 300  # 5 minutes


def _check_grid_cache() -> dict | None:
    """
    Check if cache has fresh grid data.
    Stub: returns None until Redis is integrated.
    """
    return None


def _store_grid_cache(data: dict) -> None:
    """
    Store parsed grid data in cache.
    Stub: no-op until Redis is integrated.
    """
    pass


def get_grid_carbon(region: str | None = None) -> dict:
    """
    Fetch current grid carbon intensity from WattTime.
    Returns canonical structure with region, intensity, percentile, etc.
    """
    raw = fetch_watttime_raw(region)
    if raw:
        parsed = parse_watttime_response(raw)
        if parsed.get("regions"):
            region_data = parsed["regions"][0]
            return {
                "region": region_data.get("zone", region or "unknown"),
                "intensity": region_data.get("intensity_g_per_kwh"),
                "percentile": region_data.get("percentile"),
                "score": region_data.get("score"),
                "provider": "watttime",
            }
    return {"region": region or "unknown", "intensity": None}


def get_grid_map() -> dict:
    """
    Get grid map data for /grid/map endpoint.
    Checks cache first; on miss, fetches from WattTime, parses, stores in cache.
    Returns format: {"regions": [{"name", "score", "percentile", ...}, ...]}
    """
    # 1. Check cache
    cached = _check_grid_cache()
    if cached is not None:
        return cached

    # 2. Fetch from WattTime
    regions: list[dict] = []

    raw = fetch_watttime_raw(None)
    if raw:
        parsed = parse_watttime_response(raw)
        for r in parsed.get("regions", []):
            regions.append({
                "name": r.get("name", r.get("zone", "unknown")),
                "score": r.get("score", 0),
                "percentile": r.get("percentile"),
                "intensity_g_per_kwh": r.get("intensity_g_per_kwh"),
            })

    # 3. Build response and store in cache
    resp = {"regions": regions if regions else _fallback_regions()}
    _store_grid_cache(resp)
    return resp


def _fallback_regions() -> list[dict]:
    """Return mock regions when no API data is available."""
    return [
        {
            "name": "us-central1",
            "score": 92,
            "percentile": 8,
            "intensity_g_per_kwh": None,
        }
    ]
