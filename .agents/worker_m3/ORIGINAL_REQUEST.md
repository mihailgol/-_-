## 2026-08-01T12:20:17Z
You are Worker 4 for ExamHub Milestone 3 (R3: OpenRouter / DeepSeek AI Quiz Generator).

Your working directory is: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m3`
The project root is: `c:\Users\мишка\Desktop\сайтик_бахчасарай`

## Task Instructions:
Implement Requirement R3 (OpenRouter / DeepSeek AI Quiz Generator):

1. **Database Schema (`server/db.js`)**:
   - Create `ai_generations` table:
     `CREATE TABLE IF NOT EXISTS ai_generations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));`
     `CREATE INDEX IF NOT EXISTS idx_ai_generations_user_date ON ai_generations(user_id, created_at);`

2. **Backend API (`server/routes/ai.js`)**:
   - Implement `POST /api/ai/generate-quiz` endpoint.
   - Require authentication via `requireAuth` middleware.
   - Enforce daily limits: Free users limited to 3 generations per UTC date (`SELECT COUNT(*) FROM ai_generations WHERE user_id = ? AND date(created_at) = date('now')`). If count >= 3 and `!user.isPremium`, return 429 status `{ error: "Превышен дневной лимит генераций (3/3 для бесплатного тарифа)" }`. Premium users skip limit.
   - Call OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`) with `OPENROUTER_API_KEY` (or `process.env.OPENROUTER_API_KEY`), using model `deepseek/deepseek-chat`. Enforce JSON formatting prompt for EGE/OGE exam questions.
   - Graceful fallback: If `OPENROUTER_API_KEY` is missing, API call fails/times out, or `config.isTest` is true, return high-quality mock questions tailored to the requested `subjectId` and `topicTitle`.
   - Log generation in `ai_generations` table on success.

3. **Frontend Integration (`js/modules/ai.js` & `index.html`)**:
   - Wire `handleAIGeneration(subjectId, topicTitle)` to call `POST /api/ai/generate-quiz`.
   - Pass generated questions into `startQuiz(questions, title, origin)` in `js/modules/quiz.js`.
   - Update UI modal/section in `index.html` with subject selector, topic input, generation button, remaining limit badge (e.g. "Осталось 3 генерации сегодня"), and error toast display.

4. **Testing & Quality Gate**:
   - Add unit tests in `tests/unit/ai_quiz.test.mjs` testing generation endpoint, 3/day free rate-limit enforcement, premium bypass, and fallback responses.
   - Strictly NO CODE COMMENTS without explicit request.
   - Execute `npm run check` using `run_command` and ensure 100% green status across ESLint, validate-project, Vitest, and Playwright E2E.
