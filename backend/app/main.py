"""
MBTI Assistant MVP - FastAPI Application Entry Point

This module initializes the FastAPI application with:
- CORS middleware for frontend communication
- Database initialization on startup
- API route registration
- Health check endpoints
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    
    # Initialize database
    await init_db()
    logger.info("✅ Database initialized")
    
    # Check AI service configuration
    if settings.GEMINI_API_KEY:
        logger.info("✅ Gemini API key configured")
    else:
        logger.warning("⚠️ Gemini API key not configured - AI features will fail")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down %s", settings.APP_NAME)


# ============================================================
# Application Instance
# ============================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    # MBTI Assistant API
    
    AI-powered MBTI personality assessment through natural conversation.
    
    ## Features
    - **Natural Dialogue**: No rigid questions, just conversation
    - **Multiple Depths**: Shallow (5-10 min), Standard (20-30 min), Deep (40-60 min)
    - **Real-time Progress**: Track assessment progress and predictions
    - **Rate Limiting**: Built-in protection against abuse
    
    ## Getting Started
    1. Create a session with `POST /api/chat/start`
    2. Send messages with `POST /api/chat/message`
    3. Continue until `is_finished` is `true`
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================
# Middleware
# ============================================================

# CORS Configuration - allow all origins for public tunnel access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors gracefully."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )


# ============================================================
# Health Check Endpoints
# ============================================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "start_session": "POST /api/chat/start",
            "send_message": "POST /api/chat/message",
            "get_history": "GET /api/chat/history/{session_id}",
            "get_status": "GET /api/chat/status/{session_id}",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns the status of all critical services.
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "services": {
            "database": "connected",
            "gemini": "configured" if settings.GEMINI_API_KEY else "not_configured",
            "nano_banana": "reserved" if settings.NANO_BANANA_KEY else "not_configured",
        },
    }


@app.get("/rate-limit", tags=["Health"])
async def get_rate_limit_info(request: Request):
    """
    Get current rate limit status for the requesting IP.
    
    Useful for clients to display remaining quota.
    """
    from app.dependencies import get_client_ip, rate_limiter
    
    client_ip = get_client_ip(request)
    stats = rate_limiter.get_usage_stats(client_ip)
    
    return {
        "client_ip": client_ip,
        "usage": stats,
        "limits": {
            "sessions_per_day": 5,
            "messages_per_day": 100,
            "messages_per_minute": 10,
        },
    }


# ============================================================
# API Routers
# ============================================================

from app.routers import chat, analytics

# Main chat API - handles sessions, messages, and image generation
app.include_router(
    chat.router,
    prefix="/api/chat",
    tags=["Chat"],
)

# Analytics API - handles user tracking, events, and feedback
app.include_router(
    analytics.router,
    prefix="/api/analytics",
    tags=["Analytics"],
)


# ============================================================
# Development Server
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
