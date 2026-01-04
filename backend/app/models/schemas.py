"""
Pydantic schemas for API request/response validation.
These schemas are primarily used for documentation and type hints.
Actual request/response models are defined in the routers for clarity.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================

class MBTIType(str, Enum):
    """All 16 MBTI personality types."""
    INTJ = "INTJ"
    INTP = "INTP"
    ENTJ = "ENTJ"
    ENTP = "ENTP"
    INFJ = "INFJ"
    INFP = "INFP"
    ENFJ = "ENFJ"
    ENFP = "ENFP"
    ISTJ = "ISTJ"
    ISFJ = "ISFJ"
    ESTJ = "ESTJ"
    ESFJ = "ESFJ"
    ISTP = "ISTP"
    ISFP = "ISFP"
    ESTP = "ESTP"
    ESFP = "ESFP"


class MBTIGroup(str, Enum):
    """MBTI personality groups with their associated colors."""
    ANALYST = "analyst"      # NT types - Purple (#88619a)
    DIPLOMAT = "diplomat"    # NF types - Green (#33a474)
    SENTINEL = "sentinel"    # SJ types - Blue (#4298b4)
    EXPLORER = "explorer"    # SP types - Yellow (#e2a03f)


class AnalysisDepth(str, Enum):
    """Analysis depth modes."""
    SHALLOW = "shallow"    # 5-10 rounds, temperament only
    STANDARD = "standard"  # 20-30 rounds, full 4-letter type
    DEEP = "deep"          # 40-60 rounds, type + cognitive functions


class MessageRole(str, Enum):
    """Message sender role."""
    USER = "user"
    MODEL = "model"
    SYSTEM = "system"


# ============================================================
# Dimension Scores
# ============================================================

class DimensionScore(BaseModel):
    """Score for a single MBTI dimension."""
    dimension: str = Field(..., description="E/I, S/N, T/F, or J/P")
    score: float = Field(..., ge=0, le=100, description="Percentage score (50 is neutral)")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level 0-1")


# ============================================================
# Analysis Results
# ============================================================

class AnalysisResult(BaseModel):
    """Complete MBTI analysis result."""
    session_id: str
    mbti_type: MBTIType
    group: MBTIGroup
    dimensions: list[DimensionScore]
    
    # Textual results
    summary: str
    strengths: list[str]
    growth_areas: list[str]
    
    # Deep mode extras
    cognitive_stack: Optional[list[str]] = None
    development_level: Optional[str] = None
    
    # Meta
    confidence: float = Field(..., ge=0, le=1)
    is_final: bool = False


# ============================================================
# MBTI Type Utilities
# ============================================================

def get_group_for_type(mbti_type: str) -> MBTIGroup:
    """Determine the MBTI group for a given type."""
    type_upper = mbti_type.upper()
    
    # NT - Analysts (Purple)
    if type_upper in ["INTJ", "INTP", "ENTJ", "ENTP"]:
        return MBTIGroup.ANALYST
    
    # NF - Diplomats (Green)
    if type_upper in ["INFJ", "INFP", "ENFJ", "ENFP"]:
        return MBTIGroup.DIPLOMAT
    
    # SJ - Sentinels (Blue)
    if type_upper in ["ISTJ", "ISFJ", "ESTJ", "ESFJ"]:
        return MBTIGroup.SENTINEL
    
    # SP - Explorers (Yellow)
    if type_upper in ["ISTP", "ISFP", "ESTP", "ESFP"]:
        return MBTIGroup.EXPLORER
    
    # Default for unknown types (including colors like "Purple")
    return MBTIGroup.ANALYST


def get_color_for_group(group: MBTIGroup) -> str:
    """Get the hex color for an MBTI group."""
    colors = {
        MBTIGroup.ANALYST: "#88619a",
        MBTIGroup.DIPLOMAT: "#33a474",
        MBTIGroup.SENTINEL: "#4298b4",
        MBTIGroup.EXPLORER: "#e2a03f",
    }
    return colors.get(group, "#88619a")
