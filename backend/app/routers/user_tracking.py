"""
User Tracking API Router.

Provides endpoints for:
- Tracking user sessions and journeys
- Exporting user data with full conversation history
- Analytics statistics
"""
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import verify_tracking_api_key
from app.models.database import Session, Message, get_db
from app.models.user_tracker import UserTracker

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================
# Request/Response Schemas
# ============================================================

class TrackSessionRequest(BaseModel):
    """Request to track a session for a user."""
    anonymous_id: str = Field(..., description="Browser's unique ID from localStorage")
    session_id: str = Field(..., description="The session ID to track")
    mode: str = Field(..., description="Session mode: shallow/standard/deep")
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None


class TrackImageGenerationRequest(BaseModel):
    """Request to track image generation."""
    anonymous_id: str = Field(..., description="Browser's unique ID")


class TrackSessionCompleteRequest(BaseModel):
    """Request to track session completion."""
    anonymous_id: str = Field(..., description="Browser's unique ID")
    session_id: str = Field(..., description="The session ID")
    mbti_result: str = Field(..., description="The MBTI result")
    mode: str = Field(..., description="Session mode")


class UserSummary(BaseModel):
    """Summary of a single user."""
    anonymous_id: str
    total_sessions: int
    completed_sessions: int
    mode_journey: list[str]
    generated_image: bool
    mbti_results: list[dict]
    first_seen: str
    last_seen: str
    device_type: Optional[str]


class UsersExportResponse(BaseModel):
    """Response for users export."""
    total_users: int
    users_with_image: int
    users_completed: int
    users: list[dict]


# ============================================================
# API Endpoints
# ============================================================

@router.post("/track-session")
async def track_session(
    data: TrackSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Track a new session for a user.
    
    Called when a user starts a new session.
    Creates or updates the UserTracker record.
    """
    # Find or create user tracker
    result = await db.execute(
        select(UserTracker).where(UserTracker.anonymous_id == data.anonymous_id)
    )
    tracker = result.scalar_one_or_none()
    
    if not tracker:
        # Create new tracker
        tracker = UserTracker(
            anonymous_id=data.anonymous_id,
            session_ids="[]",
            mode_journey="[]",
            mbti_results="[]",
            device_type=data.device_type,
            browser=data.browser,
            os=data.os,
        )
        db.add(tracker)
    
    # Update session list
    session_ids = json.loads(tracker.session_ids) if tracker.session_ids else []
    if data.session_id not in session_ids:
        session_ids.append(data.session_id)
        tracker.session_ids = json.dumps(session_ids)
        tracker.total_sessions = len(session_ids)
    
    # Update mode journey
    mode_journey = json.loads(tracker.mode_journey) if tracker.mode_journey else []
    mode_journey.append({
        "mode": data.mode,
        "session_id": data.session_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    tracker.mode_journey = json.dumps(mode_journey)
    
    # Update last seen
    tracker.last_seen = datetime.utcnow()
    
    # Also update the session's anonymous_id
    session_result = await db.execute(
        select(Session).where(Session.id == data.session_id)
    )
    session = session_result.scalar_one_or_none()
    if session:
        session.anonymous_id = data.anonymous_id
    
    await db.commit()
    
    logger.info(
        "Tracked session: user=%s, session=%s, mode=%s",
        data.anonymous_id[:12], data.session_id[:8], data.mode
    )
    
    return {"status": "ok", "total_sessions": tracker.total_sessions}


@router.post("/track-completion")
async def track_completion(
    data: TrackSessionCompleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Track session completion.
    
    Called when a user completes a session and gets MBTI result.
    """
    result = await db.execute(
        select(UserTracker).where(UserTracker.anonymous_id == data.anonymous_id)
    )
    tracker = result.scalar_one_or_none()
    
    if not tracker:
        return {"status": "error", "message": "User not found"}
    
    # Update completed sessions count
    tracker.completed_sessions += 1
    
    # Add MBTI result
    mbti_results = json.loads(tracker.mbti_results) if tracker.mbti_results else []
    mbti_results.append({
        "session_id": data.session_id,
        "result": data.mbti_result,
        "mode": data.mode,
        "timestamp": datetime.utcnow().isoformat()
    })
    tracker.mbti_results = json.dumps(mbti_results)
    
    await db.commit()
    
    logger.info(
        "Tracked completion: user=%s, result=%s, mode=%s",
        data.anonymous_id[:12], data.mbti_result, data.mode
    )
    
    return {"status": "ok"}


@router.post("/track-image")
async def track_image_generation(
    data: TrackImageGenerationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Track when a user generates an image.
    """
    result = await db.execute(
        select(UserTracker).where(UserTracker.anonymous_id == data.anonymous_id)
    )
    tracker = result.scalar_one_or_none()
    
    if not tracker:
        return {"status": "error", "message": "User not found"}
    
    if not tracker.generated_image:
        tracker.generated_image = True
        tracker.image_generated_at = datetime.utcnow()
        await db.commit()
        
        logger.info("Tracked image generation: user=%s", data.anonymous_id[:12])
    
    return {"status": "ok"}


@router.get("/users")
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    _api_key: str = Depends(verify_tracking_api_key),
):
    """
    Get summary of all tracked users.
    """
    result = await db.execute(
        select(UserTracker).order_by(UserTracker.last_seen.desc())
    )
    trackers = result.scalars().all()
    
    users = []
    users_with_image = 0
    users_completed = 0
    
    for tracker in trackers:
        user_data = tracker.to_dict()
        users.append(user_data)
        
        if tracker.generated_image:
            users_with_image += 1
        if tracker.completed_sessions > 0:
            users_completed += 1
    
    return {
        "total_users": len(users),
        "users_with_image": users_with_image,
        "users_completed": users_completed,
        "users": users,
    }


@router.get("/users/{anonymous_id}")
async def get_user_detail(
    anonymous_id: str,
    db: AsyncSession = Depends(get_db),
    _api_key: str = Depends(verify_tracking_api_key),
):
    """
    Get detailed information for a specific user.
    """
    result = await db.execute(
        select(UserTracker).where(UserTracker.anonymous_id == anonymous_id)
    )
    tracker = result.scalar_one_or_none()
    
    if not tracker:
        raise HTTPException(status_code=404, detail="User not found")
    
    return tracker.to_dict()


@router.get("/users/{anonymous_id}/conversations")
async def get_user_conversations(
    anonymous_id: str,
    db: AsyncSession = Depends(get_db),
    _api_key: str = Depends(verify_tracking_api_key),
):
    """
    Get all conversation histories for a specific user.
    
    Returns complete message history for each session.
    """
    # Get user tracker
    result = await db.execute(
        select(UserTracker).where(UserTracker.anonymous_id == anonymous_id)
    )
    tracker = result.scalar_one_or_none()
    
    if not tracker:
        raise HTTPException(status_code=404, detail="User not found")
    
    session_ids = json.loads(tracker.session_ids) if tracker.session_ids else []
    
    conversations = []
    for session_id in session_ids:
        # Get session with messages
        session_result = await db.execute(
            select(Session)
            .options(selectinload(Session.messages))
            .where(Session.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        
        if session:
            messages = [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.created_at.isoformat(),
                }
                for msg in sorted(session.messages, key=lambda m: m.created_at)
            ]
            
            conversations.append({
                "session_id": session_id,
                "mode": session.depth,
                "is_complete": session.is_complete,
                "mbti_result": session.current_prediction,
                "confidence_score": session.confidence_score,
                "total_rounds": session.current_round,
                "created_at": session.created_at.isoformat(),
                "messages": messages,
            })
    
    return {
        "anonymous_id": anonymous_id,
        "total_conversations": len(conversations),
        "conversations": conversations,
    }


@router.get("/export")
async def export_all_data(
    db: AsyncSession = Depends(get_db),
    _api_key: str = Depends(verify_tracking_api_key),
):
    """
    Export all user data with conversation histories.
    
    Returns comprehensive data for analysis:
    - Total users
    - Each user's mode journey with detailed analysis
    - Complete conversation history
    - MBTI results
    - Image generation status
    """
    # Get all trackers
    result = await db.execute(
        select(UserTracker).order_by(UserTracker.first_seen.asc())
    )
    trackers = result.scalars().all()
    
    # Initialize journey counters
    # Note: Users can only upgrade one level at a time (shallow→standard→deep)
    journey_counts = {
        # Shallow starters
        "shallow_only_completed": 0,
        "shallow_only_abandoned": 0,
        "shallow_to_standard_completed": 0,
        "shallow_to_standard_abandoned": 0,
        "shallow_to_standard_to_deep_completed": 0,
        "shallow_to_standard_to_deep_abandoned": 0,
        # Standard starters
        "standard_only_completed": 0,
        "standard_only_abandoned": 0,
        "standard_to_deep_completed": 0,
        "standard_to_deep_abandoned": 0,
        # Deep starters
        "deep_completed": 0,
        "deep_abandoned": 0,
        # Other
        "no_selection": 0,
    }
    
    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_users": len(trackers),
            "users_with_image": sum(1 for t in trackers if t.generated_image),
            "users_completed": sum(1 for t in trackers if t.completed_sessions > 0),
            "total_sessions": sum(t.total_sessions for t in trackers),
            "total_completed_sessions": sum(t.completed_sessions for t in trackers),
        },
        "journey_analysis": {},
        "users": [],
    }
    
    for tracker in trackers:
        user_data = tracker.to_dict()
        
        # Analyze this user's journey
        journey_analysis = analyze_user_journey(tracker)
        user_data["journey_analysis"] = journey_analysis
        
        # Count journey types
        jtype = journey_analysis["journey_type"]
        if jtype == "shallow_completed":
            journey_counts["shallow_only_completed"] += 1
        elif jtype == "shallow_abandoned":
            journey_counts["shallow_only_abandoned"] += 1
        elif jtype == "shallow_to_standard_completed":
            journey_counts["shallow_to_standard_completed"] += 1
        elif jtype == "shallow_to_standard_abandoned":
            journey_counts["shallow_to_standard_abandoned"] += 1
        elif jtype == "shallow_to_standard_to_deep_completed":
            journey_counts["shallow_to_standard_to_deep_completed"] += 1
        elif jtype == "shallow_to_standard_to_deep_abandoned":
            journey_counts["shallow_to_standard_to_deep_abandoned"] += 1
        elif jtype == "standard_completed":
            journey_counts["standard_only_completed"] += 1
        elif jtype == "standard_abandoned":
            journey_counts["standard_only_abandoned"] += 1
        elif jtype == "standard_to_deep_completed":
            journey_counts["standard_to_deep_completed"] += 1
        elif jtype == "standard_to_deep_abandoned":
            journey_counts["standard_to_deep_abandoned"] += 1
        elif jtype == "deep_completed":
            journey_counts["deep_completed"] += 1
        elif jtype == "deep_abandoned":
            journey_counts["deep_abandoned"] += 1
        else:
            journey_counts["no_selection"] += 1
        
        # Get conversations for this user
        session_ids = json.loads(tracker.session_ids) if tracker.session_ids else []
        conversations = []
        
        for session_id in session_ids:
            session_result = await db.execute(
                select(Session)
                .options(selectinload(Session.messages))
                .where(Session.id == session_id)
            )
            session = session_result.scalar_one_or_none()
            
            if session:
                messages = [
                    {
                        "role": msg.role,
                        "content": msg.content,
                        "timestamp": msg.created_at.isoformat(),
                    }
                    for msg in sorted(session.messages, key=lambda m: m.created_at)
                ]
                
                conversations.append({
                    "session_id": session_id,
                    "mode": session.depth,
                    "is_complete": session.is_complete,
                    "mbti_result": session.current_prediction,
                    "confidence_score": session.confidence_score,
                    "total_rounds": session.current_round,
                    "created_at": session.created_at.isoformat(),
                    "message_count": len(messages),
                    "messages": messages,
                })
        
        user_data["conversations"] = conversations
        export_data["users"].append(user_data)
    
    # Add journey analysis summary
    export_data["journey_analysis"] = {
        "shallow_starters": {
            "total": journey_counts["shallow_only_completed"] + journey_counts["shallow_only_abandoned"] + 
                    journey_counts["shallow_to_standard_completed"] + journey_counts["shallow_to_standard_abandoned"] +
                    journey_counts["shallow_to_standard_to_deep_completed"] + journey_counts["shallow_to_standard_to_deep_abandoned"],
            "stayed_shallow": {
                "completed": journey_counts["shallow_only_completed"],
                "abandoned": journey_counts["shallow_only_abandoned"],
            },
            "upgraded_to_standard": {
                "completed": journey_counts["shallow_to_standard_completed"],
                "abandoned": journey_counts["shallow_to_standard_abandoned"],
            },
            "upgraded_all_way_to_deep": {
                "completed": journey_counts["shallow_to_standard_to_deep_completed"],
                "abandoned": journey_counts["shallow_to_standard_to_deep_abandoned"],
            },
        },
        "standard_starters": {
            "total": journey_counts["standard_only_completed"] + journey_counts["standard_only_abandoned"] +
                    journey_counts["standard_to_deep_completed"] + journey_counts["standard_to_deep_abandoned"],
            "stayed_standard": {
                "completed": journey_counts["standard_only_completed"],
                "abandoned": journey_counts["standard_only_abandoned"],
            },
            "upgraded_to_deep": {
                "completed": journey_counts["standard_to_deep_completed"],
                "abandoned": journey_counts["standard_to_deep_abandoned"],
            },
        },
        "deep_starters": {
            "total": journey_counts["deep_completed"] + journey_counts["deep_abandoned"],
            "completed": journey_counts["deep_completed"],
            "abandoned": journey_counts["deep_abandoned"],
        },
        "no_mode_selected": journey_counts["no_selection"],
    }
    
    return export_data


def analyze_user_journey(tracker) -> dict:
    """
    Analyze a user's journey and categorize it.
    
    Returns a dict with:
    - start_mode: The mode user started with
    - end_mode: The final mode user reached
    - journey_type: Categorized journey type
    - completed: Whether user completed at least one session
    """
    journey = json.loads(tracker.mode_journey) if tracker.mode_journey else []
    results = json.loads(tracker.mbti_results) if tracker.mbti_results else []
    
    if not journey:
        return {
            "start_mode": None,
            "end_mode": None,
            "journey_type": "no_selection",
            "completed": False,
        }
    
    # Extract modes in order
    modes = []
    for j in journey:
        mode = j.get("mode") if isinstance(j, dict) else j
        modes.append(mode)
    
    start_mode = modes[0]
    
    # Find the highest mode reached (shallow < standard < deep)
    mode_rank = {"shallow": 1, "standard": 2, "deep": 3}
    highest_mode = max(modes, key=lambda m: mode_rank.get(m, 0))
    
    # Check if user completed any session
    completed = tracker.completed_sessions > 0
    
    # Determine journey type
    # Note: Users can only upgrade one level at a time (shallow→standard→deep)
    # So shallow→deep always goes through standard
    if start_mode == "shallow":
        if highest_mode == "shallow":
            if completed:
                journey_type = "shallow_completed"
            else:
                journey_type = "shallow_abandoned"
        elif highest_mode == "standard":
            if completed:
                journey_type = "shallow_to_standard_completed"
            else:
                journey_type = "shallow_to_standard_abandoned"
        elif highest_mode == "deep":
            # shallow → standard → deep (must go through standard)
            if completed:
                journey_type = "shallow_to_standard_to_deep_completed"
            else:
                journey_type = "shallow_to_standard_to_deep_abandoned"
    elif start_mode == "standard":
        if highest_mode == "standard":
            if completed:
                journey_type = "standard_completed"
            else:
                journey_type = "standard_abandoned"
        elif highest_mode == "deep":
            if completed:
                journey_type = "standard_to_deep_completed"
            else:
                journey_type = "standard_to_deep_abandoned"
        else:
            journey_type = "standard_other"
    elif start_mode == "deep":
        if completed:
            journey_type = "deep_completed"
        else:
            journey_type = "deep_abandoned"
    else:
        journey_type = "unknown"
    
    return {
        "start_mode": start_mode,
        "end_mode": highest_mode,
        "journey_type": journey_type,
        "completed": completed,
        "mode_sequence": modes,
    }


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _api_key: str = Depends(verify_tracking_api_key),
):
    """
    Get quick statistics for dashboard.
    """
    # Get all trackers
    result = await db.execute(select(UserTracker))
    trackers = result.scalars().all()
    
    # Detailed journey analysis
    # Note: Users can only upgrade one level at a time (shallow→standard→deep)
    journey_details = {
        # Starting point stats
        "started_with_shallow": 0,
        "started_with_standard": 0,
        "started_with_deep": 0,
        
        # Shallow starters - where did they end up?
        "shallow_only_completed": 0,          # Started shallow, stayed shallow, completed
        "shallow_only_abandoned": 0,          # Started shallow, stayed shallow, abandoned
        "shallow_to_standard_completed": 0,   # Shallow → Standard, completed
        "shallow_to_standard_abandoned": 0,   # Shallow → Standard, abandoned
        "shallow_to_standard_to_deep_completed": 0,  # Shallow → Standard → Deep, completed
        "shallow_to_standard_to_deep_abandoned": 0,  # Shallow → Standard → Deep, abandoned
        
        # Standard starters
        "standard_only_completed": 0,
        "standard_only_abandoned": 0,
        "standard_to_deep_completed": 0,
        "standard_to_deep_abandoned": 0,
        
        # Deep starters
        "deep_only_completed": 0,
        "deep_only_abandoned": 0,
    }
    
    mbti_distribution = {}
    user_journeys = []  # For detailed export
    
    for tracker in trackers:
        analysis = analyze_user_journey(tracker)
        user_journeys.append({
            "anonymous_id": tracker.anonymous_id[:12] + "...",
            **analysis
        })
        
        # Count starting points
        if analysis["start_mode"] == "shallow":
            journey_details["started_with_shallow"] += 1
        elif analysis["start_mode"] == "standard":
            journey_details["started_with_standard"] += 1
        elif analysis["start_mode"] == "deep":
            journey_details["started_with_deep"] += 1
        
        # Map journey types to stats
        jtype = analysis["journey_type"]
        if jtype == "shallow_completed":
            journey_details["shallow_only_completed"] += 1
        elif jtype == "shallow_abandoned":
            journey_details["shallow_only_abandoned"] += 1
        elif jtype == "shallow_to_standard_completed":
            journey_details["shallow_to_standard_completed"] += 1
        elif jtype == "shallow_to_standard_abandoned":
            journey_details["shallow_to_standard_abandoned"] += 1
        elif jtype == "shallow_to_standard_to_deep_completed":
            journey_details["shallow_to_standard_to_deep_completed"] += 1
        elif jtype == "shallow_to_standard_to_deep_abandoned":
            journey_details["shallow_to_standard_to_deep_abandoned"] += 1
        elif jtype == "standard_completed":
            journey_details["standard_only_completed"] += 1
        elif jtype == "standard_abandoned":
            journey_details["standard_only_abandoned"] += 1
        elif jtype == "standard_to_deep_completed":
            journey_details["standard_to_deep_completed"] += 1
        elif jtype == "standard_to_deep_abandoned":
            journey_details["standard_to_deep_abandoned"] += 1
        elif jtype == "deep_completed":
            journey_details["deep_only_completed"] += 1
        elif jtype == "deep_abandoned":
            journey_details["deep_only_abandoned"] += 1
        
        # MBTI distribution
        results = json.loads(tracker.mbti_results) if tracker.mbti_results else []
        for r in results:
            mbti = r.get("result") if isinstance(r, dict) else r
            if mbti:
                mbti_distribution[mbti] = mbti_distribution.get(mbti, 0) + 1
    
    # Calculate summary stats
    total_users = len(trackers)
    users_completed = sum(1 for t in trackers if t.completed_sessions > 0)
    
    return {
        "total_users": total_users,
        "users_with_image": sum(1 for t in trackers if t.generated_image),
        "users_completed": users_completed,
        "completion_rate": round(users_completed / total_users * 100, 1) if total_users > 0 else 0,
        
        "journey_summary": {
            "started_shallow": journey_details["started_with_shallow"],
            "started_standard": journey_details["started_with_standard"],
            "started_deep": journey_details["started_with_deep"],
        },
        
        "shallow_users_breakdown": {
            "stayed_shallow_completed": journey_details["shallow_only_completed"],
            "stayed_shallow_abandoned": journey_details["shallow_only_abandoned"],
            "upgraded_to_standard_completed": journey_details["shallow_to_standard_completed"],
            "upgraded_to_standard_abandoned": journey_details["shallow_to_standard_abandoned"],
            "upgraded_all_way_to_deep_completed": journey_details["shallow_to_standard_to_deep_completed"],
            "upgraded_all_way_to_deep_abandoned": journey_details["shallow_to_standard_to_deep_abandoned"],
        },
        
        "standard_users_breakdown": {
            "stayed_standard_completed": journey_details["standard_only_completed"],
            "stayed_standard_abandoned": journey_details["standard_only_abandoned"],
            "upgraded_to_deep_completed": journey_details["standard_to_deep_completed"],
            "upgraded_to_deep_abandoned": journey_details["standard_to_deep_abandoned"],
        },
        
        "deep_users_breakdown": {
            "completed": journey_details["deep_only_completed"],
            "abandoned": journey_details["deep_only_abandoned"],
        },
        
        "journey_details": journey_details,
        "mbti_distribution": dict(sorted(mbti_distribution.items(), key=lambda x: -x[1])),
    }

