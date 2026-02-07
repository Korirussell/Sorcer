import os
import sys
import logging
import types

# Provide a lightweight `loguru` fallback so tests can run without installing
# the `loguru` package. The project code only needs `logger.info/debug/error`.
try:
    import loguru  # type: ignore
except Exception:
    mod = types.ModuleType("loguru")

    class _FallbackLogger:
        def __init__(self):
            self._logger = logging.getLogger("loguru_fallback")
            if not self._logger.handlers:
                h = logging.StreamHandler()
                h.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
                self._logger.addHandler(h)
                self._logger.setLevel(logging.INFO)

        def info(self, *args, **kwargs):
            self._logger.info(*args, **kwargs)

        def debug(self, *args, **kwargs):
            self._logger.debug(*args, **kwargs)

        def error(self, *args, **kwargs):
            self._logger.error(*args, **kwargs)

        def warning(self, *args, **kwargs):
            self._logger.warning(*args, **kwargs)

        def exception(self, *args, **kwargs):
            self._logger.exception(*args, **kwargs)

    mod.logger = _FallbackLogger()
    sys.modules["loguru"] = mod

# Ensure the parent package (eco_orchestrator) is importable so we can import `core`.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)
# If the `redis` package isn't installed or is not the expected library,
# provide a minimal in-memory shim so tests can run without external deps.
try:
    import redis  # type: ignore
    _has_redis = hasattr(redis, "Redis") and hasattr(redis, "ConnectionError")
except Exception:
    _has_redis = False

if not _has_redis:
    import time

    redis_mod = types.ModuleType("redis")

    class RedisError(Exception):
        pass

    class ConnectionError(RedisError):
        pass

    class _FakeRedis:
        def __init__(self, *args, **kwargs):
            self._store = {}

        def ping(self):
            return True

        def exists(self, key):
            v = self._store.get(key)
            if v is None:
                return 0
            val, exp = v
            if exp is not None and time.time() > exp:
                del self._store[key]
                return 0
            return 1

        def get(self, key):
            v = self._store.get(key)
            if v is None:
                return None
            val, exp = v
            if exp is not None and time.time() > exp:
                del self._store[key]
                return None
            return val

        def setex(self, key, ttl, value):
            exp = time.time() + int(ttl)
            self._store[key] = (value, exp)

        def set(self, key, value):
            self._store[key] = (value, None)

        def delete(self, key):
            return 1 if self._store.pop(key, None) is not None else 0

        def flushdb(self):
            self._store.clear()

        def keys(self, pattern):
            # naive implementation supporting '*' only
            if pattern == "*":
                return list(self._store.keys())
            return [k for k in self._store.keys() if pattern in k]

        def close(self):
            pass

    redis_mod.Redis = _FakeRedis
    redis_mod.RedisError = RedisError
    redis_mod.ConnectionError = ConnectionError
    sys.modules["redis"] = redis_mod

from core import RedisCache
import core.cache as cache_module


def run() -> int:
    # Use a short TTL for tests
    cache = RedisCache(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", 6379)), default_ttl=5)

    # Ensure Redis is reachable; if not, skip the test gracefully
    try:
        cache.redis_client.ping()
    except Exception as e:
        print("SKIP: Redis not available — test skipped.", str(e))
        return 0

    key = f"test:cache:{cache_module.prompt_hash('Hello World')}"

    # Clean up any prior state
    try:
        cache.delete(key)
    except Exception:
        pass

    # Verify missing key
    got = cache.get(key)
    if got is not None:
        print("FAIL: expected None for missing key, got:", got)
        return 2

    # Set and get a JSON-able value
    ok = cache.set(key, {"value": 123}, ttl=3)
    if not ok:
        print("FAIL: set returned False")
        return 3

    got = cache.get(key)
    if got != {"value": 123}:
        print("FAIL: expected {'value': 123}, got:", got)
        return 4

    print("PASS: KV set/get and JSON (de)serialization works")

    # Clean up
    cache.delete(key)
    cache.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
