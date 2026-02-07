"""
LLM client using google.genai (new SDK). Uses GOOGLE_API_KEY from env.
"""
import os
import asyncio
from loguru import logger

# New unified SDK (replaces deprecated google.generativeai)
from google import genai


def _safe_response_text(response) -> str:
    """Get response text; handle blocked/empty or missing .text."""
    try:
        text = getattr(response, "text", None)
        if text is not None and isinstance(text, str):
            return text.strip() or "[Response empty]"
        return "[Response blocked or unavailable]"
    except Exception:
        return "[Response blocked or unavailable]"


async def _generate_with_retry(client: genai.Client, prompt: str, model_name: str, max_attempts: int = 3) -> str:
    """Call GenAI with backoff on transient/rate-limit errors."""
    last_err = None
    for attempt in range(max_attempts):
        try:
            # New SDK: sync generate_content; run in executor to avoid blocking
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents=prompt,
            )
            return _safe_response_text(response)
        except Exception as e:
            last_err = e
            msg = str(e).lower()
            if attempt < max_attempts - 1 and (
                "resource_exhausted" in msg or "rate" in msg or "503" in msg or "429" in msg or "unavailable" in msg
            ):
                delay = 2 ** attempt
                logger.warning(f"LLM attempt {attempt + 1} failed, retry in {delay}s: {e}")
                await asyncio.sleep(delay)
            else:
                raise
    raise last_err


class LLMClient:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        self._client = genai.Client(api_key=api_key) if api_key else None

    async def generate(self, prompt: str, model_name: str) -> str:
        if not self._client:
            raise RuntimeError("GOOGLE_API_KEY is not set")
        try:
            return await _generate_with_retry(self._client, prompt, model_name)
        except Exception as e:
            logger.error(f"LLM generate failed: {e}")
            raise RuntimeError(f"LLM call failed (check API key and quota): {e}") from e

    async def raw_llm_generate(self, prompt: str, model_name: str) -> str:
        if not self._client:
            raise RuntimeError("GOOGLE_API_KEY is not set")
        try:
            return await _generate_with_retry(self._client, prompt, model_name)
        except Exception as e:
            logger.error(f"LLM raw_llm_generate failed: {e}")
            raise RuntimeError(f"LLM call failed (check API key and quota): {e}") from e
