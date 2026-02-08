# Vertex AI Setup Guide for Backend

## What You Need

The `llm_client.py` routes to **3 providers**, all through Google Cloud's Vertex AI:

| Provider | Models | SDK |
|----------|--------|-----|
| **Google Gemini** | `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-pro` | `vertexai` (native) |
| **Anthropic Claude** | `claude-sonnet-4`, `claude-opus-4-6` | `anthropic[vertex]` (AnthropicVertex) |
| **Meta Llama** | `meta/llama-4-scout-17b-16e-instruct-maas`, `meta/llama-4-maverick-17b-128e-instruct-maas` | REST via Vertex AI OpenAPI endpoint |

All three use the **same GCP project and service account**. No separate API keys needed.

---

## 1. Environment Variables

Create a `.env` file in `backend/eco_orchestrator/`:

```env
GOOGLE_CLOUD_PROJECT=sorcer-hackathon
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
DEFAULT_VERTEX_REGION=us-central1
```

That's it. The `llm_client.py` reads these on startup.

---

## 2. Service Account File

You need the `service-account.json` file placed at `backend/eco_orchestrator/service-account.json`.

**Get it from Kori** — it's the service account key for `sorcer-router@sorcer-hackathon.iam.gserviceaccount.com`.

The file looks like:
```json
{
  "type": "service_account",
  "project_id": "sorcer-hackathon",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "sorcer-router@sorcer-hackathon.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**DO NOT commit this file to git.** It's in `.gitignore`.

---

## 3. Python Dependencies

```bash
cd backend/eco_orchestrator
pip install vertexai anthropic[vertex] requests python-dotenv loguru
```

Or from `requirements.txt`:
```bash
pip install -r requirements.txt
```

---

## 4. gcloud CLI (Required for Meta/Llama only)

The Meta/Llama models use the Vertex AI OpenAPI endpoint which needs a bearer token. The client gets this via:

```bash
gcloud auth print-access-token
```

So you need:
1. Install [gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. Authenticate with the service account:
   ```bash
   gcloud auth activate-service-account \
     sorcer-router@sorcer-hackathon.iam.gserviceaccount.com \
     --key-file=./service-account.json \
     --project=sorcer-hackathon
   ```

If you only need Gemini and Claude, you can skip this step — those use the SDK directly.

---

## 5. GCP APIs That Must Be Enabled

In the [Google Cloud Console](https://console.cloud.google.com/apis/library?project=sorcer-hackathon), make sure these are enabled:

- **Vertex AI API** (`aiplatform.googleapis.com`) — required for all models
- **Generative Language API** (`generativelanguage.googleapis.com`) — Gemini

These should already be enabled on the `sorcer-hackathon` project.

---

## 6. How `llm_client.py` Works

```
generate(prompt, model_name, location)
    │
    ├── model starts with "gemini"  → _call_gemini()  → vertexai SDK
    ├── model starts with "claude"  → _call_claude()  → AnthropicVertex SDK
    └── model starts with "meta/"   → _call_openapi() → REST POST to Vertex AI
```

The `location` parameter is the GCP region (e.g. `us-central1`, `europe-west1`). This is chosen by the carbon-aware router based on grid cleanliness. The client re-initializes the SDK for the target region before each call.

---

## 7. Quick Test

```python
import asyncio
from core.llm_client import LLMClient

client = LLMClient()

async def test():
    # Gemini
    r = await client.generate("Say hi", "gemini-2.0-flash", "us-central1")
    print("Gemini:", r)

    # Claude
    r = await client.generate("Say hi", "claude-sonnet-4", "europe-west1")
    print("Claude:", r)

    # Llama
    r = await client.generate("Say hi", "meta/llama-4-scout-17b-16e-instruct-maas", "us-east5")
    print("Llama:", r)

asyncio.run(test())
```

Run from `backend/eco_orchestrator/`:
```bash
python -c "$(cat <<'EOF'
# paste the above
EOF
)"
```

---

## 8. Verified Working (Feb 7 2026)

| Model | Region | Status |
|-------|--------|--------|
| `gemini-2.0-flash` | `us-central1` | ✅ |
| `gemini-2.5-flash` | `northamerica-northeast1` | ✅ |
| `claude-sonnet-4` | `europe-west1` | ✅ (429 quota — works, just rate limited) |
| `meta/llama-4-scout-17b-16e-instruct-maas` | `us-east5` | ✅ |

---

## 9. Regions Available

See `server_model_map.json` for the full mapping of regions → models → providers. The carbon router picks the greenest region that has the model tier needed.
