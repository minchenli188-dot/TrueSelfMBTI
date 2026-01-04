"""
Pydantic schemas for analytics API request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ============================================================
# User Profile Schemas
# ============================================================

class UserProfileCreate(BaseModel):
    """Schema for creating/updating a user profile."""
    anonymous_id: str = Field(..., min_length=1, max_length=64)
    
    # Optional demographic data
    age_range: Optional[str] = Field(None, max_length=20)
    gender: Optional[str] = Field(None, max_length=20)
    occupation: Optional[str] = Field(None, max_length=100)
    education: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    
    # Referral
    referral_source: Optional[str] = Field(None, max_length=100)
    
    # MBTI history
    previous_mbti: Optional[str] = Field(None, max_length=4)
    mbti_familiarity: Optional[str] = Field(None, max_length=20)
    
    # Preferences
    language: str = Field(default="zh-CN", max_length=10)
    
    # Consent
    marketing_consent: bool = Field(default=False)
    email: Optional[str] = Field(None, max_length=255)
    
    # Device info
    device_type: Optional[str] = Field(None, max_length=20)
    browser: Optional[str] = Field(None, max_length=50)
    os: Optional[str] = Field(None, max_length=50)
    screen_resolution: Optional[str] = Field(None, max_length=20)
    
    # UTM
    utm_source: Optional[str] = Field(None, max_length=100)
    utm_medium: Optional[str] = Field(None, max_length=100)
    utm_campaign: Optional[str] = Field(None, max_length=100)


class UserProfileResponse(BaseModel):
    """Response schema for user profile."""
    id: str
    anonymous_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================
# User Event Schemas
# ============================================================

class UserEventCreate(BaseModel):
    """Schema for logging a user event."""
    anonymous_id: str = Field(..., min_length=1, max_length=64)
    session_id: Optional[str] = Field(None, max_length=36)
    
    event_name: str = Field(..., min_length=1, max_length=100)
    event_category: str = Field(..., min_length=1, max_length=50)
    
    event_data: Optional[dict] = None
    
    page_path: Optional[str] = Field(None, max_length=200)
    page_title: Optional[str] = Field(None, max_length=200)
    
    duration_seconds: Optional[float] = None


class UserEventBatchCreate(BaseModel):
    """Schema for batch logging multiple events."""
    events: list[UserEventCreate] = Field(..., min_length=1, max_length=100)


class UserEventResponse(BaseModel):
    """Response schema for logged event."""
    id: int
    event_name: str
    event_category: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============================================================
# User Feedback Schemas
# ============================================================

class UserFeedbackCreate(BaseModel):
    """Schema for submitting user feedback."""
    anonymous_id: str = Field(..., min_length=1, max_length=64)
    session_id: Optional[str] = Field(None, max_length=36)
    
    feedback_type: str = Field(..., min_length=1, max_length=50)
    
    # Ratings
    nps_score: Optional[int] = Field(None, ge=0, le=10)
    result_accuracy: Optional[int] = Field(None, ge=1, le=5)
    experience_rating: Optional[int] = Field(None, ge=1, le=5)
    
    # Text feedback
    feedback_text: Optional[str] = Field(None, max_length=5000)
    
    # Context
    mbti_result: Optional[str] = Field(None, max_length=10)
    page_context: Optional[str] = Field(None, max_length=200)
    
    # Additional data
    extra_data: Optional[dict] = None


class UserFeedbackResponse(BaseModel):
    """Response schema for submitted feedback."""
    id: str
    feedback_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================
# Analytics Stats Schemas (for admin dashboard)
# ============================================================

class AnalyticsSummary(BaseModel):
    """Summary analytics stats."""
    total_users: int
    total_sessions: int
    total_events: int
    total_feedbacks: int
    
    # Completion rates
    completion_rate: float
    average_session_duration_seconds: float
    
    # Time range
    period_start: datetime
    period_end: datetime


class EventCountByName(BaseModel):
    """Event count grouped by name."""
    event_name: str
    count: int


class EventCountByDay(BaseModel):
    """Daily event counts."""
    date: str
    count: int


class FeedbackSummary(BaseModel):
    """Feedback statistics summary."""
    average_nps: Optional[float]
    nps_promoters: int  # 9-10
    nps_passives: int   # 7-8
    nps_detractors: int # 0-6
    
    average_result_accuracy: Optional[float]
    average_experience_rating: Optional[float]
    
    total_feedbacks: int


class DepthDistribution(BaseModel):
    """Distribution of users by depth selection."""
    shallow: int
    standard: int
    deep: int


class MBTIResultDistribution(BaseModel):
    """Distribution of MBTI results."""
    mbti_type: str
    count: int
    percentage: float


class AnalyticsStatsResponse(BaseModel):
    """Comprehensive analytics stats response."""
    summary: AnalyticsSummary
    events_by_name: list[EventCountByName]
    events_by_day: list[EventCountByDay]
    feedback_summary: FeedbackSummary
    depth_distribution: DepthDistribution
    mbti_distribution: list[MBTIResultDistribution]

