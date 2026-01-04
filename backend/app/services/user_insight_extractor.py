"""
User Insight Extractor Service

Analyzes completed MBTI conversations to extract user demographic
and behavioral insights without explicit data collection.

This provides implicit user profiling based on conversation content.
"""
import json
import logging
import re
from typing import Optional
from dataclasses import dataclass

import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ExtractedUserInsights:
    """Extracted user insights from conversation."""
    # Demographics (inferred)
    estimated_age_range: Optional[str] = None  # "18-24", "25-34", "35-44", "45+"
    estimated_gender: Optional[str] = None  # "male", "female", "unknown"
    occupation_hints: Optional[str] = None  # Job-related mentions
    education_level: Optional[str] = None  # "student", "graduate", "professional"
    life_stage: Optional[str] = None  # "student", "early_career", "mid_career", "parent"
    
    # Interests and topics
    mentioned_hobbies: Optional[list[str]] = None
    mentioned_interests: Optional[list[str]] = None
    career_field: Optional[str] = None
    
    # Communication style
    communication_style: Optional[str] = None  # "formal", "casual", "mixed"
    language_complexity: Optional[str] = None  # "simple", "moderate", "sophisticated"
    response_length_tendency: Optional[str] = None  # "brief", "moderate", "detailed"
    emoji_usage: Optional[str] = None  # "none", "occasional", "frequent"
    
    # Personality indicators (beyond MBTI)
    self_awareness_level: Optional[str] = None  # "low", "moderate", "high"
    openness_in_sharing: Optional[str] = None  # "reserved", "moderate", "open"
    
    # Engagement quality
    engagement_quality: Optional[str] = None  # "low", "moderate", "high"
    thoughtfulness: Optional[str] = None  # "quick_responses", "thoughtful", "very_reflective"
    
    # Context clues
    timezone_hints: Optional[str] = None  # Based on time-related mentions
    cultural_context: Optional[str] = None  # Cultural references
    
    # Raw analysis
    key_topics_discussed: Optional[list[str]] = None
    notable_quotes: Optional[list[str]] = None
    confidence_score: float = 0.0


class UserInsightExtractor:
    """
    Extracts user insights from MBTI conversation history.
    
    Uses Gemini AI to analyze the conversation and infer user
    characteristics without explicit data collection.
    """
    
    def __init__(self):
        """Initialize the Gemini client."""
        self._model: Optional[genai.GenerativeModel] = None
        self._initialized = False
    
    def _ensure_initialized(self) -> None:
        """Lazy initialization of the Gemini model."""
        if self._initialized:
            return
            
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        generation_config = genai.GenerationConfig(
            temperature=0.3,  # Lower temperature for more consistent extraction
            max_output_tokens=2000,
        )
        
        # Use Gemini 3 Flash for fast insight analysis
        model_name = "gemini-3-flash-preview"
        self._model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
        )
        
        self._initialized = True
        logger.info("UserInsightExtractor initialized with %s", model_name)
    
    async def extract_insights(
        self,
        conversation_history: list[dict],
        mbti_result: str,
        language: str = "zh-CN",
    ) -> ExtractedUserInsights:
        """
        Extract user insights from conversation history.
        
        Args:
            conversation_history: List of messages with 'role' and 'content'
            mbti_result: The determined MBTI type
            language: Language of the conversation
            
        Returns:
            ExtractedUserInsights object with inferred user data
        """
        try:
            self._ensure_initialized()
        except ValueError as e:
            logger.warning("Failed to initialize insight extractor: %s", e)
            return ExtractedUserInsights()
        
        # Build conversation text for analysis
        conversation_text = self._build_conversation_text(conversation_history)
        
        # Skip if too short
        if len(conversation_text) < 100:
            logger.info("Conversation too short for insight extraction")
            return ExtractedUserInsights()
        
        prompt = self._build_extraction_prompt(conversation_text, mbti_result, language)
        
        try:
            response = await self._model.generate_content_async(contents=prompt)
            
            if not response.candidates or not response.candidates[0].content.parts:
                logger.warning("Empty response from insight extraction")
                return ExtractedUserInsights()
            
            response_text = response.candidates[0].content.parts[0].text
            return self._parse_response(response_text)
            
        except Exception as e:
            logger.error("Failed to extract user insights: %s", e, exc_info=True)
            return ExtractedUserInsights()
    
    def _build_conversation_text(self, history: list[dict]) -> str:
        """Build readable conversation text from history."""
        lines = []
        for msg in history:
            role = "User" if msg.get("role") == "user" else "AI"
            content = msg.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n".join(lines)
    
    def _build_extraction_prompt(
        self,
        conversation_text: str,
        mbti_result: str,
        language: str,
    ) -> str:
        """Build the prompt for insight extraction."""
        
        return f"""Analyze this MBTI assessment conversation and extract user insights.

## Conversation
{conversation_text}

## MBTI Result
{mbti_result}

## Task
Based ONLY on what the user explicitly mentioned or strongly implied in their responses, extract the following information. If something is not mentioned or cannot be reliably inferred, use null.

IMPORTANT: 
- Only extract information that is clearly present in the conversation
- Do not make assumptions beyond what is stated
- Be conservative in your estimates
- Focus on the USER's messages, not the AI's

## Output Format
Return a JSON object with these fields:

```json
{{
  "estimated_age_range": "18-24" | "25-34" | "35-44" | "45+" | null,
  "estimated_gender": "male" | "female" | null,
  "occupation_hints": "string describing job/career mentions" | null,
  "education_level": "student" | "graduate" | "professional" | null,
  "life_stage": "student" | "early_career" | "mid_career" | "parent" | null,
  
  "mentioned_hobbies": ["hobby1", "hobby2"] | null,
  "mentioned_interests": ["interest1", "interest2"] | null,
  "career_field": "tech" | "finance" | "education" | "healthcare" | "creative" | "business" | "other" | null,
  
  "communication_style": "formal" | "casual" | "mixed",
  "language_complexity": "simple" | "moderate" | "sophisticated",
  "response_length_tendency": "brief" | "moderate" | "detailed",
  "emoji_usage": "none" | "occasional" | "frequent",
  
  "self_awareness_level": "low" | "moderate" | "high",
  "openness_in_sharing": "reserved" | "moderate" | "open",
  
  "engagement_quality": "low" | "moderate" | "high",
  "thoughtfulness": "quick_responses" | "thoughtful" | "very_reflective",
  
  "cultural_context": "string describing cultural references" | null,
  
  "key_topics_discussed": ["topic1", "topic2", "topic3"],
  "notable_quotes": ["interesting quote 1", "interesting quote 2"],
  "confidence_score": 0.0 to 1.0
}}
```

Return ONLY the JSON object, no additional text."""
    
    def _parse_response(self, response_text: str) -> ExtractedUserInsights:
        """Parse the AI response into ExtractedUserInsights."""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if not json_match:
                logger.warning("No JSON found in insight extraction response")
                return ExtractedUserInsights()
            
            data = json.loads(json_match.group())
            
            return ExtractedUserInsights(
                estimated_age_range=data.get("estimated_age_range"),
                estimated_gender=data.get("estimated_gender"),
                occupation_hints=data.get("occupation_hints"),
                education_level=data.get("education_level"),
                life_stage=data.get("life_stage"),
                mentioned_hobbies=data.get("mentioned_hobbies"),
                mentioned_interests=data.get("mentioned_interests"),
                career_field=data.get("career_field"),
                communication_style=data.get("communication_style"),
                language_complexity=data.get("language_complexity"),
                response_length_tendency=data.get("response_length_tendency"),
                emoji_usage=data.get("emoji_usage"),
                self_awareness_level=data.get("self_awareness_level"),
                openness_in_sharing=data.get("openness_in_sharing"),
                engagement_quality=data.get("engagement_quality"),
                thoughtfulness=data.get("thoughtfulness"),
                cultural_context=data.get("cultural_context"),
                key_topics_discussed=data.get("key_topics_discussed"),
                notable_quotes=data.get("notable_quotes"),
                confidence_score=data.get("confidence_score", 0.0),
            )
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse insight extraction JSON: %s", e)
            return ExtractedUserInsights()
        except Exception as e:
            logger.error("Error parsing insight extraction response: %s", e)
            return ExtractedUserInsights()


# Singleton instance
user_insight_extractor = UserInsightExtractor()
