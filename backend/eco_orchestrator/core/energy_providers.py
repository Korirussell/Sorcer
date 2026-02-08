"""
WattTime + Electricity Maps API clients.
Raw HTTP calls and parsing into Redis-ready canonical format.
"""
import os
from datetime import datetime, timezone
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

# Base URL
WATTTIME_BASE = "https://api.watttime.org"

# Default region for preview (WattTime free tier)
DEFAULT_WATTTIME_REGION = "CAISO_NORTH"


def _get_watttime_token() -> str | None:
    """Obtain WattTime Bearer token. Uses WATTTIME_TOKEN or login via WATTTIME_USERNAME/WATTTIME_PASSWORD."""
    token = os.getenv("WATTTIME_TOKEN")
    if token:
        return token
    username = os.getenv("WATTTIME_USERNAME")
    password = os.getenv("WATTTIME_PASSWORD")
    if not username or not password:
        return None
    try:
        r = requests.get(
            f"{WATTTIME_BASE}/login",
            auth=HTTPBasicAuth(username, password),
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("token")
    except (requests.RequestException, KeyError):
        return None


def get_watttime_token() -> str | None:
    """Public accessor for the WattTime token (used by test scripts)."""
    return _get_watttime_token()


def fetch_watttime_index(region: str | None = None, token: str | None = None) -> dict | None:
    """
    Fetch the signal-index (percentile 0-100) for a region.
    Works for ALL regions on the free tier.
    """
    token = token or _get_watttime_token()
    if not token:
        return None
    region = region or DEFAULT_WATTTIME_REGION
    try:
        r = requests.get(
            f"{WATTTIME_BASE}/v3/signal-index",
            headers={"Authorization": f"Bearer {token}"},
            params={"region": region, "signal_type": "co2_moer"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        pts = data.get("data", [])
        if pts:
            return {
                "region": region,
                "percentile": pts[0].get("value"),
                "timestamp": pts[0].get("point_time"),
            }
    except requests.RequestException:
        pass
    return None


def fetch_watttime_forecast(region: str | None = None, token: str | None = None) -> dict | None:
    """
    Fetch the current MOER forecast value (lbs CO2/MWh) for a region.
    Free tier: only CAISO_NORTH. Other regions return 403.
    """
    token = token or _get_watttime_token()
    if not token:
        return None
    region = region or DEFAULT_WATTTIME_REGION
    try:
        r = requests.get(
            f"{WATTTIME_BASE}/v3/forecast",
            headers={"Authorization": f"Bearer {token}"},
            params={"region": region, "signal_type": "co2_moer", "horizon_hours": 0},
            timeout=10,
        )
        r.raise_for_status()
        forecast = r.json()
        pts = forecast.get("data", [])
        meta = forecast.get("meta", {})
        if pts:
            moer = pts[0]["value"]
            return {
                "region": region,
                "timestamp": pts[0]["point_time"],
                "moer_lbs_per_mwh": moer,
                "co2_g_per_kwh": round(moer * 453.592 / 1000, 2),
                "units": meta.get("units", "lbs_co2_per_mwh"),
            }
    except requests.RequestException:
        pass
    return None


def fetch_watttime_region(lat: float, lon: float, token: str | None = None) -> dict | None:
    """
    Resolve GPS coordinates to a WattTime grid region.
    Works for all regions on the free tier.
    """
    token = token or _get_watttime_token()
    if not token:
        return None
    try:
        r = requests.get(
            f"{WATTTIME_BASE}/v3/region-from-loc",
            headers={"Authorization": f"Bearer {token}"},
            params={"latitude": lat, "longitude": lon, "signal_type": "co2_moer"},
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException:
        return None


def fetch_watttime_raw(region: str | None = None) -> dict | None:
    """
    Fetch real-time CO2 MOER data from WattTime.
    Combines forecast (if available) and signal-index into one dict.
    """
    token = _get_watttime_token()
    if not token:
        return None
    region = region or DEFAULT_WATTTIME_REGION

    result: dict[str, Any] = {"region": region}

    # Forecast (may 403 on non-CAISO regions for free tier)
    forecast = fetch_watttime_forecast(region, token)
    if forecast:
        result["point_time"] = forecast["timestamp"]
        result["value"] = forecast["moer_lbs_per_mwh"]
        result["co2_g_per_kwh"] = forecast["co2_g_per_kwh"]
        result["units"] = forecast["units"]

    # Percentile index (works for all regions)
    index = fetch_watttime_index(region, token)
    if index:
        result["percentile"] = index["percentile"]
        if "point_time" not in result:
            result["point_time"] = index["timestamp"]

    return result if "value" in result or "percentile" in result else None


def parse_watttime_response(raw: dict) -> dict:
    """
    Parse WattTime raw response into Redis-ready canonical format.
    """
    if not raw:
        return {"regions": [], "fetched_at": _now_iso(), "provider": "watttime"}
    regions: list[dict[str, Any]] = []
    region_name = raw.get("region", "unknown")
    value = raw.get("value")
    point_time = raw.get("point_time") or _now_iso()
    percentile = raw.get("percentile")

    entry: dict[str, Any] = {
        "name": region_name.lower().replace("_", "-"),
        "zone": region_name,
        "percentile": percentile,
        "timestamp": point_time,
    }
    if value is not None:
        intensity_g_per_kwh = value * 453.592 / 1000
        entry["intensity_g_per_kwh"] = round(intensity_g_per_kwh, 2)
        entry["moer_lbs_per_mwh"] = round(value, 2)
        entry["score"] = _intensity_to_score(intensity_g_per_kwh)
    else:
        # Derive score from percentile (invert: 0 percentile = 100 score)
        entry["intensity_g_per_kwh"] = None
        entry["moer_lbs_per_mwh"] = None
        entry["score"] = int(100 - percentile) if percentile is not None else None

    regions.append(entry)
    return {
        "regions": regions,
        "fetched_at": _now_iso(),
        "provider": "watttime",
    }


# ---------- Electricity Maps API ----------

EMAPS_BASE = "https://api.electricitymap.org/v3"


def _get_emaps_token() -> str | None:
    """Read Electricity Maps API token from env."""
    return os.getenv("ELECTRICITYMAPS_TOKEN")


def fetch_emaps_latest(zone: str) -> dict | None:
    """
    Fetch the latest real-time carbon intensity for a zone.
    Returns carbon intensity (gCO2eq/kWh), fossil fuel %, renewable %, etc.
    Docs: https://docs.electricitymaps.com
    """
    token = _get_emaps_token()
    if not token:
        return None
    try:
        r = requests.get(
            f"{EMAPS_BASE}/carbon-intensity/latest",
            headers={"auth-token": token},
            params={"zone": zone},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "zone": data.get("zone"),
            "carbon_intensity_g_per_kwh": data.get("carbonIntensity"),
            "datetime": data.get("datetime"),
            "updated_at": data.get("updatedAt"),
            "emission_factor_type": data.get("emissionFactorType"),
            "is_estimated": data.get("isEstimated", False),
            "estimation_method": data.get("estimationMethod"),
        }
    except requests.RequestException:
        return None


def fetch_emaps_power_breakdown(zone: str) -> dict | None:
    """
    Fetch the latest power generation breakdown for a zone.
    Returns MW values for each fuel type + fossil/renewable percentages.
    """
    token = _get_emaps_token()
    if not token:
        return None
    try:
        r = requests.get(
            f"{EMAPS_BASE}/power-breakdown/latest",
            headers={"auth-token": token},
            params={"zone": zone},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "zone": data.get("zone"),
            "datetime": data.get("datetime"),
            "fossil_free_pct": data.get("fossilFreePercentage"),
            "renewable_pct": data.get("renewablePercentage"),
            "power_consumption_total": data.get("powerConsumptionTotal"),
            "power_production_total": data.get("powerProductionTotal"),
            "power_consumption_breakdown": data.get("powerConsumptionBreakdown"),
            "power_production_breakdown": data.get("powerProductionBreakdown"),
        }
    except requests.RequestException:
        return None


def fetch_emaps_zones() -> dict | None:
    """
    Fetch the list of all available Electricity Maps zones.
    Returns dict keyed by zone code with zone name and country info.
    """
    token = _get_emaps_token()
    if not token:
        return None
    try:
        r = requests.get(
            f"{EMAPS_BASE}/zones",
            headers={"auth-token": token},
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException:
        return None


# ---------- Combined Snapshot (Redis-ready) ----------


def build_region_snapshot(
    em_intensity: dict | None,
    em_breakdown: dict | None,
    wt_index: dict | None,
    wt_forecast: dict | None,
) -> dict:
    """
    Merge Electricity Maps + WattTime data into a single flat dict
    ready to be stored in Redis as JSON.

    Redis key pattern:  grid:{zone}
    Redis TTL:          300s (5 min)
    """
    snapshot: dict[str, Any] = {}

    # --- Electricity Maps fields (primary) ---
    if em_intensity:
        snapshot["zone"] = em_intensity.get("zone")
        snapshot["carbon_intensity_g_per_kwh"] = em_intensity.get("carbon_intensity_g_per_kwh")
        snapshot["emission_factor_type"] = em_intensity.get("emission_factor_type")
        snapshot["is_estimated"] = em_intensity.get("is_estimated")
        snapshot["datetime"] = em_intensity.get("datetime")
        snapshot["updated_at"] = em_intensity.get("updated_at")

    if em_breakdown:
        snapshot["fossil_free_pct"] = em_breakdown.get("fossil_free_pct")
        snapshot["renewable_pct"] = em_breakdown.get("renewable_pct")
        snapshot["power_consumption_mw"] = em_breakdown.get("power_consumption_total")
        snapshot["power_production_mw"] = em_breakdown.get("power_production_total")
        snapshot["consumption_breakdown"] = em_breakdown.get("power_consumption_breakdown")
        snapshot["production_breakdown"] = em_breakdown.get("power_production_breakdown")

    # --- WattTime fields (appended) ---
    if wt_index:
        snapshot["watttime_region"] = wt_index.get("region")
        snapshot["watttime_percentile"] = wt_index.get("percentile")
        snapshot["watttime_timestamp"] = wt_index.get("timestamp")

    if wt_forecast:
        snapshot["watttime_moer_lbs_per_mwh"] = wt_forecast.get("moer_lbs_per_mwh")
        snapshot["watttime_co2_g_per_kwh"] = wt_forecast.get("co2_g_per_kwh")

    snapshot["fetched_at"] = _now_iso()
    return snapshot


def _watttime_only_snapshot(wt_region: str) -> dict | None:
    """
    Fallback: build a minimal snapshot from WattTime only when Electricity Maps fails.
    """
    wt_raw = fetch_watttime_raw(wt_region)
    if not wt_raw:
        return None
    parsed = parse_watttime_response(wt_raw)
    regions = parsed.get("regions", [])
    if not regions:
        return None
    r = regions[0]
    intensity = r.get("intensity_g_per_kwh")
    return {
        "zone": wt_region,
        "carbon_intensity_g_per_kwh": intensity,
        "fetched_at": _now_iso(),
        "watttime_region": wt_region,
        "watttime_percentile": r.get("percentile"),
        "watttime_moer_lbs_per_mwh": r.get("moer_lbs_per_mwh"),
        "watttime_co2_g_per_kwh": intensity,
        "provider": "watttime_only",
    }


def fetch_region_snapshot(em_zone: str, wt_region: str) -> dict:
    """
    One-call convenience: fetch both APIs for a region and return
    the combined Redis-ready snapshot. Falls back to WattTime-only when EM fails.
    """
    wt_token = _get_watttime_token()

    em_ci = fetch_emaps_latest(em_zone)
    em_pb = fetch_emaps_power_breakdown(em_zone)
    wt_idx = fetch_watttime_index(wt_region, wt_token)
    wt_fc = fetch_watttime_forecast(wt_region, wt_token)

    snapshot = build_region_snapshot(em_ci, em_pb, wt_idx, wt_fc)
    # If EM returned no carbon_intensity but we have WattTime, use WattTime-only fallback
    if snapshot.get("carbon_intensity_g_per_kwh") is None and snapshot.get("watttime_percentile") is None:
        fallback = _watttime_only_snapshot(wt_region)
        if fallback:
            return fallback
    return snapshot


def _now_iso() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _intensity_to_score(intensity_g_per_kwh: float | None) -> int | None:
    """
    Convert carbon intensity (g/kWh) to a 0-100 sustainability score.
    Lower intensity = higher score. ~0 = 100, ~1000+ = 0.
    """
    if intensity_g_per_kwh is None:
        return None
    if intensity_g_per_kwh <= 0:
        return 100
    score = max(0, 100 - (intensity_g_per_kwh / 10))
    return int(min(100, score))
