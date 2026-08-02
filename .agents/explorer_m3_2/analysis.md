# DB Schema & Database Setup Analysis Report (Milestone 3 — DB Sync & API Integration)

**Author:** Explorer 2  
**Date:** 2026-08-02  
**Target Repository:** `c:\Users\мишка\Desktop\сайтик_бахчасарай`  
**Working Directory:** `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\explorer_m3_2`  

---

## 1. Executive Summary

This report provides a detailed read-only investigation of SQLite database initialization, transaction handling, schema alignment with `js/data.js`, and indexing optimization in `server/db.js` and `server/seed.js`.

### Key Findings
1. **Pragmas & Concurrency:** SQLite is initialized with `WAL` mode, `foreign_keys = ON`, and `busy_timeout = 5000`. However, transaction handling in `server/db.js` uses standard `BEGIN` (deferred), which can lead to `SQLITE_BUSY` contention during concurrent writes.
2. **DB Seeding & Sync Deficit:** `server/seed.js` uses `INSERT OR IGNORE`. When `js/data.js` objects are modified or expanded, existing database rows are skipped, breaking seamless database sync. Furthermore, `otherSubjects` defined in `data.js` is not stored in SQLite and is hardcoded in `server/routes/catalog.js`.
3. **Missing Schema Columns:**
   - `questions`: Lacks `points` column (hardcoded in mock exams but missing in topic questions) and lacks support for non-single choice or text-based answers (`correct_index` only supports single integer choice).
   - `attempts`: Lacks `answers_json` column, preventing users from reviewing specific question responses in topic quiz history.
   - `videos`: Lacks optional `description` column.
   - `subjects`: Lacks `is_other` / `category` field to dynamically manage `otherSubjects`.
   - `users`: Lacks user target exam preference (`target_exam`).
4. **Missing Database Indexes:** 9 key foreign key and query filter columns across `topics`, `questions`, `attempts`, `mock_exams`, `mock_exam_attempts`, `groups`, `group_members`, `assignments`, and `assignment_submissions` lack indexes, causing full table scans during catalog navigation and user progress requests.

---

## 2. SQLite Database Setup & Configuration Audit

### 2.1 Driver & Pragmas (`server/db.js`)
- **Driver:** Node.js native `node:sqlite` (`DatabaseSync`).
- **Initialization:**
  ```javascript
  export const db = new DatabaseSync(config.dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  ```
- **Evaluation:**
  - `journal_mode = WAL` is optimal for concurrent reading and writing.
  - `foreign_keys = ON` correctly enables referential integrity enforcement.
  - `busy_timeout = 5000` prevents immediate lock failures.

### 2.2 Transaction Handling
- **Current Implementation:**
  ```javascript
  export function transaction(fn) {
    db.exec("BEGIN");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  ```
- **Vulnerability:** `BEGIN` defaults to `DEFERRED`. Under high concurrent write requests, deferred transactions upgrade to write locks on the first write statement, causing potential `SQLITE_BUSY` deadlocks.
- **Recommendation:** Change `BEGIN` to `BEGIN IMMEDIATE` to acquire write locks at transaction start.

### 2.3 Seeding Mechanism (`server/seed.js`)
- **Current Logic:**
  - Reads `js/data.js` using `node:vm` (`vm.runInNewContext(src, sandbox)`).
  - Uses `INSERT OR IGNORE` for `subjects`, `topics`, `videos`, `questions`, and `mock_exams`.
- **Deficit:** `INSERT OR IGNORE` skips existing IDs. Updates to `theory`, question text, explanations, or video URLs in `js/data.js` are ignored unless `resetDb()` is invoked.
- **Recommendation:** Implement `UPSERT` (`INSERT ... ON CONFLICT(id) DO UPDATE SET ...`) or synchronization hash checks during `seedContent()`.

---

## 3. Comprehensive Table Schema vs `js/data.js` Comparison

### 3.1 Table `subjects`
- **DB Schema:** `(id TEXT PRIMARY KEY, title TEXT, icon TEXT, color TEXT, color_hex TEXT, bg_gradient TEXT, is_active INTEGER, sort_order INTEGER)`
- **`js/data.js` Model:** Matches `subjects` keys.
- **Gaps:** `data.js` defines `otherSubjects: [{ id: "geography", title: "География", icon: "🌍" }]`. In `server/routes/catalog.js`, `OTHER_SUBJECTS` is hardcoded as an array and NOT read from the database.
- **Fix:** Add column `is_other INTEGER NOT NULL DEFAULT 0` or seed inactive/other subjects into `subjects` table.

### 3.2 Table `topics`
- **DB Schema:** `(id TEXT PRIMARY KEY, subject_id TEXT, title TEXT, is_premium INTEGER, duration TEXT, theory TEXT, sort_order INTEGER)`
- **`js/data.js` Model:** Matches `topics` object structure. Stores HTML theory content in `theory TEXT`.
- **Gaps:** None for basic model, but lacks FTS5 index for full-text search across theory text.

### 3.3 Table `videos`
- **DB Schema:** `(id TEXT PRIMARY KEY, topic_id TEXT UNIQUE, title TEXT, instructor TEXT, duration TEXT, youtube_id TEXT, views TEXT, thumbnail TEXT)`
- **`js/data.js` Model:** Matches `video` sub-object inside topic (`instructor` mapping to lecturer).
- **Gaps:** Lacks optional `description TEXT DEFAULT ''` column for extended video summaries.

### 3.4 Table `questions`
- **DB Schema:** `(id TEXT PRIMARY KEY, topic_id TEXT, type TEXT, question TEXT, options_json TEXT, correct_index INTEGER, explanation TEXT, sort_order INTEGER)`
- **`js/data.js` Model:** `(id, question, options, correctIndex, explanation)`
- **Critical Gaps:**
  1. `correct_index INTEGER NOT NULL`: Only supports single choice questions. Fails for multiple choice questions (`correctIndex: [0, 2]`), matching questions, or open text/numeric answers.
  2. `points`: No `points INTEGER NOT NULL DEFAULT 1` column present in `questions` schema, while `seed.js` mock questions explicitly define `points`.

### 3.5 Table `users`
- **DB Schema:** `(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password_hash TEXT, name TEXT, role TEXT, avatar TEXT, avatar_url TEXT, vk_id TEXT UNIQUE, yandex_id TEXT UNIQUE, is_premium INTEGER, premium_until TEXT, created_at TEXT, updated_at TEXT)`
- **Gaps:** Lacks `target_exam TEXT DEFAULT 'EGE'` user preference column.

### 3.6 Table `attempts`
- **DB Schema:** `(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, topic_id TEXT, title TEXT, score INTEGER, total INTEGER, percent INTEGER, created_at TEXT)`
- **Critical Gaps:**
  1. Missing `answers_json TEXT`: Standard topic quiz attempts only store summary scores (`score`, `total`, `percent`), losing individual question responses. Users cannot review detailed past test results.
  2. Foreign Key Constraint: `topic_id` lacks `REFERENCES topics(id) ON DELETE SET NULL`.

### 3.7 Table `mock_exams` & `mock_exam_attempts`
- **DB Schema:**
  - `mock_exams`: `(id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json, created_at)`
  - `mock_exam_attempts`: `(id, user_id, mock_exam_id, answers_json, primary_score, max_primary_score, secondary_score, time_spent_seconds, completed_at)`
- **Evaluation:** Structurally intact for mock exam flow.

---

## 4. Performance & Indexing Audit

An audit of all database access in `server/routes/*.js` revealed missing indexes on foreign key and filter columns:

| Table | Column(s) | Query Location | Missing Index | Impact |
|---|---|---|---|---|
| `topics` | `(subject_id, sort_order)` | `routes/catalog.js:23` | `idx_topics_subject_sort` | Table scan on catalog build |
| `questions` | `(topic_id, sort_order)` | `routes/catalog.js:37` | `idx_questions_topic_sort` | Table scan fetching topic questions |
| `attempts` | `(user_id, id DESC)` | `routes/progress.js:11,30` | `idx_attempts_user_id` | Table scan computing user progress stats |
| `mock_exams` | `(subject_id)` | `routes/mock-exam.js:15` | `idx_mock_exams_subject` | Table scan filtering exams by subject |
| `mock_exam_attempts` | `(user_id, id DESC)` | `routes/mock-exam.js:50` | `idx_mock_exam_attempts_user` | Table scan fetching user exam attempts |
| `groups` | `(teacher_id)` | `routes/teacher.js:26` | `idx_groups_teacher` | Table scan loading teacher groups |
| `group_members` | `(student_id)` | `routes/teacher.js:195` | `idx_group_members_student` | Table scan loading student assignments |
| `assignments` | `(group_id)` | `routes/teacher.js:98` | `idx_assignments_group` | Table scan loading group assignments |
| `assignment_submissions` | `(assignment_id, student_id)` | `routes/teacher.js:96,194` | `idx_assignment_submissions_composite` | Table scan checking student submissions |

---

## 5. Recommended Schema Adjustments & Implementation Plan

### 5.1 Proposed DDL Modifications (`server/db.js`)

```sql
-- 1. Upgrade transaction strategy to BEGIN IMMEDIATE
-- (In server/db.js transaction() function)

-- 2. Add missing columns to existing tables
ALTER TABLE subjects ADD COLUMN is_other INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN points INTEGER NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN correct_answer_json TEXT;
ALTER TABLE attempts ADD COLUMN answers_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE videos ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN target_exam TEXT NOT NULL DEFAULT 'EGE';

-- 3. Create missing performance indexes
CREATE INDEX IF NOT EXISTS idx_topics_subject_sort ON topics(subject_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_questions_topic_sort ON questions(topic_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_mock_exams_subject ON mock_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_user ON mock_exam_attempts(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student ON group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group ON assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_composite ON assignment_submissions(assignment_id, student_id);
```

### 5.2 Seeding Enhancement (`server/seed.js`)
- Update `insSubject`, `insTopic`, `insVideo`, `insQuestion`, and `insMockExam` statements in `server/seed.js` to use `INSERT INTO ... ON CONFLICT(id) DO UPDATE SET ...` to guarantee seamless database synchronization whenever `js/data.js` is updated.
- Seed `otherSubjects` dynamically into the `subjects` table.

---

## 6. Verification Method

To independently verify these findings:
1. Run static verification test suite: `npm run check`
2. Run database integrity test: `npx vitest run tests/unit/data.test.js`
3. Inspect `server/db.js` line-by-line to verify pragmas and table constraints.
