"""
Application configuration using Pydantic settings.
"""
from functools import lru_cache
from typing import List, Optional
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings with validation and type hints.
    """
    model_config = SettingsConfigDict(
        env_file=".env.development",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Application
    NODE_ENV: str = Field(default="development")
    APP_NAME: str = Field(default="Breslev Torah Online")
    APP_URL: str = Field(default="http://localhost:3000")
    API_URL: str = Field(default="http://localhost:8000")
    PORT: int = Field(default=8000)
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"]
    )
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1", ".breslev-torah.com"]
    )
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/breslev_db"
    )
    DATABASE_POOL_SIZE: int = Field(default=20)
    DATABASE_MAX_OVERFLOW: int = Field(default=40)
    DATABASE_POOL_TIMEOUT: int = Field(default=30)
    DATABASE_ECHO: bool = Field(default=False)
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_PASSWORD: Optional[str] = Field(default=None)
    REDIS_MAX_CONNECTIONS: int = Field(default=50)
    REDIS_DECODE_RESPONSES: bool = Field(default=True)
    
    # Authentication
    JWT_SECRET_KEY: str = Field(min_length=32)
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRATION_HOURS: int = Field(default=24)
    REFRESH_TOKEN_EXPIRATION_DAYS: int = Field(default=30)
    
    # External APIs
    SEFARIA_API_URL: str = Field(default="https://www.sefaria.org/api")
    SEFARIA_API_VERSION: str = Field(default="v3")
    SEFARIA_RATE_LIMIT: int = Field(default=100)
    SEFARIA_RATE_WINDOW: int = Field(default=3600)
    
    # Google APIs
    GOOGLE_APPLICATION_CREDENTIALS: Optional[Path] = Field(default=None)
    GEMINI_API_KEY: str = Field(min_length=20)
    GEMINI_MODEL: str = Field(default="gemini-1.5-pro")
    GEMINI_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)
    GEMINI_MAX_TOKENS: int = Field(default=2048, ge=1, le=8192)
    GEMINI_TOP_P: float = Field(default=0.95, ge=0.0, le=1.0)
    GEMINI_TOP_K: int = Field(default=40, ge=1, le=100)
    
    # Google TTS
    GOOGLE_TTS_LANGUAGE_CODE_HE: str = Field(default="he-IL")
    GOOGLE_TTS_LANGUAGE_CODE_EN: str = Field(default="en-US")
    GOOGLE_TTS_LANGUAGE_CODE_FR: str = Field(default="fr-FR")
    GOOGLE_TTS_VOICE_NAME_HE: str = Field(default="he-IL-Wavenet-A")
    GOOGLE_TTS_VOICE_NAME_EN: str = Field(default="en-US-Wavenet-D")
    GOOGLE_TTS_VOICE_NAME_FR: str = Field(default="fr-FR-Wavenet-A")
    GOOGLE_TTS_AUDIO_ENCODING: str = Field(default="MP3")
    GOOGLE_TTS_SPEAKING_RATE: float = Field(default=1.0, ge=0.25, le=4.0)
    GOOGLE_TTS_PITCH: float = Field(default=0.0, ge=-20.0, le=20.0)
    
    # ChromaDB
    CHROMADB_HOST: str = Field(default="localhost")
    CHROMADB_PORT: int = Field(default=8001)
    CHROMADB_COLLECTION_NAME: str = Field(default="breslev_texts")
    CHROMADB_EMBEDDING_MODEL: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    # Cache Settings
    CACHE_TTL_DEFAULT: int = Field(default=3600)
    CACHE_TTL_TEXTS: int = Field(default=86400)
    CACHE_TTL_AUDIO: int = Field(default=604800)
    CACHE_TTL_TRANSLATIONS: int = Field(default=2592000)
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")
    LOG_FILE: Optional[Path] = Field(default=Path("./logs/app.log"))
    LOG_MAX_SIZE: int = Field(default=10485760)  # 10MB
    LOG_BACKUP_COUNT: int = Field(default=5)
    
    # Performance
    WORKERS: int = Field(default=1, ge=1)
    WORKER_CONNECTIONS: int = Field(default=1000)
    WORKER_TIMEOUT: int = Field(default=300)
    UPLOAD_MAX_SIZE: int = Field(default=10485760)  # 10MB
    
    # Feature Flags
    ENABLE_CACHE: bool = Field(default=True)
    ENABLE_WEBSOCKET: bool = Field(default=True)
    ENABLE_BACKGROUND_WORKERS: bool = Field(default=True)
    ENABLE_RATE_LIMITING: bool = Field(default=False)
    ENABLE_METRICS: bool = Field(default=True)
    
    # Paths
    DATA_DIR: Path = Field(default=Path("./data"))
    AUDIO_CACHE_DIR: Path = Field(default=Path("./data/audio"))
    
    # Monitoring (Optional)
    SENTRY_DSN: Optional[str] = Field(default=None)
    DATADOG_API_KEY: Optional[str] = Field(default=None)
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("GOOGLE_APPLICATION_CREDENTIALS", mode="before")
    @classmethod
    def validate_google_credentials(cls, v):
        """Validate Google credentials file exists."""
        if v:
            path = Path(v)
            if not path.exists():
                raise ValueError(f"Google credentials file not found: {path}")
            return path
        return None
    
    @property
    def sefaria_base_url(self) -> str:
        """Get full Sefaria API base URL."""
        return f"{self.SEFARIA_API_URL}/{self.SEFARIA_API_VERSION}"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.NODE_ENV == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.NODE_ENV == "development"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    """
    return Settings()


# Global settings instance
settings = get_settings()