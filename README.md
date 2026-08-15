CogniCode

A Cognitive-Aware AI Teaching Assistant for Programming Education

CogniCode is a web-based, cognitive-aware AI teaching assistant designed specifically for university-level programming education.

Unlike conventional AI coding assistants that provide complete solutions immediately, CogniCode aims to preserve students' problem-solving and computational-thinking skills by using Socratic dialogue, progressive hints, guided debugging, conceptual checks, reflection, and personalized learning memory.

The project is being developed as a Final Year Design Project (FYDP) at the Faculty of Computing and Information Technology, University of the Punjab, Lahore.

---

📌 Project Overview

The widespread use of Large Language Models (LLMs) in programming education has created a challenge: students can obtain complete solutions without sufficiently engaging with the underlying concepts and problem-solving process.

CogniCode addresses this problem by changing the role of AI from an answer provider into a cognitive learning coach.

The system is designed to:

- Ask guiding questions before providing direct assistance.
- Verify whether a student has attempted a problem.
- Provide progressive hints instead of immediately revealing solutions.
- Guide students through debugging rather than simply fixing their code.
- Evaluate conceptual understanding.
- Maintain personalized learning memory.
- Encourage students to reflect on what they learned.
- Track behavioral indicators related to AI dependency.
- Provide students and instructors with dependency and learning analytics.

---

🎯 Project Objectives

The major objectives of CogniCode are:

1. Design and implement a multi-agent AI teaching assistant using LangGraph.
2. Develop a Socratic Dialogue Engine for programming education.
3. Implement a five-level progressive hint system.
4. Develop a Cognitive Dependency Score based on student interaction behavior.
5. Build student and instructor dependency dashboards.
6. Implement code understanding checks before higher-level assistance.
7. Develop a Debugging Coach that teaches debugging methodology.
8. Implement personalized Learning Memory for student profiles.
9. Develop a Reflection Module for post-session learning reflection.
10. Evaluate learning effectiveness, AI dependency, code quality, and usability.

---

✨ Planned Key Features

1. Socratic Tutoring

CogniCode is designed to encourage students to think before receiving an answer.

The system can respond to direct solution requests with guiding questions when an adequate attempt has not yet been demonstrated.

2. Progressive Hint System

The system will use five levels of assistance:

1. Conceptual nudge
2. Strategic guidance
3. Pseudocode or algorithmic guidance
4. Partial implementation guidance
5. Complete solution as a last resort

The intended design is that higher levels of assistance require appropriate student engagement.

3. Cognitive Dependency Score

CogniCode will calculate a behavioral dependency indicator using signals such as:

- Solution request frequency
- Hint levels reached
- Number of retries
- Debugging attempts
- Time between interactions
- Quiz performance
- Independent completion behavior

The score is intended as a learning-support metric rather than a definitive measurement of a student's ability.

4. Code Understanding Checks

Before receiving higher levels of assistance, students may be asked conceptual questions such as:

- What is the time complexity?
- What is the base case?
- Why does this approach work?
- What could be optimized?
- What is the expected output?

5. Debugging Coach

Instead of directly correcting code, the Debugging Coach will guide students to:

- Identify unexpected behavior.
- Inspect variable states.
- Trace program execution.
- Compare expected and actual output.
- Identify the likely source of an error.
- Develop and test a correction.

6. Learning Memory

The system will maintain a student learning profile containing information such as:

- Weak programming topics
- Common mistake patterns
- Previous assignments
- Hint usage patterns
- Learning history
- Reflection summaries

This information will be used to personalize future tutoring interactions.

7. Reflection Module

At the end of a learning session, students will be encouraged to reflect on:

- What they learned.
- What mistake they made.
- How they solved the problem.
- What they will do differently next time.

8. Instructor Analytics

The instructor dashboard is planned to provide course-level insights including:

- Student dependency trends
- Weak topic identification
- Learning progress
- Session information
- Reflection summaries
- Dependency comparisons against course-level statistics

---

🏗️ System Architecture

CogniCode follows a multi-agent architecture.

Core Agents

- Conversation Manager — Routes student requests to appropriate components.
- Socratic Tutor Agent — Generates guiding questions.
- Hint Generator Agent — Manages progressive hints.
- Code Analysis Agent — Analyzes submitted code.
- Debugging Coach Agent — Guides debugging methodology.
- Assessment Agent — Evaluates attempts and conceptual understanding.
- Memory Agent — Maintains personalized student learning profiles.
- Reflection Agent — Handles end-of-session reflection.
- Instructor Dashboard Agent — Aggregates learning and dependency analytics.

High-Level Workflow

Student
   │
   ▼
React Frontend
   │
   ▼
FastAPI Backend
   │
   ▼
Conversation Manager
   │
   ├──► Socratic Tutor
   ├──► Hint Generator
   ├──► Code Analysis
   ├──► Debugging Coach
   ├──► Assessment
   ├──► Memory
   └──► Reflection
            │
            ▼
     Cognitive Dependency
          Scoring
            │
       ┌────┴────┐
       ▼         ▼
   Student    Instructor
   Dashboard   Dashboard

---

🛠️ Technology Stack

Layer| Technologies
Frontend| React.js, Tailwind CSS, Recharts
Backend| FastAPI, Python
Agent Orchestration| LangGraph
LLM| Claude API / compatible hosted model
Local LLM Fallback| Llama 3 / Qwen via Ollama
Code Analysis| Tree-sitter, Python AST
Structured Database| PostgreSQL
Vector Database| ChromaDB
Authentication| JWT, bcrypt
Real-time Communication| FastAPI WebSockets
Report Generation| ReportLab
Version Control| Git, GitHub
Development Tools| VS Code, Postman, Docker
Planned Deployment| Vercel, Render/Railway, Supabase

---

📂 Planned Repository Structure

CogniCode/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   ├── agents/
│   ├── api/
│   ├── models/
│   ├── services/
│   └── requirements.txt
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── tests/
│   ├── frontend/
│   └── backend/
│
├── docs/
│   ├── architecture/
│   ├── requirements/
│   └── research/
│
├── .gitignore
└── README.md

«This structure represents the planned organization and may evolve during development.»

---

🚀 Setup and Installation

The project is currently under development. Detailed installation instructions will be updated as the frontend, backend, database, and AI components are implemented.

Prerequisites

The planned development environment requires:

- Node.js
- npm
- Python 3.x
- PostgreSQL
- Git
- Docker (optional)
- Required LLM API access or a supported local LLM
- ChromaDB

Frontend

The frontend will be developed using React.js.

Planned setup:

cd frontend
npm install
npm run dev

Backend

The backend will be developed using FastAPI.

Planned setup:

cd backend
python -m venv .venv

Activate the virtual environment and install dependencies:

pip install -r requirements.txt

The backend will then be started using the project's configured FastAPI server.

Database

CogniCode will use PostgreSQL for structured application data, including:

- Student profiles
- Session records
- Quiz results
- Dependency scores
- Learning history

Database configuration will be documented when the database implementation is added.

Environment Variables

Sensitive information such as API keys, database passwords, JWT secrets, and other credentials must never be committed to GitHub.

Environment variables will be stored locally using ".env" files.

Example:

LLM_API_KEY=your_api_key
DATABASE_URL=your_database_url
JWT_SECRET=your_secret

«Never replace the example values with real credentials in this README or commit actual secrets to the repository.»

---

🧪 Testing

Testing will be performed throughout development.

Planned testing areas include:

- Frontend component testing
- Backend API testing
- AI agent behavior testing
- Hint-level enforcement testing
- Code analysis testing
- Database testing
- Integration testing
- System usability evaluation

Formal evaluation will include learning effectiveness, dependency-related behavioral metrics, code quality, and System Usability Scale (SUS) assessment.

---

🔀 Development Methodology

CogniCode follows the Agile Scrum methodology.

Team Roles

Abdullah — Scrum Master / AI Pipeline & Agent Architecture Lead

Responsibilities include:

- Multi-agent architecture
- LLM integration
- Socratic Dialogue Engine
- Progressive Hint System
- Cognitive Dependency Score
- Code Analysis Pipeline
- Debugging Coach

Muhammad Zubair — Product Owner / Frontend, Dashboard & Integration Lead

Responsibilities include:

- React frontend
- Student dashboard
- Instructor dashboard
- Cognitive dependency dashboard
- Learning memory interface
- Reflection module UI
- System integration

Both members share responsibility for evaluation, usability testing, and final documentation.

Sprint Duration

Each sprint is planned to last approximately two weeks.

---

🌿 Branching Strategy

The "main" branch will contain the stable version of the project.

Feature branches will be used for individual development tasks.

Examples:

main
│
├── feature/frontend
├── feature/ai-agents
├── feature/backend
├── feature/database
└── feature/authentication

Branch names may become more specific as development progresses.

Examples:

feature/student-dashboard
feature/socratic-engine
feature/hint-system
feature/dependency-score

Completed and tested features will be integrated into the main development branch through appropriate commits and pull requests.

---

👥 Team

Name| Roll Number| Role
Abdullah| BSEF23M526| Scrum Master / AI Pipeline & Agent Architecture Lead
Muhammad Zubair| BSEF23M546| Product Owner / Frontend, Dashboard & Integration Lead

Supervisor

Sanam Ahmad
Assistant Professor
Faculty of Computing and Information Technology
University of the Punjab, Lahore

---

🎓 Academic Information

Project: CogniCode — A Cognitive-Aware AI Teaching Assistant for Programming Education

Degree: Bachelor of Science in Software Engineering

Session: 2023–2027

Institution: Faculty of Computing and Information Technology, University of the Punjab, Lahore

FYDP Group ID: BSEF23-63

---

📈 Project Status

Status: In Development

The system is being developed incrementally using Agile Scrum. Features, architecture, documentation, testing, and deployment information will be updated as development progresses.

---

📄 License

This project is developed as an academic Final Year Design Project.

Licensing and distribution terms will be finalized by the project team.
