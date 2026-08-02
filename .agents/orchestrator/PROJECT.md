# Project: ExamHub FIPI Educational Content Expansion

## Architecture Plan
- **Data Model & Seed (`js/data.js`)**:
  - Educational materials for 8 key subjects (Biology, Chemistry, Physics, Mathematics, Russian Language, Social Studies, Computer Science, History) based on FIPI EGE/OGE codifiers.
  - Data structure per subject: `id`, `title`, `icon`, `color`, `colorHex`, `bgGradient`, `topics` array.
  - Topic structure: `id`, `title`, `isPremium`, `duration`, `theory` (rich HTML with `<h3>`, `<h4>`, `<table>`, `<div class="note-info-box">`, `<ul>`, `<code>`), `video` (`title`, `duration`, `instructor`, `youtubeId`, `views`, `thumbnail`), `questions` array (3-5+ questions per topic with `id`, `question`, `options` array, `correctIndex`, `explanation`).
- **Database & Server Integration (`server/db.js`, `server/seed.js`, `server/routes/catalog.js`)**:
  - `seedContent()` in `server/seed.js` converts `js/data.js` objects into SQLite tables (`subjects`, `topics`, `videos`, `questions`).
  - Update `seedContent()` with UPSERT / REPLACE logic (`INSERT OR REPLACE INTO ...`) or table refresh so changes in `js/data.js` immediately update SQLite DB (`server/database.sqlite`).
  - `/api/catalog/subjects` endpoint returns the full populated catalog to the SPA frontend.
- **Frontend SPA Integration (`js/modules/subjects.js`, `js/modules/notes.js`, `js/modules/quizzes.js`)**:
  - SPA views render full theory notes with HTML formatting, video cards, test player with option selection, immediate feedback, and detailed explanations.

## Milestones Breakdown
| # | Milestone Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Science_Content | Generate comprehensive FIPI educational content (theory HTML, videos, questions with explanations) for Biology, Chemistry, and Physics in `js/data.js` | none | DONE |
| M2 | Humanities_Tech_Content | Generate comprehensive FIPI educational content (theory HTML, videos, questions with explanations) for Mathematics, Russian Language, Social Studies, Computer Science, and History in `js/data.js` | none | DONE |
| M3 | DB_Sync_API_Integration | Update `server/seed.js` and `server/db.js` for clean upsert/re-seeding, sync SQLite DB `server/database.sqlite`, and verify `/api/catalog/subjects` API | M1, M2 | PLANNED |
| M4 | ExamType_Registration_Filtering | Implement EGE/OGE choice during registration (#authModal), SQLite column `users.exam_type`, localStorage state, header toggle, and dynamic content filtering across navigation, subjects, topics, notes, tests, videos, mock exams, AI generator | M3 | PLANNED |
| M5 | Final_QA_Audit_Gate | Verify Vitest (`tests/unit/exam_type.test.js`), Playwright E2E (`tests/e2e/smoke.spec.js`, `tests/e2e/exam_type_switch.spec.js`), guarantee 100% green `npm run check`, and final Forensic Integrity Audit | M4 | PLANNED |

## Interface Contracts
### Catalog API (`GET /api/catalog/subjects`)
- Output: `{ subjects: Array<Subject>, otherSubjects: Array<OtherSubject> }`
- Subject schema: `{ id, title, icon, color, colorHex, bgGradient, topics: Array<Topic> }`
- Topic schema: `{ id, title, isPremium, duration, theory, video?, questions?: Array<Question> }`
- Question schema: `{ id, type, question, options: string[], correctIndex: number, explanation: string }`

## Code Layout
- `js/data.js`: Main seed data export containing `EXAM_DATA` with subjects, topics, theory HTML, videos, and test questions.
- `server/seed.js`: Database seeding script parsing `js/data.js` and inserting/replacing into SQLite tables.
- `server/db.js`: Database connection and schema initialization (`initDb`, `seedContent`).
- `server/routes/catalog.js`: Express router handling `/api/catalog/subjects`.
- `tests/unit/data.test.js`: Unit tests validating data schema and integrity.
- `tests/e2e/smoke.spec.js`: E2E tests for catalog navigation, note reading, quiz solving.
