# API Integration & Database Investigation Strategy Report (Milestone 3)

**Agent Role**: `explorer_m3_2` (API Integration Strategy Explorer)  
**Target System**: ExamHub (`server/routes/catalog.js`, `server/routes/mock-exam.js`, `server/db.js`, `server/seed.js`, `js/data.js`)  
**Date**: 2026-08-03  
**Status**: Investigation Complete — Step-by-Step Implementation Strategy Ready for Worker  

---

## 1. Executive Summary

An in-depth investigation was conducted into the ExamHub backend API routes (`/api/catalog/subjects`, `/api/mock-exams`), database schema (`server/db.js`), data seeding routines (`server/seed.js`), and frontend consumer modules (`js/app.js`, `js/modules/catalog.js`, `js/modules/mock-exam.js`).

### Key Discoveries:
1. **Missing Catalog Subject Detail Endpoint (`GET /api/catalog/subjects/:id`)**:
   - `server/routes/catalog.js` currently only implements `GET /api/catalog/subjects`.
   - Requests to `GET /api/catalog/subjects/:id` (e.g. `/api/catalog/subjects/math`) fail with a 404 fallback error. Adding this endpoint is required for targeted single-subject API queries.
2. **Missing `examType` Query Filtering in `GET /api/mock-exams`**:
   - `server/routes/mock-exam.js` only parses `req.query.subjectId` and ignores `examType` or `exam_type` query parameters.
   - Requirement R2 and Feature #10 dictate that backend endpoints serve content correctly filtered by exam type (ЕГЭ / ОГЭ). Filtering must be performed directly in SQLite SQL queries (`WHERE exam_type = ?`).
3. **Data Serialization & Robustness Deficiencies**:
   - `buildCatalog` in `server/routes/catalog.js` calls `JSON.parse(q.options_json)` without a `try/catch` block. Corrupted JSON in a single row would result in an unhandled server error (500).
   - Question objects returned by `buildCatalog` omit `points` and `correctAnswer` (from `correct_answer_json` in DB).
4. **Database & Seeding Sync Status**:
   - Database schema contains all required tables and indexes (`idx_topics_subject_id`, `idx_mock_exams_subject_id`, etc.).
   - `server/seed.js` correctly seeds all 8 active subjects (Math, Russian, Social Studies, Biology, Chemistry, Physics, Informatics, History) and 12 mock exams (ЕГЭ and ОГЭ variants).

---

## 2. Evidence Chain & Code Audit Findings

### 2.1 Audit of `server/routes/catalog.js`

**File Location**: `server/routes/catalog.js` (80 lines)

```javascript
// Current implementation lines 75-77:
router.get("/subjects", optionalAuth, (req, res) => {
  res.json(buildCatalog(req.user));
});
```

#### Observations:
- **Observation 1.1**: Lines 75-77 contain only the `/subjects` route. Route `/subjects/:id` is completely missing.
- **Observation 1.2**: Lines 63 in `buildCatalog`:
  ```javascript
  options: JSON.parse(q.options_json),
  ```
  Lacks `try/catch`.
- **Observation 1.3**: Questions returned in `buildCatalog` lines 59-66:
  ```javascript
  questionRows.map((q) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: JSON.parse(q.options_json),
    correctIndex: q.correct_index,
    explanation: q.explanation,
  }))
  ```
  Does not include `points` (from column `q.points`) or `correctAnswer` (from column `q.correct_answer_json`).

### 2.2 Audit of `server/routes/mock-exam.js`

**File Location**: `server/routes/mock-exam.js` (191 lines)

```javascript
// Current implementation lines 8-25:
router.get("/", optionalAuth, (req, res) => {
  const { subjectId } = req.query;
  let rows;
  if (subjectId) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE subject_id = ? ORDER BY id ASC`
      )
      .all(String(subjectId));
  } else {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams ORDER BY id ASC`
      )
      .all();
  }
  ...
```

#### Observations:
- **Observation 2.1**: `req.query` only destructures `{ subjectId }`. Any parameter such as `examType` or `exam_type` passed in HTTP GET requests (e.g. `GET /api/mock-exams?examType=EGE`) is ignored by the SQL query.
- **Observation 2.2**: Premium restriction and question sanitization in `GET /api/mock-exams/:id` (lines 58-97) and submission evaluation in `POST /api/mock-exams/:id/submit` (lines 99-188) function correctly and securely:
  - `GET /api/mock-exams/:id` strips `correctIndex` and `explanation` from response questions to prevent cheating.
  - `POST /api/mock-exams/:id/submit` evaluates score using `convertScore()`, records attempt for logged-in users, and returns explanation breakdown.

---

## 3. Detailed Data & Schema Verification

| Component | Source File / Table | Verification Result | Details |
|---|---|---|---|
| Active Subjects | `subjects` table / `js/data.js` | ✅ Synchronized | 8 subjects active (`math`, `russian`, `social`, `biology`, `chemistry`, `physics`, `informatics`, `history`), plus 2 non-seeded (`english`, `literature`) in `otherSubjects`. |
| Topics & Theory | `topics` table | ✅ Synchronized | Topics contain deep HTML theory notes, formula tables, and info boxes. |
| Questions | `questions` table | ✅ Synchronized | Questions contain options, correctIndex, explanations, points, and optional correct_answer_json. |
| Mock Exams | `mock_exams` table | ✅ Synchronized | 12 total mock exams seeded: 1 OGE + 1 EGE Premium per expanded subject. |
| Database Indexes | `sqlite_master` | ✅ Verified | Performance indexes `idx_topics_subject_id`, `idx_mock_exams_subject_id`, `idx_questions_topic_id` exist. |

---

## 4. Concrete Implementation Strategy for Worker

The Worker agent must execute the following step-by-step changes:

### Task 1: Update `server/routes/catalog.js`

1. **Refactor helper function `buildSubjectDetail(subjectId, user)`**:
   Create a reusable helper to extract subject detail for a specific subject ID.
2. **Add `GET /api/catalog/subjects/:id` Endpoint**:
   ```javascript
   router.get("/subjects/:id", optionalAuth, (req, res) => {
     const subject = buildSubjectDetail(req.params.id, req.user);
     if (!subject) {
       return res.status(404).json({ error: "Предмет не найден" });
     }
     res.json({ subject });
   });
   ```
3. **Harden JSON parsing and question field mapping**:
   Safely parse `options_json` with `try/catch` and add `points` / `correctAnswer` properties.

#### Proposed Code Structure for `server/routes/catalog.js`:

```javascript
import { Router } from "express";
import { db } from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

const OTHER_SUBJECTS = [
  { id: "russian", title: "Русский язык", icon: "Aa" },
  { id: "math", title: "Математика", icon: "√x" },
  { id: "social", title: "Обществознание", icon: "👥" },
  { id: "history", title: "История", icon: "🏛️" },
  { id: "physics", title: "Физика", icon: "⚛️" },
  { id: "informatics", title: "Информатика", icon: "💻" },
  { id: "english", title: "Английский язык", icon: "EN" },
  { id: "literature", title: "Литература", icon: "📖" },
  { id: "geography", title: "География", icon: "🌍" },
];

function formatTopic(t, user) {
  const isPremium = !!t.is_premium;
  const locked = isPremium && !user?.isPremium;

  const videoRow = db.prepare("SELECT * FROM videos WHERE topic_id = ?").get(t.id);
  const questionRows = db.prepare("SELECT * FROM questions WHERE topic_id = ? ORDER BY sort_order").all(t.id);

  return {
    id: t.id,
    title: t.title,
    isPremium,
    duration: t.duration,
    theory: locked ? null : t.theory,
    video: videoRow
      ? {
          title: videoRow.title,
          instructor: videoRow.instructor,
          duration: videoRow.duration,
          youtubeId: videoRow.youtube_id,
          views: videoRow.views,
          thumbnail: videoRow.thumbnail,
        }
      : undefined,
    questions: locked
      ? undefined
      : questionRows.map((q) => {
          let options = [];
          try {
            options = JSON.parse(q.options_json);
          } catch {
            options = [];
          }

          let correctAnswer = undefined;
          if (q.correct_answer_json) {
            try {
              correctAnswer = JSON.parse(q.correct_answer_json);
            } catch {
              correctAnswer = undefined;
            }
          }

          return {
            id: q.id,
            type: q.type,
            question: q.question,
            options,
            correctIndex: q.correct_index,
            explanation: q.explanation,
            points: q.points || 1,
            ...(correctAnswer !== undefined ? { correctAnswer } : {}),
          };
        }),
  };
}

function formatSubject(sub, user) {
  const topics = db.prepare("SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order").all(sub.id);
  return {
    id: sub.id,
    title: sub.title,
    icon: sub.icon,
    color: sub.color,
    colorHex: sub.color_hex,
    bgGradient: sub.bg_gradient,
    topics: topics.map((t) => formatTopic(t, user)),
  };
}

function buildCatalog(user) {
  const rows = db.prepare("SELECT * FROM subjects WHERE is_active = 1 ORDER BY sort_order").all();
  const activeSubjectIds = new Set(rows.map((sub) => sub.id));
  const otherSubjects = OTHER_SUBJECTS.filter((sub) => !activeSubjectIds.has(sub.id));

  const subjects = rows.map((sub) => formatSubject(sub, user));

  return { subjects, otherSubjects };
}

router.get("/subjects", optionalAuth, (req, res) => {
  res.json(buildCatalog(req.user));
});

router.get("/subjects/:id", optionalAuth, (req, res) => {
  const sub = db.prepare("SELECT * FROM subjects WHERE id = ? AND is_active = 1").get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: "Предмет не найден" });
  }
  res.json({ subject: formatSubject(sub, req.user) });
});

export default router;
```

---

### Task 2: Update `server/routes/mock-exam.js`

Enhance `GET /api/mock-exams` to support filtering by both `subjectId` and `examType` (or `exam_type`):

```javascript
router.get("/", optionalAuth, (req, res) => {
  const { subjectId, examType, exam_type } = req.query;
  const rawExamType = String(examType || exam_type || "").toUpperCase();
  const targetExamType = ["EGE", "OGE"].includes(rawExamType) ? rawExamType : null;

  let rows;
  if (subjectId && targetExamType) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE subject_id = ? AND exam_type = ? ORDER BY id ASC`
      )
      .all(String(subjectId), targetExamType);
  } else if (subjectId) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE subject_id = ? ORDER BY id ASC`
      )
      .all(String(subjectId));
  } else if (targetExamType) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE exam_type = ? ORDER BY id ASC`
      )
      .all(targetExamType);
  } else {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams ORDER BY id ASC`
      )
      .all();
  }

  const isUserPremium = Boolean(req.user && req.user.isPremium);

  const mockExams = rows.map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    title: r.title,
    examType: r.exam_type,
    durationMinutes: r.duration_minutes,
    totalQuestions: r.total_questions,
    isPremium: Boolean(r.is_premium),
    isLocked: Boolean(r.is_premium) && !isUserPremium,
    createdAt: r.created_at,
  }));

  res.json({ mockExams });
});
```

---

### Task 3: Add API Integration Unit Tests

Create `tests/unit/api_catalog_mock.test.js` to verify endpoint functionality:

1. **Test `GET /api/catalog/subjects`**: Returns catalog containing `subjects` and `otherSubjects`.
2. **Test `GET /api/catalog/subjects/math`**: Returns 200 with `{ subject }` details for math.
3. **Test `GET /api/catalog/subjects/invalid_id`**: Returns 404 `{ error: "Предмет не найден" }`.
4. **Test `GET /api/mock-exams?examType=OGE`**: Returns only mock exams with `examType: "OGE"`.
5. **Test `GET /api/mock-exams?examType=EGE`**: Returns only mock exams with `examType: "EGE"`.
6. **Test `GET /api/mock-exams?subjectId=biology&examType=OGE`**: Returns only biology OGE mock exams.

---

## 5. Verification Method for Quality Assurance

1. **Run Unit Tests**:
   ```bash
   npx vitest run tests/unit/api_catalog_mock.test.js
   ```
2. **Run Full Verification Pipeline**:
   ```bash
   npm run check
   ```
   Must pass ESLint, project validator, Vitest unit tests, and Playwright E2E tests cleanly with zero errors.

---

## 6. Caveats & Assumptions

- No changes are needed in `js/data.js` frontend seed structure, as it already matches the DB seeding contract.
- Client-side filtering in `js/modules/mock-exam.js` remains fully functional and will benefit seamlessly from backend filtering parameters when provided.
