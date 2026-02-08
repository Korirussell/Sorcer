import asyncio
import json
import os
import subprocess
from pathlib import Path

import requests
import vertexai
from vertexai.generative_models import GenerativeModel
from anthropic import AnthropicVertex
from loguru import logger

# Load server model map once at module level
_MAP_PATH = Path(__file__).resolve().parent.parent / "server_model_map.json"
try:
    with open(_MAP_PATH) as _f:
        SERVER_MODEL_MAP: dict = json.load(_f)
except FileNotFoundError:
    logger.warning(f"server_model_map.json not found at {_MAP_PATH}")
    SERVER_MODEL_MAP = {}


class LLMClient:
    """Multi-provider, region-aware LLM client.

    Routes to the correct SDK based on model prefix:
      gemini*  → Vertex AI GenerativeModel
      claude*  → AnthropicVertex
      meta/*   → Vertex AI OpenAPI (chat/completions)
    """

    DEFAULT_REGION = "us-central1"
    DEFAULT_MODEL = "gemini-2.0-flash"

    def __init__(self):
        self._project = os.getenv("GOOGLE_CLOUD_PROJECT", "sorcer-hackathon")
        self._default_location = os.getenv("VERTEX_LOCATION",
                                           os.getenv("DEFAULT_VERTEX_REGION", "us-central1"))
        try:
            vertexai.init(project=self._project, location=self._default_location)
            logger.info(f"✓ Vertex AI SDK initialized (project={self._project}, location={self._default_location})")
        except Exception as e:
            logger.warning(f"✗ Vertex AI init failed: {e}")

    # ------------------------------------------------------------------
    # Provider dispatch
    # ------------------------------------------------------------------

    async def generate(self, prompt: str, model_name: str, location: str | None = None) -> str:
        """Generate a response, routing to the correct provider."""
        resolved = self._resolve_model(model_name, location)
        loc = location or self._default_location
        logger.info(f"LLM generate | model={resolved} | region={loc} | prompt_len={len(prompt)}")

        if resolved.startswith("claude"):
            return await self._call_claude(prompt, resolved, loc)
        elif resolved.startswith("meta/"):
            return await self._call_openapi(prompt, resolved, loc)
        else:
            return await self._call_gemini(prompt, resolved, loc)

    async def raw_llm_generate(self, prompt: str, model_name: str) -> str:
        """Direct call without carbon-aware routing (bypass mode)."""
        return await self.generate(prompt, model_name)

    # ------------------------------------------------------------------
    # Gemini (Vertex AI native SDK)
    # ------------------------------------------------------------------

    async def _call_gemini(self, prompt: str, model_id: str, location: str) -> str:
        try:
            if location != self._default_location:
                vertexai.init(project=self._project, location=location)

            model = GenerativeModel(model_id)
            response = await asyncio.to_thread(lambda: model.generate_content(prompt))

            if location != self._default_location:
                vertexai.init(project=self._project, location=self._default_location)

            return response.text
        except Exception as e:
            logger.error(f"Gemini call failed ({model_id}@{location}): {e}")
            raise RuntimeError(f"LLM generation failed: {e}") from e

    # ------------------------------------------------------------------
    # Claude (Anthropic on Vertex AI)
    # ------------------------------------------------------------------

    async def _call_claude(self, prompt: str, model_id: str, location: str) -> str:
        try:
            client = AnthropicVertex(region=location, project_id=self._project)
            response = await asyncio.to_thread(
                lambda: client.messages.create(
                    model=model_id,
                    max_tokens=4096,
                    messages=[{"role": "user", "content": prompt}],
                )
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude call failed ({model_id}@{location}): {e}")
            raise RuntimeError(f"LLM generation failed: {e}") from e

    # ------------------------------------------------------------------
    # Meta / Llama (Vertex AI OpenAPI chat completions)
    # ------------------------------------------------------------------

    def _get_access_token(self) -> str:
        return subprocess.check_output(
            ["gcloud", "auth", "print-access-token"]
        ).decode().strip()

    async def _call_openapi(self, prompt: str, model_id: str, location: str) -> str:
        try:
            token = self._get_access_token()
            url = (
                f"https://{location}-aiplatform.googleapis.com"
                f"/v1/projects/{self._project}"
                f"/locations/{location}/endpoints/openapi/chat/completions"
            )
            payload = {
                "model": model_id,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            }
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
            resp = await asyncio.to_thread(
                lambda: requests.post(url, json=payload, headers=headers, timeout=60)
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"OpenAPI call failed ({model_id}@{location}): {e}")
            raise RuntimeError(f"LLM generation failed: {e}") from e

    # ------------------------------------------------------------------
    # Region / model helpers
    # ------------------------------------------------------------------

    def get_available_models(self, region: str | None = None) -> list[dict]:
        """Return models available in a region (or all regions if None)."""
        if not region:
            seen = {}
            for rdata in SERVER_MODEL_MAP.values():
                for m in rdata.get("available_models", []):
                    mid = m["id"]
                    if mid not in seen:
                        seen[mid] = {"model_id": mid, "provider": m["provider"], "power_level": m["power_level"]}
            return list(seen.values())
        rdata = SERVER_MODEL_MAP.get(region, {})
        return [{"model_id": m["id"], "provider": m["provider"], "power_level": m["power_level"]}
                for m in rdata.get("available_models", [])]

    def _resolve_model(self, model_name: str, location: str | None = None) -> str:
        """Pick the best model for the given region, falling back gracefully."""
        if not location:
            return model_name

        rdata = SERVER_MODEL_MAP.get(location, {})
        available = rdata.get("available_models", [])

        # Exact match
        for m in available:
            if m["id"] == model_name:
                return model_name

        # Same power level
        target_power = None
        for rd in SERVER_MODEL_MAP.values():
            for m in rd.get("available_models", []):
                if m["id"] == model_name:
                    target_power = m["power_level"]
                    break
            if target_power:
                break

        if target_power:
            for m in available:
                if m["power_level"] == target_power:
                    logger.warning(f"Model {model_name} unavailable in {location}, using {m['id']} (same power)")
                    return m["id"]

        # Any model in region
        if available:
            fb = available[0]["id"]
            logger.warning(f"Model {model_name} unavailable in {location}, fallback → {fb}")
            return fb

        return model_name