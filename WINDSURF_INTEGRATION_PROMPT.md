# 🧙‍♂️ WINDSURF: Frontend ↔ Backend Integration — Carbon-Aware Chat

> **Priority:** CRITICAL — This is the hackathon submission build.
> **Your role:** Senior Full-Stack Engineer
> **Backend rule:** You may ONLY touch `backend/eco_orchestrator/core/llm_client.py`. Everything else in `backend/` is READ-ONLY (already configured by another engineer). Exception: you MUST remove the test router file and its import (cleanup task — details below).
> **Frontend:** You own everything in `sorcer-app/`. Go wild.

---

## 📍 Current Architecture (READ THIS FIRST)

### How Chat Works RIGHT NOW (broken flow):
1. User types prompt in `SpellBar` on homepage (`sorcer-app/app/page.tsx`)
2. Homepage calls `postOracleRoute()` → hits `POST /api/oracle/route` — **THIS ENDPOINT DOES NOT EXIST IN THE BACKEND** (it 404s)
3. If oracle fails, it crashes. If it somehow worked, it would set a cookie with the model ID
4. User redirects to `/chat/{id}?query=...`
5. Chat page reads the cookie, renders `<Chat>` component
6. `<Chat>` uses Vercel AI SDK's `useChat` → `POST /api/chat` (Next.js API route at `sorcer-app/app/(chat)/api/chat/route.ts`)
7. Next.js route calls `getLanguageModel(selectedChatModel)` → Vercel AI Gateway (`@ai-sdk/gateway`)
8. Gateway routes to the actual LLM provider (OpenAI, Anthropic, Google, etc.)

### What the Backend ACTUALLY Has:
- `POST /orchestrate` — The real carbon-aware endpoint. Compresses prompt → classifies complexity → picks model tier → calls LLM via Vertex AI → generates carbon receipt
- `LLMClient` in `core/llm_client.py` — Multi-provider client supporting:
  - **Gemini** (via Vertex AI SDK — regional)
  - **Claude** (via AnthropicVertex — regional)  
  - **Llama/Mistral** (via Vertex OpenAPI endpoint — regional)
- `server_model_map.json` — Complete map of 11 regions with CFE%, available models, and coordinates
- `ComplexityScorer` in `core/classifier.py` — Scores prompt complexity 0-10
- `EcoOrchestrator` in `core/orchestrator.py` — Full pipeline: compress → classify → grid check → LLM call → receipt

### The Model ID Mismatch Problem:
The frontend currently uses **Vercel AI Gateway IDs** (e.g., `google/gemini-2.5-flash-lite`, `anthropic/claude-haiku-4.5`).
The backend uses **Vertex AI model IDs** (e.g., `gemini-2.0-flash`, `claude-sonnet-4`, `meta/llama-4-scout-17b-16e-instruct-maas`).
These are DIFFERENT. The mapping must be handled.

### Key Files You Need to Know:

| File | What It Does |
|---|---|
| `sorcer-app/app/page.tsx` | Homepage with SpellBar |
| `sorcer-app/components/SpellBar.tsx` | Input bar + model dropdown (DROPDOWN IS BROKEN — see Task 2) |
| `sorcer-app/components/chat.tsx` | Chat UI using Vercel AI SDK `useChat` |
| `sorcer-app/components/multimodal-input.tsx` | Chat input with model selector |
| `sorcer-app/app/(chat)/api/chat/route.ts` | Next.js API route — proxies to Vercel AI Gateway |
| `sorcer-app/lib/ai/models.ts` | Model list (currently hardcoded Vercel Gateway models) |
| `sorcer-app/lib/ai/providers.ts` | `getLanguageModel()` — uses `@ai-sdk/gateway` |
| `sorcer-app/lib/backendApi.ts` | Frontend API client for Python backend (`postOracleRoute`, etc.) |
| `sorcer-app/utils/api.ts` | Another API client (`postOrchestrate`, `getReceipt`, etc.) |
| `sorcer-app/context/EnergyContext.tsx` | React context: mode (auto/manual), selectedModelId |
| `backend/eco_orchestrator/core/llm_client.py` | ⚡ THE ONLY BACKEND FILE YOU TOUCH |
| `backend/eco_orchestrator/server_model_map.json` | Region + model + CFE data (READ-ONLY, use as reference) |
| `backend/eco_orchestrator/core/orchestrator.py` | Full pipeline (READ-ONLY) |
| `backend/eco_orchestrator/core/classifier.py` | Complexity scorer (READ-ONLY) |
| `backend/eco_orchestrator/app/main.py` | FastAPI app (READ-ONLY except removing test import) |

---

## 🎯 TASKS (In Priority Order)

### Task 0: Cleanup — Remove Test Suite
**Delete these files/references:**
1. Delete `backend/eco_orchestrator/app/routers/test.py`
2. In `backend/eco_orchestrator/app/main.py` — remove the import `test` from line 19 and remove `app.include_router(test.router)` from line 37
3. Delete `sorcer-app/app/test/page.tsx` (and the `test/` directory if empty)

---

### Task 1: Fix the SpellBar Dropdown (CAN'T SEE IT)
**Bug:** The model selector dropdown in `SpellBar.tsx` is invisible/clipped. User clicks the pill and nothing visible appears.

**Root Cause:** The dropdown is positioned `absolute bottom-full` (opens upward) inside a `<form>` with class `specimen-card`. The `specimen-card` class likely has `overflow: hidden` or the dropdown is clipped by a parent container.

**Fix Options (pick the cleanest):**
- Option A: Use a React Portal (`createPortal`) to render the dropdown at the document body level
- Option B: Add `overflow: visible` to the form/parent containers
- Option C: Use `position: fixed` with calculated coordinates based on the button's `getBoundingClientRect()`

**Also:** The dropdown has a backdrop overlay at `z-40` and dropdown at `z-50`. Make sure these z-indices are higher than everything else on the page including the sidebar (which is `z-50` in its overlay). Bump dropdown to `z-[60]` and backdrop to `z-[55]` if needed.

**Current dropdown code is at `SpellBar.tsx` line 119-173.** Read the file carefully before fixing.

---

### Task 2: Update Model List to Match Our ACTUAL Available Models
**Current models in SpellBar.tsx (line 46-50) are WRONG:**
```tsx
const models = [
  { id: "google/gemini-2.5-flash-lite", name: "Eco", ... },
  { id: "anthropic/claude-haiku-4.5", name: "Balanced", ... },
  { id: "openai/gpt-5.2", name: "Power", ... },  // ← We don't use OpenAI!
];
```

**Replace with models we ACTUALLY have on Vertex AI:**
```tsx
const models = [
  { id: "gemini-2.0-flash", name: "Eco Flash", icon: Leaf, description: "Fastest · Cheapest · Green Regions", color: "text-moss", power: "low" },
  { id: "gemini-2.5-pro", name: "Gemini Pro", icon: Zap, description: "Balanced Reasoning", color: "text-topaz", power: "medium" },
  { id: "claude-sonnet-4", name: "Claude Sonnet", icon: Zap, description: "Strong Analysis", color: "text-miami", power: "medium" },
  { id: "claude-opus-4-6", name: "Claude Opus", icon: Flame, description: "Maximum Power", color: "text-witchberry", power: "high" },
];
```

**Also update `sorcer-app/lib/ai/models.ts`** to match. The `chatModels` array and `DEFAULT_CHAT_MODEL` must reflect our Vertex AI models, not Vercel AI Gateway models.

---

### Task 3: Wire Up the Carbon-Aware Chat Flow (THE BIG ONE)

This is the core integration. There are TWO viable architectures. **Pick the one you can ship fastest:**

#### Architecture A: "Backend Does Everything" (Recommended for Hackathon)
The Python backend handles the full LLM call. Frontend just sends prompt, gets response.

**Flow:**
1. User types prompt → SpellBar submits
2. Frontend calls `POST /orchestrate` on the Python backend with `{ prompt, user_id: "anon", project_id: "hackathon", is_urgent: false }`
3. Backend compresses → classifies → picks greenest region/model → calls LLM → returns `{ response, receipt_id, eco_stats }`
4. Frontend displays the response in a chat-like UI
5. Frontend calls `GET /receipt/{receipt_id}` to show carbon stats

**What to change:**
- In `page.tsx`: Replace `handleSpellSubmit` to call `postOrchestrate()` from `utils/api.ts` directly instead of the oracle + redirect dance
- Show the response on the same page (or a new lightweight chat view) — you do NOT need the full Vercel AI SDK streaming for this
- Display eco_stats (CO₂ saved, region used, model used) in a beautiful card below the response
- The response won't stream (it returns all at once) — that's fine for a hackathon demo

**OR**

#### Architecture B: "Backend as Advisor" (Keeps Streaming but More Complex)
Backend only advises on routing. Frontend still calls Vercel AI Gateway for the actual LLM stream.

**Flow:**
1. User types prompt → SpellBar submits
2. Frontend calls Python backend `POST /orchestrate` BUT the backend is modified to return routing advice without calling the LLM
3. Backend returns `{ recommended_model: "gemini-2.0-flash", region: "northamerica-northeast1", cfe_percent: 98, reason: "..." }`
4. Frontend maps the Vertex AI model ID to a Vercel AI Gateway ID
5. Frontend uses `useChat` with the mapped model ID for streaming
6. Frontend displays the carbon stats alongside

**This requires:**
- A new lightweight endpoint in the backend (or modifying orchestrator behavior) — but you can't add new backend files
- A model ID mapping table on the frontend
- More complex state management

**My recommendation:** Go with **Architecture A** for the hackathon. A complete response with carbon stats is a better demo than streaming without stats. You can always add streaming polish later.

---

### Task 3A: Implement Architecture A (If You Chose It)

**Modify `sorcer-app/app/page.tsx`:**

Replace the current `handleSpellSubmit` function. Instead of the oracle → redirect → chat flow, do:

```tsx
const [chatResponse, setChatResponse] = useState<string | null>(null);
const [ecoStats, setEcoStats] = useState<any>(null);
const [receipt, setReceipt] = useState<any>(null);

const handleSpellSubmit = async () => {
  const prompt = input.trim();
  if (!prompt || status !== "ready") return;
  setStatus("submitted");
  setChatResponse(null);
  setEcoStats(null);
  
  try {
    // Call the Python backend's carbon-aware orchestrator
    const result = await postOrchestrate({
      prompt,
      user_id: "anonymous-sorcerer",
      project_id: "hackathon-demo",
      is_urgent: mode === "manual", // manual = urgent, auto = let backend optimize
    });
    
    setChatResponse(result.response);
    setEcoStats(result.eco_stats);
    
    // Fetch the carbon receipt for detailed stats
    if (result.receipt_id) {
      const receiptData = await getReceipt(result.receipt_id);
      setReceipt(receiptData);
    }
    
    setStatus("ready");
  } catch (e) {
    console.error("Orchestration failed:", e);
    setStatus("error");
  }
};
```

**Add a response display section** below the SpellBar on the homepage:

```tsx
{chatResponse && (
  <div className="mt-8 specimen-card p-6 text-left">
    <div className="flex items-center gap-2 mb-4">
      <Sparkles className="w-4 h-4 text-moss" />
      <h3 className="text-sm font-semibold text-oak">Oracle Response</h3>
    </div>
    <div className="prose prose-sm text-oak/80 leading-relaxed whitespace-pre-wrap">
      {chatResponse}
    </div>
    
    {/* Carbon Receipt Card */}
    {ecoStats && (
      <div className="mt-4 p-4 rounded-xl bg-moss/5 border border-moss/15">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="w-3.5 h-3.5 text-moss" />
          <span className="text-xs font-semibold text-moss">Carbon Receipt</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-moss">{ecoStats.co2_saved_grams?.toFixed(1) || '0.0'}g</p>
            <p className="text-[10px] text-oak/40">CO₂ Saved</p>
          </div>
          <div>
            <p className="text-lg font-bold text-oak">{receipt?.model_used || 'auto'}</p>
            <p className="text-[10px] text-oak/40">Model Used</p>
          </div>
          <div>
            <p className="text-lg font-bold text-topaz">{receipt?.server_location || 'optimized'}</p>
            <p className="text-[10px] text-oak/40">Region</p>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

**Import `postOrchestrate` and `getReceipt`** from `@/utils/api` in `page.tsx`.

---

### Task 4: Update `llm_client.py` — Add Robustness (ONLY backend file you touch)

The current `llm_client.py` works but needs hardening for the demo:

```python
# backend/eco_orchestrator/core/llm_client.py

import os
import subprocess
import logging
import vertexai
import requests
from vertexai.generative_models import GenerativeModel
from anthropic import AnthropicVertex
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.default_region = os.getenv("DEFAULT_VERTEX_REGION", "us-central1")
        if not self.project_id:
            logger.warning("GOOGLE_CLOUD_PROJECT not set — LLM calls will fail")

    def _get_access_token(self) -> str:
        """Get a fresh access token via gcloud CLI."""
        try:
            return subprocess.check_output(
                ["gcloud", "auth", "print-access-token"],
                timeout=10,
            ).decode().strip()
        except Exception as e:
            logger.error(f"Failed to get access token: {e}")
            raise RuntimeError("Could not authenticate with Google Cloud. Run: gcloud auth login") from e

    async def generate(self, prompt: str, model_id: str, location: str = None) -> str:
        """
        Route to the correct provider based on model_id prefix.
        The `location` parameter is chosen by the carbon-aware router.
        """
        location = location or self.default_region
        logger.info(f"LLM call: model={model_id}, region={location}")

        try:
            if model_id.startswith("gemini"):
                return await self._call_gemini(prompt, model_id, location)
            elif model_id.startswith("claude"):
                return await self._call_claude(prompt, model_id, location)
            elif model_id.startswith("meta/") or model_id.startswith("mistral/"):
                return self._call_vertex_openapi(prompt, model_id, location)
            else:
                # Fallback: try as Gemini model
                logger.warning(f"Unknown model prefix '{model_id}', falling back to Gemini")
                return await self._call_gemini(prompt, model_id, location)
        except Exception as e:
            logger.error(f"LLM call failed for {model_id} in {location}: {e}")
            raise

    async def _call_gemini(self, prompt: str, model_id: str, location: str) -> str:
        vertexai.init(project=self.project_id, location=location)
        model = GenerativeModel(model_id)
        response = await model.generate_content_async(prompt)
        return response.text

    async def _call_claude(self, prompt: str, model_id: str, location: str) -> str:
        client = AnthropicVertex(region=location, project_id=self.project_id)
        response = client.messages.create(
            model=model_id,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def _call_vertex_openapi(self, prompt: str, model_id: str, location: str) -> str:
        """Llama, Mistral via Vertex AI OpenAPI-compatible chat completions endpoint."""
        token = self._get_access_token()
        endpoint = f"https://{location}-aiplatform.googleapis.com"
        url = (
            f"{endpoint}/v1/projects/{self.project_id}"
            f"/locations/{location}/endpoints/openapi/chat/completions"
        )
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_id,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096,
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    # Backwards-compatible alias used by orchestrator.py
    async def raw_llm_generate(self, prompt: str, model_name: str) -> str:
        return await self.generate(prompt, model_name)
```

**Key improvements over current version:**
- Added logging so we can see which model + region is being used in the demo
- Added error handling with clear messages
- Added timeout to gcloud auth subprocess
- Added fallback for unknown model prefixes
- Added support for `mistral/` prefix (not just `meta/`)
- Warning if `GOOGLE_CLOUD_PROJECT` is not set

---

### Task 5: Make the Orchestrator Use Carbon-Aware Routing

**IMPORTANT: You cannot modify `orchestrator.py` directly.** But you CAN observe that `orchestrator.py` line 47 currently hardcodes:
```python
tier = "gemini-2.0-flash"  # cheapest (new API)
```
And line 64:
```python
raw_response = await self.client.generate(comp["compressed_text"], tier)
```

This means the orchestrator calls `client.generate(prompt, "gemini-2.0-flash")` without specifying a `location` — so it defaults to `self.default_region` (from env var `DEFAULT_VERTEX_REGION`, defaulting to `us-central1`).

**For the hackathon demo, this actually WORKS.** The backend will call Gemini Flash in the configured default region. To demonstrate carbon-aware routing, just make sure the `.env` has:
```
DEFAULT_VERTEX_REGION=northamerica-northeast1
```
This routes to Montréal (98% CFE) — the greenest region.

**If you want to be fancy:** In `llm_client.py` (the one file you CAN touch), you could add logic to the `generate()` method that loads `server_model_map.json` and picks the greenest region automatically. But this is optional polish — the demo works without it.

---

### Task 6: Frontend Polish — Senior Engineer Touches

#### 6a. Show Backend Connection Status
The homepage already has a backend status check (`backendOnline` state). Make sure it actually reflects the Python backend at `http://localhost:8000/health`, not just any health check. Currently `getHealth()` in `utils/api.ts` hits `/health` which IS the correct endpoint.

#### 6b. Improve Error States
If `/orchestrate` fails (backend down, LLM quota exceeded, etc.), show a useful error:
```tsx
{status === "error" && (
  <div className="mt-4 specimen-card p-4 border-witchberry/20 bg-witchberry/5">
    <p className="text-sm text-witchberry">
      The Oracle encountered an error. Make sure the backend is running: 
      <code className="text-xs bg-witchberry/10 px-1 rounded">cd backend/eco_orchestrator && uvicorn app.main:app --reload --port 8000</code>
    </p>
  </div>
)}
```

#### 6c. Loading State for Orchestration
The `/orchestrate` call takes 2-10 seconds (LLM generation). Show a beautiful loading state:
- Pulsing moss-colored orb
- Text like "The Oracle is consulting the greenest servers..."
- Maybe show which region it's connecting to

#### 6d. Clear the Input After Submit
Make sure `setInput("")` is called after successful submission.

#### 6e. Environment Variables
Ensure `sorcer-app/.env.local` has:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000
```
Both are used by different API client files (`utils/api.ts` uses `NEXT_PUBLIC_BACKEND_URL`, `lib/backendApi.ts` uses `NEXT_PUBLIC_BACKEND_BASE_URL`).

---

## 🗂 Reference: Backend Endpoints (READ-ONLY)

| Method | Path | What It Does |
|---|---|---|
| `POST` | `/orchestrate` | **THE MAIN ONE** — Send prompt, get carbon-optimized response |
| `GET` | `/health` | Health check |
| `GET` | `/receipt/{id}` | Get carbon receipt for a past request |
| `GET` | `/analytics/nutrition/{id}` | Detailed energy breakdown |
| `POST` | `/analyze/prompt` | Pre-check prompt complexity (stub) |
| `GET` | `/grid/map` | Grid carbon data (stub) |
| `GET` | `/budget/status/{project_id}` | Carbon budget (stub) |
| `GET` | `/leaderboard` | Team rankings (stub) |
| `GET` | `/user/{id}/summary` | User dashboard data (stub) |
| `POST` | `/bypass` | Direct LLM call, no eco routing |

### `/orchestrate` Request/Response:
```json
// REQUEST
{
  "prompt": "What is photosynthesis?",
  "user_id": "anonymous-sorcerer",
  "project_id": "hackathon-demo",
  "is_urgent": false
}

// RESPONSE (success)
{
  "status": "complete",
  "chat_id": "anonymous-sorcerer_uuid",
  "response": "Photosynthesis is the process by which...",
  "receipt_id": "rec_140234567890",
  "deferred": false,
  "eco_stats": {
    "original_tokens": 45,
    "final_tokens": 38,
    "co2_saved_grams": 2.4,
    "baseline_co2": 4.2,
    "actual_co2": 1.8
  }
}

// RESPONSE (deferred — grid too dirty)
{
  "status": "deferred",
  "chat_id": "anonymous-sorcerer_uuid",
  "response": "",
  "deferred": true,
  "task_id": "42",
  "message": "Queued for green window."
}
```

---

## 🗺 Reference: Available Models by Region (from `server_model_map.json`)

| Region | CFE% | Tier | Models Available |
|---|---|---|---|
| `northamerica-northeast1` (Montréal) | 98% | 🟢 Green | Gemini 2.5 Flash, Gemini 2.5 Pro |
| `europe-north1` (Finland) | 97% | 🟢 Green | Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Gemini 2.5 Flash/Pro |
| `us-west1` (Oregon) | 89% | 🟢 Green | Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Gemini 2.5 Flash/Pro |
| `europe-west1` (Belgium) | 81% | 🟢 Green | Gemini + Claude Sonnet 4, Claude Opus 4.6 |
| `europe-west4` (Netherlands) | 80% | 🟢 Green | Gemini only |
| `us-central1` (Iowa) | 59% | 🟡 Mixed | Gemini only (in current JSON) |
| `us-east5` (Ohio) | 30% | 🔴 Dirty | Gemini + Claude + Llama 4 |
| `us-east4` (Virginia) | 34% | 🔴 Dirty | Gemini only |
| `us-west4` (Vegas) | 22% | 🔴 Dirty | Gemini only |

---

## ✅ Definition of Done

- [ ] Test page (`/test`) is gone
- [ ] Test router is removed from backend `main.py`
- [ ] SpellBar dropdown is VISIBLE and functional when clicked
- [ ] Model list reflects our actual Vertex AI models (no OpenAI/GPT)
- [ ] Typing a prompt and pressing Enter calls `POST /orchestrate` on the Python backend
- [ ] Response displays in a clean card on the homepage
- [ ] Carbon stats (CO₂ saved, region, model) display below the response
- [ ] Error state shown if backend is offline
- [ ] Loading state shown during LLM generation
- [ ] `llm_client.py` has logging and error handling
- [ ] App doesn't crash if backend is unreachable

---

## 🚀 How to Test

1. **Start the backend:**
```bash
cd backend/eco_orchestrator
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

2. **Start the frontend:**
```bash
cd sorcer-app
npm run dev
```

3. **Verify backend health:** `curl http://localhost:8000/health` → `{"status":"ok"}`

4. **Test the flow:** Open `http://localhost:3000`, type "What is carbon trading?", press Enter. You should see:
   - Loading state appears
   - Response from Gemini appears in a card
   - Carbon receipt shows CO₂ saved, region used, model used
   - No console errors

5. **Test dropdown:** Click the model selector pill in the SpellBar. Dropdown should appear ABOVE the input, fully visible.

