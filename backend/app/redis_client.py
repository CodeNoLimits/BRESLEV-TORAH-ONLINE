"""
Redis client configuration and utilities.
"""
import json
from typing import Any, Optional, Union
from datetime import timedelta

import redis.asyncio as redis
from redis.exceptions import RedisError

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class RedisClient:
    """
    Enhanced Redis client with utility methods.
    """
    
    def __init__(self):
        self._client: Optional[redis.Redis] = None
        self._pubsub: Optional[redis.client.PubSub] = None
    
    async def initialize(self):
        """Initialize Redis connection."""
        try:
            self._client = redis.Redis.from_url(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                decode_responses=settings.REDIS_DECODE_RESPONSES,
                socket_keepalive=True,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30,
            )
            
            # Test connection
            await self._client.ping()
            logger.info("Redis connection established")
            
        except RedisError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def close(self):
        """Close Redis connection."""
        if self._pubsub:
            await self._pubsub.close()
        if self._client:
            await self._client.close()
    
    async def ping(self) -> bool:
        """Test Redis connection."""
        try:
            return await self._client.ping()
        except RedisError:
            return False
    
    # Basic operations
    async def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        return await self._client.get(key)
    
    async def set(
        self,
        key: str,
        value: Union[str, bytes],
        expire: Optional[int] = None
    ) -> bool:
        """Set value with optional expiration."""
        return await self._client.set(key, value, ex=expire)
    
    async def delete(self, *keys: str) -> int:
        """Delete one or more keys."""
        return await self._client.delete(*keys)
    
    async def exists(self, *keys: str) -> int:
        """Check if keys exist."""
        return await self._client.exists(*keys)
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key."""
        return await self._client.expire(key, seconds)
    
    async def ttl(self, key: str) -> int:
        """Get time to live for key."""
        return await self._client.ttl(key)
    
    # JSON operations
    async def get_json(self, key: str) -> Optional[Any]:
        """Get and deserialize JSON value."""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON for key: {key}")
                return None
        return None
    
    async def set_json(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """Serialize and set JSON value."""
        try:
            json_value = json.dumps(value, ensure_ascii=False)
            return await self.set(key, json_value, expire)
        except (TypeError, json.JSONEncodeError) as e:
            logger.error(f"Failed to encode JSON for key {key}: {e}")
            return False
    
    # Hash operations
    async def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field value."""
        return await self._client.hget(name, key)
    
    async def hset(
        self,
        name: str,
        key: Optional[str] = None,
        value: Optional[str] = None,
        mapping: Optional[dict] = None
    ) -> int:
        """Set hash field(s)."""
        return await self._client.hset(name, key, value, mapping)
    
    async def hgetall(self, name: str) -> dict:
        """Get all hash fields and values."""
        return await self._client.hgetall(name)
    
    async def hdel(self, name: str, *keys: str) -> int:
        """Delete hash fields."""
        return await self._client.hdel(name, *keys)
    
    # List operations
    async def lpush(self, key: str, *values: str) -> int:
        """Push values to list head."""
        return await self._client.lpush(key, *values)
    
    async def rpush(self, key: str, *values: str) -> int:
        """Push values to list tail."""
        return await self._client.rpush(key, *values)
    
    async def lrange(self, key: str, start: int, stop: int) -> list:
        """Get list range."""
        return await self._client.lrange(key, start, stop)
    
    async def llen(self, key: str) -> int:
        """Get list length."""
        return await self._client.llen(key)
    
    # Set operations
    async def sadd(self, key: str, *values: str) -> int:
        """Add values to set."""
        return await self._client.sadd(key, *values)
    
    async def srem(self, key: str, *values: str) -> int:
        """Remove values from set."""
        return await self._client.srem(key, *values)
    
    async def smembers(self, key: str) -> set:
        """Get all set members."""
        return await self._client.smembers(key)
    
    async def sismember(self, key: str, value: str) -> bool:
        """Check if value is in set."""
        return await self._client.sismember(key, value)
    
    # Pub/Sub operations
    async def publish(self, channel: str, message: Union[str, dict]) -> int:
        """Publish message to channel."""
        if isinstance(message, dict):
            message = json.dumps(message)
        return await self._client.publish(channel, message)
    
    async def subscribe(self, *channels: str):
        """Subscribe to channels."""
        if not self._pubsub:
            self._pubsub = self._client.pubsub()
        await self._pubsub.subscribe(*channels)
        return self._pubsub
    
    async def unsubscribe(self, *channels: str):
        """Unsubscribe from channels."""
        if self._pubsub:
            await self._pubsub.unsubscribe(*channels)
    
    # Cache helpers
    def make_cache_key(self, prefix: str, *parts: str) -> str:
        """Create cache key from parts."""
        clean_parts = [str(p).replace(":", "_") for p in parts if p]
        return f"{prefix}:{':'.join(clean_parts)}"
    
    async def cache_get_or_set(
        self,
        key: str,
        func,
        expire: Optional[int] = None,
        json_serialize: bool = True
    ):
        """Get from cache or compute and set."""
        # Try to get from cache
        if json_serialize:
            value = await self.get_json(key)
        else:
            value = await self.get(key)
        
        if value is not None:
            return value
        
        # Compute value
        value = await func() if callable(func) else func
        
        # Set in cache
        if value is not None:
            if json_serialize:
                await self.set_json(key, value, expire)
            else:
                await self.set(key, value, expire)
        
        return value
    
    # Pattern operations
    async def scan_iter(
        self,
        match: Optional[str] = None,
        count: Optional[int] = None
    ):
        """Iterate over keys matching pattern."""
        async for key in self._client.scan_iter(match=match, count=count):
            yield key
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        count = 0
        async for key in self.scan_iter(match=pattern):
            await self.delete(key)
            count += 1
        return count


# Global Redis client instance
redis_client = RedisClient()