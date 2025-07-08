"""
Book model for Breslov texts.
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum

from sqlmodel import Field, SQLModel, Relationship


class BookCategory(str, Enum):
    """Book category enumeration."""
    CHASIDUT = "Chasidut"
    KABBALAH = "Kabbalah"
    LITURGY = "Liturgy"
    BIOGRAPHY = "Biography"
    STORIES = "Stories"


class BookBase(SQLModel):
    """Base book model."""
    slug: str = Field(unique=True, index=True)
    title: str = Field(index=True)  # Hebrew title
    title_en: str
    title_fr: Optional[str] = None
    category: BookCategory
    description: Optional[str] = None
    author: str = Field(default="Rabbi Nachman of Breslov")
    
    # Structure
    parts: int = Field(default=1, ge=1)
    chapters: Optional[dict] = Field(default=None)  # JSON structure
    
    # Metadata
    order_index: int = Field(default=0)
    is_active: bool = Field(default=True)
    is_featured: bool = Field(default=False)
    
    # Stats
    view_count: int = Field(default=0)
    bookmark_count: int = Field(default=0)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Book(BookBase, table=True):
    """Book model for database."""
    __tablename__ = "books"
    
    id: int = Field(default=None, primary_key=True)
    
    def increment_views(self):
        """Increment view counter."""
        self.view_count += 1
        self.updated_at = datetime.utcnow()


class BookCreate(BookBase):
    """Schema for creating a book."""
    pass


class BookUpdate(SQLModel):
    """Schema for updating a book."""
    title: Optional[str] = None
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    description: Optional[str] = None
    category: Optional[BookCategory] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class BookRead(BookBase):
    """Schema for reading a book."""
    id: int
    
    class Config:
        from_attributes = True


class BookWithStats(BookRead):
    """Book with additional statistics."""
    total_chapters: int = 0
    completed_chapters: int = 0
    last_read_at: Optional[datetime] = None
    reading_progress: float = 0.0  # Percentage