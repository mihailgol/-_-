# Handoff Report: Milestone 4 (R4 - Mock Exam Backend & Score Converter Design)

## 1. Observation

- **Database Architecture (`server/db.js`)**:
  - `server/db.js` line 1-13 initializes `DatabaseSync` for SQLite with `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;`.
  - `server/db.js` lines 15-131 (`initSchema()`) creates tables: `users`, `sessions`, `subjects`, `topics`, `videos`, `questions`, `attempts`, `payments`, `ai_generations`.
  - `server/db.js` line 133-143 defines the `transaction(fn)` helper utilizing `BEGIN`, `COMMIT`, and `ROLLBACK`.
  - Currently, no `mock_exams` or `mock_exam_attempts` tables exist in `server/db.js`.

- **Server Routes & Index (`server/index.js`)**:
  - `server/index.js` lines 5-9 imports routes (`auth`, `catalog`, `progress`, `premium`, `ai`).
  - Lines 18-22 registers `/api/auth`, `/api/catalog`, `/api/progress`, `/api/premium`, `/api/ai`.
  - Line 26-29 provides top-level Express error handling.

- **Data Seeding (`server/seed.js` & `js/data.js`)**:
  - `server/seed.js` lines 8-10 reads `js/data.js` via `node:fs` and executes it inside `node:vm` context to populate `EXAM_DATA`.
  - Lines 32-67 insert `subjects`, `topics`, `videos`, and `questions` in a single SQLite transaction using `INSERT OR IGNORE`.

- **Auth Middleware (`server/middleware/auth.js`)**:
  - `optionalAuth` (line 33-36) attaches `req.user` if session cookie is valid.
  - `requireAuth` (line 38-45) enforces `401 Unauthorized` if `req.user` is null.
  - `serializeUser` (line 4-18) exposes `isPremium` boolean (`!!row.is_premium`).

---

## 2. Logic Chain

1. **Requirement R4** demands a full mock exam mode ("Пробники") with countdown timers (3.5h - 4h), primary-to-secondary score conversion (100-point scale for EGE, 2-5 grade scale for OGE), and Free vs Premium bank access control.
2. Direct inspection of `server/db.js` shows that mock exam data is not currently stored in the database.
3. Therefore, SQLite schema extensions (`mock_exams` and `mock_exam_attempts`) must be defined in `server/db.js` and seeded during `initDb()` from `js/data.js` / `server/seed.js`.
4. Score conversion requires a dedicated module `server/utils/score-converter.js` implementing non-linear S-curve piecewise conversion for EGE and 5-point grade boundaries for OGE, with support for custom JSON conversion tables.
5. `server/routes/mock-exam.js` must implement `GET /api/mock-exams` (list with `isLocked` flag), `GET /api/mock-exams/:id` (sanitized questions, returns `403 Forbidden` if premium variant requested by free user), `POST /api/mock-exams/:id/submit` (evaluates answers, converts scores, records attempt in DB), and `GET /api/mock-exams/attempts` (history).
6. Sanitization is critical: `GET /api/mock-exams/:id` must omit `correctIndex` and `explanation` from question payloads to prevent answer leaks prior to exam completion.

---

## 3. Caveats

- **Seed Content Volume**: Initial mock exam seed data will be populated for key subjects (`biology`, `chemistry`, `math`, `russian`). Additional subjects can be added by extending `mockExams` in `js/data.js`.
- **Guest Attempts**: Unauthenticated (guest) users can take free mock exam variants (`is_premium = 0`), and score evaluation will function, but their results will not persist in `mock_exam_attempts` (since `user_id` is required).

---

## 4. Conclusion

The complete backend specification for Milestone 4 (R4: Mock Exam Mode) is fully formulated and documented in `analysis.md`:
- `server/db.js`: Add `mock_exams` and `mock_exam_attempts` tables.
- `server/utils/score-converter.js`: Provide `convertPrimaryToSecondary()`, `calculateOgeGrade()`, and `getScoreSummary()`.
- `server/routes/mock-exam.js`: Implement `GET /api/mock-exams`, `GET /api/mock-exams/attempts`, `GET /api/mock-exams/:id`, and `POST /api/mock-exams/:id/submit`.
- `server/index.js`: Register `app.use("/api/mock-exams", mockExamRoutes)`.

---

## 5. Verification Method

To verify the design and subsequent implementation:
1. **Unit Verification**:
   Execute `npx vitest run tests/unit/score-converter.test.mjs` to test score conversion logic across boundary cases (0, max, piecewise midpoints, custom tables, OGE grades).
2. **Integration Verification**:
   Execute `npx vitest run tests/unit/mock-exam.test.mjs` to test `GET /api/mock-exams`, sanitized `GET /api/mock-exams/:id`, `403` enforcement on premium variants for free users, and `POST /api/mock-exams/:id/submit`.
3. **Full Quality Gate**:
   Run `npm run check` to verify linting, project validation, unit tests, and Playwright E2E tests.
