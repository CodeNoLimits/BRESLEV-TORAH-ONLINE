"""
Book model and related schemas.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Relationship


class BookBase(SQLModel):
    """Base book fields."""
    slug: str = Field(unique=True, index=True, max_length=100)
    title: str = Field(index=True, max_length=200)
    title_en: str = Field(max_length=200)
    heTitle: Optional[str] = Field(default=None, max_length=200)
    author: str = Field(default="Rabbi Nachman of Breslov", max_length=100)
    category: str = Field(default="Chasidut", max_length=50)
    description: Optional[str] = Field(default=None, max_length=1000)
    parts: int = Field(default=1, ge=1)
    order_index: int = Field(default=0, index=True)
    is_active: bool = Field(default=True)


class Book(BookBase, table=True):
    """Book table model."""
    __tablename__ = "books"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Metadata from Sefaria
    text_depth: Optional[int] = Field(default=None)
    section_names: Optional[str] = Field(default=None)  # JSON string
    address_types: Optional[str] = Field(default=None)  # JSON string
    lengths: Optional[str] = Field(default=None)  # JSON string
    
    # Statistics
    total_chapters: Optional[int] = Field(default=None)
    total_verses: Optional[int] = Field(default=None)
    
    # Relationships will be added as needed


class BookCreate(BookBase):
    """Schema for creating books."""
    pass


class BookRead(BookBase):
    """Schema for reading books."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    text_depth: Optional[int]
    total_chapters: Optional[int]
    total_verses: Optional[int]


class BookUpdate(SQLModel):
    """Schema for updating books."""
    title: Optional[str] = None
    title_en: Optional[str] = None
    heTitle: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class BookStructure(SQLModel):
    """Schema for book structure from Sefaria."""
    title: str
    heTitle: Optional[str]
    categories: List[str]
    sections: List[str]
    addressTypes: List[str]
    lengths: List[int]
    textDepth: int
    schema: dict