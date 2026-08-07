# Project: ExamHub Educational Materials & Integration

## Architecture
- Frontend: Native ES-modules (`js/modules/*`), single HTML entry `index.html`, loaded via `<script type="module" src="js/app.js">`.
- Data Source: `js/data.js` exposes `window.EXAM_DATA` containing `subjects` object and `otherSubjects` array.
- Backend: Node.js / Express server (`server/index.js`), SQLite database (`server/database.sqlite`) managed via `server/db.js` and seeded via `server/seed.js`.
- REST API: `/api/catalog/subjects` returns subjects with topics, theory notes, videos, questions. `/api/mock-exams` returns mock exams filtered by subject and `exam_type` ('EGE' / 'OGE').
- Testing: Vitest (unit tests) + Playwright (E2E tests). `npm run check` runs `lint`, `build`, `test`, `test:e2e`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Content Expansion: Math | Deep theory notes, formula tables, practice problem sets, full EGE & OGE mock exams with answers and explanations | M1 | R1 |
| 2 | Content Expansion: Russian | Deep theory notes, orthoepy/spelling/punctuation tables, practice sets, full EGE & OGE mock exams | M1 | R1 |
| 3 | Content Expansion: Social Studies | Deep theory notes, economics/law/politics tables, practice sets, full EGE & OGE mock exams | M1 | R1 |
| 4 | Content Expansion: Biology | Deep theory notes, cytology/genetics/anatomy tables, practice sets, expanded EGE & OGE mock exams | M1 | R1 |
| 5 | Content Expansion: Chemistry | Deep theory notes, organic/inorganic reaction tables, practice sets, expanded EGE & OGE mock exams | M1 | R1 |
| 6 | Content Expansion: Physics | Deep theory notes, mechanics/thermodynamics/electro formula tables, practice sets, full EGE & OGE mock exams | M1 | R1 |
| 7 | Content Expansion: Informatics | Deep theory notes, code/logic/networks tables, practice sets, full EGE & OGE mock exams | M1 | R1 |
| 8 | Content Expansion: History | Deep theory notes, historical timeline & period tables, practice sets, full EGE & OGE mock exams | M1 | R1 |
| 9 | Database & Seeding Sync | Integrate expanded content into `js/data.js` and `server/seed.js` / SQLite DB tables (`subjects`, `topics`, `questions`, `mock_exams`) | M2 | R2 |
| 10| API & Exam Type Integration | Ensure `/api/catalog/subjects` and `/api/mock-exams` serve new content correctly filtered by exam type (ЕГЭ / ОГЭ) | M2 | R2 |
| 11| Full Verification Pipeline | Verify 100% pass of linters, unit tests, validator, and E2E tests (`npm run check`) | M3 | R4 |
| 12| Git Commit & Push | Automatically commit changes with clear message and push to GitHub `origin main` | M4 | R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Content Generation (8 Subjects) | Expand theory notes, property/formula tables, practice sets, and EGE/OGE mock exams for all 8 subjects in `js/data.js` & `server/seed.js` | none | DONE |
| 2 | M2: DB & API Integration | Sync expanded data into SQLite DB via `server/seed.js` and verify REST API responses and ЕГЭ/ОГЭ filtering | M1 | DONE |
| 3 | M3: ExamType Registration & Content Filtering | EGE/OGE registration radio switch, SQLite `users.exam_type` schema, localStorage persistence, and SPA content filtering | M2 | IN_PROGRESS |
| 4 | M4: Final Verification & Publication | Full `npm run check` verification (ESLint, Vitest, Playwright E2E), Git commit and push to `origin main`, Victory Claim | M3 | PLANNED |


## Interface Contracts
### `js/data.js` ↔ `server/seed.js` ↔ `server/routes/catalog.js`
- `window.EXAM_DATA.subjects[subjectId]`:
  - `id`: string (e.g. `'math'`)
  - `title`: string
  - `icon`: string (Lucide icon name)
  - `color`, `color_hex`, `bg_gradient`: styling strings
  - `topics`: Array of `{ id, title, isPremium, duration, theory, video, questions }`
    - `theory`: HTML string containing `<h3>`, `<p>`, `<ul>`, `<table class="data-table">`, `<div class="note-info-box">`
    - `questions`: Array of `{ id, question, options, correctIndex, explanation }`
- `server/seed.js`:
  - Parses `EXAM_DATA` into SQLite `subjects`, `topics`, `videos`, `questions` tables.
  - Inserts `mock_exams`: Array of `{ id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json }`

## Code Layout
- Frontend seed: `js/data.js`
- Frontend logic: `js/modules/*.js`, `js/app.js`
- Backend DB & seed: `server/db.js`, `server/seed.js`, `server/database.sqlite`
- Backend routes: `server/routes/catalog.js`, `server/routes/mock-exam.js`
- Unit tests: `tests/unit/*.test.{js,mjs}`
- E2E tests: `tests/e2e/*.spec.js`
