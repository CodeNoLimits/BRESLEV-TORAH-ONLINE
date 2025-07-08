"""
Authentication models and schemas.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum

from sqlmodel import Field, SQLModel
from pydantic import EmailStr, validator
from jose import jwt, JWTError

from app.config import settings


class TokenType(str, Enum):
    """Token type enumeration."""
    ACCESS = "access"
    REFRESH = "refresh"
    RESET_PASSWORD = "reset_password"
    EMAIL_VERIFICATION = "email_verification"


class Token(SQLModel):
    """Token response model."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


class TokenData(SQLModel):
    """Token payload data."""
    sub: str  # User ID
    email: Optional[str] = None
    role: Optional[str] = None
    token_type: TokenType
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None
    jti: Optional[str] = None  # JWT ID for revocation


class LoginRequest(SQLModel):
    """Login request schema."""
    email: EmailStr
    password: str
    remember_me: bool = False


class RegisterRequest(SQLModel):
    """Registration request schema."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    password_confirm: str
    name: str = Field(min_length=1, max_length=255)
    preferred_language: str = Field(default="he", regex="^(he|en|fr)$")
    
    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PasswordResetRequest(SQLModel):
    """Password reset request schema."""
    email: EmailStr


class PasswordResetConfirm(SQLModel):
    """Password reset confirmation schema."""
    token: str
    password: str = Field(min_length=8, max_length=100)
    password_confirm: str
    
    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class EmailVerificationRequest(SQLModel):
    """Email verification request schema."""
    token: str


class RefreshTokenRequest(SQLModel):
    """Refresh token request schema."""
    refresh_token: str


class RevokeTokenRequest(SQLModel):
    """Revoke token request schema."""
    token: str
    token_type_hint: Optional[str] = None  # access_token or refresh_token