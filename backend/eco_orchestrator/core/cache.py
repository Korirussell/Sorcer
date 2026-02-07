"""
In-memory cache placeholder. Later: hash cache + semantic (vector) cache.
"""


class cache:
    """Minimal cache so orchestrator can instantiate. Returns None = cache miss."""

    def __init__(self):
        self._hash_store = {}
        self._semantic_store = []

    def check_hash_cache(self, prompt: str):
        """If exact prompt hash is cached, return saved result; else None."""
        key = str(hash(prompt))
        return self._hash_store.get(key)

    def check_semantic_cache(self, prompt: str):
        """Placeholder: no vector DB yet. Returns None."""
        return None

    def check_if_prompt_is_in_cache(self, prompt: str):
        """Check both caches. Return saved result dict or None."""
        out = self.check_hash_cache(prompt)
        if out is not None:
            return out
        return self.check_semantic_cache(prompt)

    def set_hash_cache(self, prompt: str, result: dict):
        """Store result for exact prompt hash."""
        self._hash_store[str(hash(prompt))] = result
