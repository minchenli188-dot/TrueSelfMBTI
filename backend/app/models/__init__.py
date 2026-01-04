"""
Models package for MBTI Assistant.
Contains Pydantic schemas and SQLAlchemy database models.
"""
from app.models.database import (
    Base,
    Session,
    Message,
    Analysis,
    init_db,
    get_db,
    engine,
    async_session_factory,
)
from app.models.schemas import (
    MBTIType,
    MBTIGroup,
    AnalysisDepth,
    MessageRole,
    DimensionScore,
    AnalysisResult,
    get_group_for_type,
    get_color_for_group,
)
from app.models.analytics import (
    UserProfile,
    UserEvent,
    UserFeedback,
    UserInsight,
    EventNames,
    EventCategories,
)
from app.models.analytics_schemas import (
    UserProfileCreate,
    UserProfileResponse,
    UserEventCreate,
    UserEventBatchCreate,
    UserEventResponse,
    UserFeedbackCreate,
    UserFeedbackResponse,
    AnalyticsStatsResponse,
)

__all__ = [
    # Database
    "Base",
    "Session",
    "Message",
    "Analysis",
    "init_db",
    "get_db",
    "engine",
    "async_session_factory",
    # Schemas
    "MBTIType",
    "MBTIGroup",
    "AnalysisDepth",
    "MessageRole",
    "DimensionScore",
    "AnalysisResult",
    "get_group_for_type",
    "get_color_for_group",
    # Analytics Models
    "UserProfile",
    "UserEvent",
    "UserFeedback",
    "UserInsight",
    "EventNames",
    "EventCategories",
    # Analytics Schemas
    "UserProfileCreate",
    "UserProfileResponse",
    "UserEventCreate",
    "UserEventBatchCreate",
    "UserEventResponse",
    "UserFeedbackCreate",
    "UserFeedbackResponse",
    "AnalyticsStatsResponse",
]
