# Execution Plan — ExamHub Multi-Agent System

## Overview
This plan governs the step-by-step implementation of ExamHub Requirements R1 through R5.

## Milestones & Execution Workflow

### Milestone 1: R1 — Design System & Styling Variants
- **Objective**: Enhance `css/style.css` with dark/light themes (`[data-theme="dark"]`, `[data-theme="light"]`), WCAG high-contrast color tokens, glassmorphism UI utilities (`.glass-panel`, `.glass-card`), and add theme toggle module (`js/modules/theme.js`).
- **Steps**:
  1. Explorer assesses existing `css/style.css` and color variable structure.
  2. Worker updates `css/style.css` and creates `js/modules/theme.js`.
  3. Reviewer verifies WCAG contrast compliance and no broken layouts.
  4. Challenger & Auditor run tests and audit verification.

### Milestone 2: R2 — Social Auth (VK ID & Yandex ID)
- **Objective**: Implement OAuth 2.0 routes for VK ID and Yandex ID in `server/routes/auth.js`, update SQLite DB schema (`users` table columns `vk_id`, `yandex_id`, `avatar_url`), maintain HTTP-only `examhub_session` cookies, update auth modal UI in `js/modules/auth.js` and `index.html`.
- **Steps**:
  1. Explorer checks server auth routes & DB schema in `server/db.js` and `server/routes/auth.js`.
  2. Worker implements OAuth routes, callback handlers, DB schema migration, and frontend social auth buttons.
  3. Reviewer checks HTTP-only cookie security, SQL injection safety, and session storage.
  4. Challenger & Auditor verify tests pass.

### Milestone 3: R3 — OpenRouter / DeepSeek AI Integration
- **Objective**: Create backend route `/api/ai/generate-quiz` in `server/routes/ai.js` using OpenRouter/DeepSeek API with structured prompt JSON responses, enforce 3/day daily limit for Free users (unlimited Premium), and wire frontend in `js/modules/ai.js`.
- **Steps**:
  1. Explorer inspects existing `js/modules/ai.js` and server routes.
  2. Worker implements `/api/ai/generate-quiz` with fetch fallback to mock/DeepSeek model, rate-limiter, and quiz UI integration.
  3. Reviewer verifies error handling, rate limiting logic, and response validation.
  4. Challenger & Auditor verify build and tests.

### Milestone 4: R4 — Mock Exam Mode ("Пробники")
- **Objective**: Implement Mock Exam view (`view-mock-exam`), 3.5h - 4h countdown timer component, primary to secondary score conversion algorithm (ЕГЭ/ОГЭ 100-point scale), Free/Premium access rules (Free gets 1 variant per subject, Premium gets full bank), attempt analysis UI & API (`/api/mock-exams`).
- **Steps**:
  1. Explorer examines existing quiz player (`js/modules/quiz.js`) and progress routes (`server/routes/progress.js`).
  2. Worker builds backend routes `/api/mock-exams`, score converter module, frontend `js/modules/mock-exam.js`, and HTML view section.
  3. Reviewer checks timer precision, score conversion tables, and Free/Premium restrictions.
  4. Challenger & Auditor verify correctness and zero integrity violations.

### Milestone 5: R5 — Teacher / Tutor Module
- **Objective**: Create Teacher Dashboard view (`view-teacher`), custom test constructor (`view-test-constructor`), homework sharing link generator with QR code (SVG rendering), student progress dashboard table & API endpoints (`/api/teacher/*`).
- **Steps**:
  1. Explorer plans teacher DB tables (`teacher_tests`, `teacher_assignments`, `assignment_results`) and frontend views.
  2. Worker implements teacher backend routes, database schema, frontend `js/modules/teacher.js`, QR generator integration, and analytics view.
  3. Reviewer verifies link token security, student result calculation, and UI layout.
  4. Challenger & Auditor run full test suite and forensic audit.

## Quality Gate Checklist (Every Milestone)
- [ ] Worker runs `npm run check` and achieves 100% green (ESLint, build validator, Vitest, Playwright E2E).
- [ ] Reviewer verifies architectural standards and layout compliance.
- [ ] Challenger verifies empirical edge cases.
- [ ] Auditor verifies no code comments without explicit request, no cheating/hardcoding, and full integrity.
