# Handoff Report: Requirements R3, R4, R5 Architecture & Deep Inspection

## 1. Observation
- **Project Structure**: Native ES-modules on frontend (`js/modules/*.js`, `js/app.js`), Node.js + Express backend (`server/index.js`), SQLite database with `node:sqlite` (`server/db.js`).
- **Existing AI Implementation**:
  - `js/modules/ai.js:41-58`: Uses client-side `simulateStepCompletion` and deterministic mock generator `buildAIQuestions`. No backend endpoint exists in `server/routes/ai.js`.
  - `server/db.js:16-100`: Current schema contains tables `users`, `sessions`, `subjects`, `topics`, `videos`, `questions`, `attempts`, `payments`. No tables exist for `ai_generations`, `mock_exams`, `mock_exam_attempts`, `teacher_tests`, `teacher_assignments`, or `assignment_results`.
- **Existing Quiz Engine**:
  - `js/modules/quiz.js:8-37`: `startQuiz(questions, title, origin)` initializes state and transitions to `#view-quiz-player`.
  - `server/routes/progress.js:36-47`: `POST /api/progress/attempt` records general topic attempt results.
- **Routing & Navigation**:
  - `js/modules/state.js:1`: `HASH_VIEWS = ["subjects", "notes", "videos", "tests", "plan", "analytics", "admin", "cart", "support"]`.
  - `js/modules/navigation.js:54-82`: `restoreView(state)` handles deep links for `#subject-detail:<id>`, `#note-reader:<subjectId>:<noteId>`, `#quiz-player`, `#quiz-results`.

## 2. Logic Chain
1. **R3 (AI Quiz Generator)**:
   - To replace client simulation with true OpenRouter / DeepSeek integration, server route `server/routes/ai.js` (`POST /api/ai/generate-quiz`) is required.
   - Rate limit of 3 free attempts per day requires tracking attempts per user date. `ai_generations` table with `(user_id, created_at)` index allows fast counting via `SELECT COUNT(*) FROM ai_generations WHERE user_id = ? AND date(created_at) = date('now')`.
   - Prompt engineering must enforce strict JSON responses with `questions`, `options`, `correctIndex`, and `explanation` so frontend `quiz.js` can render without transformation errors.
   - OpenRouter API fetch fallback ensures tests and environments without `OPENROUTER_API_KEY` return mock questions instead of failing.
2. **R4 (Mock Exam Mode - "Пробники")**:
   - Requires `#view-mock-exam` view in `index.html` and logic in `js/modules/mock-exam.js`.
   - Requires `mock_exams` table for variant definitions and `mock_exam_attempts` for saving student attempts.
   - Primary to secondary score conversion requires a conversion algorithm (`server/utils/score-converter.js`) implementing Rosobrnadzor 100-point scale tables for EGE/OGE.
   - Time management requires a Javascript countdown timer (210–235 mins) that auto-submits on `00:00:00`.
3. **R5 (Teacher / Tutor Module)**:
   - Requires `#view-teacher` and `#view-test-constructor` views in `index.html` and logic in `js/modules/teacher.js`.
   - Requires tables `teacher_tests`, `teacher_assignments`, and `assignment_results`.
   - QR code generation must be zero-dependency SVG string / Data URL to remain self-contained.
   - Homework URL hash links (`#homework:<token>`) must be integrated into `restoreView()` in `navigation.js`.

## 3. Caveats
- No external HTTP network requests can be executed during offline/automated test runs, so OpenRouter calls and QR code generators must operate in fallback mode or zero-dependency inline format when running `npm run check`.
- Real official Rosobrnadzor conversion tables for all 10 EGE/OGE subjects require exact numerical mapping tables; fallback linear piecewise scaling provides accurate approximations.

## 4. Conclusion
The current ExamHub codebase is well-structured for extending with Requirements R3, R4, and R5. The database schema in `server/db.js`, server routing in `server/routes/`, and ES frontend modules in `js/modules/` can seamlessly incorporate these requirements without breaking existing functionality or violating project constraints.

## 5. Verification Method
1. **Analysis Verification**: Inspect `analysis.md` for complete API payload contracts, DB schemas, score conversion algorithms, and routing changes.
2. **Quality Gate Verification**:
   Run the project test suite to verify code health:
   ```bash
   npm run check
   ```
   All steps (ESLint, project validation, Vitest unit tests, Playwright E2E smoke tests) must pass green.
