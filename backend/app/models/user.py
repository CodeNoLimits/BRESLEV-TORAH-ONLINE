"""
User model with authentication and profile information.
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum

from sqlmodel import Field, SQLModel, Relationship, Column, String
from sqlalchemy import JSON
from pydantic import EmailStr


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    SCHOLAR = "scholar"  # Érudit with special access
    STUDENT = "student"  # Regular user
    GUEST = "guest"     # Limited access


class UserBase(SQLModel):
    """Base user model with common fields."""
    email: EmailStr = Field(
        sa_column=Column(String(255), nullable=False, unique=True, index=True)
    )
    name: str = Field(min_length=1, max_length=255)
    role: UserRole = Field(default=UserRole.STUDENT)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    preferred_language: str = Field(default="he")
    
    # Profile fields
    bio: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = Field(default=None)
    study_level: Optional[str] = Field(default="beginner")  # beginner, intermediate, advanced
    
    # Preferences stored as JSON
    preferences: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)


class User(UserBase, table=True):
    """User model for database."""
    __tablename__ = "users"
    
    id: int = Field(default=None, primary_key=True)
    hashed_password: str = Field(exclude=True)
    
    # Relationships
    bookmarks: List["Bookmark"] = Relationship(back_populates="user")
    study_progress: List["StudyProgress"] = Relationship(back_populates="user")
    
    def set_password(self, password: str) -> None:
        """Hash and set user password."""
        from app.utils.security import hash_password
        self.hashed_password = hash_password(password)
    
    def verify_password(self, password: str) -> bool:
        """Verify user password."""
        from app.utils.security import verify_password
        return verify_password(password, self.hashed_password)
    
    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login_at = datetime.utcnow()
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin."""
        return self.role == UserRole.ADMIN
    
    @property
    def is_scholar(self) -> bool:
        """Check if user is scholar or higher."""
        return self.role in [UserRole.ADMIN, UserRole.SCHOLAR]


class UserCreate(SQLModel):
    """Schema for creating a user."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    name: str
    preferred_language: str = "he"


class UserUpdate(SQLModel):
    """Schema for updating a user."""
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_language: Optional[str] = None
    study_level: Optional[str] = None
    preferences: Optional[dict] = None


class UserRead(UserBase):
    """Schema for reading a user (public info)."""
    id: int
    
    class Config:
        from_attributes = True


class UserInDB(UserRead):
    """Schema for user in database (includes sensitive data)."""
    hashed_password: str


class UserLogin(SQLModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(SQLModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(SQLModel):
    """Token data for JWT."""
    user_id: Optional[int] = None
    email: Optional[str] = None