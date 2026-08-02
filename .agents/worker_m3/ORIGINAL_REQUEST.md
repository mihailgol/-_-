## 2026-08-02T19:15:20Z
<USER_REQUEST>
You are the Implementer (Worker) for Milestone 3 (DB Sync & API Integration).
Your working directory is: c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m3
Target project root: c:\Users\мишка\Desktop\сайтик_бахчасарай

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Explorer Findings:
The 3 Explorers identified the following requirements for Milestone 3:
1. `server/seed.js`: `INSERT OR IGNORE INTO` skips updating existing SQLite records when `js/data.js` changes. Naive `INSERT OR REPLACE` triggers SQLite `ON DELETE CASCADE` which erases user test attempts. Update `server/seed.js` to use SQLite `UPSERT` syntax (`INSERT INTO ... ON CONFLICT(id) DO UPDATE SET ...`) for `subjects`, `topics`, `videos`, `questions`, and `mock_exams`.
2. `server/db.js`:
   - Change `transaction(fn)` helper from `BEGIN` to `BEGIN IMMEDIATE` to prevent concurrency lock escalation.
   - Add missing columns safely (using `ALTER TABLE ... ADD COLUMN ...` or conditional checks if column doesn't exist): `questions` (`points` INTEGER DEFAULT 1, `correct_answer_json` TEXT), `attempts` (`answers_json` TEXT), `videos` (`description` TEXT DEFAULT ''), `subjects` (`is_other` INTEGER DEFAULT 0), `users` (`target_exam` TEXT DEFAULT 'EGE' and `exam_type` TEXT DEFAULT 'EGE').
   - Add performance indexes on FK columns (`topics.subject_id`, `questions.topic_id`, `videos.topic_id`, `attempts.user_id`, `mock_exams.subject_id`, `mock_exam_attempts.user_id`, `groups.teacher_id`, `group_members.student_id`, `assignments.group_id`, `assignment_submissions(assignment_id, student_id)`).
3. `server/routes/catalog.js`:
   - `OTHER_SUBJECTS` array hardcodes subjects (`russian`, `math`, `social`, etc.) that are already active in SQLite `subjects`, causing duplicate cards on the frontend. Fix `server/routes/catalog.js` so it excludes active DB subjects from `OTHER_SUBJECTS` or seeds `otherSubjects` cleanly.
   - Verify `/api/catalog/subjects` payload structure matches SPA expectations.

Instructions:
1. Update `server/db.js` with transaction isolation, missing columns migration, and performance indexes.
2. Update `server/seed.js` with UPSERT statements for all entities.
3. Update `server/routes/catalog.js` to deduplicate subject cards.
4. Execute `node server/seed.js` to populate `server/database.sqlite`.
5. Execute build & test commands (`npm run lint`, `npm run test`) and verify all tests pass.
6. Write a summary of your changes to `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m3\handoff.md` including exact build/test results, and send a message back to the orchestrator.
</USER_REQUEST>
