"""
Security middleware for FastAPI application.
"""
import time
import uuid
from typing import Callable, Optional
from datetime import datetime, timedelta
import hashlib
import hmac

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings
from app.redis_client import redis_client
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # HSTS (only in production)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # CSP (Content Security Policy)
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.sefaria.org https://generativelanguage.googleapis.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using Redis.
    """
    
    def __init__(self, app, rate_limit: int = 100, window: int = 60):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window = window  # seconds
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier
        client_id = self.get_client_id(request)
        
        # Check rate limit
        if not await self.check_rate_limit(client_id):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": self.window
                },
                headers={
                    "Retry-After": str(self.window),
                    "X-RateLimit-Limit": str(self.rate_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + self.window),
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = await self.get_remaining_requests(client_id)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.window)
        
        return response
    
    def get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting."""
        # Try to get authenticated user ID
        if hasattr(request.state, "user_id"):
            return f"user:{request.state.user_id}"
        
        # Fall back to IP address
        client_host = request.client.host if request.client else "unknown"
        
        # Handle X-Forwarded-For for proxies
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_host = forwarded.split(",")[0].strip()
        
        return f"ip:{client_host}"
    
    async def check_rate_limit(self, client_id: str) -> bool:
        """Check if client has exceeded rate limit."""
        key = f"rate_limit:{client_id}"
        
        try:
            # Increment counter
            count = await redis_client.incr(key)
            
            # Set expiration on first request
            if count == 1:
                await redis_client.expire(key, self.window)
            
            return count <= self.rate_limit
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # Allow request on error
            return True
    
    async def get_remaining_requests(self, client_id: str) -> int:
        """Get remaining requests for client."""
        key = f"rate_limit:{client_id}"
        
        try:
            count = await redis_client.get(key)
            if count:
                remaining = self.rate_limit - int(count)
                return max(0, remaining)
            return self.rate_limit
            
        except Exception:
            return self.rate_limit


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Validate and sanitize incoming requests.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Validate content length
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > settings.UPLOAD_MAX_SIZE:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Request body too large"}
                    )
            except ValueError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid content-length header"}
                )
        
        # Add request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        return response


class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    API key authentication for specific endpoints.
    """
    
    def __init__(self, app, protected_paths: Optional[list] = None):
        super().__init__(app)
        self.protected_paths = protected_paths or ["/api/v1/admin"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if path requires API key
        requires_api_key = any(
            request.url.path.startswith(path) 
            for path in self.protected_paths
        )
        
        if requires_api_key:
            api_key = request.headers.get("X-API-Key")
            
            if not api_key:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "API key required"}
                )
            
            # Validate API key
            if not await self.validate_api_key(api_key):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid API key"}
                )
        
        return await call_next(request)
    
    async def validate_api_key(self, api_key: str) -> bool:
        """Validate API key against stored keys."""
        # Check in Redis
        stored_key = await redis_client.get(f"api_key:{api_key}")
        return stored_key is not None


class RequestSignatureMiddleware(BaseHTTPMiddleware):
    """
    Verify request signatures for webhook endpoints.
    """
    
    def __init__(self, app, webhook_paths: Optional[list] = None):
        super().__init__(app)
        self.webhook_paths = webhook_paths or ["/api/v1/webhooks"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if path requires signature
        requires_signature = any(
            request.url.path.startswith(path) 
            for path in self.webhook_paths
        )
        
        if requires_signature:
            # Get signature header
            signature = request.headers.get("X-Signature")
            
            if not signature:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Signature required"}
                )
            
            # Read request body
            body = await request.body()
            
            # Verify signature
            if not self.verify_signature(body, signature):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid signature"}
                )
            
            # Store body for handler
            request.state.webhook_body = body
        
        return await call_next(request)
    
    def verify_signature(self, body: bytes, signature: str) -> bool:
        """Verify HMAC signature."""
        secret = settings.WEBHOOK_SECRET.encode()
        expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)