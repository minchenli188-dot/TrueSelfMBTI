"""
Analytics database models for user information collection and usage tracking.

This module provides:
- UserProfile: Optional demographic and preference data
- UserEvent: User action and behavior tracking
- UserFeedback: User feedback and ratings collection
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.database import Base


class UserProfile(Base):
    """
    Optional user profile for demographic data collection.
    
    Users can optionally provide this information at the start
    or end of their MBTI assessment journey.
    """
    __tablename__ = "user_profiles"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Anonymous tracking ID (stored in browser localStorage)
    # This allows tracking across sessions without requiring login
    anonymous_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    
    # Optional demographic data
    age_range: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g., "18-24", "25-34"
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    education: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # How did they find us?
    referral_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "google", "friend", "social_media"
    
    # MBTI history (self-reported)
    previous_mbti: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)  # If they know their type already
    mbti_familiarity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "never_heard", "know_basics", "expert"
    
    # Preferences
    language: Mapped[str] = mapped_column(String(10), default="zh-CN")
    
    # Consent and privacy
    marketing_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Only if consented
    
    # Device and technical info
    device_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # mobile, tablet, desktop
    browser: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    os: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    screen_resolution: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # UTM parameters for marketing attribution
    utm_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_medium: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_campaign: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relationships
    events: Mapped[list["UserEvent"]] = relationship(back_populates="user_profile", cascade="all, delete-orphan")
    feedbacks: Mapped[list["UserFeedback"]] = relationship(back_populates="user_profile", cascade="all, delete-orphan")


class UserEvent(Base):
    """
    User event tracking for analytics.
    
    Tracks all user interactions with the product for:
    - Funnel analysis (how users progress through the assessment)
    - Feature usage (which features are most/least used)
    - Drop-off points (where users abandon the process)
    - Performance metrics (time spent, completion rates)
    """
    __tablename__ = "user_events"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # User identification
    anonymous_id: Mapped[str] = mapped_column(String(64), index=True)
    user_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("user_profiles.id", ondelete="SET NULL"),
        nullable=True
    )
    session_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # MBTI session ID
    
    # Event details
    event_name: Mapped[str] = mapped_column(String(100), index=True)  # e.g., "page_view", "session_start", "message_sent"
    event_category: Mapped[str] = mapped_column(String(50), index=True)  # e.g., "navigation", "chat", "result", "feedback"
    
    # Event data (flexible JSON for any additional properties)
    event_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Page/screen information
    page_path: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    page_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Timing
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Time spent on action
    
    # Client info for this event
    client_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Relationships
    user_profile: Mapped[Optional["UserProfile"]] = relationship(back_populates="events")
    
    # Composite index for efficient querying
    __table_args__ = (
        Index("ix_user_events_anon_timestamp", "anonymous_id", "timestamp"),
        Index("ix_user_events_session_event", "session_id", "event_name"),
    )


class UserInsight(Base):
    """
    Extracted user insights from conversation.
    
    This stores demographic and behavioral data inferred
    from the MBTI conversation without explicit collection.
    """
    __tablename__ = "user_insights"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Link to session
    session_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    anonymous_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    
    # MBTI result
    mbti_result: Mapped[str] = mapped_column(String(10))
    
    # Inferred demographics
    estimated_age_range: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    estimated_gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    occupation_hints: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    education_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    life_stage: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Interests
    mentioned_hobbies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    mentioned_interests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    career_field: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Communication style
    communication_style: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    language_complexity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    response_length_tendency: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    emoji_usage: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Personality indicators
    self_awareness_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    openness_in_sharing: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Engagement
    engagement_quality: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    thoughtfulness: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    
    # Context
    cultural_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Analysis metadata
    key_topics_discussed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    notable_quotes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserFeedback(Base):
    """
    User feedback collection.
    
    Collects:
    - NPS (Net Promoter Score)
    - Feature requests
    - Bug reports
    - General feedback
    - Result satisfaction ratings
    """
    __tablename__ = "user_feedbacks"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # User identification
    anonymous_id: Mapped[str] = mapped_column(String(64), index=True)
    user_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("user_profiles.id", ondelete="SET NULL"),
        nullable=True
    )
    session_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # MBTI session ID
    
    # Feedback type
    feedback_type: Mapped[str] = mapped_column(String(50))  # "nps", "result_rating", "feature_request", "bug_report", "general"
    
    # Ratings (0-10 scale)
    nps_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0-10: How likely to recommend?
    result_accuracy: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5: How accurate was the result?
    experience_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5: Overall experience
    
    # Text feedback
    feedback_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Context
    mbti_result: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # The MBTI result they got
    page_context: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Where feedback was submitted from
    
    # Additional data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Client info
    client_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user_profile: Mapped[Optional["UserProfile"]] = relationship(back_populates="feedbacks")


# ============================================================
# Predefined Event Names and Categories
# ============================================================

class EventNames:
    """Standard event names for consistency."""
    
    # Page/Navigation events
    PAGE_VIEW = "page_view"
    PAGE_LEAVE = "page_leave"
    
    # Session lifecycle
    SESSION_START = "session_start"
    SESSION_COMPLETE = "session_complete"
    SESSION_ABANDON = "session_abandon"
    SESSION_UPGRADE = "session_upgrade"
    
    # Chat events
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    
    # Result events
    RESULT_VIEW = "result_view"
    RESULT_SHARE = "result_share"
    IMAGE_GENERATE = "image_generate"
    IMAGE_DOWNLOAD = "image_download"
    
    # Q&A events
    QA_START = "qa_start"
    QA_QUESTION = "qa_question"
    
    # User engagement
    BUTTON_CLICK = "button_click"
    DEPTH_SELECT = "depth_select"
    RESTART = "restart"
    
    # Feedback
    FEEDBACK_SUBMIT = "feedback_submit"
    NPS_SUBMIT = "nps_submit"


class EventCategories:
    """Standard event categories."""
    NAVIGATION = "navigation"
    CHAT = "chat"
    RESULT = "result"
    FEEDBACK = "feedback"
    ENGAGEMENT = "engagement"
    SYSTEM = "system"

