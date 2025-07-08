"""
Rate limiting utilities using Redis.
"""
import time
from typing import Optional

from app.redis_client import redis_client
from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class RateLimiter:
    """
    Redis-based rate limiter using sliding window.
    """
    
    def __init__(
        self,
        max_requests: int = 100,
        window_seconds: int = 3600,
        key_prefix: str = "rate_limit"
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix
    
    async def is_allowed(
        self,
        identifier: str,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None
    ) -> bool:
        """
        Check if request is allowed for given identifier.
        
        Args:
            identifier: Unique identifier (IP, user ID, etc.)
            max_requests: Override default max requests
            window_seconds: Override default window
            
        Returns:
            True if request is allowed, False if rate limited
        """
        max_reqs = max_requests or self.max_requests
        window = window_seconds or self.window_seconds
        
        # Create unique key for this identifier
        key = redis_client.make_cache_key(
            self.key_prefix,
            identifier,
            str(window)
        )
        
        current_time = int(time.time())
        window_start = current_time - window
        
        try:
            # Use pipeline for atomic operations
            pipe = redis_client._client.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window + 60)  # Extra buffer
            
            results = await pipe.execute()
            
            current_count = results[1]  # Count after cleanup
            
            # Check if under limit
            is_allowed = current_count < max_reqs
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for {identifier}: {current_count}/{max_reqs}")
            
            return is_allowed
            
        except Exception as e:
            logger.error(f"Rate limiter error for {identifier}: {e}")
            # Fail open - allow request if rate limiter fails
            return True
    
    async def get_remaining(
        self,
        identifier: str,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None
    ) -> int:
        """
        Get remaining requests for identifier.
        """
        max_reqs = max_requests or self.max_requests
        window = window_seconds or self.window_seconds
        
        key = redis_client.make_cache_key(
            self.key_prefix,
            identifier,
            str(window)
        )
        
        current_time = int(time.time())
        window_start = current_time - window
        
        try:
            # Clean up and count
            await redis_client._client.zremrangebyscore(key, 0, window_start)
            current_count = await redis_client._client.zcard(key)
            
            return max(0, max_reqs - current_count)
            
        except Exception as e:
            logger.error(f"Error getting remaining for {identifier}: {e}")
            return max_reqs
    
    async def reset(self, identifier: str) -> bool:
        """
        Reset rate limit for identifier.
        """
        key = redis_client.make_cache_key(
            self.key_prefix,
            identifier,
            str(self.window_seconds)
        )
        
        try:
            await redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error resetting rate limit for {identifier}: {e}")
            return False
    
    async def get_stats(self, identifier: str) -> dict:
        """
        Get rate limiting statistics for identifier.
        """
        key = redis_client.make_cache_key(
            self.key_prefix,
            identifier,
            str(self.window_seconds)
        )
        
        current_time = int(time.time())
        window_start = current_time - self.window_seconds
        
        try:
            # Clean up expired entries
            await redis_client._client.zremrangebyscore(key, 0, window_start)
            
            # Get count and timestamps
            current_count = await redis_client._client.zcard(key)
            timestamps = await redis_client._client.zrange(key, 0, -1, withscores=True)
            
            # Calculate reset time
            if timestamps:
                oldest_timestamp = int(timestamps[0][1])
                reset_time = oldest_timestamp + self.window_seconds
            else:
                reset_time = current_time
            
            return {
                "identifier": identifier,
                "current_count": current_count,
                "max_requests": self.max_requests,
                "window_seconds": self.window_seconds,
                "remaining": max(0, self.max_requests - current_count),
                "reset_time": reset_time,
                "reset_in_seconds": max(0, reset_time - current_time),
            }
            
        except Exception as e:
            logger.error(f"Error getting stats for {identifier}: {e}")
            return {
                "identifier": identifier,
                "current_count": 0,
                "max_requests": self.max_requests,
                "window_seconds": self.window_seconds,
                "remaining": self.max_requests,
                "reset_time": current_time,
                "reset_in_seconds": 0,
                "error": str(e),
            }