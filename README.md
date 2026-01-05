# MBTI Assistant MVP

An AI-powered MBTI personality assessment application that understands your personality through natural conversation, not boring questionnaires.

## 🌟 Features

- **Natural Dialogue**: Instead of rigid multiple-choice questions, engage in 5-100 rounds of natural conversation
- **AI-Powered Analysis**: Leverages Google Gemini for deep personality trait analysis
- **Beautiful UI**: Modern, responsive design with smooth Framer Motion animations
- **MBTI Groups**: Full support for all 16 personality types across 4 groups:
  - 🟣 **Analysts** (NT): INTJ, INTP, ENTJ, ENTP
  - 🟢 **Diplomats** (NF): INFJ, INFP, ENFJ, ENFP
  - 🔵 **Sentinels** (SJ): ISTJ, ISFJ, ESTJ, ESFJ
  - 🟡 **Explorers** (SP): ISTP, ISFP, ESTP, ESFP

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (MVP) → PostgreSQL (Production)
- **AI**: Google Gemini 3 Pro
- **Image Generation**: Nano Banana Pro (Reserved)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: Zustand

## 📁 Project Structure

```
MBTI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment configuration
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py       # Pydantic schemas
│   │   │   └── database.py      # SQLAlchemy models
│   │   ├── routers/             # API route handlers
│   │   │   └── __init__.py
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── gemini.py        # Gemini AI service
│   │       └── image_generator.py  # Image generation (reserved)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Home page
│   │   │   └── globals.css      # Global styles
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── chat/            # Chat-specific components
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   └── utils.ts         # Utility functions
│   │   ├── store/
│   │   │   └── chat.ts          # Zustand store
│   │   └── types/
│   │       └── mbti.ts          # MBTI type definitions
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.ts
│
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

# Copy environment file and add your API keys
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Run the development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install  # or npm install

# Run the development server
pnpm dev  # or npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🎨 MBTI Color Palette

| Group | Color | Hex Code |
|-------|-------|----------|
| Analyst | Purple | `#88619a` |
| Diplomat | Green | `#33a474` |
| Sentinel | Blue | `#4298b4` |
| Explorer | Yellow | `#e2a03f` |

## 📝 API Endpoints

### Sessions
- `POST /api/v1/sessions` - Create a new conversation session
- `GET /api/v1/sessions/{id}` - Get session details

### Chat
- `POST /api/v1/chat` - Send a message (returns full response)
- `POST /api/v1/chat/stream` - Send a message (streaming response)

### Analysis
- `GET /api/v1/analysis/{session_id}` - Get personality analysis results

## 🔮 Future Roadmap

- [ ] Complete Gemini AI integration
- [ ] Implement streaming chat responses
- [ ] Add Nano Banana Pro image generation
- [ ] Payment integration
- [ ] Multi-language support
- [ ] Result sharing functionality
- [ ] PostgreSQL migration for production

## 📄 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for personality discovery






