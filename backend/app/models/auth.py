"""
Authentication models for request/response schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from app.models.user import UserRole


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    remember_me: bool = False


class RegisterRequest(BaseModel):
    """User registration request model."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    password_confirm: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    preferred_language: str = Field(default="he", pattern="^(he|en|fr)$")
    
    @field_validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @model_validator(mode='after')
    def validate_password_confirmation(self):
        """Validate password confirmation matches password."""
        if self.password != self.password_confirm:
            raise ValueError('Password confirmation does not match')
        return self
    
    @field_validator('name')
    def validate_name(cls, v):
        """Validate name."""
        if not v.strip():
            raise ValueError('Name cannot be empty')
        
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        
        return v.strip()


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request model."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation model."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)
    new_password_confirm: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @model_validator(mode='after')
    def validate_new_password_confirmation(self):
        """Validate password confirmation matches password."""
        if self.new_password != self.new_password_confirm:
            raise ValueError('Password confirmation does not match')
        return self


class EmailVerificationRequest(BaseModel):
    """Email verification request model."""
    token: str


class ResendVerificationRequest(BaseModel):
    """Resend verification request model."""
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    """Change password request model."""
    current_password: str = Field(..., min_length=8, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)
    new_password_confirm: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @field_validator('new_password_confirm')
    def validate_new_password_confirm(cls, v, values):
        """Validate password confirmation."""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Password confirmation does not match')
        return v


class UserResponse(BaseModel):
    """User response model."""
    id: int
    email: EmailStr
    name: str
    role: UserRole
    is_verified: bool
    is_active: bool
    preferred_language: str
    created_at: datetime
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response model."""
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutResponse(BaseModel):
    """Logout response model."""
    message: str = "Successfully logged out"


class MessageResponse(BaseModel):
    """Generic message response model."""
    message: str