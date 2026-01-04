"""
Image Generation Service using Gemini 3 Pro Image.
Generates MBTI personality-based images in Pop Mart blind box style.

The service uses a two-step process:
1. Analyze conversation history to create a comprehensive user profile summary
2. Generate a detailed Pop Mart style prompt based on the user's unique characteristics

Watermark: All generated images include a "了解最真实的自己 • TrueSelfMBTI.com" watermark at the bottom center.
"""
import logging
import json
import base64
from typing import Optional

import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# Pop Mart Style Prompt Template
# ============================================================

POP_MART_TEMPLATE = """(Vertical Composition) A cute 3d chibi {mbti_code} character in Pop Mart blind box style. The character is {character_description}, wearing {outfit_description}.

(Action) The character is {action_and_held_item}.

(High Density Decor) The character is surrounded by specific floating 3d icons and elements arranged vertically to show personality: {floating_items}.

(Brand Base) The character is standing on a rounded {color_theme} platform base. On the front of the base, there is bold, distinct 3d text "{mbti_code}" embedded.

(Watermark) At the bottom center of the image, display the text "Discover Your True Self • TrueSelfMBTI.com" in a medium-sized, elegant light gray font that blends subtly with the white background. The text should be readable but not visually dominant. No background box - just clean, understated text.

(Style Specs) Matte clay texture, soft studio lighting, clean white background, C4D render, octane render, 8k resolution, highly detailed, minimalist but information-rich. --ar 9:16"""


# ============================================================
# MBTI Type Configurations
# ============================================================

MBTI_COLOR_THEMES = {
    # Analysts (Purple tones)
    "INTJ": "deep indigo purple",
    "INTP": "soft lavender purple",
    "ENTJ": "royal purple with gold accents",
    "ENTP": "vibrant violet",
    # Diplomats (Green tones)
    "INFJ": "mystical emerald green",
    "INFP": "soft sage green with pink undertones",
    "ENFJ": "warm forest green",
    "ENFP": "bright lime green with rainbow accents",
    # Sentinels (Blue tones)
    "ISTJ": "classic navy blue",
    "ISFJ": "gentle sky blue",
    "ESTJ": "bold royal blue",
    "ESFJ": "warm ocean blue with coral",
    # Explorers (Yellow/Orange tones)
    "ISTP": "cool steel grey with amber",
    "ISFP": "warm golden yellow",
    "ESTP": "fiery orange red",
    "ESFP": "bright sunny yellow with magenta",
}

MBTI_BASE_TRAITS = {
    "INTJ": {
        "archetype": "strategic mastermind",
        "core_traits": ["analytical", "independent", "determined", "visionary"],
        "default_elements": ["chess piece", "blueprint scroll", "galaxy orb", "geometric crystal"]
    },
    "INTP": {
        "archetype": "curious philosopher",
        "core_traits": ["logical", "inventive", "objective", "reserved"],
        "default_elements": ["floating equations", "puzzle cube", "atom model", "ancient book"]
    },
    "ENTJ": {
        "archetype": "commanding leader",
        "core_traits": ["decisive", "ambitious", "strategic", "confident"],
        "default_elements": ["crown", "mountain peak", "trophy", "organizational chart"]
    },
    "ENTP": {
        "archetype": "innovative debater",
        "core_traits": ["quick-witted", "curious", "challenging", "adaptable"],
        "default_elements": ["lightning bolt", "connected network nodes", "speech bubble", "lightbulb"]
    },
    "INFJ": {
        "archetype": "mystical counselor",
        "core_traits": ["insightful", "idealistic", "compassionate", "private"],
        "default_elements": ["aurora lights", "crystal ball", "flowing water", "moon phase"]
    },
    "INFP": {
        "archetype": "dreamy healer",
        "core_traits": ["empathetic", "creative", "idealistic", "introspective"],
        "default_elements": ["blooming flower", "floating feather", "diary with heart lock", "rainbow cloud"]
    },
    "ENFJ": {
        "archetype": "charismatic mentor",
        "core_traits": ["warm", "persuasive", "inspiring", "altruistic"],
        "default_elements": ["sunrise", "open hands", "heart glow", "podium with microphone"]
    },
    "ENFP": {
        "archetype": "creative champion",
        "core_traits": ["enthusiastic", "imaginative", "spontaneous", "optimistic"],
        "default_elements": ["fireworks", "colorful butterflies", "magic wand", "party confetti"]
    },
    "ISTJ": {
        "archetype": "reliable guardian",
        "core_traits": ["responsible", "thorough", "dependable", "traditional"],
        "default_elements": ["shield", "oak tree", "vintage clock", "checklist"]
    },
    "ISFJ": {
        "archetype": "nurturing protector",
        "core_traits": ["supportive", "reliable", "patient", "observant"],
        "default_elements": ["cozy home", "warm tea cup", "photo album", "first aid kit"]
    },
    "ESTJ": {
        "archetype": "efficient executive",
        "core_traits": ["organized", "logical", "assertive", "practical"],
        "default_elements": ["gears", "trophy", "calendar", "architectural pillars"]
    },
    "ESFJ": {
        "archetype": "caring consul",
        "core_traits": ["caring", "sociable", "traditional", "loyal"],
        "default_elements": ["heart hands", "community circle", "gift box", "family portrait"]
    },
    "ISTP": {
        "archetype": "skilled virtuoso",
        "core_traits": ["practical", "observant", "analytical", "reserved"],
        "default_elements": ["toolkit", "motorcycle", "puzzle mechanism", "Swiss army knife"]
    },
    "ISFP": {
        "archetype": "artistic adventurer",
        "core_traits": ["gentle", "sensitive", "helpful", "flexible"],
        "default_elements": ["paint palette", "nature leaf", "camera", "musical note"]
    },
    "ESTP": {
        "archetype": "bold entrepreneur",
        "core_traits": ["energetic", "pragmatic", "observant", "direct"],
        "default_elements": ["compass", "flame", "dice", "sports equipment"]
    },
    "ESFP": {
        "archetype": "vibrant entertainer",
        "core_traits": ["spontaneous", "energetic", "friendly", "playful"],
        "default_elements": ["stage spotlight", "confetti cannon", "party balloon", "dancing shoes"]
    },
}


# ============================================================
# User Profile Summary Prompt
# ============================================================

USER_PROFILE_SUMMARY_PROMPT = """You are an expert at analyzing personality conversations and extracting unique user characteristics for visual representation.

Based on the following MBTI assessment conversation, create a comprehensive profile summary that captures the user's unique personality traits for generating a personalized Pop Mart style character image.

## User's MBTI Result
- Type: {mbti_type}
- Type Name: {type_name}
- Confidence: {confidence}%

## Conversation History
{conversation}

## Your Task
Analyze the conversation carefully and extract:

1. **Physical/Visual Cues** (if mentioned or implied):
   - Age range impression
   - General style/aesthetic preferences
   - Any mentioned hobbies or interests that suggest visual elements

2. **Personality Expression**:
   - How they express themselves (formal/casual, enthusiastic/calm, etc.)
   - Key emotional tones throughout the conversation
   - Unique quirks or memorable aspects

3. **Interests & Passions**:
   - Specific hobbies, activities, or topics they mentioned
   - What seems to excite or engage them most
   - Work/study field if mentioned

4. **Lifestyle Indicators**:
   - Work style (creative, analytical, hands-on, etc.)
   - Social preferences
   - Any mentioned life situations

5. **Unique Identifiers**:
   - Specific details that make this person unique
   - Memorable quotes or expressions
   - Personal values they demonstrated

## Output Format
Return a JSON object with the following structure:
```json
{{
    "character_appearance": "description of how the chibi character should look (hair style, expression, body language)",
    "outfit_style": "description of clothing/accessories that match their personality and interests",
    "action_pose": "what the character is doing and what item they are holding",
    "floating_elements": ["item1", "item2", "item3", "item4"],
    "personality_keywords": ["keyword1", "keyword2", "keyword3"],
    "unique_details": "any special details that should be incorporated"
}}
```

Be creative but grounded in the actual conversation content. The goal is to create a character that the user would immediately recognize as representing themselves.

Return ONLY the JSON object, no additional text."""


# ============================================================
# Image Generator Service
# ============================================================

class ImageGeneratorService:
    """
    Service for generating MBTI-related images using Gemini 3 Pro Image.
    Uses a two-step process:
    1. Analyze user profile from conversation history
    2. Generate Pop Mart style character image
    """
    
    def __init__(self):
        """Initialize image generator service."""
        self._image_model: Optional[genai.GenerativeModel] = None
        self._analysis_model: Optional[genai.GenerativeModel] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize the Gemini models for analysis and image generation."""
        if self._initialized:
            return
        
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Analysis model (Gemini 3 Pro) for user profile summarization
        analysis_config = genai.GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=4096,
        )
        
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
        
        self._analysis_model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL_ANALYSIS,  # gemini-3-pro-preview
            generation_config=analysis_config,
            safety_settings=safety_settings,
        )
        
        # Image generation model
        self._image_model = genai.GenerativeModel(
            model_name=settings.GEMINI_IMAGE_MODEL,  # gemini-3-pro-image-preview
        )
        
        self._initialized = True
        logger.info(
            "ImageGeneratorService initialized with models - Analysis: %s, Image: %s",
            settings.GEMINI_MODEL_ANALYSIS,
            settings.GEMINI_IMAGE_MODEL
        )
    
    async def _analyze_user_profile(
        self,
        mbti_type: str,
        type_name: str,
        confidence: int,
        conversation_history: list[dict],
    ) -> dict:
        """
        Analyze conversation history to extract user characteristics.
        
        Args:
            mbti_type: The user's MBTI type
            type_name: The Chinese name for the type
            confidence: Confidence score percentage
            conversation_history: List of conversation messages
            
        Returns:
            Dictionary containing user profile for image generation
        """
        await self.initialize()
        
        # Format conversation for analysis
        conversation_text = "\n".join([
            f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
            for msg in conversation_history
        ])
        
        prompt = USER_PROFILE_SUMMARY_PROMPT.format(
            mbti_type=mbti_type,
            type_name=type_name,
            confidence=confidence,
            conversation=conversation_text
        )
        
        try:
            logger.info("Analyzing user profile with Gemini 3 Pro for %s", mbti_type)
            
            response = await self._analysis_model.generate_content_async(prompt)
            
            if not response.candidates or not response.candidates[0].content.parts:
                logger.warning("Empty response from profile analysis")
                return self._get_default_profile(mbti_type)
            
            response_text = response.text.strip()
            
            # Clean up response if wrapped in markdown
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            profile = json.loads(response_text)
            logger.info("Successfully analyzed user profile: %s", profile.get("personality_keywords", []))
            return profile
            
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse profile JSON: %s", e)
            return self._get_default_profile(mbti_type)
        except Exception as e:
            logger.error("Error analyzing user profile: %s", e)
            return self._get_default_profile(mbti_type)
    
    def _get_default_profile(self, mbti_type: str) -> dict:
        """Get default profile based on MBTI type."""
        traits = MBTI_BASE_TRAITS.get(mbti_type, MBTI_BASE_TRAITS["INTJ"])
        
        return {
            "character_appearance": f"a cute chibi character with bright expressive eyes and a {traits['core_traits'][0]} expression",
            "outfit_style": f"casual modern outfit with accessories reflecting their {traits['archetype']} personality",
            "action_pose": f"confidently posing with one hand raised, holding a symbolic item",
            "floating_elements": traits["default_elements"],
            "personality_keywords": traits["core_traits"][:3],
            "unique_details": f"subtle design elements that reflect the {traits['archetype']} archetype"
        }
    
    def _build_pop_mart_prompt(
        self,
        mbti_type: str,
        profile: dict,
    ) -> str:
        """
        Build the Pop Mart style image generation prompt.
        
        Args:
            mbti_type: The MBTI type code
            profile: User profile dictionary from analysis
            
        Returns:
            Formatted prompt string for image generation
        """
        color_theme = MBTI_COLOR_THEMES.get(mbti_type, "soft pastel gradient")
        
        # Get character description
        character_description = profile.get(
            "character_appearance",
            "a cute chibi character with bright expressive eyes and a friendly expression"
        )
        
        # Get outfit description
        outfit_description = profile.get(
            "outfit_style",
            "trendy casual outfit with personality-matching accessories"
        )
        
        # Get action and held item
        action_and_held_item = profile.get(
            "action_pose",
            "standing in a confident pose, holding a symbolic item representing their interests"
        )
        
        # Get floating elements
        floating_items = profile.get("floating_elements", [])
        if not floating_items:
            traits = MBTI_BASE_TRAITS.get(mbti_type, MBTI_BASE_TRAITS["INTJ"])
            floating_items = traits["default_elements"]
        
        # Format floating items as comma-separated list
        floating_items_str = ", ".join(floating_items[:4])
        
        prompt = POP_MART_TEMPLATE.format(
            mbti_code=mbti_type,
            character_description=character_description,
            outfit_description=outfit_description,
            action_and_held_item=action_and_held_item,
            floating_items=floating_items_str,
            color_theme=color_theme
        )
        
        # Add unique details if present
        unique_details = profile.get("unique_details")
        if unique_details:
            prompt += f"\n\n(Personal Touch) {unique_details}"
        
        logger.info("Generated Pop Mart prompt for %s: %s...", mbti_type, prompt[:200])
        return prompt
    
    async def generate_personality_avatar(
        self,
        mbti_type: str,
        conversation_history: Optional[list[dict]] = None,
        type_name: str = "",
        confidence: int = 85,
    ) -> Optional[str]:
        """
        Generate a personalized Pop Mart style avatar image.
        
        Args:
            mbti_type: The MBTI type (e.g., "INTJ")
            conversation_history: Full conversation history for profile analysis
            type_name: Chinese name for the MBTI type
            confidence: Confidence score
            
        Returns:
            Base64 encoded image data URL or None if failed
        """
        await self.initialize()
        
        # Step 1: Analyze user profile if conversation history is provided
        if conversation_history and len(conversation_history) > 2:
            profile = await self._analyze_user_profile(
                mbti_type=mbti_type,
                type_name=type_name or mbti_type,
                confidence=confidence,
                conversation_history=conversation_history,
            )
        else:
            # Use default profile if no conversation history
            logger.info("No conversation history provided, using default profile for %s", mbti_type)
            profile = self._get_default_profile(mbti_type)
        
        # Step 2: Build Pop Mart style prompt
        prompt = self._build_pop_mart_prompt(mbti_type, profile)
        
        # Step 3: Generate the image
        try:
            logger.info("Generating Pop Mart avatar for %s", mbti_type)
            
            response = await self._image_model.generate_content_async(prompt)
            
            # Handle image response
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # Return base64 encoded image
                        image_data = f"data:{part.inline_data.mime_type};base64,{base64.b64encode(part.inline_data.data).decode()}"
                        logger.info("Successfully generated Pop Mart avatar for %s", mbti_type)
                        return image_data
            
            logger.warning("No image data in response for %s", mbti_type)
            return None
            
        except Exception as e:
            logger.error("Failed to generate Pop Mart avatar for %s: %s", mbti_type, e)
            return None
    
    async def generate_result_card(
        self,
        mbti_type: str,
        summary: str,
        dimensions: dict
    ) -> Optional[str]:
        """
        Generate a shareable result card image.
        
        Args:
            mbti_type: The MBTI type
            summary: Brief personality summary
            dimensions: Dimension scores
            
        Returns:
            Base64 encoded image or URL
        """
        await self.initialize()
        
        prompt = self._build_result_card_prompt(mbti_type, summary)
        
        try:
            response = await self._image_model.generate_content_async(prompt)
            
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # Return base64 encoded image
                        return f"data:{part.inline_data.mime_type};base64,{base64.b64encode(part.inline_data.data).decode()}"
            
            return None
            
        except Exception as e:
            logger.error("Failed to generate result card: %s", e)
            return None
    
    def _build_result_card_prompt(self, mbti_type: str, summary: str) -> str:
        """Build the prompt for result card generation."""
        color_theme = MBTI_COLOR_THEMES.get(mbti_type, "vibrant gradient")
        
        return f"""Generate a beautiful shareable card image for MBTI type {mbti_type}.

Include:
- The type code "{mbti_type}" prominently displayed in 3D text
- Visual elements representing this personality type
- An elegant, modern design suitable for social media sharing
- Color theme: {color_theme}
- Aspect ratio: 1:1 (square)

Style: Modern, clean, professional, with subtle gradients and depth
Pop Mart inspired aesthetic with soft lighting
Do NOT include any other text besides the type code.

Make it visually appealing for sharing on social media."""


# Singleton instance
image_generator = ImageGeneratorService()
