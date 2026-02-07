# 🗺️ Definitive Server & Model Map — Carbon-Aware AI Router

> **Date:** February 2026  
> **Providers:** Google Vertex AI (MaaS only) + xAI API  
> **Billing Mode:** Pay-per-token ONLY — no dedicated GPU endpoints  
> **Source:** Google Cloud Vertex AI docs, Google Environmental Reports (CFE%), xAI API docs

---

## ⚠️ CRITICAL: Backend Migration Required

Your backend currently uses `google.generativeai` (AI Studio SDK). **AI Studio does NOT let you choose a region** — Google decides where to serve you. To enable carbon-aware routing, you MUST migrate to the **Vertex AI SDK**, which lets you specify `location` per request.

```python
# ❌ CURRENT (AI Studio — no regional control)
import google.generativeai as genai
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

# ✅ REQUIRED (Vertex AI — regional routing)
import vertexai
from vertexai.generative_models import GenerativeModel
vertexai.init(project="YOUR_PROJECT_ID", location="europe-north1")  # ← THIS is the magic
model = GenerativeModel("gemini-1.5-flash")
```

---

## 🔋 Power Level Classification

| Power Level | Category | Models | Approx Cost | Use When |
|---|---|---|---|---|
| **🟢 Low** | Small/Fast/Cheap | Gemini 2.0 Flash, Gemini 1.5 Flash, Claude 3.5 Haiku, Llama 3.1 8B, Grok-2-mini | $0.01–0.10/1K tokens | Simple chat, summaries, quick Q&A |
| **🟡 Medium** | Balanced | Gemini 1.5 Pro, Gemini 2.5 Pro, Claude 3.5 Sonnet, Llama 3.1 70B, Grok-2, DeepSeek R1 | $0.10–1.00/1K tokens | Reasoning, analysis, coding |
| **🔴 High** | Large/Slow/Expensive | Claude 3 Opus, Llama 3.1 405B | $1.00+/1K tokens | Complex multi-step reasoning |

---

## 🌍 The Definitive Region Map

### Tier 1: GREEN ZONES (CFE > 80%) — Route Here First

#### `northamerica-northeast1` — Montréal, Canada 🇨🇦
- **CFE:** 98% (Québec Hydro)
- **Grid Rating:** ⭐⭐⭐⭐⭐ PRISTINE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
- **NOT available:** Claude, DeepSeek, Llama
- **Notes:** Best carbon region in all of Google Cloud. Your #1 target for Gemini calls.

#### `europe-north1` — Hamina, Finland 🇫🇮
- **CFE:** 97% (Nordic hydro/wind/nuclear)
- **Grid Rating:** ⭐⭐⭐⭐⭐ PRISTINE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
- **NOT available:** Claude, DeepSeek, Llama
- **Notes:** Second best carbon region. Higher latency from US but amazing for async/deferred tasks.

#### `us-west1` — The Dalles, Oregon 🇺🇸
- **CFE:** 89% (Pacific NW hydro)
- **Grid Rating:** ⭐⭐⭐⭐ EXCELLENT
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
- **NOT available:** Claude, DeepSeek, Llama (likely)
- **Notes:** Best US region for carbon. Low latency from west coast.

#### `europe-west1` — St. Ghislain, Belgium 🇧🇪
- **CFE:** 81% (Wind/Nuclear)
- **Grid Rating:** ⭐⭐⭐⭐ EXCELLENT
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
  - `claude-3-5-sonnet-v2@20241022` (Medium) ✅
  - `claude-3-5-haiku@20241022` (Low) ✅
  - `claude-3-opus@20240229` (High) ✅
- **Notes:** 🌟 **CRITICAL REGION** — This is the ONLY green region with Claude available. Route ALL Claude requests here when possible.

#### `europe-west4` — Eemshaven, Netherlands 🇳🇱
- **CFE:** 80% (Wind/Solar)
- **Grid Rating:** ⭐⭐⭐⭐ EXCELLENT
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
- **NOT available:** Claude, DeepSeek, Llama
- **Notes:** Good European alternative for Gemini overflow.

---

### Tier 2: MIXED ZONES (CFE 40-80%) — Acceptable Fallback

#### `us-central1` — Council Bluffs, Iowa 🇺🇸
- **CFE:** 59% (Wind + Coal/Gas)
- **Grid Rating:** ⭐⭐⭐ MODERATE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
  - `gemini-2.5-flash` (Low) — if available
  - `gemini-2.5-pro` (Medium) — if available
  - `deepseek-r1` (Medium) ✅
  - `meta/llama-3.1-8b-instruct` (Low) ✅
  - `meta/llama-3.1-70b-instruct` (Medium) ✅
  - `meta/llama-3.1-405b-instruct` (High) ✅
  - `claude-3-5-sonnet-v2@20241022` (Medium) — likely expanded here
  - `claude-3-5-haiku@20241022` (Low) — likely expanded here
- **Notes:** 🏠 **THE HUB** — Google's primary US region. Has EVERYTHING, but middling carbon score. Use only when a model isn't available in greener regions.

#### `europe-west3` — Frankfurt, Germany 🇩🇪
- **CFE:** 59% (Mixed renewable/coal)
- **Grid Rating:** ⭐⭐⭐ MODERATE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
- **Notes:** Decent European fallback but no partner models.

---

### Tier 3: DIRTY ZONES (CFE < 40%) — Avoid When Possible

#### `us-east4` — Ashburn, Virginia 🇺🇸
- **CFE:** 34% (PJM Grid — coal/gas heavy)
- **Grid Rating:** ⭐⭐ POOR
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
- **Notes:** Major internet hub, but dirty grid. Avoid unless latency to US East is critical.

#### `us-east5` — Columbus, Ohio 🇺🇸
- **CFE:** ~30% (PJM Grid — coal/gas heavy)
- **Grid Rating:** ⭐⭐ POOR
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
  - `gemini-2.0-flash` (Low)
  - `claude-3-5-sonnet-v2@20241022` (Medium) ✅
  - `claude-3-5-haiku@20241022` (Low) ✅
  - `claude-3-opus@20240229` (High) ✅
- **Notes:** ⚠️ **THE CLAUDE TRAP** — This is Claude's primary Vertex AI region, but it's one of the dirtiest grids. Your router should prefer `europe-west1` for Claude when latency allows.

#### `us-west4` — Las Vegas, Nevada 🇺🇸
- **CFE:** 22% (NV Energy — gas/coal)
- **Grid Rating:** ⭐ TERRIBLE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
- **Notes:** Despite being in sunny Nevada, the local grid is dirty. Avoid.

#### `asia-southeast1` — Singapore 🇸🇬
- **CFE:** 3% (Almost entirely fossil fuel)
- **Grid Rating:** ⭐ TERRIBLE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
  - `gemini-1.5-pro` (Medium)
- **Notes:** Worst carbon region in Google Cloud. Only use for APAC latency requirements.

#### `asia-south1` — Mumbai, India 🇮🇳
- **CFE:** 9% (Coal dominant)
- **Grid Rating:** ⭐ TERRIBLE
- **Available Models (MaaS):**
  - `gemini-1.5-flash` (Low)
- **Notes:** Extremely dirty grid. Avoid.

---

### Special: xAI (Non-Regional)

#### `xai-global` — Memphis, Tennessee 🇺🇸
- **Base URL:** `https://api.x.ai/v1`
- **CFE:** ~25% (TVA Grid — coal/nuclear/hydro mix)
- **Grid Rating:** ⭐⭐ POOR
- **Available Models:**
  - `grok-2` (Medium)
  - `grok-2-mini` (Low) — if available
- **Regional Control:** ❌ NONE — xAI has a single global endpoint. You cannot choose which data center serves your request.
- **Data Center:** xAI's "Colossus" supercluster in Memphis, TN (100K+ H100 GPUs)
- **Notes:** xAI doesn't offer regional routing. Their Memphis DC runs on the TVA (Tennessee Valley Authority) grid, which is a mix of nuclear (~40%), coal (~15%), hydro (~10%), gas (~30%), and renewables (~5%). Not great, not terrible. Use Grok when the model is specifically needed or as a last-resort fallback.

---

## 📊 The JSON Map (for `router.py`)

```json
{
  "northamerica-northeast1": {
    "location": "Montréal, Canada",
    "cfe_percent": 98,
    "grid_cleanliness": "Pristine (Hydro)",
    "tier": "green",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [-73.5674, 45.5019]
  },
  "europe-north1": {
    "location": "Hamina, Finland",
    "cfe_percent": 97,
    "grid_cleanliness": "Pristine (Hydro/Wind/Nuclear)",
    "tier": "green",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [27.1878, 60.5693]
  },
  "us-west1": {
    "location": "The Dalles, Oregon, USA",
    "cfe_percent": 89,
    "grid_cleanliness": "Excellent (PNW Hydro)",
    "tier": "green",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [-121.1787, 45.5946]
  },
  "europe-west1": {
    "location": "St. Ghislain, Belgium",
    "cfe_percent": 81,
    "grid_cleanliness": "Excellent (Wind/Nuclear)",
    "tier": "green",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"},
      {"id": "claude-3-5-sonnet-v2@20241022", "power_level": "medium", "provider": "anthropic"},
      {"id": "claude-3-5-haiku@20241022", "power_level": "low", "provider": "anthropic"},
      {"id": "claude-3-opus@20240229", "power_level": "high", "provider": "anthropic"}
    ],
    "coordinates": [3.8190, 50.4541]
  },
  "europe-west4": {
    "location": "Eemshaven, Netherlands",
    "cfe_percent": 80,
    "grid_cleanliness": "Excellent (Wind/Solar)",
    "tier": "green",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [6.8317, 53.4389]
  },
  "us-central1": {
    "location": "Council Bluffs, Iowa, USA",
    "cfe_percent": 59,
    "grid_cleanliness": "Moderate (Wind/Coal/Gas Mix)",
    "tier": "mixed",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"},
      {"id": "claude-3-5-sonnet-v2@20241022", "power_level": "medium", "provider": "anthropic"},
      {"id": "claude-3-5-haiku@20241022", "power_level": "low", "provider": "anthropic"},
      {"id": "deepseek-r1", "power_level": "medium", "provider": "deepseek"},
      {"id": "meta/llama-3.1-8b-instruct", "power_level": "low", "provider": "meta"},
      {"id": "meta/llama-3.1-70b-instruct", "power_level": "medium", "provider": "meta"},
      {"id": "meta/llama-3.1-405b-instruct", "power_level": "high", "provider": "meta"}
    ],
    "coordinates": [-95.8608, 41.2619]
  },
  "us-east4": {
    "location": "Ashburn, Virginia, USA",
    "cfe_percent": 34,
    "grid_cleanliness": "Poor (PJM Grid — Coal/Gas Heavy)",
    "tier": "dirty",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [-77.4875, 39.0438]
  },
  "us-east5": {
    "location": "Columbus, Ohio, USA",
    "cfe_percent": 30,
    "grid_cleanliness": "Poor (PJM Grid — Coal/Gas Heavy)",
    "tier": "dirty",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"},
      {"id": "claude-3-5-sonnet-v2@20241022", "power_level": "medium", "provider": "anthropic"},
      {"id": "claude-3-5-haiku@20241022", "power_level": "low", "provider": "anthropic"},
      {"id": "claude-3-opus@20240229", "power_level": "high", "provider": "anthropic"}
    ],
    "coordinates": [-82.9988, 39.9612]
  },
  "us-west4": {
    "location": "Las Vegas, Nevada, USA",
    "cfe_percent": 22,
    "grid_cleanliness": "Terrible (NV Energy — Gas/Coal)",
    "tier": "dirty",
    "available_models": [
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [-115.1398, 36.1699]
  },
  "asia-northeast1": {
    "location": "Tokyo, Japan",
    "cfe_percent": 38,
    "grid_cleanliness": "Poor (Mixed Fossil/Nuclear)",
    "tier": "dirty",
    "available_models": [
      {"id": "gemini-2.0-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [139.6917, 35.6895]
  },
  "asia-southeast1": {
    "location": "Singapore",
    "cfe_percent": 3,
    "grid_cleanliness": "Terrible (Almost Entirely Fossil Fuel)",
    "tier": "dirty",
    "available_models": [
      {"id": "gemini-1.5-flash", "power_level": "low", "provider": "google"},
      {"id": "gemini-1.5-pro", "power_level": "medium", "provider": "google"}
    ],
    "coordinates": [103.8198, 1.3521]
  },
  "xai-global": {
    "location": "Memphis, Tennessee, USA",
    "cfe_percent": 25,
    "grid_cleanliness": "Poor (TVA Grid — Nuclear/Coal/Gas Mix)",
    "tier": "dirty",
    "provider_type": "xai",
    "base_url": "https://api.x.ai/v1",
    "regional_control": false,
    "available_models": [
      {"id": "grok-2", "power_level": "medium", "provider": "xai"}
    ],
    "coordinates": [-90.0490, 35.1495]
  }
}
```

---

## 🧠 Routing Logic Cheat Sheet

### Decision Tree for the Router

```
1. Classify prompt → determine required power_level (low/medium/high)
2. Check if user requested a specific model family
3. Find ALL regions that have a suitable model
4. Sort those regions by CFE% (highest first)
5. Pick the greenest region
6. If latency matters (is_urgent=true), filter to regions within acceptable latency
```

### Model-Specific Routing Rules

| Model Family | Greenest Option | Fallback | Worst Case |
|---|---|---|---|
| **Gemini Flash** | `northamerica-northeast1` (98%) | `europe-north1` (97%) | `us-central1` (59%) |
| **Gemini Pro** | `northamerica-northeast1` (98%) | `us-west1` (89%) | `us-central1` (59%) |
| **Claude Sonnet/Haiku** | `europe-west1` (81%) ✅ | `us-central1` (59%) | `us-east5` (30%) ❌ |
| **Claude Opus** | `europe-west1` (81%) ✅ | `us-east5` (30%) | — |
| **DeepSeek R1** | `us-central1` (59%) | — | — (only region) |
| **Llama 3.1 (any)** | `us-central1` (59%) | — | — (only region) |
| **Grok** | `xai-global` (25%) | — | — (no choice) |

### The "Green Score" Formula

```python
def green_score(region: str, model_id: str, is_urgent: bool) -> float:
    """
    Higher = Greener. Use this to rank routing options.
    """
    cfe = REGION_MAP[region]["cfe_percent"]  # 0-100
    
    # Urgency penalty: if urgent, penalize high-latency regions
    latency_penalty = 0
    if is_urgent and region.startswith("europe") or region.startswith("asia"):
        latency_penalty = 15  # knock down score for cross-ocean
    
    # Model efficiency bonus: reward choosing lighter models
    power_bonus = {"low": 10, "medium": 0, "high": -10}
    model_power = get_model_power(model_id)
    
    return cfe - latency_penalty + power_bonus[model_power]
```

---

## 🔧 Backend Integration Notes

### 1. Vertex AI Setup (Python)
```python
# Install: pip install google-cloud-aiplatform anthropic[vertex]

# For Gemini (regional)
import vertexai
from vertexai.generative_models import GenerativeModel

def call_gemini(prompt: str, region: str, model_id: str):
    vertexai.init(project="YOUR_PROJECT", location=region)
    model = GenerativeModel(model_id)
    response = model.generate_content(prompt)
    return response.text

# For Claude on Vertex (regional)  
from anthropic import AnthropicVertex

def call_claude(prompt: str, region: str, model_id: str):
    client = AnthropicVertex(region=region, project_id="YOUR_PROJECT")
    response = client.messages.create(
        model=model_id,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

# For DeepSeek/Llama on Vertex (via Model Garden endpoints)
from vertexai.preview.generative_models import GenerativeModel as PreviewModel

def call_partner_model(prompt: str, region: str, model_id: str):
    vertexai.init(project="YOUR_PROJECT", location=region)
    # Partner models use the Model Garden endpoint format
    model = PreviewModel(model_id)
    response = model.generate_content(prompt)
    return response.text
```

### 2. xAI Setup (Python)
```python
# Uses OpenAI-compatible SDK
from openai import OpenAI

def call_grok(prompt: str):
    client = OpenAI(
        api_key=os.getenv("XAI_API_KEY"),
        base_url="https://api.x.ai/v1"
    )
    response = client.chat.completions.create(
        model="grok-2",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
```

### 3. Required Environment Variables
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
XAI_API_KEY=xai-your-key-here
```

---

## 📋 Confidence Levels

| Data Point | Confidence | Source |
|---|---|---|
| Google Cloud CFE% numbers | ⭐⭐⭐⭐ High | Google Environmental Reports 2023-2024 |
| Gemini regional availability | ⭐⭐⭐⭐ High | Vertex AI docs (stable since 2024) |
| Claude on Vertex regions (us-east5, europe-west1) | ⭐⭐⭐⭐ High | Anthropic + Google partnership announcements |
| Claude expanded to us-central1 | ⭐⭐⭐ Medium | Likely by Feb 2026 but verify |
| DeepSeek R1 on Vertex (us-central1) | ⭐⭐⭐ Medium | Announced Jan 2025, verify current state |
| Llama 3.1 on Vertex MaaS (us-central1) | ⭐⭐⭐ Medium | Model Garden listing, verify MaaS vs custom deployment |
| xAI Memphis data center | ⭐⭐⭐⭐ High | Public reporting on Colossus cluster |
| xAI single global endpoint | ⭐⭐⭐⭐ High | API documentation |
| Gemini 2.5 models | ⭐⭐ Low | Extrapolated, verify if released |
| Llama 4 on Vertex | ⭐ Speculative | Not confirmed, omitted from map |

---

## 🎯 Key Insights for the Hackathon

1. **The Claude Paradox:** Claude's primary Vertex AI region (`us-east5`, Ohio) is one of Google's dirtiest grids (30% CFE). But Claude is ALSO available in `europe-west1` (81% CFE). Your router can demonstrate a **2.7x carbon improvement** just by routing Claude to Belgium instead of Ohio.

2. **Gemini is your green workhorse:** Gemini Flash is available in the cleanest regions (98% Montréal, 97% Finland). For simple tasks, always route to Gemini Flash in a green region.

3. **Partner models are trapped:** DeepSeek and Llama are only available in `us-central1` (59% CFE). There's no green alternative. Your router should flag this honestly.

4. **xAI is a carbon liability:** No regional control, dirty grid (~25% CFE), and you can't do anything about it. Use Grok only when specifically requested.

5. **The demo story:** Show a side-by-side: "Claude Sonnet in Ohio = 4.2g CO₂" vs "Claude Sonnet in Belgium = 1.5g CO₂" — same model, same quality, 63% less carbon. That's your hackathon mic drop. 🎤

