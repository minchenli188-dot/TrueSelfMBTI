"""
Analytics API router for user information collection and usage tracking.

Provides endpoints for:
- User profile creation and updates
- Event tracking
- Feedback submission
- Analytics statistics (admin)
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_client_ip
from app.models.database import get_db, Session as MBTISession, Message
from app.models.analytics import UserProfile, UserEvent, UserFeedback, UserInsight
from app.models.analytics_schemas import (
    UserProfileCreate,
    UserProfileResponse,
    UserEventCreate,
    UserEventBatchCreate,
    UserEventResponse,
    UserFeedbackCreate,
    UserFeedbackResponse,
    AnalyticsStatsResponse,
    AnalyticsSummary,
    EventCountByName,
    EventCountByDay,
    FeedbackSummary,
    DepthDistribution,
    MBTIResultDistribution,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================
# User Profile Endpoints
# ============================================================

@router.post("/profile", response_model=UserProfileResponse)
async def create_or_update_profile(
    request: Request,
    data: UserProfileCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create or update a user profile.
    
    Uses anonymous_id to identify returning users.
    If profile exists, updates it; otherwise creates new.
    """
    client_ip = get_client_ip(request)
    
    # Check if profile exists
    result = await db.execute(
        select(UserProfile).where(UserProfile.anonymous_id == data.anonymous_id)
    )
    profile = result.scalar_one_or_none()
    
    if profile:
        # Update existing profile
        for key, value in data.model_dump(exclude_unset=True).items():
            if key != "anonymous_id" and value is not None:
                setattr(profile, key, value)
        profile.updated_at = datetime.utcnow()
    else:
        # Create new profile
        profile = UserProfile(
            **data.model_dump(),
        )
        db.add(profile)
    
    await db.flush()
    
    logger.info(
        "Profile %s: anonymous_id=%s",
        "updated" if profile.id else "created",
        data.anonymous_id[:8] + "..."
    )
    
    return UserProfileResponse(
        id=profile.id,
        anonymous_id=profile.anonymous_id,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/profile/{anonymous_id}", response_model=Optional[UserProfileResponse])
async def get_profile(
    anonymous_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get user profile by anonymous ID."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.anonymous_id == anonymous_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        return None
    
    return UserProfileResponse(
        id=profile.id,
        anonymous_id=profile.anonymous_id,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


# ============================================================
# Event Tracking Endpoints
# ============================================================

@router.post("/event", response_model=UserEventResponse)
async def log_event(
    request: Request,
    data: UserEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Log a single user event.
    
    Used for tracking user actions like page views,
    button clicks, session events, etc.
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")[:500]
    
    # Find user profile if exists
    result = await db.execute(
        select(UserProfile.id).where(UserProfile.anonymous_id == data.anonymous_id)
    )
    profile_row = result.first()
    user_profile_id = profile_row[0] if profile_row else None
    
    event = UserEvent(
        anonymous_id=data.anonymous_id,
        user_profile_id=user_profile_id,
        session_id=data.session_id,
        event_name=data.event_name,
        event_category=data.event_category,
        event_data=data.event_data,
        page_path=data.page_path,
        page_title=data.page_title,
        duration_seconds=data.duration_seconds,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    
    db.add(event)
    await db.flush()
    
    logger.debug(
        "Event logged: %s/%s for anonymous_id=%s",
        data.event_category,
        data.event_name,
        data.anonymous_id[:8] + "..."
    )
    
    return UserEventResponse(
        id=event.id,
        event_name=event.event_name,
        event_category=event.event_category,
        timestamp=event.timestamp,
    )


@router.post("/events/batch", response_model=list[UserEventResponse])
async def log_events_batch(
    request: Request,
    data: UserEventBatchCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Log multiple events in a single request.
    
    Useful for batch processing events collected client-side.
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")[:500]
    
    responses = []
    
    for event_data in data.events:
        # Find user profile if exists
        result = await db.execute(
            select(UserProfile.id).where(UserProfile.anonymous_id == event_data.anonymous_id)
        )
        profile_row = result.first()
        user_profile_id = profile_row[0] if profile_row else None
        
        event = UserEvent(
            anonymous_id=event_data.anonymous_id,
            user_profile_id=user_profile_id,
            session_id=event_data.session_id,
            event_name=event_data.event_name,
            event_category=event_data.event_category,
            event_data=event_data.event_data,
            page_path=event_data.page_path,
            page_title=event_data.page_title,
            duration_seconds=event_data.duration_seconds,
            client_ip=client_ip,
            user_agent=user_agent,
        )
        db.add(event)
        await db.flush()
        
        responses.append(UserEventResponse(
            id=event.id,
            event_name=event.event_name,
            event_category=event.event_category,
            timestamp=event.timestamp,
        ))
    
    logger.info("Batch logged %d events", len(responses))
    
    return responses


# ============================================================
# Feedback Endpoints
# ============================================================

@router.post("/feedback", response_model=UserFeedbackResponse)
async def submit_feedback(
    request: Request,
    data: UserFeedbackCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit user feedback.
    
    Supports various feedback types:
    - nps: Net Promoter Score (0-10)
    - result_rating: How accurate was the MBTI result (1-5)
    - feature_request: Feature suggestions
    - bug_report: Bug reports
    - general: General feedback
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")[:500]
    
    # Find user profile if exists
    result = await db.execute(
        select(UserProfile.id).where(UserProfile.anonymous_id == data.anonymous_id)
    )
    profile_row = result.first()
    user_profile_id = profile_row[0] if profile_row else None
    
    feedback = UserFeedback(
        anonymous_id=data.anonymous_id,
        user_profile_id=user_profile_id,
        session_id=data.session_id,
        feedback_type=data.feedback_type,
        nps_score=data.nps_score,
        result_accuracy=data.result_accuracy,
        experience_rating=data.experience_rating,
        feedback_text=data.feedback_text,
        mbti_result=data.mbti_result,
        page_context=data.page_context,
        extra_data=data.extra_data,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    
    db.add(feedback)
    await db.flush()
    
    logger.info(
        "Feedback submitted: type=%s, anonymous_id=%s",
        data.feedback_type,
        data.anonymous_id[:8] + "..."
    )
    
    return UserFeedbackResponse(
        id=feedback.id,
        feedback_type=feedback.feedback_type,
        created_at=feedback.created_at,
    )


# ============================================================
# User Insight Extraction Endpoints
# ============================================================

class ExtractInsightsRequest(BaseModel):
    """Request schema for extracting user insights from conversation."""
    session_id: str = Field(..., description="Session UUID")
    anonymous_id: Optional[str] = Field(None, max_length=64)


class ExtractInsightsResponse(BaseModel):
    """Response schema for extracted insights."""
    session_id: str
    mbti_result: str
    insights_extracted: bool
    estimated_age_range: Optional[str] = None
    estimated_gender: Optional[str] = None
    life_stage: Optional[str] = None
    career_field: Optional[str] = None
    communication_style: Optional[str] = None
    engagement_quality: Optional[str] = None
    key_topics: Optional[list[str]] = None
    confidence_score: float = 0.0


@router.post("/extract-insights", response_model=ExtractInsightsResponse)
async def extract_user_insights(
    request: Request,
    data: ExtractInsightsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Extract user insights from a completed MBTI session.
    
    This endpoint analyzes the conversation history to infer
    user demographics and behavioral patterns without explicit
    data collection.
    
    Should be called after a session is completed.
    """
    from sqlalchemy.orm import selectinload
    from app.services.user_insight_extractor import user_insight_extractor
    import json
    
    # Check if insights already exist for this session
    existing = await db.execute(
        select(UserInsight).where(UserInsight.session_id == data.session_id)
    )
    if existing.scalar_one_or_none():
        logger.info("Insights already extracted for session %s", data.session_id)
        return ExtractInsightsResponse(
            session_id=data.session_id,
            mbti_result="",
            insights_extracted=False,
        )
    
    # Fetch session with messages
    result = await db.execute(
        select(MBTISession)
        .options(selectinload(MBTISession.messages))
        .where(MBTISession.id == data.session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        logger.warning("Session %s not found for insight extraction", data.session_id)
        return ExtractInsightsResponse(
            session_id=data.session_id,
            mbti_result="",
            insights_extracted=False,
        )
    
    if not session.is_complete:
        logger.info("Session %s not complete, skipping insight extraction", data.session_id)
        return ExtractInsightsResponse(
            session_id=data.session_id,
            mbti_result=session.current_prediction or "",
            insights_extracted=False,
        )
    
    # Build conversation history
    conversation_history = []
    for msg in sorted(session.messages, key=lambda m: m.created_at):
        if msg.role == "system":
            continue
        conversation_history.append({
            "role": msg.role,
            "content": msg.content,
        })
    
    # Extract insights using AI
    insights = await user_insight_extractor.extract_insights(
        conversation_history=conversation_history,
        mbti_result=session.current_prediction or "Unknown",
        language=session.language,
    )
    
    # Store insights
    user_insight = UserInsight(
        session_id=data.session_id,
        anonymous_id=data.anonymous_id,
        mbti_result=session.current_prediction or "Unknown",
        estimated_age_range=insights.estimated_age_range,
        estimated_gender=insights.estimated_gender,
        occupation_hints=insights.occupation_hints,
        education_level=insights.education_level,
        life_stage=insights.life_stage,
        mentioned_hobbies=json.dumps(insights.mentioned_hobbies) if insights.mentioned_hobbies else None,
        mentioned_interests=json.dumps(insights.mentioned_interests) if insights.mentioned_interests else None,
        career_field=insights.career_field,
        communication_style=insights.communication_style,
        language_complexity=insights.language_complexity,
        response_length_tendency=insights.response_length_tendency,
        emoji_usage=insights.emoji_usage,
        self_awareness_level=insights.self_awareness_level,
        openness_in_sharing=insights.openness_in_sharing,
        engagement_quality=insights.engagement_quality,
        thoughtfulness=insights.thoughtfulness,
        cultural_context=insights.cultural_context,
        key_topics_discussed=json.dumps(insights.key_topics_discussed) if insights.key_topics_discussed else None,
        notable_quotes=json.dumps(insights.notable_quotes) if insights.notable_quotes else None,
        confidence_score=insights.confidence_score,
    )
    
    db.add(user_insight)
    await db.flush()
    
    logger.info(
        "User insights extracted: session=%s, age=%s, career=%s, confidence=%.2f",
        data.session_id,
        insights.estimated_age_range,
        insights.career_field,
        insights.confidence_score,
    )
    
    return ExtractInsightsResponse(
        session_id=data.session_id,
        mbti_result=session.current_prediction or "Unknown",
        insights_extracted=True,
        estimated_age_range=insights.estimated_age_range,
        estimated_gender=insights.estimated_gender,
        life_stage=insights.life_stage,
        career_field=insights.career_field,
        communication_style=insights.communication_style,
        engagement_quality=insights.engagement_quality,
        key_topics=insights.key_topics_discussed,
        confidence_score=insights.confidence_score,
    )


@router.get("/insights/export")
async def export_insights(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
):
    """
    Export extracted user insights for analysis.
    
    Returns insight data for the specified time period.
    In production, add authentication.
    """
    import json
    
    period_start = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(UserInsight)
        .where(UserInsight.created_at >= period_start)
        .order_by(UserInsight.created_at.desc())
        .limit(limit)
    )
    insights = result.scalars().all()
    
    return {
        "total": len(insights),
        "period_days": days,
        "insights": [
            {
                "id": i.id,
                "session_id": i.session_id,
                "mbti_result": i.mbti_result,
                "estimated_age_range": i.estimated_age_range,
                "estimated_gender": i.estimated_gender,
                "life_stage": i.life_stage,
                "career_field": i.career_field,
                "communication_style": i.communication_style,
                "engagement_quality": i.engagement_quality,
                "key_topics": json.loads(i.key_topics_discussed) if i.key_topics_discussed else None,
                "confidence_score": i.confidence_score,
                "created_at": i.created_at.isoformat(),
            }
            for i in insights
        ]
    }


# ============================================================
# Analytics Stats Endpoints (Admin)
# ============================================================

@router.get("/stats", response_model=AnalyticsStatsResponse)
async def get_analytics_stats(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get comprehensive analytics statistics.
    
    This endpoint is intended for admin/dashboard use.
    In production, you should add authentication.
    """
    now = datetime.utcnow()
    period_start = now - timedelta(days=days)
    
    # Total users
    total_users_result = await db.execute(
        select(func.count(UserProfile.id))
    )
    total_users = total_users_result.scalar() or 0
    
    # Total MBTI sessions
    total_sessions_result = await db.execute(
        select(func.count(MBTISession.id)).where(
            MBTISession.created_at >= period_start
        )
    )
    total_sessions = total_sessions_result.scalar() or 0
    
    # Total events
    total_events_result = await db.execute(
        select(func.count(UserEvent.id)).where(
            UserEvent.timestamp >= period_start
        )
    )
    total_events = total_events_result.scalar() or 0
    
    # Total feedbacks
    total_feedbacks_result = await db.execute(
        select(func.count(UserFeedback.id)).where(
            UserFeedback.created_at >= period_start
        )
    )
    total_feedbacks = total_feedbacks_result.scalar() or 0
    
    # Completion rate
    completed_sessions_result = await db.execute(
        select(func.count(MBTISession.id)).where(
            and_(
                MBTISession.created_at >= period_start,
                MBTISession.is_complete == True
            )
        )
    )
    completed_sessions = completed_sessions_result.scalar() or 0
    completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
    
    # Average session duration (based on events)
    # This is a simplified calculation
    avg_duration = 0.0
    
    # Events by name
    events_by_name_result = await db.execute(
        select(UserEvent.event_name, func.count(UserEvent.id))
        .where(UserEvent.timestamp >= period_start)
        .group_by(UserEvent.event_name)
        .order_by(func.count(UserEvent.id).desc())
        .limit(20)
    )
    events_by_name = [
        EventCountByName(event_name=row[0], count=row[1])
        for row in events_by_name_result.fetchall()
    ]
    
    # Events by day
    # SQLite date function
    events_by_day_result = await db.execute(
        select(
            func.date(UserEvent.timestamp).label("date"),
            func.count(UserEvent.id)
        )
        .where(UserEvent.timestamp >= period_start)
        .group_by(func.date(UserEvent.timestamp))
        .order_by(func.date(UserEvent.timestamp))
    )
    events_by_day = [
        EventCountByDay(date=str(row[0]), count=row[1])
        for row in events_by_day_result.fetchall()
    ]
    
    # Feedback summary
    nps_result = await db.execute(
        select(func.avg(UserFeedback.nps_score)).where(
            and_(
                UserFeedback.created_at >= period_start,
                UserFeedback.nps_score.isnot(None)
            )
        )
    )
    average_nps = nps_result.scalar()
    
    # NPS breakdown
    promoters_result = await db.execute(
        select(func.count(UserFeedback.id)).where(
            and_(
                UserFeedback.created_at >= period_start,
                UserFeedback.nps_score >= 9
            )
        )
    )
    nps_promoters = promoters_result.scalar() or 0
    
    passives_result = await db.execute(
        select(func.count(UserFeedback.id)).where(
            and_(
                UserFeedback.created_at >= period_start,
                UserFeedback.nps_score >= 7,
                UserFeedback.nps_score <= 8
            )
        )
    )
    nps_passives = passives_result.scalar() or 0
    
    detractors_result = await db.execute(
        select(func.count(UserFeedback.id)).where(
            and_(
                UserFeedback.created_at >= period_start,
                UserFeedback.nps_score <= 6,
                UserFeedback.nps_score.isnot(None)
            )
        )
    )
    nps_detractors = detractors_result.scalar() or 0
    
    avg_result_accuracy_result = await db.execute(
        select(func.avg(UserFeedback.result_accuracy)).where(
            and_(
                UserFeedback.created_at >= period_start,
                UserFeedback.result_accuracy.isnot(None)
            )
        )
    )
    average_result_accuracy = avg_result_accuracy_result.scalar()
    
    avg_experience_result = await db.execute(
        select(func.avg(UserFeedback.experience_rating)).where(
            and_(
                UserFeedback.created_at >= period_start,
                UserFeedback.experience_rating.isnot(None)
            )
        )
    )
    average_experience_rating = avg_experience_result.scalar()
    
    # Depth distribution
    shallow_count_result = await db.execute(
        select(func.count(MBTISession.id)).where(
            and_(
                MBTISession.created_at >= period_start,
                MBTISession.depth == "shallow"
            )
        )
    )
    shallow_count = shallow_count_result.scalar() or 0
    
    standard_count_result = await db.execute(
        select(func.count(MBTISession.id)).where(
            and_(
                MBTISession.created_at >= period_start,
                MBTISession.depth == "standard"
            )
        )
    )
    standard_count = standard_count_result.scalar() or 0
    
    deep_count_result = await db.execute(
        select(func.count(MBTISession.id)).where(
            and_(
                MBTISession.created_at >= period_start,
                MBTISession.depth == "deep"
            )
        )
    )
    deep_count = deep_count_result.scalar() or 0
    
    # MBTI distribution
    mbti_dist_result = await db.execute(
        select(MBTISession.current_prediction, func.count(MBTISession.id))
        .where(
            and_(
                MBTISession.created_at >= period_start,
                MBTISession.is_complete == True,
                MBTISession.current_prediction.isnot(None)
            )
        )
        .group_by(MBTISession.current_prediction)
        .order_by(func.count(MBTISession.id).desc())
    )
    mbti_rows = mbti_dist_result.fetchall()
    total_completed = sum(row[1] for row in mbti_rows) if mbti_rows else 1
    mbti_distribution = [
        MBTIResultDistribution(
            mbti_type=row[0] or "Unknown",
            count=row[1],
            percentage=round(row[1] / total_completed * 100, 1) if total_completed > 0 else 0
        )
        for row in mbti_rows
    ]
    
    return AnalyticsStatsResponse(
        summary=AnalyticsSummary(
            total_users=total_users,
            total_sessions=total_sessions,
            total_events=total_events,
            total_feedbacks=total_feedbacks,
            completion_rate=round(completion_rate, 1),
            average_session_duration_seconds=avg_duration,
            period_start=period_start,
            period_end=now,
        ),
        events_by_name=events_by_name,
        events_by_day=events_by_day,
        feedback_summary=FeedbackSummary(
            average_nps=round(average_nps, 1) if average_nps else None,
            nps_promoters=nps_promoters,
            nps_passives=nps_passives,
            nps_detractors=nps_detractors,
            average_result_accuracy=round(average_result_accuracy, 1) if average_result_accuracy else None,
            average_experience_rating=round(average_experience_rating, 1) if average_experience_rating else None,
            total_feedbacks=total_feedbacks,
        ),
        depth_distribution=DepthDistribution(
            shallow=shallow_count,
            standard=standard_count,
            deep=deep_count,
        ),
        mbti_distribution=mbti_distribution,
    )


@router.get("/events/export")
async def export_events(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10000, ge=1, le=100000),
    db: AsyncSession = Depends(get_db),
):
    """
    Export events for external analysis.
    
    Returns raw event data for the specified time period.
    In production, add authentication.
    """
    period_start = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(UserEvent)
        .where(UserEvent.timestamp >= period_start)
        .order_by(UserEvent.timestamp.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    
    return {
        "total": len(events),
        "period_days": days,
        "events": [
            {
                "id": e.id,
                "anonymous_id": e.anonymous_id[:8] + "...",  # Truncate for privacy
                "session_id": e.session_id,
                "event_name": e.event_name,
                "event_category": e.event_category,
                "event_data": e.event_data,
                "page_path": e.page_path,
                "timestamp": e.timestamp.isoformat(),
                "duration_seconds": e.duration_seconds,
            }
            for e in events
        ]
    }


@router.get("/feedback/export")
async def export_feedback(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
):
    """
    Export feedback for analysis.
    
    Returns feedback data for the specified time period.
    In production, add authentication.
    """
    period_start = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(UserFeedback)
        .where(UserFeedback.created_at >= period_start)
        .order_by(UserFeedback.created_at.desc())
        .limit(limit)
    )
    feedbacks = result.scalars().all()
    
    return {
        "total": len(feedbacks),
        "period_days": days,
        "feedbacks": [
            {
                "id": f.id,
                "anonymous_id": f.anonymous_id[:8] + "...",
                "session_id": f.session_id,
                "feedback_type": f.feedback_type,
                "nps_score": f.nps_score,
                "result_accuracy": f.result_accuracy,
                "experience_rating": f.experience_rating,
                "feedback_text": f.feedback_text,
                "mbti_result": f.mbti_result,
                "created_at": f.created_at.isoformat(),
            }
            for f in feedbacks
        ]
    }

