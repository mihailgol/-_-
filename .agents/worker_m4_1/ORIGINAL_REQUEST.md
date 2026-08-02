## 2026-08-01T09:29:20Z
<USER_REQUEST>
You are Worker 1 for Milestone 4 (R4: Mock Exam Mode "Пробники").
Your working directory is: c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m4_1
Project Root: c:\Users\мишка\Desktop\сайтик_бахчасарай

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Project Rules & Constraints (STRICT)
- DO NOT add any comments (`//` or `/* */`) to code files without explicit user request.
- Pure native ES modules on frontend (`js/modules/*`), Express + `node:sqlite` on backend (`server/*`).
- Do NOT run Prettier on `js/app.js` or `index.html`.
- Use exact locators in tests (`#id` first, `[data-view]`, classes as last resort).
- Russian UI text & English variable/function/file names.

## Task Instructions for Milestone 4:
1. **Database Schema & Seeding (`server/db.js`, `server/seed.js`)**:
   - Add `mock_exams` table (`id`, `subject_id`, `title`, `exam_type`, `duration_minutes`, `total_questions`, `is_premium`, `questions_json`, `conversion_table_json`, `created_at`).
   - Add `mock_exam_attempts` table (`id`, `user_id`, `mock_exam_id`, `answers_json`, `primary_score`, `max_primary_score`, `secondary_score`, `time_spent_seconds`, `completed_at`).
   - Add seed mock exams into `server/seed.js` for subjects (OGE 210 min & EGE 235 min, free `is_premium: 0` vs premium `is_premium: 1`).
2. **Score Conversion Algorithm (`server/utils/score-converter.js`)**:
   - Implement score conversion scaling primary score to secondary score (100-point scale for EGE, 2-5 grade scale for OGE).
3. **Mock Exam Backend Routes (`server/routes/mock-exam.js`)**:
   - `GET /api/mock-exams` (list mock exams with `isLocked` flag based on user's premium status).
   - `GET /api/mock-exams/:id` (returns exam & sanitized questions, 403 Forbidden for locked premium variants).
   - `POST /api/mock-exams/:id/submit` (evaluates answers, converts score, records attempt, returns breakdown).
   - `GET /api/mock-exams/attempts` (user attempt history).
   - Mount routes in `server/app.js`.
4. **Frontend UI & Timer (`index.html`, `css/style.css`, `js/modules/mock-exam.js`, `js/app.js`)**:
   - Create section `<section id="view-mock-exam" class="view-section">` in `index.html`.
   - Update sidebar navigation button in `index.html` to include Mock Exams ("Пробники") with `data-view="mock-exam"`. Note sidebar order: subjects -> notes -> videos -> tests -> mock-exam -> plan -> analytics -> cart -> support (or as appropriate).
   - Implement `js/modules/mock-exam.js`: catalog screen, active exam player with countdown timer (210 min OGE / 235 min EGE) showing `#mockTimerDisplay`, 15m & 5m warning state/toast, 0s auto-submit, question grid `#mockNavGrid`, submit button `#mockSubmitBtn`, results view showing `#mockPrimaryScore` and `#mockSecondaryScore`.
   - Register module in `js/app.js`.
5. **Unit Tests & E2E Tests (`tests/unit/mock_exam.test.mjs`, `tests/e2e/smoke.spec.js`)**:
   - Create unit tests in `tests/unit/mock_exam.test.mjs` verifying score converter and backend routes.
   - Add E2E tests in `tests/e2e/smoke.spec.js` testing Mock Exam navigation, starting an exam, timer display, answering, submitting, and score output.
6. **Verification**:
   - Run `npm run check` and ensure ESLint, project validator, Vitest unit tests, and Playwright E2E tests are ALL 100% GREEN.

Write your implementation report to `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m4_1\handoff.md`. Communicate via send_message to parent (`ab7220c7-5f9f-4051-a347-a8cd7688600d`).
</USER_REQUEST>
