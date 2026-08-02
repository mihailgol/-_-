# Project: ExamHub Multi-Agent Enhancement

## Architecture Plan
- **Frontend**: Native HTML5, CSS3, ES modules (`js/modules/*`, `js/app.js`), Lucide icons.
  - R1: CSS design system with WCAG color tokens, light/dark themes (`data-theme`), glassmorphism utilities (`.glass-panel`, `.glass-card`), high contrast support.
  - R4: Mock Exam view (`view-mock-exam`), timer component (3.5h OGE / 3.9h EGE countdown), primary to secondary score converter, attempt save & analysis.
  - R5: Teacher dashboard view (`view-teacher`), test constructor (`view-test-constructor`), homework link generator with QR code, student results analytics.
- **Backend**: Node.js (>=18, ES modules) + Express + `node:sqlite` (`server/`).
  - R2: OAuth 2.0 routes `/api/auth/vk`, `/api/auth/vk/callback`, `/api/auth/yandex`, `/api/auth/yandex/callback`, HTTP-only `examhub_session` cookie, OAuth account linking in SQLite `users` table (`vk_id`, `yandex_id`, `avatar_url`).
  - R3: AI Quiz endpoint `/api/ai/generate-quiz` calling OpenRouter / DeepSeek API (with fallback/mock handling if key not set), subject/topic prompts, rate limits (3/day Free, unlimited Premium).
  - R4: Mock exam endpoints `/api/mock-exams`, `/api/mock-exams/:id/submit`, score conversion logic (ЕГЭ/ОГЭ 100-point scale tables).
  - R5: Teacher endpoints `/api/teacher/tests`, `/api/teacher/assignments`, `/api/teacher/results`, QR code generation (SVG/data-url).

## Milestones Breakdown
| # | Milestone Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | R1_Design_System | Glassmorphism, light/dark theme toggle, WCAG high-contrast tokens in `css/style.css`, theme toggle control | none | PLANNED |
| M2 | R2_Social_Auth | VK ID & Yandex ID OAuth routes, DB schema migration, HTTP-only session cookie, auth modal UI update | none | PLANNED |
| M3 | R3_AI_Quiz_Generator | OpenRouter / DeepSeek API integration (`/api/ai/generate-quiz`), prompt engineering, daily limit enforcement, UI integration | none | PLANNED |
| M4 | R4_Mock_Exam_Mode | Mock exam view, 3.5-4h countdown timer, score converter (primary -> secondary), Free/Premium access gates, attempt tracking | M1, M3 | PLANNED |
| M5 | R5_Teacher_Tutor_Module | Teacher dashboard, test constructor, assignment link & QR code sharing, student progress tracking & analytics | M2, M4 | PLANNED |

## Interface Contracts
### AI Quiz API (`POST /api/ai/generate-quiz`)
- Input: `{ subjectId: string, topicTitle: string, count?: number }`
- Output: `{ questions: Array<{ id: string, text: string, options: string[], answer: number, explanation: string }> }`
- Errors: 401 (Unauthorized), 429 (Daily limit reached for Free user)

### Social Auth API (`GET /api/auth/vk`, `GET /api/auth/yandex`)
- Redirects to OAuth provider, callbacks handle token exchange & user creation/linking, sets `examhub_session` httpOnly cookie.

### Mock Exam API (`GET /api/mock-exams`, `POST /api/mock-exams/submit`)
- Input: `{ examId: string, answers: Record<string, any>, timeSpent: number }`
- Output: `{ primaryScore: number, maxPrimaryScore: number, secondaryScore: number, totalQuestions: number, breakdown: Array<any> }`

### Teacher Module API (`POST /api/teacher/tests`, `POST /api/teacher/assignments`, `GET /api/teacher/assignments/:id/results`)
- Custom test creation, sharing link token generation, student completion tracking.

## Code Layout
- `css/style.css`: Global styles, CSS custom properties, theme tokens, glassmorphism components.
- `js/modules/theme.js`: Dark/light/system theme state management & switcher.
- `js/modules/auth.js`: Auth modal, social login buttons (VK, Yandex), session sync.
- `js/modules/ai.js`: AI quiz generator UI & API calls.
- `js/modules/mock-exam.js`: Mock exam UI, timer logic, score calculation, result modal.
- `js/modules/teacher.js`: Constructor UI, assignment management, QR code display, analytics table.
- `server/db.js`: Extended DB tables for OAuth (`vk_id`, `yandex_id`), teacher tests, homework assignments.
- `server/routes/auth.js`: OAuth login endpoints & callbacks.
- `server/routes/ai.js`: OpenRouter / DeepSeek AI quiz endpoint.
- `server/routes/mock-exam.js`: Mock exam data & submission routes.
- `server/routes/teacher.js`: Teacher module routes & QR code generation.
