"""
Authentication service with JWT tokens and security features.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
import uuid
import asyncio

from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.user import User, UserCreate, UserRole
from app.models.auth import TokenType, TokenData
from app.config import settings
from app.redis_client import redis_client
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """
    Comprehensive authentication service with security features.
    """
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire = timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        self.refresh_token_expire = timedelta(days=settings.REFRESH_TOKEN_EXPIRATION_DAYS)
    
    # Password hashing
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    # Token generation
    def create_token(
        self,
        data: Dict[str, Any],
        token_type: TokenType,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT token with claims."""
        to_encode = data.copy()
        
        # Set expiration
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        # Add standard claims
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4()),  # Unique token ID
            "token_type": token_type.value,
        })
        
        # Encode token
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def decode_token(self, token: str) -> Optional[TokenData]:
        """Decode and validate JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Check if token is revoked
            jti = payload.get("jti")
            if jti and asyncio.run(self.is_token_revoked(jti)):
                return None
            
            return TokenData(**payload)
            
        except JWTError as e:
            logger.error(f"JWT decode error: {e}")
            return None
    
    # Token management
    async def create_tokens(
        self,
        user: User,
        remember_me: bool = False
    ) -> Tuple[str, str]:
        """Create access and refresh tokens for user."""
        # Token data
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
        
        # Create access token
        access_token = self.create_token(
            token_data,
            TokenType.ACCESS,
            self.access_token_expire
        )
        
        # Create refresh token with longer expiration if remember_me
        refresh_expire = self.refresh_token_expire
        if remember_me:
            refresh_expire = timedelta(days=90)  # 3 months
        
        refresh_token = self.create_token(
            token_data,
            TokenType.REFRESH,
            refresh_expire
        )
        
        # Store refresh token in Redis
        await self.store_refresh_token(user.id, refresh_token)
        
        return access_token, refresh_token
    
    async def store_refresh_token(self, user_id: int, token: str):
        """Store refresh token in Redis."""
        key = f"refresh_token:{user_id}:{token[:20]}"  # Use prefix for identification
        await redis_client.set(
            key,
            token,
            expire=int(self.refresh_token_expire.total_seconds())
        )
    
    async def revoke_token(self, jti: str):
        """Revoke token by adding to blacklist."""
        key = f"revoked_token:{jti}"
        # Store until original expiration
        await redis_client.set(key, "1", expire=86400 * 30)  # 30 days max
    
    async def is_token_revoked(self, jti: Optional[str]) -> bool:
        """Check if token is revoked."""
        if not jti:
            return False
        
        key = f"revoked_token:{jti}"
        return await redis_client.exists(key) > 0
    
    # User authentication
    async def authenticate_user(
        self,
        db: AsyncSession,
        email: str,
        password: str
    ) -> Optional[User]:
        """Authenticate user with email and password."""
        # Get user by email
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Authentication failed: user not found - {email}")
            return None
        
        if not user.is_active:
            logger.warning(f"Authentication failed: user inactive - {email}")
            return None
        
        if not self.verify_password(password, user.hashed_password):
            logger.warning(f"Authentication failed: wrong password - {email}")
            return None
        
        # Update last login
        user.update_last_login()
        await db.commit()
        
        logger.info(f"User authenticated successfully: {email}")
        return user
    
    async def register_user(
        self,
        db: AsyncSession,
        user_data: UserCreate
    ) -> User:
        """Register new user."""
        # Check if user exists
        stmt = select(User).where(User.email == user_data.email)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise ValueError("User with this email already exists")
        
        # Create user
        user = User(
            email=user_data.email,
            name=user_data.name,
            hashed_password=self.hash_password(user_data.password),
            role=UserRole.STUDENT,
            is_active=True,
            is_verified=False,
            preferred_language=user_data.preferred_language
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Send verification email
        await self.send_verification_email(user)
        
        logger.info(f"User registered: {user.email}")
        return user
    
    # Email verification
    async def send_verification_email(self, user: User):
        """Send email verification link."""
        # Create verification token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
        }
        
        token = self.create_token(
            token_data,
            TokenType.EMAIL_VERIFICATION,
            timedelta(hours=24)
        )
        
        # Generate verification URL
        verification_url = f"{settings.APP_URL}/verify-email?token={token}"
        
        logger.info(f"Email verification URL for {user.email}: {verification_url}")
    
    async def verify_email(
        self,
        db: AsyncSession,
        token: str
    ) -> bool:
        """Verify user email with token."""
        token_data = self.decode_token(token)
        
        if not token_data or token_data.token_type != TokenType.EMAIL_VERIFICATION:
            return False
        
        # Get user
        stmt = select(User).where(User.id == int(token_data.sub))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # Mark as verified
        user.is_verified = True
        await db.commit()
        
        logger.info(f"Email verified for user: {user.email}")
        return True
    
    # Password reset
    async def send_password_reset(
        self,
        db: AsyncSession,
        email: str
    ):
        """Send password reset email."""
        # Get user
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if user exists
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return
        
        # Create reset token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
        }
        
        token = self.create_token(
            token_data,
            TokenType.RESET_PASSWORD,
            timedelta(hours=1)
        )
        
        # Generate reset URL
        reset_url = f"{settings.APP_URL}/reset-password?token={token}"
        
        logger.info(f"Password reset URL for {user.email}: {reset_url}")
    
    async def reset_password(
        self,
        db: AsyncSession,
        token: str,
        new_password: str
    ) -> bool:
        """Reset user password with token."""
        token_data = self.decode_token(token)
        
        if not token_data or token_data.token_type != TokenType.RESET_PASSWORD:
            return False
        
        # Get user
        stmt = select(User).where(User.id == int(token_data.sub))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # Update password
        user.hashed_password = self.hash_password(new_password)
        await db.commit()
        
        # Revoke token to prevent reuse
        if token_data.jti:
            await self.revoke_token(token_data.jti)
        
        logger.info(f"Password reset for user: {user.email}")
        return True
    
    # Token refresh
    async def refresh_access_token(
        self,
        db: AsyncSession,
        refresh_token: str
    ) -> Optional[str]:
        """Refresh access token using refresh token."""
        token_data = self.decode_token(refresh_token)
        
        if not token_data or token_data.token_type != TokenType.REFRESH:
            return None
        
        # Verify refresh token exists in Redis
        key_pattern = f"refresh_token:{token_data.sub}:*"
        keys = []
        async for key in redis_client.scan_iter(match=key_pattern):
            keys.append(key)
        
        # Check if any stored token matches
        valid = False
        for key in keys:
            stored_token = await redis_client.get(key)
            if stored_token == refresh_token:
                valid = True
                break
        
        if not valid:
            logger.warning(f"Invalid refresh token for user: {token_data.sub}")
            return None
        
        # Get user
        stmt = select(User).where(User.id == int(token_data.sub))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            return None
        
        # Create new access token
        new_token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
        
        access_token = self.create_token(
            new_token_data,
            TokenType.ACCESS,
            self.access_token_expire
        )
        
        return access_token
    
    # Session management
    async def create_session(
        self,
        user_id: int,
        ip_address: str,
        user_agent: str
    ) -> str:
        """Create user session."""
        session_id = str(uuid.uuid4())
        session_data = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
        }
        
        # Store session
        key = f"session:{session_id}"
        await redis_client.set_json(
            key,
            session_data,
            expire=86400  # 24 hours
        )
        
        # Add to user's sessions
        user_sessions_key = f"user_sessions:{user_id}"
        await redis_client.sadd(user_sessions_key, session_id)
        
        return session_id
    
    async def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all active sessions for user."""
        user_sessions_key = f"user_sessions:{user_id}"
        session_ids = await redis_client.smembers(user_sessions_key)
        
        sessions = []
        for session_id in session_ids:
            session_data = await redis_client.get_json(f"session:{session_id}")
            if session_data:
                session_data["session_id"] = session_id
                sessions.append(session_data)
        
        return sessions
    
    async def revoke_session(self, session_id: str):
        """Revoke specific session."""
        session_data = await redis_client.get_json(f"session:{session_id}")
        if session_data:
            # Remove from user's sessions
            user_id = session_data["user_id"]
            await redis_client.srem(f"user_sessions:{user_id}", session_id)
            
            # Delete session
            await redis_client.delete(f"session:{session_id}")
    
    async def revoke_all_sessions(self, user_id: int):
        """Revoke all sessions for user."""
        sessions = await self.get_user_sessions(user_id)
        for session in sessions:
            await self.revoke_session(session["session_id"])


# Global auth service instance
auth_service = AuthService()