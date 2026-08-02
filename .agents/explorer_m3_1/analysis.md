# Analysis Report: Database Seeding & Synchronization in ExamHub

**Author**: Explorer 1 (Milestone 3 — DB Sync & API Integration)  
**Date**: 2026-08-02  
**Target Directory**: `c:\Users\мишка\Desktop\сайтик_бахчасарай`  

---

## Executive Summary

This report presents a comprehensive analysis of the database seeding mechanism in `server/seed.js`, how data from `js/data.js` (`EXAM_DATA`) is seeded into SQLite (`server/database.sqlite`), why existing database instances fail to receive content updates, and the exact strategy to achieve clean, reliable synchronization of all 8 primary subjects, 32 topics, 160 questions, theories, videos, and mock exams.

---

## 1. Context & Data Structure Analysis

### 1.1 Source Data (`js/data.js`)
`js/data.js` defines `window.EXAM_DATA`, containing structured content for exam preparation:
* **Subjects**: 8 primary core subjects (`biology`, `chemistry`, `physics`, `math`, `russian`, `social`, `informatics`, `history`) + 2 secondary subjects (`english`, `literature`).
* **Topics**: Each of the 8 primary subjects contains **4 topics** (total 32 core topics).
  * Each topic contains HTML-formatted theory (`theory`), metadata (`isPremium`, `duration`), and an optional embedded `video` object (`youtubeId`, `instructor`, `duration`, `views`, `thumbnail`).
* **Questions**: Each core topic contains **5 multiple-choice questions** (32 topics × 5 questions = **160 core questions**).
  * Each question object defines `id`, `question`, `options` array, `correctIndex`, and `explanation`.
* **Other Assets**: `otherSubjects` list and metadata.

### 1.2 Database Schema (`server/db.js`)
`server/db.js` initializes SQLite tables using `node:sqlite` (`DatabaseSync`):
* `subjects` (`id` TEXT PRIMARY KEY, `title`, `icon`, `color`, `color_hex`, `bg_gradient`, `is_active`, `sort_order`)
* `topics` (`id` TEXT PRIMARY KEY, `subject_id` FK -> `subjects(id)` ON DELETE CASCADE, `title`, `is_premium`, `duration`, `theory`, `sort_order`)
* `videos` (`id` TEXT PRIMARY KEY, `topic_id` FK -> `topics(id)` ON DELETE CASCADE, `title`, `instructor`, `duration`, `youtube_id`, `views`, `thumbnail`)
* `questions` (`id` TEXT PRIMARY KEY, `topic_id` FK -> `topics(id)` ON DELETE CASCADE, `type`, `question`, `options_json`, `correct_index`, `explanation`, `sort_order`)
* `mock_exams` (`id` TEXT PRIMARY KEY, `subject_id` FK -> `subjects(id)` ON DELETE CASCADE, `title`, `exam_type`, `duration_minutes`, `total_questions`, `is_premium`, `questions_json`, `conversion_table_json`)
* **User Tables**: `users`, `sessions`, `attempts`, `payments`, `ai_generations`, `mock_exam_attempts`, `groups`, `group_members`, `assignments`, `assignment_submissions`.

---

## 2. Examination of `server/seed.js`

`server/seed.js` currently uses `vm.runInNewContext` to evaluate `js/data.js` and extract `window.EXAM_DATA`. It uses prepared statements with `INSERT OR IGNORE INTO`:

```javascript
// server/seed.js (Current implementation)
const insSubject = db.prepare(
  `INSERT OR IGNORE INTO subjects (id, title, icon, color, color_hex, bg_gradient, is_active, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
);
const insTopic = db.prepare(
  `INSERT OR IGNORE INTO topics (id, subject_id, title, is_premium, duration, theory, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insVideo = db.prepare(
  `INSERT OR IGNORE INTO videos (id, topic_id, title, instructor, duration, youtube_id, views, thumbnail)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const insQuestion = db.prepare(
  `INSERT OR IGNORE INTO questions (id, topic_id, type, question, options_json, correct_index, explanation, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const insMockExam = db.prepare(
  `INSERT OR IGNORE INTO mock_exams (id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
```

---

## 3. Root Cause Analysis: Why Updates Fail

### Cause 1: `INSERT OR IGNORE` Skips Existing Primary Keys
`INSERT OR IGNORE` instructs SQLite to skip row insertion if a row with the given Primary Key (`id`) already exists.
* **Impact**: When developers update theory text, fix typos in questions, add new answer options, or update video URLs in `js/data.js`, running `seedContent()` or restarting the server does **NOTHING** to existing database rows.
* The existing SQLite database retains outdated/stale content indefinitely.

### Cause 2: Risk of Naive `INSERT OR REPLACE` (Foreign Key Cascade Hazards)
A naive quick fix might seem to be replacing `INSERT OR IGNORE` with `INSERT OR REPLACE`. However, in SQLite:
* `REPLACE` (or `INSERT OR REPLACE`) operates by **deleting** the conflicting row and **inserting** a new row.
* `server/db.js` defines foreign keys with `ON DELETE CASCADE` (e.g. `mock_exam_attempts` has `REFERENCES mock_exams(id) ON DELETE CASCADE`).
* If `INSERT OR REPLACE INTO mock_exams` is executed, SQLite deletes the matching `mock_exams` row first, which **triggers `ON DELETE CASCADE` and wipes out user records in `mock_exam_attempts`**!

---

## 4. Recommended Fix Strategy

To guarantee that `node server/seed.js` or `initDb()` cleanly populates and updates all **8 subjects, 32 topics, 160 questions, theories, videos, and mock exams** without breaking user data, we recommend using **SQLite UPSERT syntax** (`INSERT INTO ... ON CONFLICT(id) DO UPDATE SET ...`).

### 4.1 Proposed Statements for `server/seed.js`

```javascript
// Recommended prepared statements for server/seed.js using UPSERT

const insSubject = db.prepare(
  `INSERT INTO subjects (id, title, icon, color, color_hex, bg_gradient, is_active, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, 1, ?)
   ON CONFLICT(id) DO UPDATE SET
     title = excluded.title,
     icon = excluded.icon,
     color = excluded.color,
     color_hex = excluded.color_hex,
     bg_gradient = excluded.bg_gradient,
     is_active = excluded.is_active,
     sort_order = excluded.sort_order`
);

const insTopic = db.prepare(
  `INSERT INTO topics (id, subject_id, title, is_premium, duration, theory, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     subject_id = excluded.subject_id,
     title = excluded.title,
     is_premium = excluded.is_premium,
     duration = excluded.duration,
     theory = excluded.theory,
     sort_order = excluded.sort_order`
);

const insVideo = db.prepare(
  `INSERT INTO videos (id, topic_id, title, instructor, duration, youtube_id, views, thumbnail)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     topic_id = excluded.topic_id,
     title = excluded.title,
     instructor = excluded.instructor,
     duration = excluded.duration,
     youtube_id = excluded.youtube_id,
     views = excluded.views,
     thumbnail = excluded.thumbnail`
);

const insQuestion = db.prepare(
  `INSERT INTO questions (id, topic_id, type, question, options_json, correct_index, explanation, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     topic_id = excluded.topic_id,
     type = excluded.type,
     question = excluded.question,
     options_json = excluded.options_json,
     correct_index = excluded.correct_index,
     explanation = excluded.explanation,
     sort_order = excluded.sort_order`
);

const insMockExam = db.prepare(
  `INSERT INTO mock_exams (id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     subject_id = excluded.subject_id,
     title = excluded.title,
     exam_type = excluded.exam_type,
     duration_minutes = excluded.duration_minutes,
     total_questions = excluded.total_questions,
     is_premium = excluded.is_premium,
     questions_json = excluded.questions_json,
     conversion_table_json = excluded.conversion_table_json`
);
```

### 4.2 Benefits of the UPSERT Strategy
1. **In-place Column Updates**: Modifies changed theories, question texts, explanations, video links, or option arrays without deleting existing records.
2. **Preserves Foreign Key Integrity**: Does not trigger `ON DELETE CASCADE`, preserving user test history (`attempts`, `mock_exam_attempts`).
3. **Atomic Execution**: Operates seamlessly inside `transaction(() => { ... })` in `server/seed.js`.
4. **Complete Coverage**: Reliably populates all subjects (8 core + 2 additional), 32 topics, 160 core questions, videos, and mock exams every time `seedContent()` is called.

---

## 5. Verification Plan

After implementation by the implementer agent:
1. Run `node server/seed.js` or `npm run dev`.
2. Inspect SQLite table counts via query or script:
   - `SELECT COUNT(*) FROM subjects;` -> 10 (or 8 core subjects)
   - `SELECT COUNT(*) FROM topics;` -> 34 (32 core + 2 additional)
   - `SELECT COUNT(*) FROM questions;` -> 162 (160 core + 2 additional)
   - `SELECT COUNT(*) FROM mock_exams;` -> 6
3. Edit a theory string in `js/data.js`, run `seedContent()`, and verify the updated theory string appears in `topics` table without modifying user `attempts`.
4. Execute `npm run check` (ESLint, unit tests, E2E tests) to confirm complete regression-free operation.
