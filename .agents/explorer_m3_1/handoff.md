# Handoff Report — Explorer 1 (Milestone 3: DB Sync & API Integration)

**Date**: 2026-08-02  
**Working Directory**: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\explorer_m3_1`  
**Target Analysis Report**: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\explorer_m3_1\analysis.md`  

---

## 1. Observation

Direct observations from examining the codebase:

1. **`js/data.js` Structure**:
   - Defines `window.EXAM_DATA.subjects` with **10 subjects**: 8 core primary subjects (`biology`, `chemistry`, `physics`, `math`, `russian`, `social`, `informatics`, `history`) + 2 supplementary subjects (`english`, `literature`).
   - The 8 primary subjects contain **4 topics each** (32 topics total).
   - Each primary topic contains **5 questions** (160 questions total).
   - Topics include rich HTML string fields (`theory`), metadata (`isPremium`, `duration`), and an optional embedded `video` object (`youtubeId`, `instructor`, `duration`, `views`, `thumbnail`).

2. **`server/db.js` Schema**:
   - `subjects`: `id TEXT PRIMARY KEY`, `title`, `icon`, `color`, `color_hex`, `bg_gradient`, `is_active`, `sort_order`.
   - `topics`: `id TEXT PRIMARY KEY`, `subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE`, `title`, `is_premium`, `duration`, `theory`, `sort_order`.
   - `videos`: `id TEXT PRIMARY KEY`, `topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE`, `title`, `instructor`, `duration`, `youtube_id`, `views`, `thumbnail`.
   - `questions`: `id TEXT PRIMARY KEY`, `topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE`, `type`, `question`, `options_json`, `correct_index`, `explanation`, `sort_order`.
   - `mock_exams`: `id TEXT PRIMARY KEY`, `subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE`, `title`, `exam_type`, `duration_minutes`, `total_questions`, `is_premium`, `questions_json`, `conversion_table_json`.
   - `mock_exam_attempts`: `id INTEGER PRIMARY KEY`, `user_id INTEGER`, `mock_exam_id TEXT REFERENCES mock_exams(id) ON DELETE CASCADE`.

3. **`server/seed.js` Implementation**:
   - Evaluates `js/data.js` via `vm.runInNewContext`.
   - Lines 15–34: Uses `INSERT OR IGNORE INTO` statements for `subjects`, `topics`, `videos`, `questions`, and `mock_exams`.

---

## 2. Logic Chain

1. **Premise 1**: `INSERT OR IGNORE INTO` in SQLite skips execution if a primary key (`id`) already exists in the table.
2. **Premise 2**: When database `server/database.sqlite` is already created from a previous run, subsequent calls to `seedContent()` (e.g. at server startup) will skip any existing `subjects`, `topics`, `videos`, `questions`, or `mock_exams`.
3. **Inference 1**: Any updates to `theory` text, fixes in `questions`, revisions of `options`, or updates to `video` metadata in `js/data.js` will NOT be reflected in the SQLite database as long as the primary keys match.
4. **Premise 3**: Replacing `INSERT OR IGNORE` with `INSERT OR REPLACE` would execute a `DELETE` followed by `INSERT` in SQLite.
5. **Inference 2**: Because `mock_exam_attempts` references `mock_exams(id)` with `ON DELETE CASCADE`, using `INSERT OR REPLACE INTO mock_exams` would cascade-delete user test attempt data in `mock_exam_attempts`.
6. **Conclusion**: Using SQLite `INSERT INTO ... ON CONFLICT(id) DO UPDATE SET ...` (UPSERT syntax) performs in-place column updates on matching primary keys. It updates changed theories, question texts, explanations, video links, or option arrays without triggering `ON DELETE CASCADE` or deleting user records.

---

## 3. Caveats

* **Deleted Content**: UPSERT updates existing primary keys and inserts new ones, but does not delete primary keys that were completely removed from `js/data.js`. (For ExamHub's fixed catalog structure, this is standard and desirable to preserve historical reference integrity).
* **Option Serialization**: Question `options` array in `js/data.js` must be converted via `JSON.stringify(q.options)` prior to UPSERT binding (already implemented in `server/seed.js`).

---

## 4. Conclusion

`server/seed.js` should be updated to replace `INSERT OR IGNORE INTO` with `INSERT INTO ... ON CONFLICT(id) DO UPDATE SET ...` for `subjects`, `topics`, `videos`, `questions`, and `mock_exams`. This will ensure clean, safe, and immediate synchronization of all 8 core subjects, 32 topics, 160 core questions, theories, videos, and options across database restarts without risk of user data loss.

---

## 5. Verification Method

1. **Source Inspection**: Confirm `server/seed.js` contains `ON CONFLICT(id) DO UPDATE SET` clauses for all content insertion statements.
2. **Execution Test**:
   - Run `node server/seed.js`.
   - Verify table counts using `node -e`:
     - `subjects`: 10 rows
     - `topics`: 34 rows (32 core + 2 supplementary)
     - `questions`: 162 rows (160 core + 2 supplementary)
     - `mock_exams`: 6 rows
3. **Update Propagation Test**: Modify a theory string or question explanation in `js/data.js`, run `node server/seed.js`, and check that the DB record reflects the updated string.
4. **Regression Test**: Run `npm run check` to verify ESLint, unit tests, and Playwright E2E tests pass.
