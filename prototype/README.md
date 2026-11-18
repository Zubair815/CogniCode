# CogniCode — Figma Redesign Prototype

This folder contains the complete, standalone interactive redesign prototype exported from Figma Make.

**Figma URL:** [Redesign Prototype for CogniCode](https://www.figma.com/make/AwI2lqTMc8PI2O2il2XU8O/Redesign-Prototype-for-Use--Copy-?p=f&t=E3eh7ZmuHWH8Coa2-0)

---

## 🚀 How to Run the Prototype

### Option 1: Direct Browser Preview (Zero dependencies)
Simply open `index.html` in Google Chrome, Microsoft Edge, or any modern web browser.

### Option 2: Run with Vite / pnpm
```bash
cd prototype
pnpm install
pnpm dev
```

---

## 🎨 Prototype Overview & Screens

The prototype showcases the complete UI/UX flow for CogniCode with dark and light mode support:

1. **Landing Page (`#landing`)**: Hero with animated canvas neural background, value proposition, problem statement, features, role breakdown, and CTA.
2. **Authentication (`#login`)**: Dual-tab login and registration with dedicated learner pathways (Institution Student, Independent Learner, Educator).
3. **Institution Student Courses (`#scourses`)**: Enrolled university courses (Data Structures & Algorithms, Object-Oriented Programming, Database Systems), attendance, syllabus progress, and course join code modal.
4. **Independent Student Home (`#shome`)**: Self-directed learning tracks (Python, Algorithms, Web Development), streak tracking, and quick session starters.
5. **Socratic Tutoring Chat (`#chat`)**: Socratic dialogue tutor with attempt detection banner, progressive hints level indicator (Levels 1–5), code editor block, and cognitive coaching.
6. **Student Dependency Dashboard (`#sdash`)**: Cognitive Dependency Score (CDS 0–100) radial gauge, 6-factor metric breakdown, weak topics list, and past session logs.
7. **Post-Session Reflections (`#refl`)**: Mandatory end-of-session reflection prompts (*What did you learn today?*, *What mistake will you avoid next time?*).
8. **Code Understanding Checks / Quiz (`#quiz`)**: Pre-solution verification questions before higher-level hint unlock.
9. **Instructor Courses (`#icourses`)**: Course management, student rosters, and course code generation.
10. **Instructor Analytics Dashboard (`#idash`)**: Class-wide dependency metrics, high-risk student alerts, and weak topic clusters.
11. **Student Drilldown Detail (`#idetail`)**: Per-student cognitive dependency history, hint usage distribution, and reflection logs.
12. **Dependency Heatmap (`#iheat`)**: Visual matrix of student dependency scores across course topics.
13. **Comprehensive Error States**:
    - `404 Not Found` (`#e404`)
    - `403 Forbidden / Unauthorized` (`#e403`)
    - `401 Session Expired` (`#e401`)
    - `500 Server Error` (`#e500`)
    - `Network Disconnected` (`#enet`)
    - `LLM Provider Timeout` (`#ellm`)
    - `Rate Limit Cooldown` (`#erate`)
