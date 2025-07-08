"""
Test configuration and fixtures for the Breslev Torah Online application.

This module provides comprehensive test fixtures including:
- Database setup with test isolation
- Authentication fixtures with different user roles
- Mock services for external dependencies
- Utility functions for test data creation
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import get_db, Base
from backend.app.models.user import User, UserRole
from backend.app.models.book import Book, BookText
from backend.app.models.chat import Chat, ChatMessage
from backend.app.services.auth import AuthService
from backend.app.core.config import settings


# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def override_get_db(db_session):
    """Override the get_db dependency to use test database."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client(override_get_db) -> Generator[TestClient, None, None]:
    """Create a test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


# User fixtures
@pytest.fixture
async def test_admin_user(db_session) -> User:
    """Create a test admin user."""
    user = User(
        email="admin@test.com",
        name="Test Admin",
        role=UserRole.ADMIN,
        hashed_password="$2b$12$test_hashed_password",
        is_verified=True,
        preferred_language="he"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
async def test_scholar_user(db_session) -> User:
    """Create a test scholar user."""
    user = User(
        email="scholar@test.com",
        name="Test Scholar",
        role=UserRole.SCHOLAR,
        hashed_password="$2b$12$test_hashed_password",
        is_verified=True,
        preferred_language="he"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
async def test_student_user(db_session) -> User:
    """Create a test student user."""
    user = User(
        email="student@test.com",
        name="Test Student",
        role=UserRole.STUDENT,
        hashed_password="$2b$12$test_hashed_password",
        is_verified=True,
        preferred_language="he"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
async def test_guest_user(db_session) -> User:
    """Create a test guest user."""
    user = User(
        email="guest@test.com",
        name="Test Guest",
        role=UserRole.GUEST,
        hashed_password="$2b$12$test_hashed_password",
        is_verified=False,
        preferred_language="he"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# Authentication fixtures
@pytest.fixture
async def auth_service() -> AuthService:
    """Create an AuthService instance."""
    return AuthService()


@pytest.fixture
async def admin_token(test_admin_user, auth_service) -> str:
    """Create an admin JWT token."""
    access_token, _ = await auth_service.create_tokens(test_admin_user)
    return access_token


@pytest.fixture
async def scholar_token(test_scholar_user, auth_service) -> str:
    """Create a scholar JWT token."""
    access_token, _ = await auth_service.create_tokens(test_scholar_user)
    return access_token


@pytest.fixture
async def student_token(test_student_user, auth_service) -> str:
    """Create a student JWT token."""
    access_token, _ = await auth_service.create_tokens(test_student_user)
    return access_token


@pytest.fixture
async def guest_token(test_guest_user, auth_service) -> str:
    """Create a guest JWT token."""
    access_token, _ = await auth_service.create_tokens(test_guest_user)
    return access_token


# Headers with authentication
@pytest.fixture
def admin_headers(admin_token) -> dict:
    """Headers with admin authorization."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def scholar_headers(scholar_token) -> dict:
    """Headers with scholar authorization."""
    return {"Authorization": f"Bearer {scholar_token}"}


@pytest.fixture
def student_headers(student_token) -> dict:
    """Headers with student authorization."""
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def guest_headers(guest_token) -> dict:
    """Headers with guest authorization."""
    return {"Authorization": f"Bearer {guest_token}"}


# Book fixtures
@pytest.fixture
async def test_book(db_session) -> Book:
    """Create a test book."""
    book = Book(
        title="תיקוני הזוהר",
        title_en="Tikkunei Zohar",
        title_fr="Tikkunei Zohar",
        author="רבי שמעון בר יוחאי",
        description="ספר תיקוני הזוהר",
        category="kabbalah",
        language="he",
        total_chapters=70,
        is_public=True,
        difficulty_level=5,
        estimated_reading_time=120
    )
    db_session.add(book)
    db_session.commit()
    db_session.refresh(book)
    return book


@pytest.fixture
async def test_book_text(db_session, test_book) -> BookText:
    """Create test book text."""
    text = BookText(
        book_id=test_book.id,
        chapter_number=1,
        section_number=1,
        text_content="זה הטקסט של התיקון הראשון",
        text_content_en="This is the text of the first tikkun",
        text_content_fr="Ceci est le texte du premier tikkun",
        word_count=8,
        page_number=1
    )
    db_session.add(text)
    db_session.commit()
    db_session.refresh(text)
    return text


# Chat fixtures
@pytest.fixture
async def test_chat(db_session, test_student_user) -> Chat:
    """Create a test chat session."""
    chat = Chat(
        user_id=test_student_user.id,
        title="שאלה על התיקונים",
        language="he",
        ai_model="gemini-pro",
        is_active=True
    )
    db_session.add(chat)
    db_session.commit()
    db_session.refresh(chat)
    return chat


@pytest.fixture
async def test_chat_message(db_session, test_chat) -> ChatMessage:
    """Create a test chat message."""
    message = ChatMessage(
        chat_id=test_chat.id,
        content="מה המשמעות של התיקון הראשון?",
        sender="user",
        tokens_used=15
    )
    db_session.add(message)
    db_session.commit()
    db_session.refresh(message)
    return message


# Mock services
@pytest.fixture
def mock_redis():
    """Mock Redis service."""
    class MockRedis:
        def __init__(self):
            self.data = {}
        
        async def get(self, key: str):
            return self.data.get(key)
        
        async def set(self, key: str, value: str, expire: int = None):
            self.data[key] = value
        
        async def delete(self, key: str):
            if key in self.data:
                del self.data[key]
        
        async def exists(self, key: str):
            return key in self.data
    
    return MockRedis()


@pytest.fixture
def mock_chromadb():
    """Mock ChromaDB service."""
    class MockChromaDB:
        def __init__(self):
            self.collections = {}
        
        async def add_texts(self, collection_name: str, texts: list, metadatas: list = None):
            if collection_name not in self.collections:
                self.collections[collection_name] = []
            self.collections[collection_name].extend(texts)
        
        async def search(self, collection_name: str, query: str, limit: int = 5):
            if collection_name not in self.collections:
                return []
            # Simple mock search - return first few texts
            return self.collections[collection_name][:limit]
    
    return MockChromaDB()


@pytest.fixture
def mock_gemini():
    """Mock Gemini AI service."""
    class MockGemini:
        async def generate_response(self, prompt: str, context: str = None):
            return {
                "response": f"מענה על: {prompt}",
                "tokens_used": 50,
                "model": "gemini-pro"
            }
    
    return MockGemini()


@pytest.fixture
def mock_tts():
    """Mock TTS service."""
    class MockTTS:
        async def synthesize(self, text: str, language: str = "he"):
            return {
                "audio_url": f"http://test.com/audio/{hash(text)}.mp3",
                "duration": len(text) * 0.1,  # Mock duration
                "format": "mp3"
            }
    
    return MockTTS()


# Test data helpers
@pytest.fixture
def sample_book_data():
    """Sample book data for testing."""
    return {
        "title": "ליקוטי מוהרן",
        "title_en": "Likutei Moharan",
        "title_fr": "Likutei Moharan",
        "author": "רבי נחמן מברסלב",
        "description": "הספר המרכזי של רבי נחמן מברסלב",
        "category": "breslov",
        "language": "he",
        "total_chapters": 286,
        "is_public": True,
        "difficulty_level": 4,
        "estimated_reading_time": 240
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "newuser@test.com",
        "name": "New User",
        "password": "securepassword123",
        "password_confirm": "securepassword123",
        "preferred_language": "he"
    }


@pytest.fixture
def sample_chat_data():
    """Sample chat data for testing."""
    return {
        "title": "שאלה על הליקוטים",
        "language": "he",
        "ai_model": "gemini-pro"
    }


# Test utilities
class TestUtils:
    """Utility functions for testing."""
    
    @staticmethod
    def create_test_user(db_session, email: str, role: UserRole = UserRole.STUDENT) -> User:
        """Create a test user with given email and role."""
        user = User(
            email=email,
            name=f"Test {role.value.title()}",
            role=role,
            hashed_password="$2b$12$test_hashed_password",
            is_verified=True,
            preferred_language="he"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @staticmethod
    def create_test_book(db_session, title: str, is_public: bool = True) -> Book:
        """Create a test book with given title."""
        book = Book(
            title=title,
            title_en=f"{title} (EN)",
            title_fr=f"{title} (FR)",
            author="Test Author",
            description=f"Description for {title}",
            category="test",
            language="he",
            total_chapters=10,
            is_public=is_public,
            difficulty_level=3,
            estimated_reading_time=60
        )
        db_session.add(book)
        db_session.commit()
        db_session.refresh(book)
        return book


@pytest.fixture
def test_utils():
    """Test utilities fixture."""
    return TestUtils