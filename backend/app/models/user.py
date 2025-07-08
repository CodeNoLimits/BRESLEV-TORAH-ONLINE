"""
User model and related schemas.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Relationship
from pydantic import EmailStr


class UserBase(SQLModel):
    """Base user fields."""
    email: EmailStr = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    preferred_language: str = Field(default="en", max_length=5)
    timezone: str = Field(default="UTC", max_length=50)


class User(UserBase, table=True):
    """User table model."""
    __tablename__ = "users"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    hashed_password: str = Field(min_length=8)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(default=None)
    email_verified: bool = Field(default=False)
    
    # Relationships will be added as needed


class UserCreate(UserBase):
    """Schema for creating users."""
    password: str = Field(min_length=8, max_length=100)


class UserRead(UserBase):
    """Schema for reading users."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    email_verified: bool


class UserUpdate(SQLModel):
    """Schema for updating users."""
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None


class UserLogin(SQLModel):
    """Schema for user login."""
    username: str
    password: str


class Token(SQLModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(SQLModel):
    """Token data for JWT."""
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    email: Optional[str] = None