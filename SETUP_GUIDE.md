# 🔧 Backend Setup Guide — Carbon-Aware AI Router

> **For Windsurf:** Follow these steps IN ORDER. Do NOT skip any step. Do NOT modify frontend code — this is backend-only work.
> **Working Directory:** `backend/eco_orchestrator/`

---

## Context: What We're Doing

The backend currently uses `google.generativeai` (Google AI Studio SDK) with a simple API key. This does NOT allow regional routing — Google picks the data center for you.

We need to migrate to **Google Vertex AI SDK**, which lets us specify a `location` (region) per request. This is the core of our carbon-aware routing — we can send requests to the greenest data center.

### Current State (`core/llm_client.py`):
```python
# ❌ CURRENT — No regional control
import google.generativeai as genai
import os

class LLMClient:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

    async def generate(self, prompt: str, model_name: str):
        model = genai.GenerativeModel(model_name)
        response = await model.generate_content_async(prompt)
        return response.text
```

### Target State:
```python
# ✅ NEW — Regional routing enabled for Gemini, Claude, and Grok
import vertexai
from vertexai.generative_models import GenerativeModel
from anthropic import AnthropicVertex
from openai import OpenAI

class LLMClient:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.xai_key = os.getenv("XAI_API_KEY")

    async def generate(self, prompt: str, model_id: str, region: str):
        # Router picks the region based on carbon score
        vertexai.init(project=self.project_id, location=region)
        model = GenerativeModel(model_id)
        response = await model.generate_content_async(prompt)
        return response.text
```

---

## Step 1: Google Cloud Project + Vertex AI APIs

### 1a. Install gcloud CLI (if not installed)
```bash
brew install google-cloud-sdk
```

### 1b. Authenticate and create project
```bash
# Login to Google Cloud
gcloud auth login

# Create project (or use existing — change the name as needed)
gcloud projects create sorcer-hackathon --name="Sorcer Hackathon"
gcloud config set project sorcer-hackathon

# IMPORTANT: Link a billing account
# Go to: https://console.cloud.google.com/billing
# Select your project and link it to a billing account
# Vertex AI requires billing enabled — it won't work without it
```

### 1c. Enable required APIs
```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable compute.googleapis.com
```

---

## Step 2: Create Service Account + Download Key

Vertex AI authenticates via service accounts, not API keys.

```bash
# Create the service account
gcloud iam service-accounts create sorcer-router \
  --display-name="Sorcer Carbon Router"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding sorcer-hackathon \
  --member="serviceAccount:sorcer-router@sorcer-hackathon.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Download the JSON key file directly into the backend directory
gcloud iam service-accounts keys create backend/eco_orchestrator/service-account.json \
  --iam-account=sorcer-router@sorcer-hackathon.iam.gserviceaccount.com
```

> ⚠️ `service-account.json` is already covered by the existing `.gitignore` in `backend/eco_orchestrator/`. Verify with `git status` before committing.

---

## Step 3: Enable Claude in Vertex AI Model Garden

This MUST be done in the browser — there is no CLI command.

1. Go to **https://console.cloud.google.com/vertex-ai/model-garden**
2. Make sure your project (`sorcer-hackathon`) is selected in the top bar
3. Search **"Claude"**
4. Click **Claude 3.5 Sonnet** → click **"Enable"** → Accept Anthropic's Terms of Service
5. Click **Claude 3.5 Haiku** → click **"Enable"** → Accept Terms
6. (Optional) Search **"DeepSeek"** → Enable **DeepSeek R1**
7. (Optional) Search **"Llama"** → Enable **Llama 3.1** variants

> **No separate Anthropic API key needed.** Claude on Vertex authenticates through your Google service account.

---

## Step 4: Get xAI (Grok) API Key

1. Go to **https://console.x.ai**
2. Sign up or log in (you can use your X/Twitter account)
3. Navigate to **API Keys**
4. Click **Create New Key**
5. Copy the key — it starts with `xai-...`

---

## Step 5: Install Updated Python Dependencies

The `requirements.txt` has already been updated with these new packages:
- `google-cloud-aiplatform>=1.60` — Vertex AI SDK
- `anthropic[vertex]>=0.40` — Claude on Vertex
- `openai>=1.30` — xAI Grok (OpenAI-compatible SDK)

```bash
cd backend/eco_orchestrator
pip install -r requirements.txt
```

---

## Step 6: Create the `.env` File

Create `backend/eco_orchestrator/.env` with these values:

```env
# ============================================
# SORCER — Environment Variables
# ============================================

# --- Google Cloud / Vertex AI ---
GOOGLE_CLOUD_PROJECT=sorcer-hackathon
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
# Keep the old AI Studio key for backwards compatibility during migration
GOOGLE_API_KEY=your-old-ai-studio-key-here

# --- xAI (Grok) ---
XAI_API_KEY=xai-paste-your-key-here

# --- Redis ---
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=3600

# --- Default Region ---
DEFAULT_VERTEX_REGION=us-central1
```

> Replace `sorcer-hackathon` with your actual project ID and `xai-paste-your-key-here` with your actual xAI key.

---

## Step 7: Test All 3 Providers

Run this test script to verify everything connects:

```bash
cd backend/eco_orchestrator
python3 -c "
import os
from dotenv import load_dotenv
load_dotenv()

print('=== 1. Testing Vertex AI (Gemini) ===')
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
    vertexai.init(project=os.getenv('GOOGLE_CLOUD_PROJECT'), location='us-central1')
    model = GenerativeModel('gemini-1.5-flash')
    resp = model.generate_content('Say hello in 5 words')
    print(f'✅ Gemini works: {resp.text[:80]}')
except Exception as e:
    print(f'❌ Gemini failed: {e}')

print()
print('=== 2. Testing Vertex AI (Claude) ===')
try:
    from anthropic import AnthropicVertex
    client = AnthropicVertex(region='us-east5', project_id=os.getenv('GOOGLE_CLOUD_PROJECT'))
    resp = client.messages.create(
        model='claude-3-5-haiku@20241022',
        max_tokens=50,
        messages=[{'role': 'user', 'content': 'Say hello in 5 words'}]
    )
    print(f'✅ Claude works: {resp.content[0].text[:80]}')
except Exception as e:
    print(f'❌ Claude failed: {e}')

print()
print('=== 3. Testing xAI (Grok) ===')
try:
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv('XAI_API_KEY'), base_url='https://api.x.ai/v1')
    resp = client.chat.completions.create(
        model='grok-2',
        messages=[{'role': 'user', 'content': 'Say hello in 5 words'}],
        max_tokens=50
    )
    print(f'✅ Grok works: {resp.choices[0].message.content[:80]}')
except Exception as e:
    print(f'❌ Grok failed: {e}')
"
```

All 3 should print ✅. If any fail, check:
- **Gemini fails:** Is billing enabled? Is `aiplatform.googleapis.com` enabled? Is `service-account.json` in the right place?
- **Claude fails:** Did you enable Claude in Model Garden (Step 3)? Did you accept Anthropic's ToS?
- **Grok fails:** Is your `XAI_API_KEY` correct in `.env`? Does it start with `xai-`?

---

## Step 8: Rewrite `core/llm_client.py` for Multi-Provider Regional Routing

Once all 3 providers test successfully, rewrite `core/llm_client.py`:

```python
import os
import vertexai
from vertexai.generative_models import GenerativeModel
from anthropic import AnthropicVertex
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class LLMClient:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.default_region = os.getenv("DEFAULT_VERTEX_REGION", "us-central1")
        self.xai_client = OpenAI(
            api_key=os.getenv("XAI_API_KEY"),
            base_url="https://api.x.ai/v1"
        )

    async def generate(self, prompt: str, model_id: str, region: str = None) -> str:
        """
        Route to the correct provider based on model_id.
        The `region` parameter is chosen by the carbon-aware router.
        """
        region = region or self.default_region

        if model_id.startswith("gemini"):
            return await self._call_gemini(prompt, model_id, region)
        elif model_id.startswith("claude"):
            return await self._call_claude(prompt, model_id, region)
        elif model_id.startswith("grok"):
            return self._call_grok(prompt, model_id)
        elif model_id.startswith("deepseek") or model_id.startswith("meta/"):
            return await self._call_vertex_partner(prompt, model_id, region)
        else:
            raise ValueError(f"Unknown model: {model_id}")

    async def _call_gemini(self, prompt: str, model_id: str, region: str) -> str:
        vertexai.init(project=self.project_id, location=region)
        model = GenerativeModel(model_id)
        response = await model.generate_content_async(prompt)
        return response.text

    async def _call_claude(self, prompt: str, model_id: str, region: str) -> str:
        client = AnthropicVertex(region=region, project_id=self.project_id)
        response = client.messages.create(
            model=model_id,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def _call_grok(self, prompt: str, model_id: str) -> str:
        # xAI has no regional routing — single global endpoint
        response = self.xai_client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

    async def _call_vertex_partner(self, prompt: str, model_id: str, region: str) -> str:
        # DeepSeek, Llama via Vertex AI Model Garden
        vertexai.init(project=self.project_id, location=region)
        model = GenerativeModel(model_id)
        response = await model.generate_content_async(prompt)
        return response.text

    # Keep backwards-compatible method for existing code
    async def raw_llm_generate(self, prompt: str, model_name: str) -> str:
        return await self.generate(prompt, model_name)
```

---

## Step 9: Update `core/classifier.py` Tier Output

The classifier currently outputs only `"gemini-1.5-pro"` or `"gemini-1.5-flash"`. Update it to support the full model roster:

**In `core/classifier.py`, change line 74:**
```python
# OLD:
"tier": "gemini-1.5-pro" if final_score > 4.5 else "gemini-1.5-flash"

# NEW — Returns a power level, not a specific model
# The router will pick the actual model + region based on this
"tier": "high" if final_score > 7.0 else "medium" if final_score > 4.5 else "low"
```

Then the router uses the tier to pick from available models in the greenest region.

---

## Step 10: Create `core/carbon_router.py` — The Brain

This is the new file that makes carbon-aware routing decisions:

```python
import json
import os

# Load the server model map
MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "server_model_map.json")

with open(MAP_PATH) as f:
    REGION_MAP = json.load(f)

def get_greenest_option(power_level: str, preferred_provider: str = None, is_urgent: bool = False) -> dict:
    """
    Given a power level (low/medium/high) and optional provider preference,
    return the greenest region + model combination.

    Returns: {"region": "europe-north1", "model_id": "gemini-1.5-flash", "cfe_percent": 97}
    """
    candidates = []

    for region_id, region_data in REGION_MAP.items():
        # Skip xAI unless specifically requested
        if region_data.get("provider_type") == "xai" and preferred_provider != "xai":
            continue

        # If urgent, skip non-US regions (latency)
        if is_urgent and not region_id.startswith("us") and not region_id.startswith("north"):
            continue

        for model in region_data["available_models"]:
            # Filter by power level
            if model["power_level"] != power_level:
                continue

            # Filter by provider preference
            if preferred_provider and model["provider"] != preferred_provider:
                continue

            candidates.append({
                "region": region_id,
                "model_id": model["id"],
                "provider": model["provider"],
                "cfe_percent": region_data["cfe_percent"],
                "location": region_data["location"],
            })

    if not candidates:
        # Fallback: widen search (drop provider preference)
        if preferred_provider:
            return get_greenest_option(power_level, preferred_provider=None, is_urgent=is_urgent)
        # Last resort: return us-central1 with gemini flash
        return {
            "region": "us-central1",
            "model_id": "gemini-1.5-flash",
            "provider": "google",
            "cfe_percent": 59,
            "location": "Council Bluffs, Iowa, USA"
        }

    # Sort by CFE% descending — greenest first
    candidates.sort(key=lambda c: c["cfe_percent"], reverse=True)
    return candidates[0]
```

---

## File: `server_model_map.json`

Copy the JSON block from `SERVER_MODEL_MAP.md` (the section titled "The JSON Map for router.py") into a new file at:

```
backend/eco_orchestrator/server_model_map.json
```

This JSON file is loaded by `core/carbon_router.py` at startup.

---

## Summary: New/Modified Files

| File | Action | Purpose |
|---|---|---|
| `service-account.json` | CREATE (via gcloud) | Google Cloud auth |
| `.env` | CREATE (manually) | All API keys and config |
| `requirements.txt` | ALREADY UPDATED ✅ | New SDK packages |
| `core/llm_client.py` | REWRITE | Multi-provider + regional routing |
| `core/classifier.py` | MODIFY line 74 | Output power levels instead of model names |
| `core/carbon_router.py` | CREATE | Carbon-aware routing logic |
| `server_model_map.json` | CREATE | Region/model/CFE data from SERVER_MODEL_MAP.md |

---

## Verification Checklist

After completing all steps, verify:
- [ ] `gcloud auth list` shows your account
- [ ] `gcloud config get project` returns your project ID
- [ ] `service-account.json` exists in `backend/eco_orchestrator/`
- [ ] `.env` has all 3 keys filled in (GOOGLE_CLOUD_PROJECT, GOOGLE_APPLICATION_CREDENTIALS, XAI_API_KEY)
- [ ] `pip list | grep google-cloud-aiplatform` returns a version
- [ ] `pip list | grep anthropic` returns a version
- [ ] `pip list | grep openai` returns a version
- [ ] Test script from Step 7 shows 3x ✅
- [ ] `core/llm_client.py` can route to Gemini, Claude, and Grok
- [ ] `core/carbon_router.py` returns greenest region for each power level

