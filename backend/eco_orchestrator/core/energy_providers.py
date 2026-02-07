"""
WattTime API client.
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


# ---------- Green Web Foundation IP-to-CO2 ----------

GWF_BASE = "https://api.thegreenwebfoundation.org/api/v3/ip-to-co2intensity"


def fetch_gwf_co2_intensity(ip: str) -> dict | None:
    """
    Fetch annual-average carbon intensity for an IP address via the
    Green Web Foundation API.  Free, no auth required.

    Returns dict with country_name, carbon_intensity (g/kWh),
    generation_from_fossil (%), data year, etc.
    """
    try:
        r = requests.get(
            f"{GWF_BASE}/{ip}",
            headers={"accept": "application/json"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "country_name": data.get("country_name"),
            "country_code": data.get("country_code_iso_2"),
            "carbon_intensity_g_per_kwh": data.get("carbon_intensity"),
            "generation_from_fossil_pct": data.get("generation_from_fossil"),
            "carbon_intensity_type": data.get("carbon_intensity_type"),
            "data_year": data.get("year"),
            "checked_ip": data.get("checked_ip"),
        }
    except requests.RequestException:
        return None


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
