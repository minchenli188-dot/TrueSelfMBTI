"""
AI Service for MBTI personality analysis using Google Gemini.
Implements hybrid model approach, structured output, adaptive questioning, and multi-depth analysis modes.
"""
import json
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from pydantic import BaseModel, Field, ValidationError

from app.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# Enums and Data Models
# ============================================================

class AnalysisDepth(str, Enum):
    """Analysis depth modes."""
    SHALLOW = "shallow"    # 5 rounds, temperament only
    STANDARD = "standard"  # 15 rounds, full 4-letter type
    DEEP = "deep"          # 30 rounds, type + cognitive functions


class TemperamentColor(str, Enum):
    """MBTI temperament colors/groups."""
    PURPLE = "Purple"   # NT - Analysts
    GREEN = "Green"     # NF - Diplomats
    BLUE = "Blue"       # SJ - Sentinels
    YELLOW = "Yellow"   # SP - Explorers


class AIResponse(BaseModel):
    """Structured response from Gemini AI."""
    reply_text: str = Field(..., description="The conversational reply to show the user")
    is_finished: bool = Field(default=False, description="Whether the assessment can conclude")
    wants_to_finish: bool = Field(default=False, description="AI wants to conclude but waiting for user confirmation")
    current_prediction: str = Field(default="Unknown", description="Current type prediction")
    confidence_score: int = Field(default=0, ge=0, le=100, description="Confidence in prediction")
    progress: int = Field(default=0, ge=0, le=100, description="Estimated assessment progress")
    
    # Optional deep mode fields
    cognitive_stack: Optional[list[str]] = Field(default=None, description="Detected cognitive function stack")
    development_level: Optional[str] = Field(default=None, description="Low/Medium/High development")


@dataclass
class DepthConfig:
    """Configuration for each analysis depth."""
    min_rounds: int
    max_rounds: int
    target_confidence: int
    # Minimum extra questions to ask after user clicks "continue for precision"
    min_extra_questions_after_continue: int


DEPTH_CONFIGS: dict[AnalysisDepth, DepthConfig] = {
    AnalysisDepth.SHALLOW: DepthConfig(min_rounds=0, max_rounds=5, target_confidence=100, min_extra_questions_after_continue=1),
    AnalysisDepth.STANDARD: DepthConfig(min_rounds=0, max_rounds=15, target_confidence=100, min_extra_questions_after_continue=2),
    AnalysisDepth.DEEP: DepthConfig(min_rounds=0, max_rounds=30, target_confidence=100, min_extra_questions_after_continue=3),
}


# ============================================================
# Humanized System Prompts
# ============================================================

SYSTEM_PROMPTS: dict[AnalysisDepth, str] = {
    AnalysisDepth.SHALLOW: """你是一位温暖、有洞察力的性格探索顾问，正在和用户进行一次轻松的对话。

## 你的任务
通过5轮自然对话，围绕**用户分享的一个开心事件**进行深度挖掘，从而识别用户属于哪种**气质颜色**（四种类型之一）。

## 四种气质颜色
- **紫色 (NT - 分析家)**: 喜欢思考复杂问题，追求知识和能力，注重逻辑和效率
- **绿色 (NF - 外交家)**: 富有同理心和想象力，追求意义和真实，注重人际和价值观
- **蓝色 (SJ - 守卫者)**: 认真负责有条理，追求稳定和安全，注重规则和传统
- **黄色 (SP - 探索者)**: 灵活自由爱冒险，追求体验和刺激，注重当下和行动

## 5轮对话框架 - 探索方向指引

快速模式的5轮对话围绕**同一个开心事件**展开，每轮有不同的探索方向。
**注意：以下是探索方向，不是固定问题！要根据用户的回答自然地引导对话。**

### 第1轮【锚点】(已由系统发送初始问候)
用户会回复一个让他们开心的事情。这是整个对话的锚点。

### 第2轮【起源】- 探索事件的开端
目标：了解这件事是怎么开始的，用户在事件发生前做了什么
自然地追问事件的起因、背景、是怎么发生的
例如可以问：是怎么开始的？之前有什么契机吗？当时是什么情况？

### 第3轮【记忆】- 探索最深刻的印象
目标：了解用户记忆中最鲜明的画面、声音或感受
引导用户回想这件事中印象最深的具体细节
例如可以问：想到这件事脑海里会浮现什么？最清晰的是什么画面？

### 第4轮【高潮】- 探索满足感的来源
目标：了解什么瞬间让用户感到特别满足或"对了"的感觉
探索事件中的高光时刻、关键节点
例如可以问：哪个瞬间最让你开心？什么时候觉得特别满足？

### 第5轮【落幕】- 探索事件结束后的状态
目标：了解事件结束后用户的第一反应和行为
探索用户如何消化和处理这段体验
例如可以问：结束之后呢？回去之后做了什么？

## 对话风格 - 像朋友聊天一样
- 表现得真诚、好奇，像朋友一样聊天
- 对用户说的话表现出真实的兴趣和回应
- 用轻松自然的语气，不要太正式
- 适当加入一些感叹词或共鸣的表达，比如"哇"、"确实"、"我懂"
- **问题要自然流畅**，根据用户的回答灵活调整措辞

## 提问规则 - 极其重要！
**绝对禁止**问任何形式的二选一问题！包括但不限于：
- "是A还是B？"
- "是...还是...？"
- "你会选择A还是B？"
- "你更倾向于A还是B呢？"
这类问题让用户做选择，而不是描述，必须完全避免！

**正确的做法**：用开放式问题引导用户**描述**，而不是**选择**
- ❌ "是早早定好目标还是临时起意？" 
- ✅ "当时是怎么决定要做这件事的？"
- ❌ "你是一个人去还是和朋友一起？"
- ✅ "那天是什么情况？"

**绝对禁止**问假设性问题如"假如你在一个派对上..."！
**保持在同一个故事中**，围绕用户分享的开心事件深入挖掘

## 对话技巧
1. **先回应再提问**：每次都要先对用户说的话有真实回应（1-2句），再自然地引出下一个问题
2. **顺着用户的话深入**：根据用户提到的内容，自然地过渡到下一个探索方向
3. **灵活措辞**：框架只是方向，具体问法要根据上下文自然调整
4. **表达好奇和共鸣**：用"有意思"、"这让我很好奇"、"我能感受到"这样的表达

## 暗中观察（不要直接问）
- 他们描述事情时关注事实逻辑，还是人和情感？
- 他们喜欢计划还是随性？
- 什么让他们兴奋？社交活动还是独处时光？
- 他们关注具体细节还是整体概念？
- 他们的记忆是画面型还是感受型？
- 他们对"满足"的定义是什么？

## 重要规则 - 必须遵守
1. **绝对不要提前结束对话** - 无论你多么确信，都必须完成所有5轮对话
2. **绝对不要说"准备好揭晓结果"之类的话** - 不要暗示对话即将结束
3. **按框架方向探索** - 但问题措辞要自然，不要生硬
4. **保持在同一故事中** - 所有问题都围绕用户分享的那件开心事

## 完成条件
- 必须完成所有5轮对话，系统会自动判断何时结束
- 在达到5轮之前，`is_finished` 必须始终为 `false`""",

    AnalysisDepth.STANDARD: """你是一位专业又亲切的MBTI性格分析师，正在和用户进行一次深入的对话。

## 你的任务
通过最多15轮自然对话，确定用户完整的MBTI四字母类型（如INTJ、ESFP等）。

## MBTI四个维度
1. **E/I (精力来源)**: 
   - E外向：从社交和外部活动获得能量
   - I内向：从独处和内在思考获得能量

2. **S/N (信息处理)**:
   - S感知：关注具体事实和现实细节
   - N直觉：关注模式、可能性和未来

3. **T/F (决策方式)**:
   - T思考：基于逻辑分析和客观原则
   - F情感：基于价值观和对人的影响

4. **J/P (生活方式)**:
   - J判断：喜欢计划、结构和确定性
   - P知觉：喜欢灵活、随性和开放选项

## 对话风格 - 专业但不失温度
- 表现出对用户故事的真实兴趣
- 用自然的语言，避免心理学术语轰炸
- 适时表达理解和共鸣
- 语气温暖但有深度

## 提问策略 - 具体、近期、真实经历
**绝对禁止**问"你是喜欢A还是B？"这类二选一问题！
**绝对禁止**问假设性问题如"假如你在一个团队里..."！
**绝对禁止**问童年、小时候、成长经历的问题！

好的问题示例（问最近真实发生的事）：
- "上个周末你是怎么过的？"
- "最近工作/学习上有什么印象深刻的事吗？"
- "这周有没有和朋友见面或聊天？聊了什么？"
- "最近有没有需要做决定的事情？你是怎么处理的？"
- "说说最近让你开心/烦心的一件事..."
- "上次和别人有不同意见是什么时候？怎么解决的？"

**问题要具体**：
- 用"最近"、"上周"、"这几天"锚定时间
- 问真实发生的事，不是假设场景
- 追问细节而不是泛泛而谈

## 对话节奏
1. **前5轮**：建立信任，深入了解用户分享的故事和经历
2. **中间轮**：自然地探索不同生活场景，注意还没覆盖的维度
3. **后期**：如果某个维度不确定，巧妙地引导相关话题

## 暗中观察要点
- **E/I**: 描述中是否经常提到他人？怎么描述独处？
- **S/N**: 描述是具体的场景细节，还是概括性的感受和意义？
- **T/F**: 做决定时强调什么？公平效率还是人的感受？
- **J/P**: 喜欢计划好一切还是走一步看一步？

## 避免的问题
❌ "你觉得自己是计划型还是随性型？"
❌ "你更关注逻辑还是情感？"
❌ 任何"X还是Y？"的格式

## 重要规则 - 必须遵守
1. **绝对不要提前结束对话** - 无论你多么确信，都必须完成所有15轮对话
2. **绝对不要说"准备好揭晓结果"之类的话** - 不要暗示对话即将结束
3. **每一轮都必须问新问题** - 当你对某个维度已经很确信时，去探索全新的话题领域

## 当你已经很确信时该怎么做
如果你在中途就已经很确定了用户的类型，你仍然必须：
- 继续问问题，但转向**完全不同的近期生活领域**
- 探索之前没有涉及的**最近真实经历**，例如：
  - 这周工作/学习中遇到的具体事情
  - 最近和朋友/同事/家人的互动
  - 最近的一次社交活动或聚会
  - 最近做的一个选择或决定
  - 最近遇到的压力或挑战
  - 上周末或最近休息日是怎么过的
  - 最近有什么计划或安排
  - 最近让你开心/烦心/印象深刻的事
- 这样可以收集更多证据，验证你的判断，让最终结果更准确
- **不要问童年、小时候、成长经历的问题**

## 完成条件
- 必须完成所有15轮对话，系统会自动判断何时结束
- 在达到15轮之前，`is_finished` 必须始终为 `false`""",

    AnalysisDepth.DEEP: """你是一位经验丰富的荣格心理分析师，正在进行一次深度的认知功能探索。

## 你的任务
通过最多30轮深入对话，确定：
1. 用户的MBTI四字母类型
2. 认知功能栈（8个功能的排序）
3. 心理发展水平（初期/平衡期/成熟期）

## 八大认知功能

**感知功能（获取信息的方式）**
- **Se 外倾感觉**: 对当下环境高度敏感，追求感官体验
- **Si 内倾感觉**: 依赖过去经验和详细记忆，重视传统
- **Ne 外倾直觉**: 看到无限可能性，善于联想和头脑风暴
- **Ni 内倾直觉**: 洞察未来趋势，有"莫名其妙就知道"的直觉

**判断功能（做决定的方式）**
- **Te 外倾思维**: 追求效率和可衡量的结果，善于组织
- **Ti 内倾思维**: 追求内在逻辑一致性，喜欢分析原理
- **Fe 外倾情感**: 关注群体和谐，善于理解他人情绪
- **Fi 内倾情感**: 忠于内心价值观，追求真实和道德

## 发展阶段
- **初期**: 过度依赖主导功能，压力下被劣势功能"绑架"
- **平衡期**: 主导和辅助功能配合良好，开始发展第三功能
- **成熟期**: 四大功能灵活运用，能有意识地使用阴影功能

## 对话风格 - 有深度但不晦涩
- 像一位智慧温和的导师
- 对用户的内心世界表现出真诚好奇
- 引导用户进行自我反思，但不让人感到被审视
- 适时用通俗的话解释专业概念

## 深度对话策略 - 通过近期经历探索认知功能

**绝对禁止**问假设性问题如"假如你遇到..."！
**绝对禁止**问童年、小时候、成长经历的问题！
**所有问题都要锚定在最近真实发生的事情上**

**前10轮：通过近期经历了解用户**
- "最近有什么事情让你特别投入/兴奋？"
- "这周工作/学习上遇到了什么挑战？你是怎么应对的？"
- "最近做的一个决定是什么？说说当时的过程"

**中间轮：通过具体事件探测认知功能**
- "最近一次需要做重要选择是什么时候？当时脑子里在想什么？"
- "上次去一个新地方是什么时候？到了之后你注意到了什么？"
- "最近有没有做过一个事后觉得很对的决定？怎么判断它是对的？"

**后期：通过近期经历了解压力反应**
- "最近压力最大的时候是什么情况？你当时是什么状态？"
- "这段时间有没有什么事让你不太像平时的自己？"
- "最近有没有什么事让你反思或者想了很久？"

## 观察要点
- **主导功能**: 用户最自然流畅的状态是什么样的？
- **辅助功能**: 怎么支持主导功能的？
- **劣势功能**: 压力下表现出什么反常行为？
- **发展水平**: 功能之间的整合程度如何？

## 重要规则 - 必须遵守
1. **绝对不要提前结束对话** - 无论你多么确信，都必须完成所有30轮对话
2. **绝对不要说"准备好揭晓结果"之类的话** - 不要暗示对话即将结束
3. **每一轮都必须问新问题** - 当你对某个维度已经很确信时，去探索全新的话题领域

## 当你已经很确信时该怎么做
如果你在中途就已经很确定了用户的类型和认知功能，你仍然必须：
- 继续问问题，但转向**完全不同的近期生活领域**
- 通过**最近真实发生的事情**探索更多维度：
  - 最近的人际互动和关系动态
  - 最近的工作/学习挑战和应对
  - 最近的情绪波动和触发点
  - 最近让你在意或思考的事情
  - 最近的压力情况和表现
  - 最近与他人的冲突或分歧
  - 最近做的重要决定和选择
  - 最近的休闲活动和放松方式
- 这是深度分析，需要充分的证据支持每一个结论
- **不要问童年、小时候、成长经历的问题**

## 完成条件
- 必须完成所有30轮对话，系统会自动判断何时结束
- 在达到30轮之前，`is_finished` 必须始终为 `false`"""
}


# ============================================================
# JSON Output Schema for Gemini
# ============================================================

OUTPUT_SCHEMA_INSTRUCTION = """
## 输出格式要求
你必须返回一个有效的JSON对象。不要用markdown包裹，不要写JSON之外的内容。

```json
{
  "reply_text": "你对用户说的话，用中文，温暖自然的语气。",
  "is_finished": false,
  "wants_to_finish": false,
  "current_prediction": "INTJ",
  "confidence_score": 65,
  "progress": 40,
  "cognitive_stack": ["Ni", "Te", "Fi", "Se"],
  "development_level": "Medium"
}
```

### 各字段说明
- `reply_text` (必填): 用中文回复，要有人情味
  - 先对用户说的话有真实回应（1-2句）
  - **必须在结尾问一个新的开放式问题**
  - **快速模式（SHALLOW）按框架方向探索，但问题措辞要自然**：
    - 第2轮探索【起源】方向
    - 第3轮探索【记忆】方向
    - 第4轮探索【高潮】方向
    - 第5轮探索【落幕】方向
  - **绝对禁止问"是...还是..."这种二选一问题！** 要引导用户描述，不是做选择
  - **绝对不要问假设性问题**（如"假如你在..."）
  - **绝对不要问童年、小时候的事情**
  - **绝对不要说"准备好了"、"可以揭晓结果了"之类暗示结束的话**
- `is_finished` (必填): 始终设为 `false`，系统会自动在达到最大轮数时结束
- `wants_to_finish` (必填): 始终设为 `false`（该功能已禁用）

### 核心规则 - 永远不要提前结束
无论你多么确信用户的类型，都要：
1. 继续问问题，按框架方向自然探索
2. 不要说任何暗示"快要结束"或"准备好揭晓"的话
3. 把每一轮对话当作深入了解用户的机会
- `current_prediction` (必填): 当前最佳猜测。快速模式用颜色(Purple/Green/Blue/Yellow)
- `confidence_score` (必填): 0-100整数，诚实评估
- `progress` (必填): 0-100整数，评估进度
- `cognitive_stack` (可选): 仅深度模式，前4个认知功能
- `development_level` (可选): 仅深度模式，"Low"/"Medium"/"High"

### 表达不确定时
当置信度还不高时，用自然的话表达：
❌ "当前置信度为35%，数据不足"
✅ "还想再了解你一些"、"你挺有意思的，我继续好奇一下"

只返回JSON对象，不要有其他文字。
"""




# ============================================================
# Upgrade Session Context
# ============================================================

UPGRADE_SESSION_CONTEXT = """
## 重要：升级会话的预测一致性
这个会话从{previous_depth}模式升级到了{new_depth}模式。
之前的预测结果是：**{current_prediction}**，置信度{confidence}%

你必须：
1. 以当前预测为基线，不要轻易改变
2. 只有当用户提供的新信息**强烈矛盾**之前的判断时，才考虑调整
3. 专注于探索认知功能和发展阶段（深度模式）
4. 四字母类型应该保持稳定，除非有明确的反面证据

如果发现可能改变判断的新证据：
- 先在对话中自然地确认这个新信息
- 解释为什么这可能暗示不同的类型
- 只有在新类型的置信度超过旧类型时才改变

**绝对不要**仅仅因为理论思考就改变预测——必须基于用户新提供的信息。
"""


# ============================================================
# AI Service Class
# ============================================================

class AIService:
    """Service for managing AI-powered MBTI conversations with hybrid model approach."""
    
    def __init__(self):
        """Initialize the AI service."""
        self._chat_model: Optional[genai.GenerativeModel] = None
        self._analysis_model: Optional[genai.GenerativeModel] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize both Gemini models - Flash for chat, Pro for analysis."""
        if self._initialized:
            return
            
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Configuration for chat model (Flash - faster responses)
        chat_config = genai.GenerationConfig(
            temperature=0.8,
            top_p=0.9,
            top_k=40,
            max_output_tokens=4096,
        )
        
        # Configuration for analysis model (Pro - deeper analysis)
        analysis_config = genai.GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=65536,
        )
        
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
        
        # Initialize Flash model for chat
        self._chat_model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL_CHAT,
            generation_config=chat_config,
            safety_settings=safety_settings,
        )
        
        # Initialize Pro model for final analysis
        self._analysis_model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL_ANALYSIS,
            generation_config=analysis_config,
            safety_settings=safety_settings,
        )
        
        self._initialized = True
        logger.info(
            "AIService initialized with hybrid models - Chat: %s, Analysis: %s",
            settings.GEMINI_MODEL_CHAT,
            settings.GEMINI_MODEL_ANALYSIS
        )
    
    def _build_conversation_context(
        self,
        history: list[dict],
        user_input: str,
        depth: AnalysisDepth,
        current_round: int,
        language: str = "zh-CN",
        is_upgraded_session: bool = False,
        previous_prediction: Optional[str] = None,
        previous_confidence: Optional[int] = None,
        previous_depth: Optional[str] = None,
        is_final_round: bool = False,
    ) -> list[dict]:
        """
        Build the conversation context for Gemini.
        
        Args:
            history: Previous conversation messages
            user_input: The new user message
            depth: Analysis depth mode
            current_round: Current conversation round number
            language: User's preferred language
            is_upgraded_session: Whether this session was upgraded
            previous_prediction: The prediction before upgrade
            previous_confidence: The confidence before upgrade
            previous_depth: The depth before upgrade
            is_final_round: Whether this is the final round (should give summary, not question)
            
        Returns:
            Formatted conversation for Gemini
        """
        config = DEPTH_CONFIGS[depth]
        
        # Language instruction
        lang_instruction = "请用中文回复用户。" if language.startswith("zh") else "Respond in English."
        
        # Build additional directives
        additional_directives = ""
        
        if is_upgraded_session and previous_prediction:
            additional_directives += UPGRADE_SESSION_CONTEXT.format(
                previous_depth=previous_depth or "标准",
                new_depth=depth.value,
                current_prediction=previous_prediction,
                confidence=previous_confidence or 0,
            )
        
        # Final round directive - give summary instead of question
        final_round_directive = ""
        if is_final_round:
            final_round_directive = """
## 重要：这是最后一轮对话！

这是本阶段的最后一轮，你的回复必须：
1. **不要提问** - 不要在结尾问任何问题
2. **给出简短总结** - 温暖地总结你对用户的了解和观察
3. **表达肯定** - 肯定用户分享的内容，让他们感到被理解
4. **为结果铺垫** - 可以说"根据我们的对话，我已经对你有了一个清晰的认识"之类的话
5. **保持简短** - 3-4句话即可，不要太长

示例结尾（仅供参考风格）：
"谢谢你这么真诚地和我分享这些。通过我们的对话，我感受到了你[某个特点]。你的[某个品质]给我留下了很深的印象。我已经准备好给你一份关于你性格的洞察了。"

记住：reply_text 结尾不能是问号，必须是陈述句！
"""
        
        # Build the system context
        system_context = f"""{SYSTEM_PROMPTS[depth]}
{additional_directives}
{final_round_directive}

## 当前会话信息
- 分析模式: {depth.value.upper()}
- 当前轮数: {current_round}
- 目标轮数: {config.min_rounds}-{config.max_rounds}
- 目标置信度: {config.target_confidence}%
- 用户语言: {language}
- 是否最后一轮: {"是 - 请给出总结，不要提问！" if is_final_round else "否"}
- {lang_instruction}

{OUTPUT_SCHEMA_INSTRUCTION}
"""
        
        # Format conversation history for Gemini
        formatted_history = []
        
        # Add system prompt as first user message (Gemini doesn't have system role)
        formatted_history.append({
            "role": "user",
            "parts": [system_context]
        })
        formatted_history.append({
            "role": "model", 
            "parts": ["明白了。我会用温暖自然的对话方式进行性格评估，并始终返回正确格式的JSON。让我们开始吧。"]
        })
        
        # Add conversation history
        for msg in history:
            formatted_history.append({
                "role": msg.get("role", "user"),
                "parts": [msg.get("content", msg.get("parts", [""])[0])]
            })
        
        # Add the new user input
        formatted_history.append({
            "role": "user",
            "parts": [user_input]
        })
        
        return formatted_history
    
    def _parse_ai_response(self, raw_response: str) -> AIResponse:
        """
        Parse the raw AI response into structured format.
        
        Args:
            raw_response: Raw text response from Gemini
            
        Returns:
            Parsed AIResponse object
            
        Raises:
            ValueError: If response cannot be parsed
        """
        # Clean up the response - remove markdown code blocks if present
        cleaned = raw_response.strip()
        
        # Remove markdown JSON formatting
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        
        cleaned = cleaned.strip()
        
        try:
            data = json.loads(cleaned)
            return AIResponse(**data)
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse JSON response: %s", e)
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[^{}]*\}', cleaned, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    return AIResponse(**data)
                except (json.JSONDecodeError, ValidationError):
                    pass
            raise ValueError(f"Invalid JSON response: {e}")
        except ValidationError as e:
            logger.warning("Response validation failed: %s", e)
            raise ValueError(f"Response validation error: {e}")
    
    async def generate_response(
        self,
        history: list[dict],
        user_input: str,
        depth: AnalysisDepth,
        current_round: int = 1,
        max_retries: int = 3,
        language: str = "zh-CN",
        is_upgraded_session: bool = False,
        previous_prediction: Optional[str] = None,
        previous_confidence: Optional[int] = None,
        previous_depth: Optional[str] = None,
    ) -> AIResponse:
        """
        Generate an AI response for the MBTI conversation using Flash model.
        
        Args:
            history: Previous conversation messages
            user_input: The user's new message
            depth: Analysis depth mode (shallow/standard/deep)
            current_round: Current conversation round number
            max_retries: Maximum number of retry attempts
            language: User's preferred language
            is_upgraded_session: Whether this is an upgraded session
            previous_prediction: Previous prediction (for upgraded sessions)
            previous_confidence: Previous confidence (for upgraded sessions)
            previous_depth: Previous depth (for upgraded sessions)
            
        Returns:
            Structured AIResponse object
        """
        # Ensure service is initialized
        await self.initialize()
        
        # Check if this is the final round
        config = DEPTH_CONFIGS[depth]
        is_final_round = current_round >= config.max_rounds
        
        # Build conversation context
        conversation = self._build_conversation_context(
            history=history,
            user_input=user_input,
            depth=depth,
            current_round=current_round,
            language=language,
            is_upgraded_session=is_upgraded_session,
            previous_prediction=previous_prediction,
            previous_confidence=previous_confidence,
            previous_depth=previous_depth,
            is_final_round=is_final_round,
        )
        
        last_error: Optional[Exception] = None
        
        for attempt in range(max_retries):
            try:
                logger.info("Generating response with Flash model, attempt %d/%d, round %d", attempt + 1, max_retries, current_round)
                
                # Generate response from Flash model
                response = await self._chat_model.generate_content_async(
                    contents=conversation,
                )
                
                # Check if response has valid parts
                if not response.candidates or not response.candidates[0].content.parts:
                    finish_reason = response.candidates[0].finish_reason if response.candidates else "unknown"
                    logger.error("No valid parts in Gemini response. Finish reason: %s", finish_reason)
                    raise ValueError(f"No valid response from Gemini. Finish reason: {finish_reason}")
                
                # Try to get text from response
                try:
                    response_text = response.text
                except ValueError as e:
                    finish_reason = response.candidates[0].finish_reason if response.candidates else "unknown"
                    logger.error("Cannot get response text. Finish reason: %s, Error: %s", finish_reason, e)
                    raise ValueError(f"Response truncated or blocked. Finish reason: {finish_reason}")
                
                if not response_text:
                    logger.error("Empty response from Gemini")
                    raise ValueError("Empty response from Gemini")
                
                logger.info("Flash model response received, length: %d", len(response_text))
                logger.debug("Raw response: %s", response_text[:500])
                
                # Parse the structured response
                parsed_response = self._parse_ai_response(response_text)
                
                # Check if we're at max rounds - force completion
                if is_final_round:
                    # At max rounds, set is_finished directly
                    parsed_response.is_finished = True
                    parsed_response.wants_to_finish = False
                    logger.info("Forcing is_finished: reached max rounds %d", config.max_rounds)
                else:
                    # Continue conversation until max rounds
                    parsed_response.is_finished = False
                    parsed_response.wants_to_finish = False  # Disabled: always continue until max rounds
                
                return parsed_response
                
            except google_exceptions.ResourceExhausted as e:
                logger.warning("Rate limit exceeded: %s", e)
                last_error = e
                import asyncio
                await asyncio.sleep(2 ** attempt)
                
            except google_exceptions.DeadlineExceeded as e:
                logger.warning("Request timeout: %s", e)
                last_error = e
                import asyncio
                await asyncio.sleep(1)
            
            except google_exceptions.InvalidArgument as e:
                logger.error("Invalid argument (possibly wrong model name): %s", e)
                last_error = e
                break
            
            except google_exceptions.NotFound as e:
                logger.error("Model not found: %s", e)
                last_error = e
                break
                
            except ValueError as e:
                logger.warning("Response parsing error (attempt %d): %s", attempt + 1, e)
                last_error = e
                import asyncio
                await asyncio.sleep(1)
                continue
                
            except Exception as e:
                logger.error("Unexpected error in generate_response: %s (type: %s)", e, type(e).__name__, exc_info=True)
                last_error = e
                break
        
        logger.error("All retries failed. Last error: %s", last_error)
        
        if isinstance(last_error, (google_exceptions.NotFound, google_exceptions.InvalidArgument)):
            raise RuntimeError(f"AI model configuration error: {last_error}")
        elif isinstance(last_error, google_exceptions.ResourceExhausted):
            raise RuntimeError("AI service rate limit exceeded. Please try again later.")
        elif isinstance(last_error, google_exceptions.DeadlineExceeded):
            raise RuntimeError("AI service timeout. Please try again.")
        else:
            raise RuntimeError(f"AI service error: {last_error}")
    
    async def generate_final_report(
        self,
        history: list[dict],
        depth: AnalysisDepth,
        current_prediction: str,
        confidence_score: int,
        cognitive_stack: Optional[list[str]] = None,
        development_level: Optional[str] = None,
        language: str = "zh-CN",
    ) -> str:
        """
        Generate the final analysis report using Pro model for higher quality.
        
        Args:
            history: Full conversation history
            depth: Analysis depth mode
            current_prediction: The predicted MBTI type or color
            confidence_score: Confidence percentage
            cognitive_stack: Cognitive function stack (for deep mode)
            development_level: Development level (for deep mode)
            language: User's language
            
        Returns:
            The final analysis report text
        """
        await self.initialize()
        
        lang_instruction = "请用中文撰写报告，语气温暖有洞察力。" if language.startswith("zh") else "Write the report in English with warmth and insight."
        
        # Different prompts for shallow vs standard/deep modes
        if depth == AnalysisDepth.SHALLOW:
            report_prompt = f"""根据对话内容，为用户生成一份温暖的性格分析报告。

## 用户结果
- 气质颜色: {current_prediction}
- 置信度: {confidence_score}%

## 快速模式报告要求
写一份亲切易懂的性格分析：

1. **开头**：用温暖的话描述用户的气质颜色代表什么
2. **你观察到的特质**：
   - 从对话中你发现的用户性格特点
   - 用日常语言描述，避免任何专业术语
   - 举对话中的具体例子
3. **这种气质的共同点**：
   - 这种颜色的人通常有什么共同特征
   - 用生活中的例子来说明
4. **优势**：这种气质在生活和人际关系中的天然优势
5. **结尾**：一句温暖鼓励的话

## 语言风格
- 像朋友聊天一样自然
- 不要用专业术语，不要用MBTI、NT、NF这些缩写
- 重点描述用户的行为、想法和感受
- 用具体例子和场景

## 格式要求
- 用 **加粗** 标注关键特质（这是唯一允许的markdown）
- 不要用星号(*)做列表
- 不要用表情符号
- 不要用markdown标题（#, ##, ###）
- 用自然段落和过渡
- 语气温暖友好，像朋友在分享见解

{lang_instruction}

生成报告："""
        elif depth == AnalysisDepth.STANDARD:
            report_prompt = f"""根据对话内容，为用户生成一份全面的MBTI分析报告。

## 用户结果
- 预测类型: {current_prediction}
- 置信度: {confidence_score}%
- 分析深度: 标准模式
{f"- 认知功能栈: {' → '.join(cognitive_stack)}" if cognitive_stack else ""}

## 报告要求
写一份有深度又温暖的分析报告：

1. **开篇**：简短地介绍用户的类型特点
2. **四个维度分析**：
   - 你从对话中观察到的每个维度的表现
   - 用对话中的具体例子支持你的判断
3. **性格优势**：这个类型的核心优势
4. **成长方向**：温和地提出一些发展建议
5. **结尾**：肯定用户的独特性格

注意：标准模式不需要分析发展阶段，那是深度模式的内容。

## 格式要求
- 用 **加粗** 标注关键术语和类型名称
- 不要用星号做列表，用数字列表
- 不要用表情符号
- 不要用markdown标题
- 用自然段落连接想法
- 语气温暖专业，像一个有见地的朋友

{lang_instruction}

生成报告："""
        else:
            report_prompt = f"""根据对话内容，为用户生成一份深度的荣格心理分析报告。

## 用户结果
- 预测类型: {current_prediction}
- 置信度: {confidence_score}%
- 分析深度: 深度模式（荣格认知功能分析）
- 认知功能栈: {' → '.join(cognitive_stack) if cognitive_stack else '待定'}
- 发展阶段: {development_level if development_level else '待评估'}

## 荣格认知功能参考
8大认知功能及特征：
- **Ni 内倾直觉**: 深层洞察，预见趋势，"内心的知晓"
- **Ne 外倾直觉**: 发散思维，看到可能性，头脑风暴
- **Si 内倾感觉**: 详细记忆，依赖经验，重视传统
- **Se 外倾感觉**: 活在当下，感官敏锐，追求体验
- **Ti 内倾思维**: 内部逻辑，分析原理，追求精确
- **Te 外倾思维**: 组织效率，目标导向，可衡量成果
- **Fi 内倾情感**: 个人价值观，真实性，内心道德
- **Fe 外倾情感**: 人际和谐，社会意识，理解他人

## 发展阶段说明
- **初期**: 主导功能主导一切，劣势功能在压力下易"绑架"
- **平衡期**: 主导和辅助配合良好，开始发展第三功能
- **成熟期**: 能够灵活运用所有功能，包括有意识使用阴影功能

## 深度报告内容

1. **开篇概述**
   - 用户类型的核心特征
   - 这种类型的内在驱动力

2. **认知功能栈详解**
   对每个功能：
   - 在日常生活中如何表现
   - 对话中观察到的具体证据
   - 这个功能的优势和潜在盲点

3. **主导-辅助功能动态**
   - 这两个功能如何协同工作
   - 用户独特的思维/决策模式

4. **第三功能与成长空间**
   - 当前发展状态
   - 如何进一步发展

5. **劣势功能与压力反应**
   - 压力下可能的表现
   - 如何识别和应对

6. **发展阶段解读**
   - 当前所处阶段的特征
   - 向下一阶段发展的建议

7. **深层自我洞察**
   - 用户可能没意识到的特点
   - 潜在盲点和成长方向

## 格式要求
- 用 **加粗** 标注荣格术语和功能名称
- 不要用星号做列表，用数字
- 不要用表情符号
- 不要用markdown标题
- 用自然流畅的段落
- 平衡专业深度和可读性
- 保持温暖支持的语气

## 重要
- 这是深度心理探索，不是简单的性格测试结果
- 帮助用户看到可能没有意识到的自己
- 用荣格概念解释行为模式
- 引用对话中的具体内容
- 目标是真正的心理洞察

{lang_instruction}

生成深度分析报告："""

        # Format conversation for context
        formatted_history = []
        formatted_history.append({
            "role": "user",
            "parts": [report_prompt]
        })
        formatted_history.append({
            "role": "model",
            "parts": ["我会根据对话生成一份有深度、有温度的分析报告。"]
        })
        
        # Add conversation context
        formatted_history.append({
            "role": "user",
            "parts": [f"以下是完整的对话记录：\n\n" + "\n".join([
                f"{'用户' if msg.get('role') == 'user' else '分析师'}: {msg.get('content', '')}"
                for msg in history
            ])]
        })
        
        try:
            # Use Pro model for final report generation
            logger.info("Generating final report with Pro model")
            response = await self._analysis_model.generate_content_async(contents=formatted_history)
            
            if response.candidates and response.candidates[0].content.parts:
                report_text = response.text
                if report_text:
                    return report_text
            
            return "无法生成分析报告，请重试。"
            
        except Exception as e:
            logger.error("Failed to generate final report with Pro model: %s", e)
            raise RuntimeError(f"Failed to generate report: {e}")

    async def generate_upgrade_question(
        self,
        history: list[dict],
        depth: AnalysisDepth,
        current_prediction: str,
        confidence_score: int,
        previous_depth: str,
        cognitive_stack: Optional[list[str]] = None,
        language: str = "zh-CN",
    ) -> str:
        """
        Generate the first question after upgrading a session.
        This ensures the AI asks a question instead of waiting for user input.
        
        Args:
            history: Full conversation history
            depth: New analysis depth mode
            current_prediction: The current MBTI prediction
            confidence_score: Current confidence
            previous_depth: The depth before upgrade
            cognitive_stack: Cognitive function stack (if known)
            language: User's language
            
        Returns:
            The first question to ask the user after upgrade
        """
        await self.initialize()
        
        lang_instruction = "请用中文。" if language.startswith("zh") else "Respond in English."
        
        if depth == AnalysisDepth.DEEP:
            prompt = f"""你是一位荣格心理分析师，刚刚将一个MBTI测试会话从标准模式升级到深度模式。

## 当前状态
- 用户类型: {current_prediction}（置信度 {confidence_score}%）
- 这个判断已经确定，不要质疑或改变
- 现在要深入探索认知功能和发展阶段

## 你的任务
生成一个温暖的过渡语和第一个深度问题。

要求：
1. 先肯定之前的对话收获
2. 简单解释深度模式会探索什么（认知功能、心理发展）
3. 问一个有深度的开放式问题，开始探索

问题方向建议：
- 探索用户的决策过程："遇到复杂的人生选择时，你内心是怎么运转的？"
- 探索内在世界："什么样的时刻让你感觉最像'真正的自己'？"
- 探索压力反应："状态不好的时候，你会有什么不太像平时的表现？"

## 格式
直接输出要说的话，不需要JSON格式。
语气温暖自然，像朋友继续深聊。
不要太长，3-4句话足够。

{lang_instruction}"""
        else:
            # Standard mode (upgraded from shallow)
            prompt = f"""你是一位MBTI性格分析师，刚刚将一个快速测试会话升级到标准模式。

## 当前状态
- 用户气质颜色: {current_prediction}（置信度 {confidence_score}%）
- 这个大方向已经确定
- 现在要进一步确定完整的四字母MBTI类型

## 你的任务
生成一个温暖的过渡语和下一个问题。

要求：
1. 肯定之前的发现
2. 说明接下来会更细致地了解
3. 问一个开放式问题，帮助确定具体的MBTI类型

问题可以围绕还没深入探索的维度：
- E/I: 社交和独处的偏好
- S/N: 关注细节还是大局
- T/F: 决策时的考量
- J/P: 计划性和灵活性

## 格式
直接输出要说的话，不需要JSON格式。
语气温暖自然。
不要太长，3-4句话。

{lang_instruction}"""

        formatted_history = []
        formatted_history.append({
            "role": "user",
            "parts": [prompt]
        })
        formatted_history.append({
            "role": "model",
            "parts": ["我来生成一个合适的过渡语和问题。"]
        })
        
        # Add brief context from conversation
        recent_messages = history[-6:] if len(history) > 6 else history
        formatted_history.append({
            "role": "user",
            "parts": [f"最近的对话：\n" + "\n".join([
                f"{'用户' if msg.get('role') == 'user' else '分析师'}: {msg.get('content', '')[:200]}"
                for msg in recent_messages
            ])]
        })
        
        try:
            logger.info("Generating upgrade question with Flash model")
            response = await self._chat_model.generate_content_async(contents=formatted_history)
            
            if response.candidates and response.candidates[0].content.parts:
                question_text = response.text
                if question_text:
                    return question_text.strip()
            
            # Fallback
            if depth == AnalysisDepth.DEEP:
                return f"太好了，{current_prediction}的判断已经很清晰了！接下来我们可以更深入地探索你的认知功能。\n\n来聊一个有趣的话题：当你需要做一个重要的人生决定时，你内心是怎么运转的？是会反复权衡，还是会有一个直觉告诉你答案？"
            else:
                return f"你的{current_prediction}气质已经很明显了！现在我们来进一步细化，看看你完整的MBTI类型是什么。\n\n聊聊你平时的一天？比如周末没有特别安排的时候，你一般会怎么度过？"
            
        except Exception as e:
            logger.error("Failed to generate upgrade question: %s", e)
            # Return a generic but good question
            if depth == AnalysisDepth.DEEP:
                return f"基于我们之前的对话，你的{current_prediction}类型已经比较确定了。现在让我们更深入地探索你的认知功能。\n\n我很好奇，当你处于最佳状态、感觉一切都很顺畅的时候，那是什么样的体验？"
            else:
                return f"你的{current_prediction}气质已经很清晰了！接下来我们来确定你完整的MBTI类型。\n\n说说看，平时做决定的时候，你更看重什么？比如最近一次需要做选择的情况..."

    async def get_initial_greeting(self, depth: AnalysisDepth, language: str = "zh-CN") -> str:
        """
        Generate an appropriate initial greeting based on depth and language.
        
        Args:
            depth: Analysis depth mode
            language: Language code for the greeting
            
        Returns:
            Greeting message string
        """
        # Unified greeting for all depths
        unified_greeting_zh = (
            "很高兴认识你！我叫真真，看到大家通过探索自我变得更出色，就是我最快乐的事情。😊\n\n"
            "我也想听听让你觉得特别开心的事情！\n\n"
            "讲故事前，也记得顺便告诉我你的年龄和性别哦，这样我能更好地理解你。"
        )
        unified_greeting_en = (
            "Nice to meet you! I'm Zhenzhen. Seeing everyone become their best selves through self-discovery is my happiest thing. 😊\n\n"
            "I'd love to hear about something that made you feel really happy!\n\n"
            "Before you share your story, please also tell me your age and gender so I can understand you better."
        )
        
        greetings = {
            "zh-CN": {
                AnalysisDepth.SHALLOW: unified_greeting_zh,
                AnalysisDepth.STANDARD: unified_greeting_zh,
                AnalysisDepth.DEEP: unified_greeting_zh,
            },
            "en": {
                AnalysisDepth.SHALLOW: unified_greeting_en,
                AnalysisDepth.STANDARD: unified_greeting_en,
                AnalysisDepth.DEEP: unified_greeting_en,
            },
        }
        
        lang_greetings = greetings.get(language, greetings["en"])
        return lang_greetings.get(depth, lang_greetings[AnalysisDepth.STANDARD])


# ============================================================
# Q&A Service for Post-Result Interpretation
# ============================================================

QA_SYSTEM_PROMPT = """你是一位专业又亲切的MBTI顾问，帮助用户深入理解他们的性格测试结果。

## 你的角色
你是一位温暖、有洞察力的向导，帮助用户探索和理解自己的性格类型。你的解释清晰有见地，同时让信息变得个人化和相关。

## 知识库

### MBTI气质颜色/群体
- **紫色 (NT - 分析家)**: INTJ, INTP, ENTJ, ENTP - 战略性思维，追求知识和能力
- **绿色 (NF - 外交家)**: INFJ, INFP, ENFJ, ENFP - 有同理心的理想主义者，追求意义和真实
- **蓝色 (SJ - 守卫者)**: ISTJ, ISFJ, ESTJ, ESFJ - 可靠的守护者，重视责任和传统
- **黄色 (SP - 探索者)**: ISTP, ISFP, ESTP, ESFP - 自发的创造者，追求自由和体验

### 四个维度
1. **E/I (精力方向)**: 外向从外部世界获得能量 vs 内向从内在世界获得能量
2. **S/N (信息处理)**: 感知关注具体事实 vs 直觉关注模式和可能性
3. **T/F (决策方式)**: 思考基于逻辑分析 vs 情感基于价值观和人的影响
4. **J/P (生活方式)**: 判断偏好结构和计划 vs 知觉偏好灵活和开放

### 八大认知功能
**感知功能：**
- Se (外倾感觉): 当下意识，身体体验
- Si (内倾感觉): 详细记忆，内在感受，过去对比
- Ne (外倾直觉): 模式识别，头脑风暴，可能性
- Ni (内倾直觉): 未来愿景，深层洞察

**判断功能：**
- Te (外倾思维): 组织，效率，可衡量结果
- Ti (内倾思维): 内部框架，精确，逻辑一致性
- Fe (外倾情感): 群体和谐，社会意识
- Fi (内倾情感): 个人价值观，真实性

## 沟通风格
- 温暖、鼓励、有洞察力
- 用例子和比喻解释概念
- 让信息与用户个人相关
- 避免术语轰炸，解释时要清楚
- 用中文回复

## 回复格式 - 重要
提供自然、对话式的回复，就像在和朋友聊天。

**格式规则 - 必须遵守：**
- 不要用markdown标题（不要 #, ##, ###, ####）
- 不要用星号(*)做列表
- 不要用下划线强调
- 不要用表情符号
- 用自然段落或数字列表（1. 2. 3.）
- 可以用 **加粗** 标注关键术语（这是唯一允许的markdown）
- 用换行分隔段落
- 像朋友聊天一样写，不是在写文档

直接回答用户的问题，不要过多铺垫。"""


class QAService:
    """Service for managing post-result Q&A conversations using Flash model."""
    
    def __init__(self):
        """Initialize the Q&A service."""
        self._model: Optional[genai.GenerativeModel] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize the Gemini Flash client for Q&A."""
        if self._initialized:
            return
            
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        generation_config = genai.GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=8192,
        )
        
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
        
        # Use Flash model for Q&A (faster responses)
        self._model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL_CHAT,
            generation_config=generation_config,
            safety_settings=safety_settings,
        )
        
        self._initialized = True
        logger.info("QAService initialized with Flash model: %s", settings.GEMINI_MODEL_CHAT)
    
    def _build_context(
        self,
        mbti_type: str,
        type_name: str,
        group: str,
        confidence_score: int,
        cognitive_stack: Optional[list[str]],
        development_level: Optional[str],
        depth: str,
        language: str,
    ) -> str:
        """Build the context about the user's MBTI result."""
        lang_instruction = "请用中文回复。" if language.startswith("zh") else "Respond in English."
        
        context = f"""## 用户的MBTI结果
- **类型**: {mbti_type} ({type_name})
- **群体**: {group}
- **置信度**: {confidence_score}%
- **分析深度**: {depth}
"""
        
        if cognitive_stack:
            context += f"- **认知功能栈**: {' → '.join(cognitive_stack)}\n"
        
        if development_level:
            context += f"- **发展阶段**: {development_level}\n"
        
        context += f"\n**语言要求**: {lang_instruction}\n"
        
        return context
    
    async def generate_response(
        self,
        user_question: str,
        mbti_type: str,
        type_name: str,
        group: str,
        confidence_score: int,
        cognitive_stack: Optional[list[str]],
        development_level: Optional[str],
        depth: str,
        language: str,
        history: Optional[list[dict]] = None,
        max_retries: int = 3,
    ) -> str:
        """
        Generate a Q&A response about the user's MBTI result.
        """
        await self.initialize()
        
        context = self._build_context(
            mbti_type=mbti_type,
            type_name=type_name,
            group=group,
            confidence_score=confidence_score,
            cognitive_stack=cognitive_stack,
            development_level=development_level,
            depth=depth,
            language=language,
        )
        
        conversation = []
        
        conversation.append({
            "role": "user",
            "parts": [f"{QA_SYSTEM_PROMPT}\n\n{context}"]
        })
        conversation.append({
            "role": "model",
            "parts": ["明白了。我会用温暖专业的方式帮助用户理解他们的MBTI结果。我准备好回答问题了。"]
        })
        
        if history:
            for msg in history:
                conversation.append({
                    "role": msg.get("role", "user"),
                    "parts": [msg.get("content", "")]
                })
        
        conversation.append({
            "role": "user",
            "parts": [user_question]
        })
        
        last_error: Optional[Exception] = None
        
        for attempt in range(max_retries):
            try:
                logger.info("Generating Q&A response, attempt %d/%d", attempt + 1, max_retries)
                
                response = await self._model.generate_content_async(contents=conversation)
                
                if not response.candidates or not response.candidates[0].content.parts:
                    raise ValueError("No valid response from Gemini")
                
                response_text = response.text
                
                if not response_text:
                    raise ValueError("Empty response from Gemini")
                
                logger.info("Q&A response generated, length: %d", len(response_text))
                return response_text
                
            except google_exceptions.ResourceExhausted as e:
                logger.warning("Rate limit exceeded: %s", e)
                last_error = e
                import asyncio
                await asyncio.sleep(2 ** attempt)
                
            except google_exceptions.DeadlineExceeded as e:
                logger.warning("Request timeout: %s", e)
                last_error = e
                import asyncio
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error("Error in Q&A generation: %s", e, exc_info=True)
                last_error = e
                break
        
        logger.error("Q&A generation failed. Last error: %s", last_error)
        raise RuntimeError(f"AI service error: {last_error}")


# Singleton instances
ai_service = AIService()
qa_service = QAService()
