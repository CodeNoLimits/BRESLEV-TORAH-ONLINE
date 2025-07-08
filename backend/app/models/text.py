"""
Text model and related schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Relationship


class TextBase(SQLModel):
    """Base text fields."""
    ref: str = Field(index=True, max_length=200)  # e.g., "Likutei_Moharan.1.5"
    book_slug: str = Field(index=True, max_length=100)
    chapter: Optional[int] = Field(default=None, index=True)
    verse: Optional[int] = Field(default=None, index=True)
    section: Optional[str] = Field(default=None, max_length=50)
    
    # Text content
    hebrew: Optional[str] = Field(default=None)
    english: Optional[str] = Field(default=None)
    french: Optional[str] = Field(default=None)
    
    # Metadata
    language: str = Field(default="he", max_length=5)
    version: Optional[str] = Field(default=None, max_length=100)
    
    is_active: bool = Field(default=True)


class Text(TextBase, table=True):
    """Text table model."""
    __tablename__ = "texts"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Full text for search
    full_text: Optional[str] = Field(default=None)
    
    # Sefaria metadata
    sefaria_data: Optional[str] = Field(default=None)  # JSON string
    
    # Relationships
    book_id: Optional[UUID] = Field(default=None, foreign_key="books.id")


class TextCreate(TextBase):
    """Schema for creating texts."""
    pass


class TextRead(TextBase):
    """Schema for reading texts."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    full_text: Optional[str]


class TextUpdate(SQLModel):
    """Schema for updating texts."""
    hebrew: Optional[str] = None
    english: Optional[str] = None
    french: Optional[str] = None
    is_active: Optional[bool] = None


class TextSearch(SQLModel):
    """Schema for text search requests."""
    query: str = Field(min_length=1, max_length=500)
    book_slug: Optional[str] = None
    language: str = Field(default="he")
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class TextSearchResult(SQLModel):
    """Schema for text search results."""
    ref: str
    book_slug: str
    chapter: Optional[int]
    verse: Optional[int]
    hebrew: Optional[str]
    english: Optional[str]
    french: Optional[str]
    score: float
    snippet: str


class TextRange(SQLModel):
    """Schema for requesting text ranges."""
    book_slug: str
    start_chapter: int = Field(ge=1)
    end_chapter: int = Field(ge=1)
    language: str = Field(default="he")


class TextTranslation(SQLModel):
    """Schema for text translations."""
    ref: str
    source_language: str
    target_language: str
    source_text: str
    translated_text: str
    confidence: Optional[float] = None


class SefariaTextResponse(SQLModel):
    """Schema for Sefaria API responses."""
    ref: str
    heRef: Optional[str]
    isComplex: bool
    text: List[str]
    he: List[str]
    versions: List[Dict[str, Any]]
    textDepth: int
    sectionNames: List[str]
    addressTypes: List[str]