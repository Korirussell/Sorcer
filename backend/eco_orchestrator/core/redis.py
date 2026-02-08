# ============================================================================
# Redis Cache Wrapper Class
# ============================================================================

import json
from typing import Any, Optional
from loguru import logger

try:
    import redis
    _HAS_REDIS = True
except ImportError:
    _HAS_REDIS = False


class RedisCache:
    """
    A Redis cache wrapper that provides a simple interface for caching
    without needing to worry about the underlying Redis implementation.
    
    This class handles:
    - Checking if a key exists in cache
    - Retrieving values from cache
    - Storing key-value pairs in cache
    - JSON serialization/deserialization for complex types
    
    NOTE: Redis is disabled for now - all operations will be no-ops
    """
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        default_ttl: Optional[int] = None
    ):
        """
        Initialize the Redis cache connection.
        
        Args:
            host: Redis server hostname (default: localhost)
            port: Redis server port (default: 6379)
            db: Redis database number (default: 0)
            password: Redis password if required (default: None)
            default_ttl: Default time-to-live in seconds for cached items (default: None)
        """
        self.default_ttl = default_ttl
        self.redis_client = None
        if _HAS_REDIS:
            try:
                self.redis_client = redis.Redis(
                    host=host,
                    port=port,
                    db=db,
                    password=password,
                    decode_responses=True,
                )
                self.redis_client.ping()
                logger.info(f"✓ Redis connected ({host}:{port})")
            except Exception as e:
                self.redis_client = None
                logger.warning(f"Redis disabled (no-op mode): {e}")
        else:
            logger.info("✓ Redis cache disabled (no-op mode, redis not installed)")
    
    def exists(self, key: str) -> bool:
        """
        Check if a key exists in the cache.
        
        Args:
            key: The cache key to check
            
        Returns:
            True if the key exists, False otherwise
        """
        if self.redis_client is None:
            return False
        try:
            return self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Error checking cache key '{key}': {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve a value from the cache by key.
        
        Args:
            key: The cache key to retrieve
            
        Returns:
            The cached value (deserialized from JSON if applicable),
            or None if the key doesn't exist
        """
        if self.redis_client is None:
            return None
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            
            # Try to deserialize as JSON for complex types
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                # Return as-is if not valid JSON
                return value
        except Exception as e:
            logger.error(f"Error retrieving key '{key}' from cache: {e}")
            return None
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Store a key-value pair in the cache.
        
        Args:
            key: The cache key
            value: The value to cache (will be JSON serialized if possible)
            ttl: Time-to-live in seconds (uses default_ttl if not specified)
            
        Returns:
            True if the operation succeeded, False otherwise
        """
        if self.redis_client is None:
            return False
        try:
            # Serialize value to JSON if it's not a string
            if isinstance(value, str):
                serialized_value = value
            else:
                serialized_value = json.dumps(value)
            
            # Use provided TTL or fall back to default
            cache_ttl = ttl if ttl is not None else self.default_ttl
            
            if cache_ttl is not None:
                self.redis_client.setex(key, cache_ttl, serialized_value)
            else:
                self.redis_client.set(key, serialized_value)
            
            logger.debug(f"✓ Cached key '{key}' (TTL: {cache_ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Error setting cache key '{key}': {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a key from the cache.
        
        Args:
            key: The cache key to delete
            
        Returns:
            True if the key was deleted, False otherwise
        """
        if self.redis_client is None:
            return False
        try:
            deleted = self.redis_client.delete(key)
            return deleted > 0
        except Exception as e:
            logger.error(f"Error deleting cache key '{key}': {e}")
            return False
    
    def clear(self) -> bool:
        """
        Clear all keys from the current database.
        
        Returns:
            True if successful, False otherwise
        """
        if self.redis_client is None:
            return False
        try:
            self.redis_client.flushdb()
            logger.info("✓ Cache cleared")
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    def get_all_keys(self, pattern: str = "*") -> list:
        """
        Get all keys matching a pattern.
        
        Args:
            pattern: Redis key pattern (default: "*" for all keys)
            
        Returns:
            List of keys matching the pattern
        """
        if self.redis_client is None:
            return []
        try:
            return self.redis_client.keys(pattern)
        except Exception as e:
            logger.error(f"Error retrieving keys: {e}")
            return []
    
    def close(self) -> None:
        """Close the Redis connection."""
        if self.redis_client is None:
            return
        try:
            self.redis_client.close()
            logger.info("✓ Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing connection: {e}")

