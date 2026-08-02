# Plan: ExamHub FIPI Educational Content Expansion

## Objective
Generate, structure, and integrate full FIPI-aligned educational materials for all 8 key catalog subjects (Biology, Chemistry, Mathematics, Russian Language, Social Studies, Physics, Computer Science, History) into `js/data.js` and SQLite database `server/database.sqlite`. Ensure full SPA accessibility and 100% passing test suite (`npm run check`).

## Milestone 1: Natural Sciences Content Expansion (Biology, Chemistry, Physics)
1. **Explorer Analysis**:
   - Inspect existing topics in `js/data.js` for Biology, Chemistry, and Physics.
   - Define FIPI codifier topic breakdown for each science subject (3-4 major topics per subject covering key exam domains).
   - Establish theory HTML formatting standards (tables, callout boxes `.note-info-box`, key term highlights, formulas).
   - Design question sets (3-5 questions per topic) with options, `correctIndex`, and detailed explanations.
2. **Worker Implementation**:
   - Update `js/data.js` for `biology`, `chemistry`, and `physics`.
   - Add topics, rich theory notes, video metadata, and test questions with explanations.
3. **Reviewer & Challenger Verification**:
   - Review correctness of science theory and FIPI alignment.
   - Verify question logic, option indexing, and explanations.
4. **Forensic Audit**:
   - Audit code integrity and ensure no fake/placeholder questions.

## Milestone 2: Humanities & Tech Content Expansion (Mathematics, Russian, Social Studies, Computer Science, History)
1. **Explorer Analysis**:
   - Inspect existing topics for Math, Russian, Social Studies, Informatics, and History.
   - Define FIPI codifier topic breakdown for each subject (3-4 major topics per subject).
   - Design theory HTML notes with code blocks for Informatics, math formulas for Math, historical chronologies for History, rules for Russian, and economic/political terms for Social Studies.
   - Design question sets (3-5 questions per topic) with options, `correctIndex`, and detailed explanations.
2. **Worker Implementation**:
   - Update `js/data.js` for `math`, `russian`, `social`, `informatics`, and `history`.
   - Add topics, rich theory notes, video metadata, and test questions with explanations.
3. **Reviewer & Challenger Verification**:
   - Review correctness of humanities/tech theory and FIPI alignment.
   - Verify question logic, option indexing, and explanations.
4. **Forensic Audit**:
   - Audit code integrity and ensure no fake/placeholder questions.

## Milestone 3: DB Sync & Server Integration (`server/seed.js`, `server/db.js`, `server/database.sqlite`)
1. **Explorer Analysis**:
   - Analyze database seeding in `server/seed.js` and schema initialization in `server/db.js`.
   - Identify issues with `INSERT OR IGNORE` preventing updates to existing topic theories or questions.
2. **Worker Implementation**:
   - Update `server/seed.js` to use `INSERT OR REPLACE INTO` for subjects, topics, videos, and questions (or clean re-seed transaction).
   - Re-seed/migrate `server/database.sqlite`.
   - Ensure `/api/catalog/subjects` returns full updated catalog data.
3. **Reviewer & Challenger Verification**:
   - Test `/api/catalog/subjects` response structure and verify all subjects/topics/questions/videos are delivered correctly via Express.
4. **Forensic Audit**:
   - Audit database seeding integrity.

## Milestone 4: ExamType Registration & Content Filtering (EGE / OGE)
1. **Explorer Analysis**:
   - Inspect auth modal `#authModal` in `index.html` and `js/modules/auth.js`.
   - Inspect SQLite user schema in `server/db.js` and user endpoints in `server/routes/auth.js`.
   - Analyze filtering logic across SPA views (`js/modules/subjects.js`, `js/modules/notes.js`, `js/modules/quizzes.js`, `js/modules/mock-exam.js`, `js/modules/ai.js`).
2. **Worker Implementation**:
   - Add radio switch to `#authModal` for examType ("ЕГЭ (10-11 класс)" / "ОГЭ (9 класс)").
   - Update SQLite `users` table schema to store `exam_type TEXT NOT NULL DEFAULT 'EGE'`.
   - Update auth endpoints (`/api/auth/register`, `/api/auth/me`) and `localStorage` to save and sync `examType`.
   - Add examType header toggle control and apply dynamic content filtering to all views (subjects, topics, theory notes, tests, videos, mock exams, AI generator).
3. **Reviewer & Challenger Verification**:
   - Verify examType persistence in SQLite and localStorage.
   - Verify proper filtering of OGE vs EGE content across UI views.
4. **Forensic Audit**:
   - Audit auth logic and filtering implementation.

## Milestone 5: Full Test Verification & Quality Gate (`npm run check`)
1. **Explorer Analysis**:
   - Review Vitest unit tests (`tests/unit/exam_type.test.js`, `tests/unit/data.test.js`) and Playwright E2E tests (`tests/e2e/smoke.spec.js`, `tests/e2e/exam_type_switch.spec.js`).
2. **Worker Implementation**:
   - Fix any broken test assertions and ensure 100% pass rate.
   - Run full `npm run check` (ESLint, build validator, Vitest unit tests, Playwright E2E tests).
3. **Reviewer & Challenger Verification**:
   - Execute all verification scripts independently.
4. **Forensic Audit**:
   - Perform final forensic integrity audit. Clean audit verdict required.
