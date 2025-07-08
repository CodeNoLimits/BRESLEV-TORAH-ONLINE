"""
Chat model and related schemas.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from enum import Enum

from sqlmodel import SQLModel, Field


class ChatRole(str, Enum):
    """Chat message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessageBase(SQLModel):
    """Base chat message fields."""
    role: ChatRole
    content: str = Field(min_length=1, max_length=10000)
    session_id: str = Field(index=True, max_length=100)
    user_id: UUID = Field(index=True)


class ChatMessage(ChatMessageBase, table=True):
    """Chat message table model."""
    __tablename__ = "chat_messages"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Message metadata
    metadata: Optional[str] = Field(default=None)  # JSON string
    
    # Context and citations
    context_used: bool = Field(default=False)
    citations: Optional[str] = Field(default=None)  # JSON string
    
    # AI model info
    model_used: Optional[str] = Field(default=None, max_length=50)
    tokens_used: Optional[int] = Field(default=None)
    
    # Response quality metrics
    response_time_ms: Optional[int] = Field(default=None)
    user_rating: Optional[int] = Field(default=None, ge=1, le=5)


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating chat messages."""
    pass


class ChatMessageRead(ChatMessageBase):
    """Schema for reading chat messages."""
    id: UUID
    created_at: datetime
    metadata: Optional[Dict[str, Any]]
    context_used: bool
    citations: Optional[List[Dict[str, Any]]]
    model_used: Optional[str]
    tokens_used: Optional[int]
    response_time_ms: Optional[int]
    user_rating: Optional[int]


class ChatRequest(SQLModel):
    """Schema for chat requests."""
    message: str = Field(min_length=1, max_length=10000)
    session_id: str = Field(max_length=100)
    book_filter: Optional[str] = None
    language: str = Field(default="en", max_length=5)
    stream: bool = Field(default=False)


class ChatResponse(SQLModel):
    """Schema for chat responses."""
    response: str
    session_id: str
    message_id: UUID
    citations: List[Dict[str, Any]]
    context_used: bool
    model_used: str
    tokens_used: Optional[int]
    response_time_ms: int


class ChatSession(SQLModel, table=True):
    """Chat session table model."""
    __tablename__ = "chat_sessions"
    
    id: str = Field(primary_key=True, max_length=100)
    user_id: UUID = Field(index=True)
    title: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)
    
    # Session metadata
    total_messages: int = Field(default=0)
    last_activity: datetime = Field(default_factory=datetime.utcnow)


class ChatSessionCreate(SQLModel):
    """Schema for creating chat sessions."""
    title: Optional[str] = None


class ChatSessionRead(SQLModel):
    """Schema for reading chat sessions."""
    id: str
    user_id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    total_messages: int
    last_activity: datetime
    is_active: bool


class ChatCitation(SQLModel):
    """Schema for chat citations."""
    index: int
    ref: str
    text: str
    book: Optional[str]
    chapter: Optional[int]
    verse: Optional[int]
    score: Optional[float] = None


class ChatAnalytics(SQLModel):
    """Schema for chat analytics."""
    user_id: UUID
    period_start: datetime
    period_end: datetime
    total_messages: int
    total_sessions: int
    avg_session_length: float
    most_discussed_topics: List[str]
    preferred_language: str