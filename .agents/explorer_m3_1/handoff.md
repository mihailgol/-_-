# Milestone 3 (DB Sync & Seeding Strategy) — Handoff Report

## 1. Observation

1. **File Locations & Roles**:
   - `server/db.js` (lines 15-220): `initSchema()` creates tables (`users`, `sessions`, `subjects`, `topics`, `videos`, `questions`, `attempts`, `payments`, `ai_generations`, `mock_exams`, `mock_exam_attempts`, `groups`, `group_members`, `assignments`, `assignment_submissions`) and 10 FK indexes (`idx_topics_subject_id`, `idx_questions_topic_id`, `idx_videos_topic_id`, `idx_attempts_user_id`, `idx_mock_exams_subject_id`, `idx_mock_exam_attempts_user_id`, `idx_groups_teacher_id`, `idx_group_members_student_id`, `idx_assignments_group_id`, `idx_assignment_submissions_assignment_student`).
   - `server/seed.js` (lines 8-126): `seedContent()` loads `js/data.js` via `node:vm` sandbox (`sandbox.window.EXAM_DATA`), executing UPSERT queries (`INSERT ... ON CONFLICT(...) DO UPDATE SET ...`) inside `transaction(...)`.
   - `server/index.js` (lines 36-39):
     ```javascript
     if (config.isTest) {
       resetDb();
     }
     initDb();
     ```
     `initDb()` calls `initSchema()` and `seedContent()` automatically on server startup.
   - `server/config.js` (line 11-13):
     ```javascript
     dbPath: process.env.DB_PATH || resolve(root, "data", process.env.NODE_ENV === "test" ? "examhub.test.db" : "examhub.db")
     ```

2. **Database Content Counts (Verified via Node.js script)**:
   - `js/data.js`: 8 primary subjects (`biology`, `chemistry`, `russian`, `math`, `social`, `history`, `physics`, `informatics`) with 4 topics each (32 topics) and 20 practice questions each (160 questions), plus 2 secondary subjects (`english`, `literature`, 1 topic & 1 question each). Total: 10 subjects, 34 topics, 34 videos, 162 practice questions.
   - `server/seed.js`: 16 mock exams hardcoded for 8 primary subjects (1 OGE + 1 EGE for each subject).
   - SQLite DB (`data/examhub.db`): Contains 10 subjects, 34 topics, 34 videos, 162 questions, and 16 mock exams.

3. **FK Cascading Behavior on `mock_exams`**:
   - `mock_exam_attempts` table schema in `server/db.js` (line 164):
     `mock_exam_id TEXT NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE`

---

## 2. Logic Chain

1. **Observation 1** shows that `mock_exam_attempts` uses `ON DELETE CASCADE` referencing `mock_exams(id)`.
2. **Observation 1** shows `server/seed.js` uses `UPSERT` (`INSERT ... ON CONFLICT(id) DO UPDATE SET ...`) rather than `DELETE FROM mock_exams;`.
3. If `seed.js` executed `DELETE FROM mock_exams;` (Clean Table Sync), SQLite foreign key cascades would delete all existing user mock exam attempts in `mock_exam_attempts`.
4. Therefore, `UPSERT` (`ON CONFLICT DO UPDATE`) in `server/seed.js` is essential to preserve user attempts and ensure idempotent seeding.
5. **Observation 2** shows that `js/data.js` and `server/seed.js` currently contain 10 subjects, 34 topics, 34 videos, 162 questions, and 16 mock exams, all of which are 100% synchronized into `data/examhub.db` without constraint errors.
6. **Observation 1** shows `initDb()` is called during server startup (`server/index.js`), guaranteeing that schema initialization and UPSERT seeding occur automatically whenever the Express server starts up or tests run.

---

## 3. Caveats

- **Orphaned Record Retention**: UPSERT updates or inserts records but does not remove rows from SQLite if a topic/question ID is removed from `js/data.js`. If a future milestone deprecates/removes topic IDs, an explicit cleanup transaction or soft-delete would be required.
- **Environment DB Paths**: Documentation (`PROJECT.md`) refers to `server/database.sqlite`, whereas runtime configuration (`server/config.js`) defaults to `data/examhub.db` (and `data/examhub.test.db` for tests). All backend code uses `config.dbPath`.

---

## 4. Conclusion

- **DB Schema & Seeding Status**: `server/db.js` and `server/seed.js` are fully aligned and functioning correctly.
- **Seeding Strategy Assessment**: `UPSERT` (`ON CONFLICT DO UPDATE`) is verified as the correct, safe strategy for ExamHub. It guarantees data sync from `js/data.js` without deleting user attempt history.
- **Worker Action Plan**: Worker does not need to rewrite the seeding mechanism or schema structure. Worker should maintain the UPSERT pattern and verify `npm run check` passes.

---

## 5. Verification Method

1. **Unit & E2E Test Suite**:
   ```bash
   npm run check
   ```
   Must pass 100% (ESLint, Vitest unit tests including `tests/unit/m3_verification.test.js`, and Playwright E2E tests).

2. **Standalone Seeding Verification**:
   ```bash
   node server/seed.js
   ```
   Must output `Database seeded successfully.` without throwing `UNIQUE constraint failed` or `FOREIGN KEY constraint failed`.

3. **Database Row Count Inspection**:
   ```bash
   node -e "import('./server/db.js').then(({db}) => { console.log('Subjects:', db.prepare('SELECT count(*) as c FROM subjects').get()); console.log('Topics:', db.prepare('SELECT count(*) as c FROM topics').get()); console.log('Questions:', db.prepare('SELECT count(*) as c FROM questions').get()); console.log('MockExams:', db.prepare('SELECT count(*) as c FROM mock_exams').get()); });"
   ```
   Expected output: `Subjects: { c: 10 }`, `Topics: { c: 34 }`, `Questions: { c: 162 }`, `MockExams: { c: 16 }`.
