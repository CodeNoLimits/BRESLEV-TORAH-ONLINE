"""
Core configuration module that imports from main config.
"""
from app.config import settings, get_settings, Settings

__all__ = ["settings", "get_settings", "Settings"]