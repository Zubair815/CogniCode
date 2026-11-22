# CogniCode

**Cognitive-Aware AI Teaching Assistant for Programming Education**

CogniCode is a conversational AI teaching assistant for university programming courses. Instead of returning finished code solutions on the first request, it guides students through problem solving with Socratic dialogue, 5-level progressive hints, Tree-sitter AST debugging feedback, conceptual understanding checks, post-session reflections, and a six-signal Cognitive Dependency Score (CDS).

Developed as a Final Year Design Project (FYDP) at the Faculty of Computing and Information Technology (FCIT / PUCIT), University of the Punjab, Lahore.

- **Group ID:** BSEF23-63
- **Team:** Abdullah (AI Pipeline & Backend Architecture) · Muhammad Zubair (Frontend, Analytics & Integration)
- **Supervisor:** Sanam Ahmad, Assistant Professor, PUCIT

---

## Core Capabilities

1. **Socratic Tutoring:** Responds to direct solution requests with guiding questions unless a verified attempt is present.
2. **5-Level Progressive Hint Gate:**
   - Level 1: Conceptual nudge (no code)
   - Level 2: Concept & invariant reminder
   - Level 3: Structured pseudocode (gated by a conceptual understanding check)
   - Level 4: Partial implementation skeleton
   - Level 5: Complete worked reference (last resort after verified attempts)
3. **Tree-sitter Code Analysis & Debugging Coach:** Parses Python code submissions to inspect syntax errors, function signatures, loops, recursion, and base-case presence.
4. **Cognitive Dependency Score (CDS):** A 0–100 behavioral score computed from six weighted signals (`solution_frequency`, `hint_depth`, `retry_count`, `time_gap`, `debugging_attempts`, `quiz_performance`), categorized into **Low (0–40)**, **Moderate (41–70)**, and **High (71–100)** bands.
5. **Long-Term Student Memory & Reflections:** ChromaDB vector store + relational reflection journal recording key takeaways and bug traps to avoid.
6. **Instructor Cohort Analytics:** Course creation with 6-character student join codes, cohort dependency roster, topic-by-topic dependency heatmap, student drill-down, and ReportLab PDF cohort audit export.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| Frontend | React 19, Vite 8, Tailwind CSS 3, React Router 7, Lucide Icons |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic Settings |
| Multi-Agent Orchestration | LangGraph (`StateGraph`) |
| LLM Providers | Groq Cloud (`openai/gpt-oss-20b`), Claude API, Ollama (`llama3.2`) |
| Code Analysis | Tree-sitter (`tree-sitter`, `tree-sitter-python`) |
| Databases | PostgreSQL (Supabase), ChromaDB (vector store) |
| Authentication | JWT (`python-jose`), bcrypt (`passlib`) |
| Real-Time Chat | FastAPI WebSockets (`/ws/chat/{session_id}`) |
| PDF Reporting | ReportLab |

---

## Repository Structure

```text
CogniCode/
├── .github/workflows/          # Backend & Frontend GitHub Actions CI
├── backend/
│   ├── agents/                 # LangGraph state machine & specialized tutoring agents
│   │   ├── graph.py            # Compiled LangGraph StateGraph
│   │   ├── state.py            # Typed AgentState schema
│   │   ├── conversation_manager.py
│   │   ├── socratic_tutor.py
│   │   ├── hint_generator.py
│   │   ├── code_analysis.py
│   │   ├── debugging_coach.py
│   │   ├── assessment.py
│   │   ├── memory.py
│   │   └── reflection.py
│   ├── alembic/                # Database schema migrations
│   ├── api/                    # REST routers (auth, session, instructor)
│   ├── auth/                   # JWT creation/verification, bcrypt, RBAC dependencies
│   ├── core/                   # CDS engine, PDF report generator, middleware, error handlers
│   ├── db/                     # SQLAlchemy ORM models and database session factory
│   ├── llm/                    # Unified LLM interface (Groq, Claude, Ollama)
│   ├── schemas/                # Pydantic request/response contracts
│   ├── tests/                  # Pytest unit and integration test suites
│   ├── vector/                 # ChromaDB vector store client
│   ├── websocket/              # WebSocket connection manager and chat turn handler
│   ├── config.py               # Environment configuration
│   ├── main.py                 # FastAPI application entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # UI primitives, AppLayout, AuthLayout, chat components
│   │   ├── constants/          # Route definitions
│   │   ├── context/            # AuthContext & ThemeContext (Light / Dark / System)
│   │   ├── hooks/              # useChatSession & useWebSocket
│   │   ├── pages/              # Landing, Auth, Chat, Student & Instructor views
│   │   └── services/           # Axios REST clients (auth, chat, instructor)
│   ├── index.html
│   ├── package.json
│   └── tailwind.config.js
├── docker/                     # Multi-stage Backend & Frontend Dockerfiles + Nginx config
├── docs/                       # SRS, Architecture, Roadmap, Testing, Security & D1 docs
├── prototype/                  # Initial static HTML/Figma reference prototype
├── DESIGN.md                   # Visual design system & token specification
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Setup & Running

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**
- A **Groq API key** (or Claude API key / local Ollama instance)

### 1. Configure Backend Environment

Copy `.env.example` to `backend/.env` and set your `LLM_API_KEY` and `JWT_SECRET`:

```env
LLM_PROVIDER=groq
LLM_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
DATABASE_URL=postgresql://user:password@localhost:5432/cognicode
CHROMA_PERSIST_DIR=./data/chroma
JWT_SECRET=replace_with_a_long_random_secret
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
```

### 2. Start the Backend Server

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 3. Start the Frontend Dev Server

```powershell
cd frontend
npm install
npm run dev
```

- Application URL: `http://localhost:5173`

*(On Windows PowerShell, you can also run `.\start-backend.ps1` and `.\start-frontend.ps1` from the repository root.)*

---

## Validation & Testing Commands

### Backend Automated Tests
```powershell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

### Frontend Lint & Production Build
```powershell
cd frontend
npm run lint
npm run build
```

---

## License

Developed for academic purposes as part of the Final Year Design Project (BSEF23-63) at FCIT / PUCIT, University of the Punjab, Lahore.
