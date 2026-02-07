# CONTEXTGRID.md — Grid Intelligence & Carbon Caching System

> Exhaustive context document for the energy grid data pipeline.
> Covers: API integrations, Redis caching, data schemas, constraints, and architecture.

---

## 1. Architecture Overview

The system combines two real-time energy APIs (WattTime + Electricity Maps) into a
single flat data snapshot per grid zone, cached in Redis with a 5-minute TTL.

```
                 ┌──────────────┐     ┌───────────────────┐
                 │  WattTime    │     │  Electricity Maps  │
                 │  (free tier) │     │  (student key)     │
                 └──────┬───────┘     └─────────┬─────────┘
                        │                       │
                        ▼                       ▼
              ┌─────────────────────────────────────────┐
              │       core/energy_providers.py           │
              │  fetch_watttime_index()                  │
              │  fetch_watttime_forecast()               │
              │  fetch_emaps_latest()                    │
              │  fetch_emaps_power_breakdown()           │
              │  build_region_snapshot()  ◄── merges both│
              │  fetch_region_snapshot()  ◄── one-call   │
              └──────────────────┬──────────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────────┐
              │         core/grid_engine.py              │
              │  get_region_data()    ◄── cache-aware    │
              │  get_multi_region_data()                 │
              │  get_grid_carbon()   ◄── slim accessor   │
              │  get_grid_map()      ◄── /grid/map API   │
              │                                         │
              │  Uses core/redis.py RedisCache           │
              │  Key pattern: grid:{zone}                │
              │  TTL: 300s (5 min)                       │
              └──────────────────┬──────────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────────┐
              │    app/routers/intelligence.py           │
              │    GET /grid/map                         │
              └─────────────────────────────────────────┘
```

### Separation of Concerns

| Layer                    | File                        | Responsibility                                      |
|--------------------------|-----------------------------|-----------------------------------------------------|
| **API clients**          | `core/energy_providers.py`  | Raw HTTP calls, response parsing, snapshot building  |
| **Orchestration + cache**| `core/grid_engine.py`       | Cache-aware fetching, multi-region, slim accessors   |
| **Redis wrapper**        | `core/redis.py`             | Generic key-value cache with JSON ser/de and TTL     |
| **Prompt cache**         | `core/cache.py`             | Hash-based + semantic cache for LLM prompts (separate concern) |
| **FastAPI router**       | `app/routers/intelligence.py` | HTTP endpoints that call grid_engine                |

---

## 2. Data Sources

### 2.1 WattTime API

- **Base URL**: `https://api.watttime.org`
- **Auth**: HTTP Basic Auth to `/login` → returns a Bearer token
- **Credentials**: `WATTTIME_USERNAME` / `WATTTIME_PASSWORD` env vars
- **Tier**: Free (student/researcher)

#### Endpoints Used

| Endpoint                | What It Returns                        | Free Tier Access          |
|-------------------------|----------------------------------------|---------------------------|
| `GET /login`            | Bearer token                           | All users                 |
| `GET /v3/signal-index`  | Percentile 0-100 (real-time rank)      | **ALL regions**           |
| `GET /v3/forecast`      | MOER value (lbs CO2/MWh)              | **CAISO_NORTH only** (403 for others) |
| `GET /v3/region-from-loc` | Resolves lat/lon → WattTime region   | **ALL regions**           |

#### Critical Free Tier Constraints

1. **`/v3/forecast` is locked to CAISO_NORTH**. Any other region returns HTTP 403
   `INVALID_SCOPE`. This means only San Francisco/Northern California gets actual
   MOER values (lbs CO2/MWh → convertible to g CO2/kWh). All other regions only
   get the percentile index.

2. **Percentile (0-100)** is a relative rank, NOT an absolute carbon value.
   - 0 = cleanest the grid has been historically
   - 100 = dirtiest the grid has been historically
   - It tells you *where you are in the distribution*, not the actual g/kWh.

3. **MOER = Marginal Operating Emissions Rate**. This is the emissions of the
   *marginal* generator (the plant that would respond to new load), measured in
   lbs CO2 per MWh. Conversion: `g/kWh = MOER × 453.592 / 1000`.

4. **Token expires** — the login token from `/login` is short-lived. The code
   re-authenticates on every batch call (no token caching implemented yet).

5. **Region codes are NOT the same as Electricity Maps zones**. Example:
   - WattTime: `CAISO_NORTH`, `ERCOT_NORTHCENTRAL`, `NYISO_NYC`
   - Electricity Maps: `US-CAL-CISO`, `US-TEX-ERCO`, `US-NY-NYIS`
   - You must maintain a mapping between them.

### 2.2 Electricity Maps API

- **Base URL**: `https://api.electricitymap.org/v3`
- **Auth**: `auth-token` header with API key
- **Credentials**: `ELECTRICITYMAPS_TOKEN` env var
- **Tier**: Free (student key, validated)

#### Endpoints Used

| Endpoint                          | What It Returns                                    |
|-----------------------------------|----------------------------------------------------|
| `GET /carbon-intensity/latest`    | Real-time carbon intensity (gCO2eq/kWh) for a zone |
| `GET /power-breakdown/latest`     | MW per fuel type, fossil-free %, renewable %        |
| `GET /zones`                      | List of all available zone codes                    |

#### Key Fields Returned

**carbon-intensity/latest:**
- `carbonIntensity` → stored as `carbon_intensity_g_per_kwh` (integer, gCO2eq/kWh)
- `emissionFactorType` → `"lifecycle"` (includes construction/decommission) or `"direct"`
- `isEstimated` → boolean, true when real-time data unavailable (uses `TIME_SLICER_AVERAGE`)
- `datetime` → hourly timestamp of the data point

**power-breakdown/latest:**
- `fossilFreePercentage` → includes nuclear + renewables
- `renewablePercentage` → excludes nuclear
- `powerConsumptionBreakdown` → dict with MW per fuel type (nuclear, solar, wind, gas, coal, etc.)
- `powerProductionBreakdown` → same but for production (may differ due to imports/exports)
- Negative values in production (e.g., `battery discharge: -5807`) represent energy storage charging

#### Constraints

1. **Zone codes use ISO format**: `US-CAL-CISO`, `US-TEX-ERCO`, `DE`, `FR`, `GB`, etc.
   US zones are more granular (by ISO region), EU zones are typically country-level.

2. **`is_estimated: true`** is common for many US zones. The API falls back to
   `TIME_SLICER_AVERAGE` when real-time grid data isn't available. This is still
   useful but is less accurate than direct metering.

3. **Rate limits** exist but are generous for the student tier. No explicit rate
   limit header observed in testing, but avoid hammering with >100 requests/minute.

4. **Some zones may not exist** — always handle 4xx responses gracefully.

---

## 3. Redis Cache Layer

### 3.1 RedisCache Wrapper (`core/redis.py`)

A generic key-value wrapper around the `redis` Python library.

**Key behaviors:**
- Auto JSON serialization on `set()`, auto deserialization on `get()`
- TTL support via `setex()` (Redis native expiry)
- **Graceful degradation**: if Redis is down, `redis_client` is set to `None`
  and every method returns `None`/`False`/`[]`. The app continues to work by
  hitting the APIs directly every time.
- Connection timeout: 5 seconds (`socket_connect_timeout=5`)
- Logging via `loguru`

**Methods:**
```
get(key) → dict | str | None
set(key, value, ttl=None) → bool
exists(key) → bool
delete(key) → bool
clear() → bool                    # flushdb — USE WITH CAUTION
get_all_keys(pattern="*") → list  # KEYS command — avoid in production at scale
close() → None
```

### 3.2 Grid Cache in `grid_engine.py`

| Setting            | Value         | Override Env Var    |
|--------------------|---------------|---------------------|
| Key prefix         | `grid:`       | —                   |
| TTL                | 300 seconds   | `GRID_CACHE_TTL`    |
| Redis host         | `localhost`   | `REDIS_HOST`        |
| Redis port         | `6379`        | `REDIS_PORT`        |

**Key patterns:**
- `grid:US-CAL-CISO` → single zone snapshot
- `grid:US-TEX-ERCO` → single zone snapshot
- `grid:__map__` → cached response for the `/grid/map` endpoint (contains all default regions)

**Cache flow in `get_region_data()`:**
```
1. _cache_get(em_zone) → check Redis for grid:{zone}
2. If hit: return cached dict with _from_cache=True flag added
3. If miss: call fetch_region_snapshot() (hits both APIs)
4. _cache_set(em_zone, snapshot) → store in Redis with TTL
5. Return fresh snapshot
```

**Important**: The `_from_cache` flag is injected at read time — it is NOT stored
in Redis. It's a runtime indicator only.

### 3.3 Prompt Cache (`core/cache.py`) — Separate System

This is for LLM prompt caching, NOT grid data. Mentioned here for completeness
so you don't confuse the two.

- Key pattern: `prompt:hash:{sha256}`
- TTL: 3600s (1 hour, via `CACHE_TTL` env var)
- Optional semantic similarity search via `redisvl` (currently broken on Python 3.14
  due to Pydantic v1 incompatibility — degrades gracefully to `None`)
- Used by `core/orchestrator.py` for caching LLM responses

**DO NOT use `cache.py` for grid data. Use `grid_engine.py` which talks to
`redis.py` directly.**

---

## 4. Canonical Data Schema (Redis Snapshot)

Each zone is stored as a single flat JSON dict. This is the shape returned by
`build_region_snapshot()` and stored at `grid:{zone}`:

```json
{
  "zone": "US-CAL-CISO",
  "carbon_intensity_g_per_kwh": 114,
  "emission_factor_type": "lifecycle",
  "is_estimated": false,
  "datetime": "2026-02-07T22:00:00.000Z",
  "updated_at": "2026-02-07T21:25:31.934Z",
  "fossil_free_pct": 84,
  "renewable_pct": 74,
  "power_consumption_mw": 20638,
  "power_production_mw": 24865,
  "consumption_breakdown": {
    "nuclear": 2129,
    "geothermal": 657,
    "biomass": 272,
    "coal": 203,
    "wind": 265,
    "solar": 13521,
    "hydro": 522,
    "gas": 3003,
    "oil": 0,
    "unknown": 67,
    "hydro discharge": 0,
    "battery discharge": 0
  },
  "production_breakdown": {
    "nuclear": 2256,
    "geothermal": 744,
    "biomass": 374,
    "coal": 0,
    "wind": 286,
    "solar": 16932,
    "hydro": 711,
    "gas": 3562,
    "oil": null,
    "unknown": 0,
    "hydro discharge": null,
    "battery discharge": -5807
  },
  "watttime_region": "CAISO_NORTH",
  "watttime_percentile": 1.0,
  "watttime_timestamp": "2026-02-07T22:20:00+00:00",
  "watttime_moer_lbs_per_mwh": 133.2,
  "watttime_co2_g_per_kwh": 60.42,
  "fetched_at": "2026-02-07T22:24:54Z"
}
```

### Field Reference

| Field                          | Source            | Type     | Notes                                                    |
|--------------------------------|-------------------|----------|----------------------------------------------------------|
| `zone`                         | Electricity Maps  | string   | EM zone code (e.g., `US-CAL-CISO`)                      |
| `carbon_intensity_g_per_kwh`   | Electricity Maps  | int      | Real-time lifecycle carbon intensity                     |
| `emission_factor_type`         | Electricity Maps  | string   | `"lifecycle"` or `"direct"`                              |
| `is_estimated`                 | Electricity Maps  | bool     | True when EM uses time-slicer average, not live data     |
| `datetime`                     | Electricity Maps  | string   | Hourly timestamp of the EM data point                    |
| `updated_at`                   | Electricity Maps  | string   | When EM last refreshed this zone                         |
| `fossil_free_pct`              | Electricity Maps  | int      | % of generation that is fossil-free (incl. nuclear)      |
| `renewable_pct`                | Electricity Maps  | int      | % of generation that is renewable (excl. nuclear)        |
| `power_consumption_mw`         | Electricity Maps  | int      | Total power consumption in MW                            |
| `power_production_mw`          | Electricity Maps  | int      | Total power production in MW                             |
| `consumption_breakdown`        | Electricity Maps  | dict     | MW per fuel type (consumption side)                      |
| `production_breakdown`         | Electricity Maps  | dict     | MW per fuel type (production side)                       |
| `watttime_region`              | WattTime          | string   | WT region code (e.g., `CAISO_NORTH`)                    |
| `watttime_percentile`          | WattTime          | float    | 0-100, real-time grid cleanliness rank                   |
| `watttime_timestamp`           | WattTime          | string   | When WT measured this percentile                         |
| `watttime_moer_lbs_per_mwh`    | WattTime          | float?   | MOER value — **only populated for CAISO_NORTH**          |
| `watttime_co2_g_per_kwh`       | WattTime          | float?   | Derived: `MOER × 453.592 / 1000` — **only CAISO_NORTH** |
| `fetched_at`                   | System            | string   | UTC timestamp when we fetched this snapshot              |

**Nullable fields**: `watttime_moer_lbs_per_mwh` and `watttime_co2_g_per_kwh` are
`null` for all non-CAISO_NORTH regions due to the WattTime free tier restriction.
The `production_breakdown` may contain `null` values for fuel types not tracked.

---

## 5. Zone Mapping (Electricity Maps ↔ WattTime)

These two APIs use **completely different zone/region codes**. You must always
provide both when calling `get_region_data(em_zone, wt_region)`.

### Tested & Verified Mappings

| City              | EM Zone          | WT Region              |
|-------------------|------------------|------------------------|
| San Francisco, CA | `US-CAL-CISO`   | `CAISO_NORTH`          |
| Dallas, TX        | `US-TEX-ERCO`   | `ERCOT_NORTHCENTRAL`   |
| New York, NY      | `US-NY-NYIS`    | `NYISO_NYC`            |
| Chicago, IL       | `US-MIDW-MISO`  | `PJM_CHICAGO`          |
| Atlanta, GA       | `US-SE-SOCO`    | `SOCO`                 |

### How To Resolve New Zones

1. **EM zone**: Check `fetch_emaps_zones()` or the Electricity Maps docs.
   US zones follow the pattern `US-{region}-{ISO}`.
2. **WT region**: Call `fetch_watttime_region(lat, lon)` with the city's GPS
   coordinates. It returns `{"region": "CAISO_NORTH", "region_full_name": "..."}`.
3. Store the mapping. There is no automatic cross-reference between the two APIs.

### EU Zone Codes

EU zones in Electricity Maps are typically **country-level ISO codes**: `DE`, `FR`,
`GB`, `NL`, `SE`, `NO`, `FI`, `ES`, `IT`, `CH`, `PL`, `DK`, `BE`, `AT`, `CZ`,
`RO`, `GR`, `PT`, `IE`. WattTime uses the same codes for EU countries.

---

## 6. Environment Variables

| Variable               | Required | Default        | Used By                |
|------------------------|----------|----------------|------------------------|
| `WATTTIME_USERNAME`    | Yes      | —              | `energy_providers.py`  |
| `WATTTIME_PASSWORD`    | Yes      | —              | `energy_providers.py`  |
| `WATTTIME_TOKEN`       | No       | —              | Shortcut: skip login   |
| `ELECTRICITYMAPS_TOKEN`| Yes      | —              | `energy_providers.py`  |
| `REDIS_HOST`           | No       | `localhost`    | `grid_engine.py`, `cache.py` |
| `REDIS_PORT`           | No       | `6379`         | `grid_engine.py`, `cache.py` |
| `REDIS_URL`            | No       | Built from host/port | `cache.py` (semantic) |
| `GRID_CACHE_TTL`       | No       | `300`          | `grid_engine.py`       |
| `CACHE_TTL`            | No       | `3600`         | `cache.py` (prompts)   |

All loaded via `python-dotenv` from `.env` in the project root. The `.env` file
is NOT committed to git (it contains secrets).

---

## 7. Known Constraints & Gotchas

### API Constraints

1. **WattTime MOER is CAISO_NORTH only** on free tier. All other regions return
   403 on `/v3/forecast`. The `watttime_moer_lbs_per_mwh` field will be absent
   (not set, not null) for non-CAISO regions.

2. **WattTime token is not cached** between calls. Each batch of requests re-authenticates.
   This adds ~200ms per batch but avoids token expiry issues.

3. **Electricity Maps `is_estimated: true`** is common for US zones. The
   `TIME_SLICER_AVERAGE` estimation method uses historical patterns for the same
   time-of-day/day-of-week. It's directionally accurate but not live metering.

4. **Electricity Maps `fossil_free_pct` includes nuclear**. If you want to distinguish
   nuclear from renewables, use `renewable_pct` (which excludes nuclear) or inspect
   the `consumption_breakdown` dict directly.

5. **Negative values in `production_breakdown`** (e.g., `battery discharge: -5807`)
   indicate energy storage *charging*. A negative `hydro discharge` means pumped
   hydro is storing energy. These are normal.

6. **`null` vs missing fields**: Electricity Maps may return `null` for fuel types
   it doesn't have data for (e.g., `"geothermal": null` for a zone without
   geothermal plants). The snapshot preserves these nulls.

### Redis Constraints

7. **Redis is optional**. If Redis is not running, the `RedisCache` wrapper sets
   `redis_client = None` and every operation is a no-op. The app works fine — it
   just re-fetches from APIs every time. No crashes, no exceptions.

8. **`get_all_keys()` uses the Redis `KEYS` command**. This is O(N) and should NOT
   be used in production at scale. For monitoring only. Use `SCAN` if you need
   production-safe key enumeration.

9. **Two separate Redis instances are created**: one in `grid_engine.py` (for grid
   data, 300s TTL) and one in `cache.py` (for prompts, 3600s TTL). They connect
   to the same Redis server but use different TTLs and key prefixes.

10. **`redisvl` semantic cache is broken on Python 3.14** due to Pydantic v1
    incompatibility. The `cache.py` module catches this with try/except and sets
    `llmcache = None`. Hash-based prompt caching still works. This does NOT affect
    grid data caching at all (grid caching uses `redis.py` directly).

### Data Interpretation

11. **Percentile is NOT carbon intensity**. Percentile 50 does NOT mean 50 g/kWh.
    It means "the grid is at its median historical dirtiness." A grid with average
    200 g/kWh at percentile 50 is very different from a grid with average 600 g/kWh
    at percentile 50.

12. **EM carbon intensity vs WT MOER measure different things**:
    - EM `carbon_intensity_g_per_kwh` = **average** emissions of the entire grid mix
    - WT MOER = **marginal** emissions of the plant that responds to new load
    - These numbers will differ, sometimes significantly. Both are valid for different
      use cases (average for reporting, marginal for scheduling decisions).

13. **`emission_factor_type: "lifecycle"`** means the carbon intensity includes
    upstream emissions (construction, fuel extraction, decommissioning), not just
    stack emissions. This makes numbers ~10-20% higher than "direct" factors.

### Operational

14. **Redis must be started manually** in development: `redis-server --daemonize yes`.
    It's installed via Homebrew (`brew install redis`). No Docker required.

15. **The `.env` file must be at the project root**
    (`backend/eco_orchestrator/.env`). The `main.py` loads it explicitly:
    `load_dotenv(_package_root / ".env")`.

16. **`core/__init__.py` must import new modules** if you add files to `core/`.
    Currently imports: `classifier, compression, energy_providers, grid_engine, pii_scrubber`.
    Note: `redis`, `cache`, and `test_cache` are NOT in `__init__.py` — they are
    imported directly where needed.

---

## 8. File Map

```
backend/eco_orchestrator/
├── .env                          # API keys & config (NOT in git)
├── requirements.txt              # Python dependencies
├── pyproject.toml                # Build config
├── app/
│   ├── main.py                   # FastAPI entry point, loads .env
│   ├── worker.py                 # Background task monitor
│   └── routers/
│       ├── intelligence.py       # GET /grid/map endpoint
│       ├── action.py
│       ├── discovery.py
│       ├── governance.py
│       └── transparency.py
├── core/
│   ├── __init__.py               # Package exports
│   ├── energy_providers.py       # WattTime + Electricity Maps API clients
│   ├── grid_engine.py            # Cache-aware orchestration layer
│   ├── redis.py                  # RedisCache wrapper class
│   ├── cache.py                  # Prompt caching (hash + semantic)
│   ├── test_cache.py             # Cache tests with fake Redis fallback
│   ├── orchestrator.py           # LLM orchestration (uses cache.py)
│   ├── classifier.py
│   ├── compression.py
│   └── pii_scrubber.py
└── data/
    ├── watttime_test_results.json  # Test output (5 US regions, full snapshots)
    └── wackFormula.txt             # Reference: percentile → intensity estimation formula
```

---

## 9. Reference: Estimation Formula (Not Implemented in Code)

The file `data/wackFormula.txt` contains a statistical approach for estimating
live carbon intensity from a percentile + yearly average. **This was previously
implemented in `energy_providers.py` but has been removed** because we now have
real-time carbon intensity from Electricity Maps, making the estimation unnecessary.

The formula is kept as a reference document only:

```
I_curr = μ × (1 + z_P × C_v)

Where:
  μ   = annual average grid carbon intensity (g CO2/kWh)
  z_P = z-score for the WattTime percentile (via inverse normal CDF)
  C_v = volatility coefficient (0.15 for stable grids, 0.5 for volatile)
```

If you ever need to estimate carbon intensity for a zone where Electricity Maps
has no data, this formula can be re-implemented using the GCP region carbon data
from https://cloud.google.com/sustainability/region-carbon as the μ baseline.

---

## 10. Quick Reference: Running the System

```bash
# Start Redis (required for caching, optional for API calls)
redis-server --daemonize yes

# Activate venv
cd backend/eco_orchestrator
source .venv/bin/activate

# Install deps
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --reload

# Test grid endpoint
curl http://localhost:8000/grid/map

# Test a single region from Python
python3 -c "
from dotenv import load_dotenv; load_dotenv()
import sys; sys.path.insert(0, '.')
from core.grid_engine import get_region_data
snap = get_region_data('US-CAL-CISO', 'CAISO_NORTH')
print(snap)
"

# Check what's in Redis
redis-cli KEYS "grid:*"
redis-cli GET "grid:US-CAL-CISO"
redis-cli TTL "grid:US-CAL-CISO"
```

---

*Last updated: 2026-02-07. Generated from the feature/energyEndpoints branch.*
