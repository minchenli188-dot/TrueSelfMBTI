# TrueSelfMBTI - AI 驱动的 MBTI 人格测试

## 项目概述

TrueSelfMBTI 是一个创新的 MBTI 性格测试平台，摒弃传统的选择题问卷形式，通过**自然对话**让 AI 深入理解用户性格，提供更准确、更个性化的人格分析。

## ✨ 核心特点

| 特点 | 描述 |
|------|------|
| 🗣️ 自然对话 | 像和朋友聊天一样，无需填写无聊的选择题 |
| 🤖 AI 分析 | 基于 Google Gemini 进行深度性格分析 |
| 📊 多层深度 | 支持快速测试(5题)、标准测试(15题)、深度测试(50+题) |
| 🎨 AI 画像 | 为用户生成专属的 MBTI 人格视觉肖像 |
| 💬 智能问答 | 测试后可与 AI 实时对话，解答关于结果的疑问 |
| 📈 实时预测 | 对话过程中实时展示性格类型预测和置信度 |

## 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                       Frontend                          │
│  Next.js 15 + TypeScript + Tailwind CSS + Framer Motion │
│                        Zustand                          │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────┐
│                        Backend                          │
│              FastAPI + SQLite + Python 3.11             │
│                    Google Gemini AI                     │
└─────────────────────────────────────────────────────────┘
```

## 📁 目录结构

```
MBTI/
├── backend/              # FastAPI 后端服务
│   ├── app/
│   │   ├── main.py       # 应用入口
│   │   ├── config.py     # 环境配置
│   │   ├── routers/      # API 路由
│   │   │   ├── chat.py   # 对话接口
│   │   │   └── analytics.py  # 数据分析接口
│   │   ├── services/     # 业务逻辑
│   │   │   ├── ai_service.py  # Gemini AI 服务
│   │   │   └── image_generator.py  # 图像生成
│   │   └── models/       # 数据模型
│   └── requirements.txt
│
├── frontend/             # Next.js 前端应用
│   └── src/
│       ├── app/          # 页面路由
│       │   ├── page.tsx  # 主页
│       │   └── results/  # 结果页
│       ├── components/   # React 组件
│       │   ├── chat/     # 聊天相关组件
│       │   ├── ResultView.tsx    # 结果展示
│       │   ├── AIQAView.tsx      # AI 问答
│       │   └── DepthSelector.tsx # 深度选择
│       ├── hooks/        # 自定义 Hooks
│       ├── store/        # Zustand 状态管理
│       └── lib/          # 工具函数
│
└── README.md
```

## 🚀 快速启动

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 访问地址

- 前端应用：http://localhost:3000
- API 文档：http://localhost:8000/docs

## 🎯 核心功能流程

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 1. 选择深度  │ -> │ 2. 自然对话  │ -> │ 3. 实时分析  │
│ 快速/标准/深度│    │  AI 引导聊天 │    │ 预测 + 置信度│
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 6. 生成画像  │ <- │ 5. AI 问答   │ <- │ 4. 查看结果  │
│ 专属 AI 肖像 │    │ 深入了解自己 │    │ MBTI 分析报告│
└──────────────┘    └──────────────┘    └──────────────┘
```

## 🎨 MBTI 四大类型

| 类型 | 颜色 | 包含 |
|------|------|------|
| 🟣 分析家 (NT) | `#88619a` | INTJ, INTP, ENTJ, ENTP |
| 🟢 外交家 (NF) | `#33a474` | INFJ, INFP, ENFJ, ENFP |
| 🔵 守卫者 (SJ) | `#4298b4` | ISTJ, ISFJ, ESTJ, ESFJ |
| 🟡 探险家 (SP) | `#e2a03f` | ISTP, ISFP, ESTP, ESFP |

## 📡 主要 API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/chat/start` | 创建新会话 |
| POST | `/api/chat/message` | 发送消息 |
| GET | `/api/chat/history/{session_id}` | 获取对话历史 |
| GET | `/api/chat/status/{session_id}` | 获取会话状态 |
| POST | `/api/chat/generate-image` | 生成 AI 画像 |

## 🔮 未来规划

- [ ] 多语言支持
- [ ] 结果分享功能
- [ ] PostgreSQL 生产环境迁移
- [ ] 支付集成
- [ ] 更多 AI 模型支持

---

> 用最懂你的方式，帮助你更好地了解自己，成为更好的自己。

