"""
Advanced caching service with multiple strategies.
"""
import json
import hashlib
from typing import Any, Optional, Union, List, Dict, Callable
from datetime import datetime, timedelta
from functools import wraps
import asyncio

from app.redis_client import redis_client
from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class CacheService:
    """
    Advanced caching service with TTL, invalidation, and warming strategies.
    """
    
    def __init__(self):
        self.redis = redis_client
        self.default_ttl = settings.CACHE_TTL_DEFAULT
        
        # Cache namespaces
        self.namespaces = {
            "texts": settings.CACHE_TTL_TEXTS,
            "translations": settings.CACHE_TTL_TRANSLATIONS,
            "audio": settings.CACHE_TTL_AUDIO,
            "api_responses": settings.CACHE_TTL_DEFAULT,
            "user_data": 3600,  # 1 hour
            "search_results": 1800,  # 30 minutes
        }
    
    def _generate_key(self, namespace: str, *args, **kwargs) -> str:
        """Generate cache key from namespace and arguments."""
        # Combine args and kwargs into a single string
        key_parts = [str(arg) for arg in args]
        key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
        key_string = "|".join(key_parts)
        
        # Create hash for long keys
        if len(key_string) > 200:
            key_hash = hashlib.md5(key_string.encode()).hexdigest()
            return f"{namespace}:{key_hash}"
        
        return f"{namespace}:{key_string}"
    
    async def get(
        self,
        namespace: str,
        key: Union[str, List[str]],
        deserialize: bool = True
    ) -> Optional[Any]:
        """Get value from cache."""
        cache_key = self._generate_key(namespace, key) if isinstance(key, str) else key
        
        try:
            if deserialize:
                return await self.redis.get_json(cache_key)
            else:
                return await self.redis.get(cache_key)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(
        self,
        namespace: str,
        key: Union[str, List[str]],
        value: Any,
        ttl: Optional[int] = None,
        serialize: bool = True
    ) -> bool:
        """Set value in cache."""
        cache_key = self._generate_key(namespace, key) if isinstance(key, str) else key
        ttl = ttl or self.namespaces.get(namespace, self.default_ttl)
        
        try:
            if serialize:
                return await self.redis.set_json(cache_key, value, expire=ttl)
            else:
                return await self.redis.set(cache_key, value, expire=ttl)
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, namespace: str, key: Union[str, List[str]]) -> bool:
        """Delete value from cache."""
        cache_key = self._generate_key(namespace, key) if isinstance(key, str) else key
        
        try:
            result = await self.redis.delete(cache_key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern."""
        try:
            return await self.redis.delete_pattern(pattern)
        except Exception as e:
            logger.error(f"Pattern invalidation error: {e}")
            return 0
    
    async def get_or_set(
        self,
        namespace: str,
        key: str,
        func: Callable,
        ttl: Optional[int] = None,
        force_refresh: bool = False
    ) -> Any:
        """Get from cache or compute and set."""
        if not force_refresh:
            cached = await self.get(namespace, key)
            if cached is not None:
                return cached
        
        # Compute value
        if asyncio.iscoroutinefunction(func):
            value = await func()
        else:
            value = func()
        
        # Cache the result
        if value is not None:
            await self.set(namespace, key, value, ttl)
        
        return value
    
    async def batch_get(
        self,
        namespace: str,
        keys: List[str]
    ) -> Dict[str, Any]:
        """Get multiple values from cache."""
        cache_keys = [self._generate_key(namespace, key) for key in keys]
        results = {}
        
        for i, cache_key in enumerate(cache_keys):
            value = await self.redis.get_json(cache_key)
            if value is not None:
                results[keys[i]] = value
        
        return results
    
    async def batch_set(
        self,
        namespace: str,
        items: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> int:
        """Set multiple values in cache."""
        ttl = ttl or self.namespaces.get(namespace, self.default_ttl)
        success_count = 0
        
        for key, value in items.items():
            if await self.set(namespace, key, value, ttl):
                success_count += 1
        
        return success_count
    
    # Decorator for caching function results
    def cached(
        self,
        namespace: str,
        ttl: Optional[int] = None,
        key_func: Optional[Callable] = None
    ):
        """Decorator to cache function results."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                if key_func:
                    cache_key = key_func(*args, **kwargs)
                else:
                    # Default key generation
                    key_parts = [func.__name__]
                    key_parts.extend([str(arg) for arg in args])
                    key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
                    cache_key = "|".join(key_parts)
                
                # Try cache
                cached_value = await self.get(namespace, cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Cache result
                if result is not None:
                    await self.set(namespace, cache_key, result, ttl)
                
                return result
            
            return wrapper
        return decorator
    
    # Tag-based invalidation
    async def tag_set(
        self,
        namespace: str,
        key: str,
        value: Any,
        tags: List[str],
        ttl: Optional[int] = None
    ) -> bool:
        """Set value with tags for group invalidation."""
        # Set the main value
        if not await self.set(namespace, key, value, ttl):
            return False
        
        # Add key to tag sets
        cache_key = self._generate_key(namespace, key)
        for tag in tags:
            tag_key = f"tag:{tag}"
            await self.redis.sadd(tag_key, cache_key)
            # Set expiration on tag set
            await self.redis.expire(tag_key, ttl or self.default_ttl)
        
        return True
    
    async def invalidate_tag(self, tag: str) -> int:
        """Invalidate all keys with a specific tag."""
        tag_key = f"tag:{tag}"
        
        # Get all keys with this tag
        keys = await self.redis.smembers(tag_key)
        
        if not keys:
            return 0
        
        # Delete all tagged keys
        deleted = await self.redis.delete(*keys)
        
        # Delete the tag set
        await self.redis.delete(tag_key)
        
        return deleted
    
    # Cache statistics
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        info = await self.redis._client.info("stats")
        memory = await self.redis._client.info("memory")
        
        # Count keys by namespace
        namespace_counts = {}
        for ns in self.namespaces:
            count = 0
            async for _ in self.redis.scan_iter(match=f"{ns}:*"):
                count += 1
            namespace_counts[ns] = count
        
        return {
            "connected": await self.redis.ping(),
            "total_keys": info.get("db0", {}).get("keys", 0),
            "memory_used": memory.get("used_memory_human", "0"),
            "hit_rate": info.get("keyspace_hit_ratio", 0),
            "evicted_keys": info.get("evicted_keys", 0),
            "namespace_counts": namespace_counts,
            "uptime_seconds": info.get("uptime_in_seconds", 0),
        }


# Global cache service instance
cache_service = CacheService()