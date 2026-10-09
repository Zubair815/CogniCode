# CogniCode

**A Cognitive-Aware AI Teaching Assistant for Programming Education**

CogniCode is a web-based, cognitive-aware AI teaching assistant designed specifically for university-level programming education.

Unlike conventional AI coding assistants that provide complete solutions immediately, CogniCode preserves students' problem-solving and computational-thinking skills through Socratic dialogue, progressive hints, guided debugging, conceptual checks, reflection, and personalized learning memory.

Developed as a Final Year Design Project (FYDP) at the Faculty of Computing and Information Technology (FCIT), University of the Punjab, Lahore.

**Group ID:** BSEF23-63
**Program:** BS Software Engineering (2023–2027)
**Supervisor:** Sanam Ahmad, Assistant Professor, PUCIT

---

## 📌 Project Overview

The widespread use of Large Language Models (LLMs) in programming education has created a challenge: students can obtain complete solutions without sufficiently engaging with the underlying concepts and problem-solving process.

CogniCode reframes the role of AI from an **answer provider** into a **cognitive learning coach**.

The system is designed to:

- Ask guiding questions before providing direct assistance
- Verify whether a student has attempted a problem
- Provide progressive hints instead of immediately revealing solutions
- Guide students through debugging rather than simply fixing their code
- Evaluate conceptual understanding before higher-level assistance
- Maintain personalized learning memory across sessions
- Encourage students to reflect on what they learned
- Track behavioral indicators related to AI dependency
- Provide students and instructors with dependency and learning analytics

---

## 🎯 Project Objectives

1. Design and implement a multi-agent AI teaching assistant using **LangGraph**
2. Develop a **Socratic Dialogue Engine** for programming education
3. Implement a **five-level progressive hint system**
4. Develop a **Cognitive Dependency Score (CDS)** based on student interaction behavior
5. Build **student and instructor dependency dashboards**
6. Implement **Code Understanding Checks** before higher-level assistance
7. Develop a **Debugging Coach** that teaches debugging methodology
8. Implement personalized **Learning Memory** for student profiles
9. Develop a **Reflection Module** for post-session learning reflection
10. Evaluate learning effectiveness, AI dependency, code quality, and usability

---

## ✨ Key Features

### 1. Socratic Tutoring
When a student requests a direct solution without an adequate attempt, the system responds with a guiding question instead of code.

### 2. Progressive Hint System
Five levels of assistance, each locked until the student demonstrates an attempt:
1. Conceptual nudge
2. Concept reminder
3. Pseudocode
4. Partial implementation
5. Complete solution (last resort only)

### 3. Cognitive Dependency Score (CDS)
A real-time behavioral metric (0–100) computed from six weighted signals:
- Solution request frequency
- Average hint level reached
- Retry count
- Interaction time gap
- Debugging attempts
- Quiz performance

Classified into bands: **Low (0–40)**, **Moderate (41–70)**, **High (71–100)**.

### 4. Code Understanding Checks
Before Level 3+ hints, students answer conceptual questions (e.g., time complexity, base case, optimization possibilities).

### 5. Debugging Coach
Guides students to identify unexpected behavior, inspect variable states, trace execution, and develop corrections — without directly fixing code.

### 6. Learning Memory
A persistent student profile stores weak topics, mistake patterns, assignment history, hint usage, and reflection summaries for personalized tutoring.

### 7. Reflection Module
Mandatory end-of-session reflection prompts:
- What did you learn today?
- What mistake will you avoid next time?

### 8. Instructor Analytics
A dedicated dashboard providing dependency heatmaps, weak-topic identification, session logs, per-student drill-down, and PDF export.

---

## 🏗️ System Architecture

CogniCode uses a **three-tier architecture** over a **multi-agent orchestration framework**.

### Core Agents (9)

| Agent | Responsibility |
|---|---|
| Conversation Manager | Routes student input to appropriate agents |
| Socratic Tutor | Generates guiding questions |
| Hint Generator | Manages progressive hint levels |
| Code Analysis | Parses code via Tree-sitter AST |
| Debugging Coach | Guides debugging methodology |
| Assessment | Evaluates attempts and quizzes |
| Memory | Maintains persistent student profile |
| Reflection | Handles end-of-session reflection |
| Instructor Dashboard | Aggregates analytics |

### High-Level Workflow

```
Student
   │
   ▼
React Frontend  ◄──── WebSocket ────►  FastAPI Backend
                                            │
                                            ▼
                                   Conversation Manager (LangGraph)
                                            │
        ┌───────────┬───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼           ▼
   Socratic    Hint        Code        Debugging   Assessment   Memory
    Tutor    Generator    Analysis      Coach                     │
        │           │           │           │           │          │
        └───────────┴───────────┴───────────┴───────────┴──────────┘
                                            │
                                            ▼
                                 Cognitive Dependency Score
                                            │
                                   ┌────────┴────────┐
                                   ▼                 ▼
                             Student Dashboard  Instructor Dashboard
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Tailwind CSS, Recharts |
| Backend | FastAPI (Python) |
| Agent Orchestration | LangGraph |
| LLM | Claude API (primary), Llama 3 / Qwen via Ollama (fallback) |
| Code Analysis | Tree-sitter, Python AST |
| Structured Database | PostgreSQL (hosted on Supabase) |
| Vector Database | ChromaDB |
| Authentication | JWT, bcrypt |
| Real-time Communication | FastAPI WebSockets |
| Report Generation | ReportLab |
| Version Control | Git, GitHub |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend), Render/Railway (backend), Supabase (DB) |

---

## 📂 Repository Structure

```
BSEF23-63-CogniCode/
│
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
│       ├── backend-ci.yml
│       └── frontend-ci.yml
│
├── frontend/                   # React.js application
│   ├── src/
│   │   ├── pages/              # Login, Chat, Dashboards
│   │   ├── components/         # Reusable UI components
│   │   ├── services/           # API + WebSocket clients
│   │   └── hooks/
│   ├── public/
│   └── package.json
│
├── backend/                    # FastAPI backend
│   ├── main.py                 # FastAPI entry point
│   ├── api/                    # REST route modules
│   ├── agents/                 # LangGraph agents
│   │   ├── graph.py            # LangGraph definition
│   │   ├── state.py            # Shared AgentState object
│   │   ├── conversation_manager.py
│   │   ├── socratic_tutor.py
│   │   ├── hint_generator.py
│   │   ├── code_analysis.py
│   │   ├── debugging_coach.py
│   │   ├── assessment.py
│   │   ├── memory.py
│   │   ├── reflection.py
│   │   └── instructor_dashboard.py
│   ├── auth/                   # JWT, bcrypt, RBAC
│   ├── llm/                    # Claude client + Ollama fallback
│   ├── websocket/              # WebSocket handlers
│   ├── db/                     # SQLAlchemy models + migrations
│   ├── vector/                 # ChromaDB integration
│   ├── schemas/                # Pydantic models
│   └── requirements.txt
│
├── database/                   # SQL schemas, seeds, migration notes
│   ├── migrations/
│   └── seeds/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── evaluation/
│
├── docs/                       # Proposal, PDR, PRD, D1, diagrams
│   ├── architecture/
│   ├── requirements/
│   └── research/
│
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── .env.example
├── .gitignore
└── README.md
```

> Structure may evolve as development progresses.

---

## 🚀 Setup and Installation

The project is currently under development. Detailed setup instructions will be added as each component is implemented.

### Prerequisites

- Node.js (v18+) and npm
- Python 3.11+
- PostgreSQL
- Git
- Docker (optional)
- LLM API access (Claude) **or** a local LLM via Ollama
- ChromaDB

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

### Database

CogniCode uses PostgreSQL for structured data — student profiles, session records, quiz results, dependency scores, and learning history. Configuration will be documented once the database layer is implemented.

### Environment Variables

Sensitive information (API keys, database passwords, JWT secrets) must **never** be committed to GitHub. Store them locally in a `.env` file.

Example `.env.example`:

```env
# LLM
LLM_API_KEY=your_api_key
LLM_PROVIDER=claude

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cognicode

# Auth
JWT_SECRET=your_secret_key
JWT_ALGORITHM=RS256
JWT_EXPIRY_HOURS=24

# Optional
OLLAMA_BASE_URL=http://localhost:11434
```

> ⚠️ Never replace example values with real credentials in this README or commit actual secrets to the repository.

---

## 🧪 Testing

Testing is performed throughout development. Planned areas:

- Frontend component testing
- Backend API testing
- AI agent behavior testing
- Hint-level enforcement testing
- Code analysis (AST) testing
- Database and migration testing
- Integration testing (WebSocket → agent graph → response)
- System Usability Scale (SUS) evaluation

Formal evaluation will cover learning effectiveness, AI dependency metrics, code quality, and usability.

---

## 🔀 Development Methodology

CogniCode follows **Agile Scrum** with **two-week sprints** (14 sprints total).

### Team Roles

**Abdullah — Scrum Master / AI Pipeline & Agent Architecture Lead**
- Multi-agent architecture (LangGraph)
- LLM integration (Claude + Ollama fallback)
- Socratic Dialogue Engine
- Progressive Hint System
- Cognitive Dependency Score engine
- Code Analysis pipeline (Tree-sitter)
- Debugging Coach Agent

**Muhammad Zubair — Product Owner / Frontend, Dashboard & Integration Lead**
- React frontend
- Student chat and dashboard
- Instructor dashboard
- Cognitive Dependency dashboard
- Learning Memory UI
- Reflection Module UI
- System integration

Both members share responsibility for evaluation, usability testing, and final documentation.

---

## 🌿 Branching Strategy

CogniCode follows a **Git Flow-inspired** strategy:

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code (protected) |
| `develop` | Active development integration branch |
| `feature/<name>` | Individual features (e.g., `feature/socratic-engine`) |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation updates |

### Workflow

```
develop  →  feature/<name>  →  commit  →  pull request  →  review  →  merge into develop
                                                                           │
                                                                           ▼
                                                                    merge into main
                                                                    (at sprint end)
```

### Example Feature Branches

- `feature/authentication`
- `feature/socratic-engine`
- `feature/hint-system`
- `feature/dependency-score`
- `feature/student-dashboard`
- `feature/instructor-dashboard`
- `feature/code-analysis`
- `feature/debugging-coach`
- `feature/memory-agent`
- `feature/reflection-module`

Completed and tested features are merged into `develop` via pull request, then promoted to `main` at each sprint boundary.

---

## 📅 Project Timeline

The project spans **two academic semesters** across **14 two-week sprints**.

- **Semester 1 (Sprints 1–7):** Core AI pipeline — auth, LLM integration, Socratic engine, hint system, assessment, CDS, code analysis
- **Semester 2 (Sprints 8–14):** Memory agent, reflection, instructor dashboard, integration, evaluation, polish, submission

### Key Milestones

| Milestone | Target Week |
|---|---|
| M1 — Proposal Approved | Week 2 |
| M2 — PDR Finalized | Week 3 |
| M3 — Core Chat & LLM Integration Working | Week 6 |
| M4 — Socratic Engine & Hint System Complete | Week 10 |
| M5 — Cognitive Dependency Score Engine Live | Week 12 |
| M6 — All Agents Integrated & Tested | Week 22 |
| M7 — Formal Evaluation Complete | Week 24 |
| M8 — Final Report & Submission | Week 28 |

---

## 📄 Documentation

| Document | Description |
|---|---|
| Proposal | Initial project proposal (FYP-DSE) |
| PDR | Preliminary Design Report — technical design |
| PRD | Product Requirements Document — product perspective |
| D1 | Agile: Product Backlog & Definition of Done |
| SRS | Software Requirements Specification |

Located in the `docs/` directory.

---

## 🔒 Security & Privacy

- All API endpoints require JWT authentication (RS256)
- Passwords hashed with bcrypt (minimum 12 rounds)
- Role-based access control — students cannot access other students' data
- HTTPS/TLS 1.3 enforced in production
- Input sanitization to prevent SQL injection and XSS
- Student data is not shared with third parties except the LLM API (stated in the privacy notice)

---

## 📜 License

This project is developed for academic purposes as part of the FYDP requirements at FCIT, University of the Punjab, Lahore.

---