"""
Bookmark model for saving user's reading positions.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, Relationship


class BookmarkBase(SQLModel):
    """Base bookmark model."""
    user_id: int = Field(foreign_key="users.id", index=True)
    book_id: int = Field(foreign_key="books.id", index=True)
    text_id: Optional[int] = Field(default=None, foreign_key="texts.id")
    
    # Position
    chapter: int
    verse: Optional[int] = None
    position: Optional[float] = None  # Scroll position percentage
    
    # Metadata
    title: Optional[str] = Field(default=None, max_length=255)
    note: Optional[str] = Field(default=None, max_length=1000)
    color: Optional[str] = Field(default="#6366f1", regex="^#[0-9A-Fa-f]{6}$")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed_at: datetime = Field(default_factory=datetime.utcnow)


class Bookmark(BookmarkBase, table=True):
    """Bookmark model for database."""
    __tablename__ = "bookmarks"
    
    id: int = Field(default=None, primary_key=True)
    
    # Relationships
    user: "User" = Relationship(back_populates="bookmarks")
    book: "Book" = Relationship(back_populates="bookmarks")
    
    def update_access_time(self):
        """Update last accessed timestamp."""
        self.last_accessed_at = datetime.utcnow()
    
    class Config:
        # Unique constraint on user + book + chapter + verse
        __table_args__ = (
            {"mysql_engine": "InnoDB"},
        )


class BookmarkCreate(SQLModel):
    """Schema for creating bookmark."""
    book_id: int
    chapter: int
    verse: Optional[int] = None
    title: Optional[str] = None
    note: Optional[str] = None
    color: Optional[str] = "#6366f1"


class BookmarkUpdate(SQLModel):
    """Schema for updating bookmark."""
    title: Optional[str] = None
    note: Optional[str] = None
    color: Optional[str] = None
    position: Optional[float] = None


class BookmarkRead(BookmarkBase):
    """Schema for reading bookmark."""
    id: int
    book_title: Optional[str] = None
    book_title_en: Optional[str] = None
    
    class Config:
        from_attributes = True