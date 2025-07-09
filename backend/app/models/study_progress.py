"""
Study progress tracking model.
"""
from datetime import datetime, date
from typing import Optional, Dict
from enum import Enum

from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import JSON, Date


class StudyStatus(str, Enum):
    """Study status enumeration."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"


class StudyProgressBase(SQLModel):
    """Base study progress model."""
    user_id: int = Field(foreign_key="users.id", index=True)
    book_id: int = Field(foreign_key="books.id", index=True)
    chapter: int = Field(ge=1)
    
    # Progress tracking
    status: StudyStatus = Field(default=StudyStatus.NOT_STARTED)
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    
    # Time tracking
    time_spent_seconds: int = Field(default=0)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    last_studied_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Study quality metrics
    comprehension_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    notes_count: int = Field(default=0)
    questions_asked: int = Field(default=0)
    
    # Metadata
    study_metadata: Dict = Field(default_factory=dict, sa_column=Column(JSON))
    

class StudyProgress(StudyProgressBase, table=True):
    """Study progress model for database."""
    __tablename__ = "study_progress"
    
    id: int = Field(default=None, primary_key=True)
    
    # Relationships
    user: "User" = Relationship(back_populates="study_progress")
    book: "Book" = Relationship(back_populates="study_progress")
    
    def start_study(self):
        """Mark study session as started."""
        if self.status == StudyStatus.NOT_STARTED:
            self.status = StudyStatus.IN_PROGRESS
            self.started_at = datetime.utcnow()
        self.last_studied_at = datetime.utcnow()
    
    def complete_chapter(self):
        """Mark chapter as completed."""
        self.status = StudyStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100.0
    
    def add_study_time(self, seconds: int):
        """Add study time."""
        self.time_spent_seconds += seconds
        self.last_studied_at = datetime.utcnow()
    
    class Config:
        # Unique constraint on user + book + chapter
        __table_args__ = (
            {"mysql_engine": "InnoDB"},
        )


class StudyStreakBase(SQLModel):
    """Base study streak model."""
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Streak data
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    total_days_studied: int = Field(default=0)
    
    # Dates
    last_study_date: Optional[date] = Field(default=None, sa_column=Column(Date))
    streak_start_date: Optional[date] = Field(default=None, sa_column=Column(Date))
    
    # Goals
    daily_goal_minutes: int = Field(default=30)
    weekly_goal_chapters: int = Field(default=7)
    
    # Achievements
    achievements: Dict = Field(default_factory=dict, sa_column=Column(JSON))


class StudyStreak(StudyStreakBase, table=True):
    """Study streak model for database."""
    __tablename__ = "study_streaks"
    
    id: int = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True)
    
    def update_streak(self, study_date: date = None):
        """Update study streak."""
        if study_date is None:
            study_date = date.today()
        
        if self.last_study_date is None:
            # First study
            self.current_streak = 1
            self.longest_streak = 1
            self.total_days_studied = 1
            self.streak_start_date = study_date
        elif (study_date - self.last_study_date).days == 1:
            # Consecutive day
            self.current_streak += 1
            self.longest_streak = max(self.longest_streak, self.current_streak)
            self.total_days_studied += 1
        elif (study_date - self.last_study_date).days > 1:
            # Streak broken
            self.current_streak = 1
            self.streak_start_date = study_date
            self.total_days_studied += 1
        # else: same day, no update needed
        
        self.last_study_date = study_date