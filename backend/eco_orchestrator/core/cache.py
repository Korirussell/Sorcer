"""Cache helpers for the project.

This module exposes:
- hash-based exact-match cache helpers using the RedisCache wrapper
- optional semantic (vector) cache helpers if `redisvl` is installed
- unified helper functions `check_if_prompt_is_in_cache` and `add_prompt_to_cache`

The module is defensive: semantic functionality is no-op when the
`redisvl` library isn't present.
"""
import os
import hashlib
from typing import Optional, Any

from core.redis import RedisCache

try:
    from redisvl.extensions.llmcache import SemanticCache
    from redisvl.utils.vectorize import HFTextVectorizer
except Exception:
    SemanticCache = None
    HFTextVectorizer = None


# Configuration (override via env)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
DEFAULT_TTL = int(os.getenv("CACHE_TTL", 3600))
REDIS_URL = os.getenv("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}")


# Instantiate a module-level key/value cache (optional: app starts even if Redis is down).
try:
    kv_cache = RedisCache(host=REDIS_HOST, port=REDIS_PORT, default_ttl=DEFAULT_TTL)
except Exception:
    kv_cache = None


# Optional semantic cache (may remain None if `redisvl` not installed)
llmcache = None
if SemanticCache is not None and HFTextVectorizer is not None:
    try:
        llmcache = SemanticCache(
            name="prompt_cache",
            redis_url=REDIS_URL,
            distance_threshold=0.1,
            vectorizer=HFTextVectorizer("sentence-transformers/all-MiniLM-L6-v2"),
        )
    except Exception:
        llmcache = None


# -----------------------------
# Helpers: normalization & hashing
# -----------------------------


def normalize_prompt(prompt: str) -> str:
    """Normalize prompt text for hashing/comparison."""
    p = prompt.strip().lower()
    return " ".join(p.split())


def prompt_hash(prompt: str) -> str:
    """Return a stable hash for a prompt."""
    normalized = normalize_prompt(prompt)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


# -----------------------------
# Hash-based cache API
# -----------------------------


def check_hash_cache(prompt: str) -> Optional[Any]:
    """Return cached value for exact prompt match (normalized/hash) or None."""
    if kv_cache is None:
        return None
    key = f"prompt:hash:{prompt_hash(prompt)}"
    return kv_cache.get(key)


def add_hash_cache(prompt: str, output: Any, ttl: Optional[int] = None) -> bool:
    """Add prompt->output to the exact-match KV cache."""
    if kv_cache is None:
        return False
    key = f"prompt:hash:{prompt_hash(prompt)}"
    return kv_cache.set(key, output, ttl=ttl)


# -----------------------------
# Semantic cache API (optional)
# -----------------------------


def check_semantic_cache(prompt: str) -> Optional[Any]:
    """Look for semantically similar cached outputs (if available).

    Returns None when semantic backend isn't available.
    """
    if llmcache is None:
        return None

    try:
        # API for redisvl/llmcache may vary between versions. Try common names.
        if hasattr(llmcache, "query"):
            hits = llmcache.query(prompt, top_k=1)
        elif hasattr(llmcache, "search"):
            hits = llmcache.search(prompt, k=1)
        else:
            return None

        if not hits:
            return None

        hit = hits[0]
        if isinstance(hit, dict) and "value" in hit:
            return hit["value"]
        return hit
    except Exception:
        return None


def add_semantic_cache(prompt: str, output: Any) -> bool:
    """Add a prompt->output pair to the semantic cache if available."""
    if llmcache is None:
        return False
    try:
        if hasattr(llmcache, "add"):
            llmcache.add(prompt, output)
            return True
        if hasattr(llmcache, "upsert"):
            llmcache.upsert(prompt, output)
            return True
        if hasattr(llmcache, "insert"):
            llmcache.insert(prompt, output)
            return True
    except Exception:
        return False
    return False


# -----------------------------
# Unified API
# -----------------------------


def check_if_prompt_is_in_cache(prompt: str, semantic_fallback: bool = True) -> Optional[Any]:
    """Check exact (hash) cache first, then semantic cache if enabled."""
    out = check_hash_cache(prompt)
    if out is not None:
        return out
    if semantic_fallback:
        return check_semantic_cache(prompt)
    return None


def add_prompt_to_cache(prompt: str, output: Any, use_semantic: bool = True, ttl: Optional[int] = None) -> None:
    """Add prompt to both exact hash cache and (optionally) semantic cache. No-op if Redis is down."""
    if kv_cache is None:
        return
    add_hash_cache(prompt, output, ttl=ttl)
    if use_semantic:
        add_semantic_cache(prompt, output)