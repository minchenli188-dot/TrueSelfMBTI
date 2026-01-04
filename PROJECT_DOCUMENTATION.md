# MBTI Assistant - 完整项目文档

> **TrueSelfMBTI.com** - 用最懂你的方式，帮助你更好地了解自己，成为更好的自己

一个 AI 驱动的 MBTI 性格测评应用，通过自然对话而非选择题来深入理解用户性格。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [系统架构](#3-系统架构)
4. [后端详解](#4-后端详解)
5. [前端详解](#5-前端详解)
6. [核心功能](#6-核心功能)
7. [API 接口文档](#7-api-接口文档)
8. [数据模型](#8-数据模型)
9. [AI 服务详解](#9-ai-服务详解)
10. [部署与运行](#10-部署与运行)
11. [配置说明](#11-配置说明)
12. [开发指南](#12-开发指南)

---

## 1. 项目概述

### 1.1 项目简介

MBTI Assistant 是一款创新的 AI 性格测评产品，摒弃了传统 MBTI 测试的枯燥选择题形式，采用自然对话的方式进行性格评估。基于荣格心理学理论，通过 Google Gemini AI 进行深度对话分析，帮助用户发现自己的真实性格类型。

### 1.2 核心特色

| 特性 | 描述 |
|------|------|
| 🗣️ **自然对话** | 像和朋友聊天一样，用开放式问题引导用户表达真实自我 |
| 🧠 **荣格理论** | 基于卡尔·荣格原型心理学，提供有学术支撑的分析 |
| ⚡ **多深度模式** | 支持快速(5题)、标准(15题)、深度(30题)三种模式 |
| 📊 **认知功能分析** | 深入分析 8 大认知功能栈，揭示思维运作的底层逻辑 |
| 🎨 **专属画像** | AI 生成专属于用户的 Pop Mart 风格人格视觉肖像 |
| 💬 **AI 解答** | 测试后与 AI 实时对话，解答关于结果的任何疑问 |
| 📈 **渐进式测试** | 支持从快速模式无缝升级到更深层次的分析 |

### 1.3 MBTI 类型体系

项目支持完整的 16 种 MBTI 人格类型，分为 4 个气质群体：

| 群体 | 颜色 | 类型 | 特征 |
|------|------|------|------|
| 🟣 **分析家 (NT)** | `#88619a` | INTJ, INTP, ENTJ, ENTP | 战略性思维，追求知识和能力 |
| 🟢 **外交家 (NF)** | `#33a474` | INFJ, INFP, ENFJ, ENFP | 有同理心的理想主义者 |
| 🔵 **守卫者 (SJ)** | `#4298b4` | ISTJ, ISFJ, ESTJ, ESFJ | 可靠的守护者，重视责任和传统 |
| 🟡 **探索者 (SP)** | `#e2a03f` | ISTP, ISFP, ESTP, ESFP | 自发的创造者，追求自由和体验 |

---

## 2. 技术栈

### 2.1 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **FastAPI** | 0.115.6 | Web 框架 |
| **Python** | 3.11+ | 编程语言 |
| **SQLAlchemy** | 2.0.36 | 异步 ORM |
| **SQLite + aiosqlite** | 0.20.0 | 数据库 (MVP) |
| **Pydantic** | 2.10.4 | 数据验证 |
| **Google Generative AI** | 0.8.3 | Gemini AI 服务 |
| **Uvicorn** | 0.34.0 | ASGI 服务器 |

### 2.2 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 15.1.3 | React 框架 (App Router) |
| **React** | 19.0.0 | UI 库 |
| **TypeScript** | 5.7.2 | 类型安全 |
| **Tailwind CSS** | 3.4.17 | 样式框架 |
| **Framer Motion** | 11.15.0 | 动画库 |
| **Zustand** | 5.0.2 | 状态管理 |
| **Lucide React** | 0.469.0 | 图标库 |

### 2.3 AI 模型

| 模型 | 用途 |
|------|------|
| **gemini-3-flash-preview** | 对话问答 (快速响应) |
| **gemini-3-pro-preview** | 最终分析报告 (深度分析) |
| **gemini-3-pro-image-preview** | 个性化头像生成 |

---

## 3. 系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Components │  │    Hooks     │  │       Context          │  │
│  │  - Chat UI  │  │ useChatSession│ │ - ThemeContext        │  │
│  │  - Result   │  │ useQASession │  │ - ToastContext        │  │
│  │  - Depth    │  │ useAnalytics │  │                        │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      API Client (lib/api.ts)               │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/REST
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Routers                               ││
│  │  ┌──────────────────┐    ┌────────────────────────────────┐ ││
│  │  │   chat.py        │    │        analytics.py            │ ││
│  │  │ - /start         │    │ - /profile                     │ ││
│  │  │ - /message       │    │ - /event                       │ ││
│  │  │ - /finish        │    │ - /feedback                    │ ││
│  │  │ - /upgrade       │    │ - /stats                       │ ││
│  │  │ - /qa            │    │ - /extract-insights            │ ││
│  │  │ - /image         │    └────────────────────────────────┘ ││
│  │  └──────────────────┘                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                       Services                               ││
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ ││
│  │  │   ai_service    │ │ image_generator │ │ insight_extractor││
│  │  │ - generate_resp │ │ - Pop Mart style│ │ - Demographics │ ││
│  │  │ - final_report  │ │ - Avatar gen    │ │ - Behavior     │ ││
│  │  │ - upgrade_quest │ │                 │ │                │ ││
│  │  └─────────────────┘ └─────────────────┘ └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Database (SQLite)                        ││
│  │  Sessions │ Messages │ Analyses │ UserProfiles │ Events     ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Google Gemini AI                             │
│           Flash (Chat) │ Pro (Analysis) │ Image                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
MBTI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── config.py            # 环境配置管理
│   │   ├── dependencies.py      # 依赖注入 (限流等)
│   │   ├── models/
│   │   │   ├── database.py      # SQLAlchemy 数据模型
│   │   │   ├── schemas.py       # Pydantic 模式定义
│   │   │   ├── analytics.py     # 分析相关数据模型
│   │   │   └── analytics_schemas.py  # 分析 API 模式
│   │   ├── routers/
│   │   │   ├── chat.py          # 聊天 API 路由
│   │   │   └── analytics.py     # 分析 API 路由
│   │   └── services/
│   │       ├── ai_service.py    # AI 服务 (Gemini)
│   │       ├── image_generator.py    # 图片生成服务
│   │       └── user_insight_extractor.py  # 用户洞察提取
│   ├── mbti_assistant.db        # SQLite 数据库文件
│   ├── requirements.txt         # Python 依赖
│   └── venv/                    # 虚拟环境
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # 根布局
│   │   │   ├── page.tsx         # 主页面
│   │   │   ├── providers.tsx    # Context Providers
│   │   │   └── globals.css      # 全局样式
│   │   ├── components/
│   │   │   ├── chat/            # 聊天相关组件
│   │   │   │   ├── ChatBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── DynamicBackground.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   ├── ui/              # 通用 UI 组件
│   │   │   ├── AIQAView.tsx     # AI 问答视图
│   │   │   ├── DepthSelector.tsx    # 深度选择器
│   │   │   ├── FeedbackButton.tsx   # 反馈按钮
│   │   │   └── ResultView.tsx   # 结果展示视图
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx     # 主题上下文
│   │   │   └── ToastContext.tsx     # Toast 通知上下文
│   │   ├── hooks/
│   │   │   ├── useChatSession.ts    # 聊天会话 Hook
│   │   │   ├── useQASession.ts      # Q&A 会话 Hook
│   │   │   └── useAnalytics.ts      # 分析埋点 Hook
│   │   ├── lib/
│   │   │   ├── api.ts           # API 客户端
│   │   │   ├── analytics.ts     # 分析工具
│   │   │   └── utils.ts         # 工具函数
│   │   ├── store/
│   │   │   └── chat.ts          # Zustand 状态管理
│   │   └── types/
│   │       └── mbti.ts          # MBTI 类型定义
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.ts
│
├── README.md
└── start-tunnel.sh              # Cloudflare 隧道启动脚本
```

---

## 4. 后端详解

### 4.1 应用入口 (main.py)

FastAPI 应用配置了以下特性：

```python
# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    await init_db()
    yield
    # 关闭时清理资源

# CORS 配置 - 允许所有来源 (开发/隧道访问)
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    ...

# 路由注册
app.include_router(chat.router, prefix="/api/chat")
app.include_router(analytics.router, prefix="/api/analytics")
```

### 4.2 配置管理 (config.py)

使用 Pydantic Settings 管理环境变量：

```python
class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "MBTI Assistant MVP"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # API 密钥
    GEMINI_API_KEY: str = ""
    NANO_BANANA_KEY: str = ""  # 预留
    
    # 数据库
    DATABASE_URL: str = "sqlite+aiosqlite:///./mbti_assistant.db"
    
    # AI 模型配置 (混合模型策略)
    GEMINI_MODEL_CHAT: str = "gemini-3-flash-preview"      # 对话
    GEMINI_MODEL_ANALYSIS: str = "gemini-3-pro-preview"    # 分析
    GEMINI_IMAGE_MODEL: str = "gemini-3-pro-image-preview" # 图像
```

### 4.3 依赖注入 (dependencies.py)

提供限流和请求处理依赖：

```python
# 内存限流器 (MVP 版本)
class InMemoryRateLimiter:
    def check_session_limit(self, ip: str) -> tuple[bool, Optional[str]]:
        ...
    def check_message_limit(self, ip: str) -> tuple[bool, Optional[str]]:
        ...

# FastAPI 依赖
async def verify_session_rate_limit(request: Request) -> str:
    """验证会话创建频率限制"""
    ...

async def verify_message_rate_limit(request: Request) -> str:
    """验证消息发送频率限制"""
    ...

def get_client_ip(request: Request) -> str:
    """获取真实客户端 IP (支持代理头)"""
    ...
```

---

## 5. 前端详解

### 5.1 应用结构

前端采用 Next.js 15 App Router 架构：

```
app/
├── layout.tsx      # 根布局 (字体、Providers)
├── page.tsx        # 主页面 (SPA 单页应用)
├── providers.tsx   # Context Providers 集合
└── globals.css     # 全局样式 (Tailwind)
```

### 5.2 状态管理 (useChatSession)

核心 Hook 管理整个聊天会话状态：

```typescript
interface ChatSessionState {
  // 会话状态
  sessionId: string | null;
  depth: AnalysisDepth | null;
  isStarted: boolean;
  isRestoring: boolean;
  
  // 消息
  messages: ChatMessage[];
  
  // UI 状态
  input: string;
  isLoading: boolean;
  isTyping: boolean;
  
  // 进度
  progress: number;
  currentPrediction: string;
  confidenceScore: number;
  currentRound: number;
  maxRounds: number;
  
  // 完成状态
  isFinished: boolean;
  isAtMaxRounds: boolean;
  resultData: ResultData | null;
  
  // 图片生成
  isGeneratingImage: boolean;
  generatedImageUrl: string | null;
}

interface ChatSessionActions {
  startSession: (depth: AnalysisDepth) => Promise<void>;
  sendMessage: (content?: string) => Promise<void>;
  finishSession: () => Promise<void>;
  upgradeToStandard: () => Promise<void>;
  upgradeToDeep: () => Promise<void>;
  generateImage: () => Promise<void>;
  reset: () => void;
}
```

### 5.3 主题系统 (ThemeContext)

动态主题根据 MBTI 类型变化：

```typescript
type MBTITheme = "analyst" | "diplomat" | "sentinel" | "explorer" | "neutral";

const THEME_COLORS: Record<MBTITheme, ThemeColors> = {
  analyst: {
    primary: "#88619a",
    primaryRgb: "136, 97, 154",
    gradient: "from-analyst/20 via-analyst/10 to-transparent",
  },
  // ... 其他主题
};

// 根据预测结果自动切换主题
setThemeFromPrediction("INTJ")  // -> analyst 主题
setThemeFromPrediction("ENFP")  // -> diplomat 主题
```

### 5.4 组件体系

#### 核心组件

| 组件 | 功能 |
|------|------|
| `DepthSelector` | 测试深度选择界面 |
| `ChatBubble` | 对话气泡 (用户/AI) |
| `ChatInput` | 消息输入框 |
| `StatusBar` | 进度条和预测显示 |
| `DynamicBackground` | 动态渐变背景 |
| `ResultView` | 结果展示页 |
| `AIQAView` | AI 问答界面 |
| `FeedbackButton` | 用户反馈按钮 |

---

## 6. 核心功能

### 6.1 三级深度分析模式

| 模式 | 对话轮数 | 输出结果 | 特色功能 |
|------|----------|----------|----------|
| **快速模式** | 5 题 | 气质颜色 (NT/NF/SJ/SP) | 基础性格报告 |
| **标准模式** | 15 题 | 完整 4 字母 MBTI 类型 | 专属画像 + AI 解答 + 详细报告 |
| **深度模式** | 30 题 | MBTI + 认知功能栈 + 发展阶段 | 专业心理报告 + 荣格分析 |

### 6.2 渐进式升级

用户可以在完成低级别测试后，无缝升级到更深层次：

```
快速模式 (5题) → 标准模式 (再答10题) → 深度模式 (再答15题)
       ↓                    ↓                     ↓
    气质颜色            MBTI 类型           认知功能分析
```

升级时保留所有对话历史，AI 会基于已有对话继续深入探索。

### 6.3 AI 对话策略

#### 开放式提问

AI 被明确指示**禁止**问二选一的问题，始终使用开放式问题：

```
❌ "你是喜欢计划还是随性？"
❌ "你更关注逻辑还是情感？"

✅ "说说最近让你觉得特别有成就感的一件事..."
✅ "遇到这种情况你一般会怎么做？"
```

#### 对话轮次控制

AI 必须完成指定轮数的对话，不得提前结束：

```python
# 从 ai_service.py
if is_final_round:
    parsed_response.is_finished = True  # 只在最后一轮设置
else:
    parsed_response.is_finished = False  # 强制继续对话
```

### 6.4 认知功能分析 (深度模式)

深度模式分析用户的 8 大认知功能：

| 功能 | 类型 | 描述 |
|------|------|------|
| **Ni** | 内倾直觉 | 深层洞察，预见趋势 |
| **Ne** | 外倾直觉 | 发散思维，看到可能性 |
| **Si** | 内倾感觉 | 详细记忆，依赖经验 |
| **Se** | 外倾感觉 | 活在当下，感官敏锐 |
| **Ti** | 内倾思维 | 内部逻辑，分析原理 |
| **Te** | 外倾思维 | 组织效率，目标导向 |
| **Fi** | 内倾情感 | 个人价值观，追求真实 |
| **Fe** | 外倾情感 | 人际和谐，理解他人 |

### 6.5 Pop Mart 风格头像生成

基于对话内容生成个性化头像：

```python
# 两步生成过程
async def generate_personality_avatar(self, ...):
    # 步骤1: 分析用户档案
    profile = await self._analyze_user_profile(
        mbti_type, type_name, confidence, conversation_history
    )
    
    # 步骤2: 生成 Pop Mart 风格图像
    prompt = self._build_pop_mart_prompt(mbti_type, profile)
    response = await self._image_model.generate_content_async(prompt)
```

生成的图像包含：
- 可爱 3D Chibi 角色
- 根据用户特征定制的服装和姿势
- 代表性格的浮动元素
- MBTI 类型标识底座
- 品牌水印

### 6.6 AI Q&A 问答系统

完成测试后，用户可以与 AI 对话深入了解结果：

```typescript
const presetQuestions = [
  { label: "性格优势", question: "详细分析一下我这个类型的核心优势..." },
  { label: "职业建议", question: "什么样的职业最适合我？" },
  { label: "人际关系", question: "我在人际关系中有什么特点？" },
  { label: "成长建议", question: "我应该如何发展自己的弱项？" },
];
```

---

## 7. API 接口文档

### 7.1 聊天 API (`/api/chat`)

#### 开始会话

```http
POST /api/chat/start
Content-Type: application/json

{
  "depth": "standard",    // shallow | standard | deep
  "language": "zh-CN",    // 语言代码
  "user_name": "可选"     // 用户昵称
}
```

**响应：**

```json
{
  "session_id": "uuid-string",
  "depth": "standard",
  "language": "zh-CN",
  "greeting": "你好呀！欢迎来探索你的MBTI性格类型～...",
  "rate_limit": {
    "sessions_today": 1,
    "sessions_limit": 999999,
    "messages_today": 0,
    "messages_limit": 999999
  }
}
```

#### 发送消息

```http
POST /api/chat/message
Content-Type: application/json

{
  "session_id": "uuid-string",
  "content": "用户输入的消息"
}
```

**响应：**

```json
{
  "message_id": 123,
  "reply_text": "AI 的回复内容...",
  "is_finished": false,
  "is_at_max_rounds": false,
  "current_prediction": "INTJ",
  "confidence_score": 75,
  "progress": 60,
  "current_round": 9,
  "max_rounds": 15,
  "cognitive_stack": null,
  "development_level": null
}
```

#### 完成会话

```http
POST /api/chat/finish
Content-Type: application/json

{
  "session_id": "uuid-string"
}
```

**响应：**

```json
{
  "session_id": "uuid-string",
  "mbti_type": "INTJ",
  "type_name": "建筑师",
  "group": "analyst",
  "confidence_score": 85,
  "analysis_report": "详细的分析报告文本...",
  "total_rounds": 15,
  "cognitive_stack": ["Ni", "Te", "Fi", "Se"],
  "development_level": "Medium"
}
```

#### 升级模式

```http
POST /api/chat/upgrade
Content-Type: application/json

{
  "session_id": "uuid-string"
}
```

**响应：**

```json
{
  "session_id": "uuid-string",
  "new_depth": "standard",
  "remaining_rounds": 10,
  "message": "已升级到标准模式！还需完成约 10 道题...",
  "ai_question": "太好了，你的气质已经很清晰了！接下来..."
}
```

#### AI 问答

```http
POST /api/chat/qa
Content-Type: application/json

{
  "session_id": "uuid-string",
  "question": "什么职业适合我？",
  "history": []  // 可选：之前的问答历史
}
```

**响应：**

```json
{
  "answer": "根据你的 INTJ 性格类型...",
  "mbti_type": "INTJ",
  "type_name": "建筑师"
}
```

#### 生成头像

```http
POST /api/chat/image?session_id=uuid-string
```

**响应：**

```json
{
  "status": "success",
  "message": "Your personalized INTJ Pop Mart avatar has been generated!",
  "image_url": "data:image/png;base64,..."
}
```

#### 获取聊天历史

```http
GET /api/chat/history/{session_id}
```

#### 获取会话状态

```http
GET /api/chat/status/{session_id}
```

### 7.2 分析 API (`/api/analytics`)

#### 用户档案

```http
POST /api/analytics/profile
GET /api/analytics/profile/{anonymous_id}
```

#### 事件追踪

```http
POST /api/analytics/event
POST /api/analytics/events/batch
```

#### 反馈

```http
POST /api/analytics/feedback
```

#### 统计信息

```http
GET /api/analytics/stats?days=30
GET /api/analytics/events/export
GET /api/analytics/feedback/export
GET /api/analytics/insights/export
```

### 7.3 健康检查

```http
GET /                # 根路由 - API 信息
GET /health          # 健康状态
GET /rate-limit      # 当前限流状态
```

---

## 8. 数据模型

### 8.1 核心数据模型

#### Session (会话)

```python
class Session(Base):
    __tablename__ = "sessions"
    
    id: str                 # UUID 主键
    depth: str              # shallow/standard/deep
    language: str           # zh-CN, en
    user_name: str | None   # 可选用户名
    
    # 客户端信息
    client_ip: str | None
    user_agent: str | None
    
    # 会话状态
    is_active: bool         # 是否活跃
    is_complete: bool       # 是否完成
    current_round: int      # 当前轮数
    
    # 预测结果
    current_prediction: str | None  # MBTI 类型
    confidence_score: int | None    # 置信度
    progress: int | None            # 进度百分比
    
    # 深度模式字段
    cognitive_stack: str | None     # JSON: ["Ni", "Te", "Fi", "Se"]
    development_level: str | None   # Low/Medium/High
    
    # 时间戳
    created_at: datetime
    updated_at: datetime
    
    # 关系
    messages: list[Message]
    analysis: Analysis | None
```

#### Message (消息)

```python
class Message(Base):
    __tablename__ = "messages"
    
    id: int                 # 自增主键
    session_id: str         # 关联会话
    role: str               # user/model/system
    content: str            # 消息内容
    
    # AI 响应元数据 (JSON)
    ai_metadata: dict | None  # {is_finished, current_prediction, ...}
    
    created_at: datetime
```

#### Analysis (分析结果)

```python
class Analysis(Base):
    __tablename__ = "analyses"
    
    id: str
    session_id: str
    
    # 最终结果
    mbti_type: str          # INTJ, ENFP, etc.
    group: str              # analyst/diplomat/sentinel/explorer
    
    # 维度得分 (0-100, 50 为中性)
    ei_score: float         # E < 50, I > 50
    sn_score: float         # S < 50, N > 50
    tf_score: float         # T < 50, F > 50
    jp_score: float         # J < 50, P > 50
    
    # 深度模式结果
    cognitive_stack: str | None      # JSON 数组
    development_level: str | None
    
    # 文本结果
    summary: str
    strengths: str          # JSON 数组
    growth_areas: str       # JSON 数组
```

### 8.2 分析数据模型

#### UserProfile (用户档案)

```python
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    anonymous_id: str       # 匿名追踪 ID
    
    # 可选人口统计数据
    age_range: str | None
    gender: str | None
    occupation: str | None
    country: str | None
    
    # 来源追踪
    referral_source: str | None
    utm_source: str | None
    utm_medium: str | None
    utm_campaign: str | None
    
    # 设备信息
    device_type: str | None
    browser: str | None
```

#### UserEvent (事件)

```python
class UserEvent(Base):
    __tablename__ = "user_events"
    
    anonymous_id: str
    session_id: str | None
    
    event_name: str         # page_view, session_start, etc.
    event_category: str     # navigation, chat, result, etc.
    event_data: dict | None # 灵活的事件数据
    
    page_path: str | None
    timestamp: datetime
    duration_seconds: float | None
```

#### UserInsight (洞察)

```python
class UserInsight(Base):
    __tablename__ = "user_insights"
    
    session_id: str
    mbti_result: str
    
    # 推断的人口统计
    estimated_age_range: str | None
    estimated_gender: str | None
    life_stage: str | None
    career_field: str | None
    
    # 沟通风格
    communication_style: str | None
    language_complexity: str | None
    engagement_quality: str | None
    
    # 分析元数据
    key_topics_discussed: str | None  # JSON 数组
    confidence_score: float
```

---

## 9. AI 服务详解

### 9.1 混合模型策略

系统采用混合模型策略优化成本和质量：

| 任务 | 模型 | 原因 |
|------|------|------|
| 对话问答 | Flash | 快速响应，低成本 |
| 最终报告 | Pro | 深度分析，高质量 |
| 图像生成 | Pro Image | 专业图像生成 |
| 用户洞察 | Flash | 快速分析，后台任务 |

### 9.2 提示词工程

#### 系统提示词结构

```python
SYSTEM_PROMPTS = {
    AnalysisDepth.SHALLOW: """
    你是一位温暖、有洞察力的性格探索顾问...
    
    ## 你的任务
    通过最多5轮自然对话，识别用户属于哪种气质颜色
    
    ## 四种气质颜色
    - 紫色 (NT - 分析家): ...
    - 绿色 (NF - 外交家): ...
    - ...
    
    ## 对话风格 - 像朋友聊天一样
    - 表现得真诚、好奇
    - 用轻松自然的语气
    
    ## 提问策略 - 只用开放式问题
    **绝对禁止**问"A还是B？"这种二选一的问题！
    
    ## 重要规则
    1. 绝对不要提前结束对话
    2. 每一轮都必须问新问题
    """,
    
    AnalysisDepth.STANDARD: """...""",
    AnalysisDepth.DEEP: """...""",
}
```

#### 输出格式

AI 被要求返回结构化 JSON：

```json
{
  "reply_text": "用中文回复，温暖自然的语气",
  "is_finished": false,
  "wants_to_finish": false,
  "current_prediction": "INTJ",
  "confidence_score": 65,
  "progress": 40,
  "cognitive_stack": ["Ni", "Te", "Fi", "Se"],
  "development_level": "Medium"
}
```

### 9.3 Q&A 服务

独立的 Q&A 服务处理测试后的问答：

```python
class QAService:
    """使用 Flash 模型进行快速问答"""
    
    async def generate_response(
        self,
        user_question: str,
        mbti_type: str,
        type_name: str,
        group: str,
        confidence_score: int,
        cognitive_stack: list[str] | None,
        development_level: str | None,
        depth: str,
        language: str,
        history: list[dict] | None,
    ) -> str:
        ...
```

---

## 10. 部署与运行

### 10.1 环境要求

- Python 3.11+
- Node.js 20+
- pnpm (推荐) 或 npm

### 10.2 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 添加 GEMINI_API_KEY

# 5. 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

### 10.3 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
pnpm install  # 或 npm install

# 3. 启动开发服务器
pnpm dev  # 或 npm run dev
```

### 10.4 访问地址

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

### 10.5 Cloudflare 隧道 (可选)

项目包含 `start-tunnel.sh` 用于创建 Cloudflare 隧道实现外网访问。

---

## 11. 配置说明

### 11.1 后端环境变量

创建 `backend/.env` 文件：

```env
# 应用配置
DEBUG=true

# AI 服务
GEMINI_API_KEY=your-gemini-api-key

# 数据库 (可选，默认使用 SQLite)
DATABASE_URL=sqlite+aiosqlite:///./mbti_assistant.db

# CORS (可选，默认允许所有)
CORS_ORIGINS=["http://localhost:3000"]
```

### 11.2 前端环境变量

创建 `frontend/.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 11.3 模型配置

在 `config.py` 中可调整 AI 模型：

```python
# 对话模型 (快速响应)
GEMINI_MODEL_CHAT: str = "gemini-3-flash-preview"

# 分析模型 (深度分析)
GEMINI_MODEL_ANALYSIS: str = "gemini-3-pro-preview"

# 图像模型
GEMINI_IMAGE_MODEL: str = "gemini-3-pro-image-preview"
```

### 11.4 深度模式配置

```python
DEPTH_CONFIGS: dict[AnalysisDepth, DepthConfig] = {
    AnalysisDepth.SHALLOW: DepthConfig(
        min_rounds=0, max_rounds=5, target_confidence=100
    ),
    AnalysisDepth.STANDARD: DepthConfig(
        min_rounds=0, max_rounds=15, target_confidence=100
    ),
    AnalysisDepth.DEEP: DepthConfig(
        min_rounds=0, max_rounds=30, target_confidence=100
    ),
}
```

---

## 12. 开发指南

### 12.1 代码规范

- **语言**：所有代码注释和变量名使用英文
- **格式**：使用项目配置的 linter (ESLint, Black)
- **类型**：TypeScript 严格模式，Python 类型注解

### 12.2 添加新的 MBTI 类型支持

1. 更新 `backend/app/routers/chat.py` 中的 `MBTI_TYPE_NAMES_ZH` 和 `MBTI_GROUPS`
2. 更新 `frontend/src/types/mbti.ts` 中的类型定义
3. 更新 `frontend/src/context/ThemeContext.tsx` 中的主题映射

### 12.3 添加新的分析深度

1. 在 `backend/app/services/ai_service.py` 中：
   - 添加新的 `AnalysisDepth` 枚举值
   - 添加新的 `SYSTEM_PROMPTS` 条目
   - 更新 `DEPTH_CONFIGS`

2. 在前端更新：
   - `DepthSelector` 组件
   - `useChatSession` Hook 中的相关逻辑

### 12.4 测试

```bash
# 后端测试
cd backend
pytest

# 前端类型检查
cd frontend
pnpm type-check
```

### 12.5 生产部署建议

- [ ] 将 SQLite 迁移到 PostgreSQL
- [ ] 使用 Redis 替换内存限流器
- [ ] 配置适当的 CORS 策略
- [ ] 添加认证机制
- [ ] 配置 CDN 加速静态资源
- [ ] 添加监控和日志收集

---

## 附录

### A. API 错误码

| 状态码 | 含义 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 429 | 请求频率限制 |
| 500 | 服务器内部错误 |
| 503 | AI 服务不可用 |

### B. 事件类型

```python
class EventNames:
    PAGE_VIEW = "page_view"
    SESSION_START = "session_start"
    SESSION_COMPLETE = "session_complete"
    SESSION_ABANDON = "session_abandon"
    SESSION_UPGRADE = "session_upgrade"
    MESSAGE_SENT = "message_sent"
    RESULT_VIEW = "result_view"
    RESULT_SHARE = "result_share"
    IMAGE_GENERATE = "image_generate"
    QA_START = "qa_start"
    QA_QUESTION = "qa_question"
    FEEDBACK_SUBMIT = "feedback_submit"
```

### C. 许可证

MIT License

---

**Built with ❤️ for personality discovery**

*最后更新：2026年1月*
