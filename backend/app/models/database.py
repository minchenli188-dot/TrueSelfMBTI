"""
SQLAlchemy database models for MBTI Assistant.
Includes Session, Message, and Analysis models with full relationship support.
"""
import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.config import settings


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


class Session(Base):
    """
    Conversation session model.
    Tracks the entire MBTI assessment conversation lifecycle.
    """
    __tablename__ = "sessions"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    
    # Session configuration
    depth: Mapped[str] = mapped_column(String(20), default="standard")  # shallow/standard/deep
    language: Mapped[str] = mapped_column(String(10), default="zh-CN")
    user_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Security & tracking
    client_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 max length
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Session state
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    current_round: Mapped[int] = mapped_column(Integer, default=0)
    
    # Precision continuation tracking
    # Tracks the round when user last clicked "continue for precision"
    # Used to enforce minimum extra questions before allowing early finish again
    continue_precision_round: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
    
    # Current prediction state (updated each round)
    current_prediction: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    confidence_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    progress: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Deep mode specific fields (stored as JSON)
    cognitive_stack: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    development_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relationships
    messages: Mapped[list["Message"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    analysis: Mapped[Optional["Analysis"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        uselist=False
    )
    
    def get_cognitive_stack(self) -> Optional[list[str]]:
        """Parse cognitive_stack JSON to list."""
        if self.cognitive_stack:
            try:
                return json.loads(self.cognitive_stack)
            except json.JSONDecodeError:
                return None
        return None
    
    def set_cognitive_stack(self, stack: list[str]) -> None:
        """Set cognitive_stack from list."""
        self.cognitive_stack = json.dumps(stack)


class Message(Base):
    """
    Chat message model.
    Stores both user messages and AI responses with metadata.
    """
    __tablename__ = "messages"
    
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        index=True
    )
    
    # Message content
    role: Mapped[str] = mapped_column(String(20))  # user, model, system
    content: Mapped[str] = mapped_column(Text)
    
    # AI response metadata (stored as JSON)
    # Contains: is_finished, current_prediction, confidence_score, progress, etc.
    ai_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )
    
    # Relationships
    session: Mapped["Session"] = relationship(back_populates="messages")
    
    def get_metadata_value(self, key: str, default=None):
        """Safely get a value from ai_metadata."""
        if self.ai_metadata and isinstance(self.ai_metadata, dict):
            return self.ai_metadata.get(key, default)
        return default


class Analysis(Base):
    """
    Final MBTI analysis result model.
    Created when the assessment is complete.
    """
    __tablename__ = "analyses"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True
    )
    
    # Final result
    mbti_type: Mapped[str] = mapped_column(String(4))
    group: Mapped[str] = mapped_column(String(20))  # analyst/diplomat/sentinel/explorer
    
    # Dimension scores (0-100, where 50 is neutral)
    ei_score: Mapped[float] = mapped_column(Float, default=50.0)  # E < 50, I > 50
    sn_score: Mapped[float] = mapped_column(Float, default=50.0)  # S < 50, N > 50
    tf_score: Mapped[float] = mapped_column(Float, default=50.0)  # T < 50, F > 50
    jp_score: Mapped[float] = mapped_column(Float, default=50.0)  # J < 50, P > 50
    
    # Confidence levels (0-1)
    ei_confidence: Mapped[float] = mapped_column(Float, default=0.5)
    sn_confidence: Mapped[float] = mapped_column(Float, default=0.5)
    tf_confidence: Mapped[float] = mapped_column(Float, default=0.5)
    jp_confidence: Mapped[float] = mapped_column(Float, default=0.5)
    
    # Deep mode results
    cognitive_stack: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    development_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Rich text results
    summary: Mapped[str] = mapped_column(Text)
    strengths: Mapped[str] = mapped_column(Text)  # JSON array
    growth_areas: Mapped[str] = mapped_column(Text)  # JSON array
    
    # Meta
    is_final: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    
    # Relationships
    session: Mapped["Session"] = relationship(back_populates="analysis")


# ============================================================
# Database Engine & Session Factory
# ============================================================

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize database tables."""
    # Import analytics models to ensure they're registered with Base
    from app.models.analytics import UserProfile, UserEvent, UserFeedback, UserInsight
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Run migrations for new columns (SQLite ALTER TABLE)
        try:
            # Add continue_precision_round column if it doesn't exist
            await conn.execute(
                text("ALTER TABLE sessions ADD COLUMN continue_precision_round INTEGER")
            )
        except Exception:
            # Column already exists, ignore
            pass


async def get_db() -> AsyncSession:
    """
    Dependency that provides a database session.
    Automatically handles commit/rollback and cleanup.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
