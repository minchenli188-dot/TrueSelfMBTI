# TrueSelf16 - AI-Powered Personality Assessment

An AI-powered 16 personality type assessment application that understands your personality through natural conversation, not boring questionnaires.

> **Live Site**: https://trueselfmbti.com  
> **GitHub**: https://github.com/minchenli188-dot/TrueSelf16

## 🌟 Features

- **Natural Dialogue**: Instead of rigid multiple-choice questions, engage in 5-30+ rounds of natural conversation
- **AI-Powered Analysis**: Leverages Google Gemini for deep personality trait analysis
- **Jungian Theory Based**: Grounded in Carl Jung's analytical psychology and cognitive functions
- **AI Portrait Generation**: Get a unique AI-generated visual portrait based on your personality
- **Interactive Q&A**: Chat with AI after the test to explore your results further
- **Beautiful UI**: Modern, responsive design with smooth Framer Motion animations
- **16 Personality Types**: Full support for all 16 types across 4 groups:
  - 🟣 **Analysts** (NT): INTJ, INTP, ENTJ, ENTP
  - 🟢 **Diplomats** (NF): INFJ, INFP, ENFJ, ENFP
  - 🔵 **Sentinels** (SJ): ISTJ, ISFJ, ESTJ, ESFJ
  - 🟡 **Explorers** (SP): ISTP, ISFP, ESTP, ESFP

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (MVP) → PostgreSQL (Production)
- **AI**: Google Gemini 3 (Flash for chat, Pro for analysis)
- **Image Generation**: Gemini 3 Pro Image

### Frontend
- **Framework**: Next.js 16 (App Router + Turbopack)
- **UI Library**: React 19.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: Zustand

## 📁 Project Structure

```
TrueSelf16/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment configuration
│   │   ├── dependencies.py      # Dependency injection
│   │   ├── models/
│   │   │   ├── database.py      # SQLAlchemy models
│   │   │   ├── schemas.py       # Pydantic schemas
│   │   │   └── analytics.py     # Analytics models
│   │   ├── routers/
│   │   │   ├── chat.py          # Chat API endpoints
│   │   │   └── analytics.py     # Analytics API
│   │   └── services/
│   │       ├── ai_service.py    # Gemini AI service
│   │       ├── image_generator.py  # AI portrait generation
│   │       └── user_insight_extractor.py
│   ├── requirements.txt
│   └── .env                     # Environment variables (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Home page
│   │   │   └── results/         # Results page
│   │   ├── components/
│   │   │   ├── chat/            # Chat components
│   │   │   ├── ResultView.tsx   # Results display
│   │   │   ├── AIQAView.tsx     # AI Q&A interface
│   │   │   └── DepthSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useChatSession.ts
│   │   │   ├── useQASession.ts
│   │   │   └── useAnalytics.ts
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   └── utils.ts
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── store/
│   │   │   └── chat.ts          # Zustand store
│   │   └── types/
│   │       └── mbti.ts          # Type definitions
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.local               # Environment variables (not committed)
│
├── ecosystem.config.js          # PM2 configuration
├── DEPLOYMENT_GUIDE.md          # Deployment documentation
├── PROJECT_INTRO.md             # Project introduction
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- pnpm (recommended) or npm

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API key
echo "GEMINI_API_KEY=your_api_key" > .env

# Run the development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install  # or npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
pnpm dev  # or npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🎨 Personality Type Color Palette

| Group | Color | Hex Code |
|-------|-------|----------|
| Analyst | Purple | `#88619a` |
| Diplomat | Green | `#33a474` |
| Sentinel | Blue | `#4298b4` |
| Explorer | Yellow | `#e2a03f` |

## 📝 API Endpoints

### Chat
- `POST /api/chat/start` - Start a new session
- `POST /api/chat/message` - Send a message
- `POST /api/chat/finish` - Complete test and get results
- `POST /api/chat/upgrade` - Upgrade to deeper analysis
- `POST /api/chat/qa` - Post-test Q&A
- `POST /api/chat/image` - Generate AI portrait
- `GET /api/chat/history/{session_id}` - Get chat history
- `GET /api/chat/status/{session_id}` - Get session status

### Analytics
- `POST /api/analytics/profile` - Create user profile
- `POST /api/analytics/event` - Log event
- `POST /api/analytics/feedback` - Submit feedback
- `GET /api/analytics/stats` - Get statistics

### Health
- `GET /` - API info
- `GET /health` - Health check
- `GET /docs` - Swagger documentation

## 🔮 Future Roadmap

- [ ] Multi-language support
- [ ] Result sharing functionality
- [ ] PostgreSQL migration for production
- [ ] Payment integration
- [ ] More AI model support

## 📄 License

MIT License - See LICENSE file for details.

---

> *Helping you understand yourself better, in the way that understands you best.*

Built with ❤️ for personality discovery
