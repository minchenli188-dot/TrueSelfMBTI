"""
Simplified User Tracking System.

This module provides clean, actionable user analytics:
- Total unique users
- Complete conversation history per user
- Mode selection journey (shallow → standard → deep)
- Image generation tracking
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.database import Base


class UserTracker(Base):
    """
    Tracks unique users across all their sessions.
    
    Each browser gets a unique anonymous_id stored in localStorage.
    This table links all sessions for a single user together.
    """
    __tablename__ = "user_trackers"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Unique identifier from browser localStorage
    anonymous_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    
    # All session IDs for this user (JSON array)
    session_ids: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of session IDs
    
    # Mode journey tracking (JSON array in order)
    # e.g., ["shallow", "standard"] means user did shallow first, then continued to standard
    mode_journey: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    
    # Statistics
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    completed_sessions: Mapped[int] = mapped_column(Integer, default=0)
    
    # Image generation tracking
    generated_image: Mapped[bool] = mapped_column(Boolean, default=False)
    image_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Final MBTI results (JSON array of results from completed sessions)
    # e.g., [{"session_id": "xxx", "result": "INTJ", "mode": "deep", "timestamp": "..."}]
    mbti_results: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    
    # Device info (from first session)
    device_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    os: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Timestamps
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Indexes for efficient querying
    __table_args__ = (
        Index("ix_user_trackers_first_seen", "first_seen"),
        Index("ix_user_trackers_last_seen", "last_seen"),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        import json
        return {
            "id": self.id,
            "anonymous_id": self.anonymous_id,
            "session_ids": json.loads(self.session_ids) if self.session_ids else [],
            "mode_journey": json.loads(self.mode_journey) if self.mode_journey else [],
            "total_sessions": self.total_sessions,
            "completed_sessions": self.completed_sessions,
            "generated_image": self.generated_image,
            "image_generated_at": self.image_generated_at.isoformat() if self.image_generated_at else None,
            "mbti_results": json.loads(self.mbti_results) if self.mbti_results else [],
            "device_type": self.device_type,
            "browser": self.browser,
            "os": self.os,
            "first_seen": self.first_seen.isoformat(),
            "last_seen": self.last_seen.isoformat(),
        }

