"""
Chat API router for MBTI Assistant.
Handles session creation, message sending, and image generation (stub).
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import (
    get_client_ip,
    rate_limiter,
    verify_message_rate_limit,
    verify_session_rate_limit,
)
from app.models.database import Message, Session, get_db
from app.services.ai_service import AIResponse, AnalysisDepth, ai_service, qa_service, DEPTH_CONFIGS

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================
# Request/Response Schemas
# ============================================================

class StartSessionRequest(BaseModel):
    """Request schema for starting a new session."""
    depth: str = Field(
        default="standard",
        pattern="^(shallow|standard|deep)$",
        description="Analysis depth: shallow (5-10 rounds), standard (20-30), deep (40-60)"
    )
    language: str = Field(default="zh-CN", description="Preferred language")
    user_name: Optional[str] = Field(default=None, max_length=100)


class StartSessionResponse(BaseModel):
    """Response schema for session creation."""
    session_id: str
    depth: str
    language: str
    greeting: str
    rate_limit: dict


class SendMessageRequest(BaseModel):
    """Request schema for sending a message."""
    session_id: str = Field(..., description="Session UUID")
    content: str = Field(..., min_length=1, max_length=5000, description="User message")


class SendMessageResponse(BaseModel):
    """Response schema for message sending."""
    message_id: int
    reply_text: str
    is_finished: bool
    is_at_max_rounds: bool = False
    current_prediction: str
    confidence_score: int
    progress: int
    current_round: int
    max_rounds: int
    cognitive_stack: Optional[list[str]] = None
    development_level: Optional[str] = None


class FinishSessionRequest(BaseModel):
    """Request schema for finishing a session."""
    session_id: str = Field(..., description="Session UUID")


class FinishSessionResponse(BaseModel):
    """Response schema for finishing a session."""
    session_id: str
    mbti_type: str
    type_name: str
    group: str
    confidence_score: int
    analysis_report: str
    total_rounds: int
    cognitive_stack: Optional[list[str]] = None
    development_level: Optional[str] = None


class ImageGenerationResponse(BaseModel):
    """Response schema for image generation."""
    status: str
    message: str
    image_url: Optional[str] = None


class UpgradeSessionRequest(BaseModel):
    """Request schema for upgrading session from shallow to standard."""
    session_id: str = Field(..., description="Session UUID")


class UpgradeSessionResponse(BaseModel):
    """Response schema for session upgrade."""
    session_id: str
    new_depth: str
    remaining_rounds: int
    message: str
    # New: AI-generated first question after upgrade
    ai_question: str


class QAMessageRequest(BaseModel):
    """Request schema for Q&A messages."""
    session_id: str = Field(..., description="Session UUID")
    question: str = Field(..., min_length=1, max_length=2000, description="User's question")
    history: Optional[list[dict]] = Field(default=None, description="Previous Q&A conversation history")


class QAMessageResponse(BaseModel):
    """Response schema for Q&A messages."""
    answer: str
    mbti_type: str
    type_name: str


# ============================================================
# MBTI Type Names for Q&A Context
# ============================================================

MBTI_TYPE_NAMES_ZH: dict[str, str] = {
    "INTJ": "建筑师",
    "INTP": "逻辑学家",
    "ENTJ": "指挥官",
    "ENTP": "辩论家",
    "INFJ": "提倡者",
    "INFP": "调停者",
    "ENFJ": "主人公",
    "ENFP": "竞选者",
    "ISTJ": "物流师",
    "ISFJ": "守卫者",
    "ESTJ": "总经理",
    "ESFJ": "执政官",
    "ISTP": "鉴赏家",
    "ISFP": "探险家",
    "ESTP": "企业家",
    "ESFP": "表演者",
    "Purple": "分析家气质",
    "Green": "外交家气质",
    "Blue": "守卫者气质",
    "Yellow": "探索者气质",
}

MBTI_GROUPS: dict[str, str] = {
    "INTJ": "analyst", "INTP": "analyst", "ENTJ": "analyst", "ENTP": "analyst",
    "INFJ": "diplomat", "INFP": "diplomat", "ENFJ": "diplomat", "ENFP": "diplomat",
    "ISTJ": "sentinel", "ISFJ": "sentinel", "ESTJ": "sentinel", "ESFJ": "sentinel",
    "ISTP": "explorer", "ISFP": "explorer", "ESTP": "explorer", "ESFP": "explorer",
    "Purple": "analyst", "Green": "diplomat", "Blue": "sentinel", "Yellow": "explorer",
}

GROUP_NAMES_ZH: dict[str, str] = {
    "analyst": "分析家",
    "diplomat": "外交家",
    "sentinel": "守卫者",
    "explorer": "探索者",
}


# ============================================================
# API Endpoints
# ============================================================

@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    request: Request,
    data: StartSessionRequest,
    client_ip: str = Depends(verify_session_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new MBTI assessment session.
    
    This endpoint:
    1. Validates rate limit for session creation
    2. Creates a new session in the database
    3. Returns session ID and initial greeting
    
    Rate Limit: 5 sessions per IP per day
    """
    # Validate depth
    try:
        depth = AnalysisDepth(data.depth)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid depth: {data.depth}. Must be shallow, standard, or deep."
        )
    
    # Create session
    session = Session(
        depth=data.depth,
        language=data.language,
        user_name=data.user_name,
        client_ip=client_ip,
        user_agent=request.headers.get("User-Agent", "")[:500],
        is_active=True,
        current_round=0,
    )
    
    db.add(session)
    await db.flush()  # Get the session ID without committing
    
    # Get initial greeting
    greeting = await ai_service.get_initial_greeting(
        depth=depth,
        language=data.language,
    )
    
    # Save greeting as first assistant message
    greeting_message = Message(
        session_id=session.id,
        role="model",
        content=greeting,
        ai_metadata={
            "is_finished": False,
            "current_prediction": "Unknown",
            "confidence_score": 0,
            "progress": 0,
        }
    )
    db.add(greeting_message)
    
    # Record session creation for rate limiting
    rate_limiter.record_session_created(client_ip)
    
    await db.commit()
    
    logger.info(
        "Session created: id=%s, depth=%s, ip=%s",
        session.id, data.depth, client_ip
    )
    
    return StartSessionResponse(
        session_id=session.id,
        depth=data.depth,
        language=data.language,
        greeting=greeting,
        rate_limit=rate_limiter.get_usage_stats(client_ip),
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    request: Request,
    data: SendMessageRequest,
    client_ip: str = Depends(verify_message_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and receive AI response.
    
    This endpoint:
    1. Validates rate limit for messages
    2. Validates session exists and is active
    3. Saves user message to database
    4. Fetches conversation history
    5. Generates AI response via Gemini
    6. Saves AI response with metadata
    7. Updates session state
    
    Rate Limit: 100 messages per IP per day, 10 per minute
    """
    # Validate session ID format
    try:
        session_uuid = UUID(data.session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    # Fetch session with messages
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == str(session_uuid))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {data.session_id} not found"
        )
    
    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session is no longer active"
        )
    
    if session.is_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session has already been completed"
        )
    
    # Save user message
    user_message = Message(
        session_id=session.id,
        role="user",
        content=data.content,
        ai_metadata=None,
    )
    db.add(user_message)
    await db.flush()
    
    # Build conversation history for AI
    history = []
    for msg in sorted(session.messages, key=lambda m: m.created_at):
        if msg.role == "system":
            continue
        history.append({
            "role": "model" if msg.role == "model" else "user",
            "content": msg.content,
        })
    
    # Increment round counter
    new_round = session.current_round + 1
    
    # Generate AI response
    try:
        ai_response: AIResponse = await ai_service.generate_response(
            history=history,
            user_input=data.content,
            depth=AnalysisDepth(session.depth),
            current_round=new_round,
            language=session.language,
        )
    except Exception as e:
        logger.error("AI service error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again."
        )
    
    # Build metadata for AI response
    ai_metadata = {
        "is_finished": ai_response.is_finished,
        "current_prediction": ai_response.current_prediction,
        "confidence_score": ai_response.confidence_score,
        "progress": ai_response.progress,
    }
    
    if ai_response.cognitive_stack:
        ai_metadata["cognitive_stack"] = ai_response.cognitive_stack
    if ai_response.development_level:
        ai_metadata["development_level"] = ai_response.development_level
    
    # Save AI response message
    ai_message = Message(
        session_id=session.id,
        role="model",
        content=ai_response.reply_text,
        ai_metadata=ai_metadata,
    )
    db.add(ai_message)
    await db.flush()
    
    # Update session state
    session.current_round = new_round
    session.current_prediction = ai_response.current_prediction
    session.confidence_score = ai_response.confidence_score
    session.progress = ai_response.progress
    # Note: Don't set is_complete here - it should only be set in finish_session
    # after the final report and brief interpretation are generated
    
    if ai_response.cognitive_stack:
        session.set_cognitive_stack(ai_response.cognitive_stack)
    if ai_response.development_level:
        session.development_level = ai_response.development_level
    
    # If session is complete, mark as inactive
    if ai_response.is_finished:
        session.is_active = False
        logger.info(
            "Session completed: id=%s, prediction=%s, confidence=%d%%",
            session.id, ai_response.current_prediction, ai_response.confidence_score
        )
    
    # Record message for rate limiting
    rate_limiter.record_message_sent(client_ip)
    
    await db.commit()
    
    # Get depth config for max_rounds
    depth_config = DEPTH_CONFIGS[AnalysisDepth(session.depth)]
    is_at_max_rounds = new_round >= depth_config.max_rounds
    
    logger.info(
        "Message processed: session=%s, round=%d/%d, prediction=%s, confidence=%d%%, is_finished=%s",
        session.id, new_round, depth_config.max_rounds, ai_response.current_prediction, 
        ai_response.confidence_score, ai_response.is_finished
    )
    
    return SendMessageResponse(
        message_id=ai_message.id,
        reply_text=ai_response.reply_text,
        is_finished=ai_response.is_finished,
        is_at_max_rounds=is_at_max_rounds,
        current_prediction=ai_response.current_prediction,
        confidence_score=ai_response.confidence_score,
        progress=ai_response.progress,
        current_round=new_round,
        max_rounds=depth_config.max_rounds,
        cognitive_stack=ai_response.cognitive_stack,
        development_level=ai_response.development_level,
    )


@router.post("/finish", response_model=FinishSessionResponse)
async def finish_session(
    request: Request,
    data: FinishSessionRequest,
    client_ip: str = Depends(verify_message_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    """
    Finish the assessment and generate the final analysis report.
    
    This endpoint:
    1. Validates the session exists and is ready to finish
    2. Generates the final analysis report using AI
    3. Marks the session as complete
    4. Returns the full result data for the result page
    
    Should be called when the user clicks "View Results" button.
    """
    # Validate session ID format
    try:
        session_uuid = UUID(data.session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    # Fetch session with messages
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == str(session_uuid))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {data.session_id} not found"
        )
    
    if not session.current_prediction or session.current_prediction == "Unknown":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment not ready to conclude. Please continue the conversation."
        )
    
    # Check if this is a revisit with stored report
    if session.is_complete and session.analysis_report:
        # Return the stored report for consistency
        logger.info(
            "Session result revisited with stored report: id=%s, prediction=%s",
            session.id, session.current_prediction
        )
        return FinishSessionResponse(
            session_id=session.id,
            mbti_type=session.current_prediction,
            type_name=MBTI_TYPE_NAMES_ZH.get(session.current_prediction, session.current_prediction),
            group=MBTI_GROUPS.get(session.current_prediction, "analyst"),
            confidence_score=session.confidence_score or 0,
            analysis_report=session.analysis_report,
            total_rounds=session.current_round,
            cognitive_stack=session.get_cognitive_stack(),
            development_level=session.development_level,
        )
    
    # Build conversation history for report generation
    history = []
    for msg in sorted(session.messages, key=lambda m: m.created_at):
        if msg.role == "system":
            continue
        history.append({
            "role": "model" if msg.role == "model" else "user",
            "content": msg.content,
        })
    
    # Check if this is a first-time completion or a revisit without stored report
    was_already_complete = session.is_complete

    # Generate the final analysis report
    try:
        analysis_report = await ai_service.generate_final_report(
            history=history,
            depth=AnalysisDepth(session.depth),
            current_prediction=session.current_prediction,
            confidence_score=session.confidence_score or 0,
            cognitive_stack=session.get_cognitive_stack(),
            development_level=session.development_level,
            language=session.language,
        )
    except Exception as e:
        logger.error("Failed to generate final report: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate analysis report. Please try again."
        )
    
    # Save the generated report to the database for future visits
    session.analysis_report = analysis_report
    
    # Only update session completion state for first-time completions
    if not was_already_complete:
        # Mark session as complete
        session.is_complete = True
        session.is_active = False
        
        # Record for rate limiting
        rate_limiter.record_message_sent(client_ip)
        
        logger.info(
            "Session finished: id=%s, prediction=%s, confidence=%d%%",
            session.id, session.current_prediction, session.confidence_score or 0
        )
    else:
        logger.info(
            "Session report regenerated and saved: id=%s, prediction=%s",
            session.id, session.current_prediction
        )
    
    # Commit the changes (including saved report)
    await db.commit()
    
    return FinishSessionResponse(
        session_id=session.id,
        mbti_type=session.current_prediction,
        type_name=MBTI_TYPE_NAMES_ZH.get(session.current_prediction, session.current_prediction),
        group=MBTI_GROUPS.get(session.current_prediction, "analyst"),
        confidence_score=session.confidence_score or 0,
        analysis_report=analysis_report,
        total_rounds=session.current_round,
        cognitive_stack=session.get_cognitive_stack(),
        development_level=session.development_level,
    )


@router.post("/upgrade", response_model=UpgradeSessionResponse)
async def upgrade_session(
    request: Request,
    data: UpgradeSessionRequest,
    client_ip: str = Depends(get_client_ip),
    db: AsyncSession = Depends(get_db),
):
    """
    Upgrade a session to the next depth level.
    
    This endpoint:
    1. Validates the session exists
    2. Supports shallow→standard and standard→deep upgrades
    3. Reactivates the session for continued conversation
    4. Preserves all existing conversation history
    5. Generates AI question to continue (fixes the jump issue)
    
    Upgrade paths:
    - shallow (5 rounds) → standard (15 total, 10 more needed)
    - standard (15 rounds) → deep (40 total, 25 more needed)
    """
    # Validate session ID format
    try:
        session_uuid = UUID(data.session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    # Fetch session with messages
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == str(session_uuid))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {data.session_id} not found"
        )
    
    # Store previous state for context
    previous_depth = session.depth
    previous_prediction = session.current_prediction
    previous_confidence = session.confidence_score
    
    # Determine target depth and calculate remaining rounds
    if session.depth == "shallow":
        new_depth = "standard"
        target_rounds = 15
        remaining_rounds = max(0, target_rounds - session.current_round)
        message = f"已升级到标准模式！还需完成约 {remaining_rounds} 道题即可获得完整 MBTI 类型分析。"
    elif session.depth == "standard":
        new_depth = "deep"
        target_rounds = 30
        remaining_rounds = max(0, target_rounds - session.current_round)
        message = f"已升级到深度模式！还需完成约 {remaining_rounds} 道题即可获得基于荣格理论的深度分析。"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deep mode sessions cannot be upgraded further"
        )
    
    # Build conversation history
    history = []
    for msg in sorted(session.messages, key=lambda m: m.created_at):
        if msg.role == "system":
            continue
        history.append({
            "role": "model" if msg.role == "model" else "user",
            "content": msg.content,
        })
    
    # Generate the first question for the upgraded session
    # This ensures AI asks a question instead of waiting for user input
    try:
        ai_question = await ai_service.generate_upgrade_question(
            history=history,
            depth=AnalysisDepth(new_depth),
            current_prediction=previous_prediction or "Unknown",
            confidence_score=previous_confidence or 0,
            previous_depth=previous_depth,
            cognitive_stack=session.get_cognitive_stack(),
            language=session.language,
        )
    except Exception as e:
        logger.error("Failed to generate upgrade question: %s", e)
        # Fallback message
        if new_depth == "deep":
            ai_question = f"太好了，{previous_prediction}的判断已经比较清晰了！现在让我们更深入地探索你的认知功能。\n\n来聊一个有趣的话题：当你需要做一个重要决定时，你内心是怎么运转的？"
        else:
            ai_question = f"你的{previous_prediction}气质已经很明显了！接下来我们来进一步确定你完整的MBTI类型。\n\n聊聊你平时的一天吧？比如周末没有安排的时候，你一般会怎么度过？"
    
    # Save the AI question as a message
    ai_message = Message(
        session_id=session.id,
        role="model",
        content=ai_question,
        ai_metadata={
            "is_finished": False,
            "current_prediction": previous_prediction or "Unknown",  # Keep prediction stable!
            "confidence_score": previous_confidence or 0,  # Keep confidence stable!
            "progress": int((session.current_round / target_rounds) * 100) if target_rounds > 0 else 0,
            "is_upgrade_message": True,
        }
    )
    db.add(ai_message)
    
    # Upgrade the session
    session.depth = new_depth
    session.is_active = True
    session.is_complete = False
    # Important: Keep current_prediction stable!
    # Don't reset it - this prevents the type jump bug
    
    await db.commit()
    
    logger.info(
        "Session upgraded: id=%s, from=%s, to=%s, current_round=%d, remaining=%d, prediction=%s (kept stable)",
        session.id, previous_depth, new_depth, session.current_round, remaining_rounds, previous_prediction
    )
    
    return UpgradeSessionResponse(
        session_id=session.id,
        new_depth=new_depth,
        remaining_rounds=remaining_rounds,
        message=message,
        ai_question=ai_question,
    )


@router.post("/image")
async def generate_image(
    request: Request,
    session_id: str,
    client_ip: str = Depends(verify_message_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate personality-based image using Gemini 3 Pro Image.
    
    Creates a unique Pop Mart style personality visualization based on:
    1. The user's MBTI type
    2. Conversation history analysis for personalized characteristics
    
    The image generation uses a two-step process:
    - First, Gemini 3 Pro analyzes the conversation to extract user traits (saved for consistency)
    - Then, generates a personalized Pop Mart blind box style character
    
    The user profile is saved to the database so returning users get consistent images.
    """
    import json as json_module
    from app.services.image_generator import image_generator
    
    # Validate session exists and load messages
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    if not session.current_prediction or session.current_prediction == "Unknown":
        return {
            "status": "error",
            "message": "Please complete the assessment first to generate your personality image.",
            "image_url": None,
        }
    
    # Get type name for better context
    type_name = MBTI_TYPE_NAMES_ZH.get(session.current_prediction, session.current_prediction)
    
    # Check if we have a stored profile (for consistent image generation)
    stored_profile = None
    if session.image_profile:
        try:
            stored_profile = json_module.loads(session.image_profile)
            logger.info("Using stored image profile for session %s", session_id)
        except json_module.JSONDecodeError:
            logger.warning("Failed to parse stored image profile, will regenerate")
            stored_profile = None
    
    # Build conversation history for profile analysis (only if no stored profile)
    conversation_history = None
    if not stored_profile:
        conversation_history = []
        for msg in sorted(session.messages, key=lambda m: m.created_at):
            if msg.role == "system":
                continue
            conversation_history.append({
                "role": "model" if msg.role == "model" else "user",
                "content": msg.content,
            })
    
    try:
        # Generate the personalized Pop Mart avatar
        image_url, profile = await image_generator.generate_personality_avatar(
            mbti_type=session.current_prediction,
            conversation_history=conversation_history,
            type_name=type_name,
            confidence=session.confidence_score or 85,
            stored_profile=stored_profile,
        )
        
        # Save the profile if it was newly generated
        if profile and not stored_profile:
            session.image_profile = json_module.dumps(profile, ensure_ascii=False)
            await db.commit()
            logger.info("Saved new image profile for session %s", session_id)
        
        if image_url:
            return {
                "status": "success",
                "message": f"Your personalized {session.current_prediction} Pop Mart avatar has been generated!",
                "image_url": image_url,
            }
        else:
            return {
                "status": "pending",
                "message": "Image generation in progress. Please try again in a moment.",
                "image_url": None,
            }
            
    except Exception as e:
        logger.error("Image generation failed: %s", e)
        return {
            "status": "error",
            "message": "Image generation temporarily unavailable. Please try again later.",
            "image_url": None,
        }


@router.post("/demo-image")
async def generate_demo_image(
    mbti_type: str = "INFP",
    gender: str = "female",
):
    """
    Generate a demo image for showcase purposes.
    
    This endpoint generates a beautiful Pop Mart style character for the landing page demo.
    No session required - uses predefined characteristics for the demo.
    """
    from app.services.image_generator import image_generator, POP_MART_TEMPLATE, MBTI_COLOR_THEMES
    
    # Custom profile for demo - a beautiful character without display case frame
    if gender == "female":
        demo_profile = {
            "character_appearance": "a cute young woman with long flowing wavy hair in soft brown color with pink flower accessories, big sparkling eyes with long eyelashes, rosy cheeks, warm gentle smile, delicate feminine features, soft and dreamy expression",
            "outfit_style": "elegant cream-colored cozy knit sweater, simple gold necklace with a small heart pendant, comfortable light blue jeans, brown leather satchel bag",
            "action_pose": "sitting gracefully on a stack of vintage books, one hand holding an open journal with a pen, looking up thoughtfully with a gentle smile as if inspired by a beautiful idea",
            "floating_elements": ["blooming pink peonies", "floating origami paper cranes", "soft glowing golden stars", "vintage polaroid photos floating around"],
            "personality_keywords": ["gentle", "creative", "dreamy"],
            "unique_details": "NO display case or glass frame around the character. Clean white background. Soft pastel color palette with romantic aesthetic, subtle pink flower petals floating around, warm golden hour lighting, ethereal and whimsical atmosphere. The character should be displayed directly without any box or frame enclosure."
        }
    else:
        demo_profile = {
            "character_appearance": "a cool young man with stylish messy black hair, sharp confident eyes with a slight smirk, wearing headphones around neck, intelligent and strategic expression",
            "outfit_style": "modern dark navy jacket over black hoodie, dark pants, stylish sneakers, tech-savvy appearance",
            "action_pose": "standing confidently with one hand touching a floating holographic data screen, the other hand in pocket, looking focused and determined",
            "floating_elements": ["holographic data screens with brain icons", "floating geometric blue cubes", "golden shield badge", "certificate with ribbon", "comedy/drama mask"],
            "personality_keywords": ["strategic", "confident", "intelligent"],
            "unique_details": "NO display case or glass frame around the character. Clean white/light gray background. Cool blue tech aesthetic with subtle glow effects, modern and sophisticated atmosphere. The character should be displayed directly without any box or frame enclosure."
        }
    
    try:
        # Generate the image using the custom profile
        image_url, _ = await image_generator.generate_personality_avatar(
            mbti_type=mbti_type,
            conversation_history=None,
            type_name="调停者",
            confidence=92,
            stored_profile=demo_profile,
        )
        
        if image_url:
            return {
                "status": "success",
                "message": f"Demo {mbti_type} avatar generated successfully!",
                "image_url": image_url,
            }
        else:
            return {
                "status": "error",
                "message": "Failed to generate demo image.",
                "image_url": None,
            }
            
    except Exception as e:
        logger.error("Demo image generation failed: %s", e)
        return {
            "status": "error",
            "message": f"Demo image generation failed: {str(e)}",
            "image_url": None,
        }


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the full chat history for a session.
    
    Returns all messages in chronological order with their metadata.
    """
    # Validate session ID
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == str(session_uuid))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    messages = [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "ai_metadata": msg.ai_metadata,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in sorted(session.messages, key=lambda m: m.created_at)
    ]
    
    return {
        "session_id": session_id,
        "depth": session.depth,
        "current_round": session.current_round,
        "is_complete": session.is_complete,
        "current_prediction": session.current_prediction,
        "confidence_score": session.confidence_score,
        "messages": messages,
    }


@router.get("/status/{session_id}")
async def get_session_status(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current status of a session.
    
    Returns session state without full message history.
    """
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    result = await db.execute(
        select(Session).where(Session.id == str(session_uuid))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    return {
        "session_id": session_id,
        "depth": session.depth,
        "language": session.language,
        "is_active": session.is_active,
        "is_complete": session.is_complete,
        "current_round": session.current_round,
        "current_prediction": session.current_prediction,
        "confidence_score": session.confidence_score,
        "progress": session.progress,
        "cognitive_stack": session.get_cognitive_stack(),
        "development_level": session.development_level,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


@router.post("/qa", response_model=QAMessageResponse)
async def ask_question(
    request: Request,
    data: QAMessageRequest,
    client_ip: str = Depends(verify_message_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a question about the MBTI result.
    
    This endpoint:
    1. Validates the session exists and is complete
    2. Generates an AI response about the user's MBTI result
    3. Returns the answer with context
    
    Rate Limit: Uses message rate limit (100/day, 10/minute)
    """
    # Validate session ID format
    try:
        session_uuid = UUID(data.session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    # Fetch session
    result = await db.execute(
        select(Session).where(Session.id == str(session_uuid))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {data.session_id} not found"
        )
    
    if not session.current_prediction or session.current_prediction == "Unknown":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No MBTI result available. Please complete the assessment first."
        )
    
    # Get type info
    mbti_type = session.current_prediction
    type_name = MBTI_TYPE_NAMES_ZH.get(mbti_type, mbti_type)
    group = MBTI_GROUPS.get(mbti_type, "analyst")
    group_name = GROUP_NAMES_ZH.get(group, group)
    cognitive_stack = session.get_cognitive_stack()
    
    try:
        # Generate Q&A response
        answer = await qa_service.generate_response(
            user_question=data.question,
            mbti_type=mbti_type,
            type_name=type_name,
            group=group_name,
            confidence_score=session.confidence_score or 0,
            cognitive_stack=cognitive_stack,
            development_level=session.development_level,
            depth=session.depth,
            language=session.language,
            history=data.history,
        )
    except Exception as e:
        logger.error("Q&A service error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again."
        )
    
    # Record message for rate limiting
    rate_limiter.record_message_sent(client_ip)
    
    logger.info(
        "Q&A processed: session=%s, type=%s, question_length=%d",
        session.id, mbti_type, len(data.question)
    )
    
    return QAMessageResponse(
        answer=answer,
        mbti_type=mbti_type,
        type_name=type_name,
    )
