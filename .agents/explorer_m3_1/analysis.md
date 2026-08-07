# Milestone 3 (DB Sync & Seeding Strategy) — Detailed Analysis

## Executive Summary

This report presents a thorough architectural and technical investigation into ExamHub's database initialization (`server/db.js`) and content seeding pipeline (`server/seed.js`). It evaluates schema integrity, transaction safety, seeding strategies (`UPSERT` vs Clean Table Sync), server startup behavior, and formulates an actionable implementation strategy for Worker agents.

---

## 1. Database Schema Architecture (`server/db.js`)

### 1.1 Content & System Tables Definition
The SQLite database schema is initialized via `initSchema()` in `server/db.js` using `DatabaseSync` (`node:sqlite`). SQLite `PRAGMA foreign_keys = ON;`, `PRAGMA journal_mode = WAL;`, and `PRAGMA busy_timeout = 5000;` are enabled at connection time.

The table structures for content and user progression are defined as follows:

1. **`subjects`**:
   - `id TEXT PRIMARY KEY` (e.g., `'math'`, `'biology'`)
   - `title TEXT NOT NULL`
   - `icon TEXT NOT NULL`
   - `color TEXT NOT NULL`, `color_hex TEXT NOT NULL`, `bg_gradient TEXT NOT NULL`
   - `is_active INTEGER NOT NULL DEFAULT 1`
   - `is_other INTEGER NOT NULL DEFAULT 0`
   - `sort_order INTEGER NOT NULL DEFAULT 0`

2. **`topics`**:
   - `id TEXT PRIMARY KEY` (e.g., `'bio_cytology'`)
   - `subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE`
   - `title TEXT NOT NULL`
   - `is_premium INTEGER NOT NULL DEFAULT 0`
   - `duration TEXT NOT NULL DEFAULT '45 мин'`
   - `theory TEXT NOT NULL DEFAULT ''`
   - `sort_order INTEGER NOT NULL DEFAULT 0`

3. **`videos`**:
   - `id TEXT PRIMARY KEY`
   - `topic_id TEXT NOT NULL UNIQUE REFERENCES topics(id) ON DELETE CASCADE`
   - `title TEXT NOT NULL`, `instructor TEXT NOT NULL`, `duration TEXT NOT NULL`, `youtube_id TEXT NOT NULL`
   - `views TEXT NOT NULL DEFAULT '0'`, `thumbnail TEXT NOT NULL DEFAULT ''`, `description TEXT NOT NULL DEFAULT ''`

4. **`questions`**:
   - `id TEXT PRIMARY KEY`
   - `topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE`
   - `type TEXT NOT NULL DEFAULT 'single'`
   - `question TEXT NOT NULL`
   - `options_json TEXT NOT NULL`
   - `correct_index INTEGER NOT NULL`
   - `explanation TEXT NOT NULL`
   - `points INTEGER NOT NULL DEFAULT 1`
   - `correct_answer_json TEXT`
   - `sort_order INTEGER NOT NULL DEFAULT 0`

5. **`mock_exams`**:
   - `id TEXT PRIMARY KEY` (e.g., `'mock_math_ege_1'`)
   - `subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE`
   - `title TEXT NOT NULL`
   - `exam_type TEXT NOT NULL` ('EGE' / 'OGE')
   - `duration_minutes INTEGER NOT NULL`, `total_questions INTEGER NOT NULL`, `is_premium INTEGER NOT NULL DEFAULT 0`
   - `questions_json TEXT NOT NULL`, `conversion_table_json TEXT NOT NULL`
   - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`

6. **User & Activity Tables**:
   - `users`: stores user accounts, `target_exam`, `exam_type`, OAuth identifiers (`vk_id`, `yandex_id`).
   - `attempts`: stores topic quiz results (`topic_id TEXT`, `score`, `total`, `percent`, `answers_json`).
   - `mock_exam_attempts`: stores full mock exam submissions (`mock_exam_id TEXT NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE`).
   - `groups`, `group_members`, `assignments`, `assignment_submissions`, `payments`, `ai_generations`.

### 1.2 Schema Migration & Indexes
- `initSchema()` uses idempotent `CREATE TABLE IF NOT EXISTS` blocks followed by `try { db.exec("ALTER TABLE ..."); } catch (err) {}` guards for schema migrations (e.g., adding `is_other` to `subjects`, `description` to `videos`, `points` and `correct_answer_json` to `questions`).
- Performance indexes exist for foreign keys: `idx_topics_subject_id`, `idx_questions_topic_id`, `idx_videos_topic_id`, `idx_attempts_user_id`, `idx_mock_exams_subject_id`, `idx_mock_exam_attempts_user_id`, `idx_groups_teacher_id`, `idx_group_members_student_id`, `idx_assignments_group_id`, `idx_assignment_submissions_assignment_student`.

---

## 2. Content Seeding Strategy (`server/seed.js`)

### 2.1 Data Extraction from `js/data.js`
`seedContent()` in `server/seed.js` loads `js/data.js` dynamically using Node.js `vm.runInNewContext`:
```javascript
const src = readFileSync(resolve(config.root, "js/data.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox, { filename: "data.js" });
const data = sandbox.window.EXAM_DATA;
```
This enables seamless server-side consumption of `js/data.js` without needing a build step or module transpilation.

### 2.2 Seeding SQL Statements (UPSERT Pattern)
`server/seed.js` executes five prepared statements within an atomic transaction helper `transaction(() => { ... })` (`BEGIN IMMEDIATE ... COMMIT`):
- `insSubject`: `INSERT INTO subjects ... VALUES (...) ON CONFLICT(id) DO UPDATE SET title = excluded.title, icon = excluded.icon, color = excluded.color, color_hex = excluded.color_hex, bg_gradient = excluded.bg_gradient, is_active = excluded.is_active, sort_order = excluded.sort_order`
- `insTopic`: `INSERT INTO topics ... VALUES (...) ON CONFLICT(id) DO UPDATE SET subject_id = excluded.subject_id, title = excluded.title, is_premium = excluded.is_premium, duration = excluded.duration, theory = excluded.theory, sort_order = excluded.sort_order`
- `insVideo`: `INSERT INTO videos ... VALUES (...) ON CONFLICT(topic_id) DO UPDATE SET id = excluded.id, title = excluded.title, instructor = excluded.instructor, duration = excluded.duration, youtube_id = excluded.youtube_id, views = excluded.views, thumbnail = excluded.thumbnail, description = excluded.description`
- `insQuestion`: `INSERT INTO questions ... VALUES (...) ON CONFLICT(id) DO UPDATE SET topic_id = excluded.topic_id, type = excluded.type, question = excluded.question, options_json = excluded.options_json, correct_index = excluded.correct_index, explanation = excluded.explanation, sort_order = excluded.sort_order, points = excluded.points, correct_answer_json = excluded.correct_answer_json`
- `insMockExam`: `INSERT INTO mock_exams ... VALUES (...) ON CONFLICT(id) DO UPDATE SET subject_id = excluded.subject_id, title = excluded.title, exam_type = excluded.exam_type, duration_minutes = excluded.duration_minutes, total_questions = excluded.total_questions, is_premium = excluded.is_premium, questions_json = excluded.questions_json, conversion_table_json = excluded.conversion_table_json`

### 2.3 Evaluation: UPSERT vs Clean Table Transactions
A critical architectural question is whether `seed.js` should use `UPSERT` (`INSERT ... ON CONFLICT DO UPDATE`) or `Clean Table Sync` (`DELETE FROM subjects; ...`).

| Evaluation Metric | UPSERT (`ON CONFLICT DO UPDATE`) | Clean Table Sync (`DELETE FROM ...`) |
|-------------------|-----------------------------------|---------------------------------------|
| **Data Preservation** | ✅ **Preserves user data**. User activity in `mock_exam_attempts` is kept intact. | ❌ **Destroys user mock exam attempts**. `mock_exam_attempts` has `mock_exam_id REFERENCES mock_exams(id) ON DELETE CASCADE`. Deleting `mock_exams` triggers cascading deletes of user exam history! |
| **Idempotency** | ✅ **100% Idempotent**. Safe to run repeatedly on server startup or deployment without wiping user state. | ⚠️ Resets content tables on every run; unsafe for production startup without table segregation. |
| **Constraint Safety** | ✅ Prevents `FOREIGN KEY constraint failed` and `UNIQUE constraint failed`. | ⚠️ Requires strict table deletion order (`questions` → `videos` → `topics` → `mock_exams` → `subjects`) to avoid FK violation errors. |
| **Stale Record Pruning** | ⚠️ If a topic/question ID is deleted from `data.js`, the row remains in SQLite unless explicitly pruned. | ✅ Automatically removes any obsolete rows no longer in `data.js`. |

**Verdict**: `UPSERT` (`ON CONFLICT(...) DO UPDATE SET ...`) is strictly superior and mandatory for ExamHub because it protects user mock exam attempt history from cascading deletion while maintaining exact synchronization with `js/data.js`.

---

## 3. Server Startup vs Standalone Seeding Workflows

### 3.1 Server Startup (`server/index.js`)
When `npm run dev` or `node server/index.js` starts:
1. `config` checks `NODE_ENV`. If `NODE_ENV === "test"`, `resetDb()` drops all tables first.
2. `initDb()` is called (line 39 of `server/index.js`).
3. `initDb()` executes `initSchema()` (ensuring tables & columns exist) and then calls `seedContent()`.
4. Result: Database tables are automatically verified and seeded on every server start.

### 3.2 Standalone Seeding (`node server/seed.js`)
When `node server/seed.js` is run directly from the command line:
1. `process.argv[1]` check triggers execution.
2. `initSchema()` ensures all schema definitions and column additions are present.
3. `seedContent()` parses `js/data.js` and performs `UPSERT` sync across all 5 tables in a transaction.
4. Output: `Database seeded successfully.`.

---

## 4. Current Data Audit & Verification

### 4.1 Content Counts in `js/data.js`
- **Primary Subjects (8)**: `biology`, `chemistry`, `russian`, `math`, `social`, `history`, `physics`, `informatics`.
  - Each primary subject contains **4 topics** (32 topics total).
  - Each primary subject contains **20 practice questions** (160 questions total).
- **Secondary Subjects (2)**: `english` (1 topic, 1 question), `literature` (1 topic, 1 question).
- **Total Data in `js/data.js`**:
  - **10 Subjects**
  - **34 Topics**
  - **34 Videos**
  - **162 Practice Questions**

### 4.2 Mock Exams in `server/seed.js`
- Hardcoded mock exams exist for all 8 primary subjects:
  1. `mock_bio_oge_1` & `mock_bio_ege_1` (Biology OGE/EGE)
  2. `mock_chem_oge_1` & `mock_chem_ege_1` (Chemistry OGE/EGE)
  3. `mock_rus_oge_1` & `mock_rus_ege_1` (Russian OGE/EGE)
  4. `mock_math_oge_1` & `mock_math_ege_1` (Math OGE/EGE)
  5. `mock_soc_oge_1` & `mock_soc_ege_1` (Social Studies OGE/EGE)
  6. `mock_hist_oge_1` & `mock_hist_ege_1` (History OGE/EGE)
  7. `mock_phys_oge_1` & `mock_phys_ege_1` (Physics OGE/EGE)
  8. `mock_inf_oge_1` & `mock_inf_ege_1` (Informatics OGE/EGE)
- **Total Mock Exams**: **16 Mock Exams** (8 OGE + 8 EGE).

### 4.3 SQLite DB Audit (`data/examhub.db`)
Programmatic verification via `DatabaseSync` queries confirms SQLite DB contains:
- `subjects`: 10 rows
- `topics`: 34 rows
- `videos`: 34 rows
- `questions`: 162 rows
- `mock_exams`: 16 rows

---

## 5. Actionable Implementation Strategy for Worker

To guarantee 100% data sync, schema stability, and test compliance across all environments, Worker should adhere to the following step-by-step strategy:

### Step 1: Schema Safety (`server/db.js`)
- Ensure `initSchema()` retains all `CREATE TABLE IF NOT EXISTS` statements with complete field lists.
- Keep column migration `try/catch` blocks (`ALTER TABLE ... ADD COLUMN ...`) for backward compatibility with existing SQLite DB files.
- Ensure all 10 performance indexes on FK columns are maintained.

### Step 2: Seeding Logic Safety (`server/seed.js`)
- Maintain `UPSERT` (`INSERT INTO ... ON CONFLICT(...) DO UPDATE SET ...`) for `subjects`, `topics`, `videos`, `questions`, and `mock_exams`.
- Ensure `videos` UPSERT target remains `ON CONFLICT(topic_id)` and uses `v.id || '${topic.id}_video'` as `id` to prevent `UNIQUE constraint failed: videos.id` errors when identical YouTube URLs are used across multiple topics.
- Maintain JSON serialization for `options_json`, `correct_answer_json`, `questions_json`, and `conversion_table_json`.

### Step 3: Optional Script Helper (`package.json`)
- Add `"seed": "node server/seed.js"` to `package.json` `scripts` for developer convenience if requested or needed.

### Step 4: Verification Pipeline Compliance
- Run `npm run check` (`eslint` → `build` → `vitest` → `playwright`) to confirm 100% pass rate without regressions.

