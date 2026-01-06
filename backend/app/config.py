"""
Configuration management for MBTI Assistant MVP.
Loads environment variables and provides type-safe settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "MBTI Assistant MVP"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # API Keys
    GEMINI_API_KEY: str = ""
    NANO_BANANA_KEY: str = ""  # Reserved for future image generation
    TRACKING_API_KEY: str = "mbti-track-2026-secret-key"  # API key for tracking endpoints
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./mbti_assistant.db"
    
    # CORS Settings
    # Allow all origins for public access via cloudflared tunnels
    CORS_ORIGINS: list[str] = ["*"]
    
    # Session Configuration (testing mode - no limits)
    MIN_CONVERSATION_ROUNDS: int = 1
    MAX_CONVERSATION_ROUNDS: int = 999999
    
    # AI Model Configuration - Hybrid approach
    # Flash model for Q&A and conversation (faster, cheaper)
    GEMINI_MODEL_CHAT: str = "gemini-3-flash-preview"
    # Pro model for final analysis and reports (deeper, more accurate)
    GEMINI_MODEL_ANALYSIS: str = "gemini-3-pro-preview"
    # Image generation model
    GEMINI_IMAGE_MODEL: str = "gemini-3-pro-image-preview"
    # Legacy field - kept for backward compatibility with .env files
    # This is ignored, we use GEMINI_MODEL_CHAT and GEMINI_MODEL_ANALYSIS instead
    GEMINI_MODEL: str = "gemini-3-pro-preview"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

