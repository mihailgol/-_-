# Analysis: Backend Architecture, Score Conversion & API Design for Milestone 4 (Mock Exam Mode)

## Executive Summary
This analysis outlines the complete backend architecture for Requirement **R4: Mock Exam Mode ("Пробники")** of Milestone 4. It defines:
1. SQLite database extensions (`mock_exams` and `mock_exam_attempts` tables, seed integration).
2. Primary-to-secondary score conversion algorithm (`server/utils/score-converter.js`) supporting 100-point scale for EGE (e.g., 58 primary -> 100 secondary) and 2-5 grade scale for OGE (e.g., 37 primary -> 100 secondary / grade 5).
3. Complete REST API endpoints (`server/routes/mock-exam.js`) including variant listing, sanitized exam delivery, answer submission/evaluation, and user attempt history.
4. Robust Free vs Premium access control matrix ensuring Free users access 1 variant per subject while Premium users access the full variant bank.

---

## 1. Existing Backend Codebase Investigation

### 1.1 Server Architecture & DB Setup
- **Entry point**: `server/index.js` mounts routes at `/api/auth`, `/api/catalog`, `/api/progress`, `/api/premium`, `/api/ai`. Router middleware is registered via `app.use()`.
- **Database (`server/db.js`)**: Uses `node:sqlite` (`DatabaseSync`) with `WAL` journal mode and foreign keys enabled.
- **Seeding (`server/seed.js`)**: `seedContent()` executes `js/data.js` via `node:vm` sandbox inside a SQLite transaction (`transaction(fn)`).

### 1.2 Database Schema Extensions Needed
To support Mock Exams, `server/db.js` must be updated to create two new tables in `initSchema()`:

```sql
CREATE TABLE IF NOT EXISTS mock_exams (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL DEFAULT 'EGE', -- 'EGE' | 'OGE'
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 235,
  max_primary_score INTEGER NOT NULL DEFAULT 58,
  is_premium INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  questions_json TEXT NOT NULL,
  conversion_table_json TEXT
);

CREATE TABLE IF NOT EXISTS mock_exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mock_exam_id TEXT NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  primary_score INTEGER NOT NULL,
  max_primary_score INTEGER NOT NULL,
  secondary_score INTEGER NOT NULL,
  grade INTEGER, -- 2, 3, 4, 5 for OGE
  time_spent_seconds INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_subject ON mock_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_attempts_user ON mock_exam_attempts(user_id);
```

Also, update `resetDb()` in `server/db.js` to include:
```sql
DROP TABLE IF EXISTS mock_exam_attempts;
DROP TABLE IF EXISTS mock_exams;
```

### 1.3 Seeding Mock Exams (`server/seed.js` & `js/data.js`)
Extend `EXAM_DATA` in `js/data.js` to include a `mockExams` array (or `mockExams` on each subject object).
`server/seed.js` will iterate over `EXAM_DATA.mockExams` (or `subject.mockExams`) and execute:
```sql
INSERT OR IGNORE INTO mock_exams (
  id, subject_id, exam_type, title, description, duration_minutes,
  max_primary_score, is_premium, sort_order, questions_json, conversion_table_json
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

---

## 2. Design for `server/utils/score-converter.js`

### 2.1 Overview & Requirements
- **EGE (ЕГЭ)**: Converts primary score ($P$) out of $P_{max}$ (e.g., 58 primary) into secondary score ($S$) on a 100-point scale.
- **OGE (ОГЭ)**: Converts primary score ($P$) out of $P_{max}$ (e.g., 37 primary) into a 100-point equivalent scale AND a 5-point grade ($2, 3, 4, 5$).

### 2.2 Algorithm & Code Design
```js
export function convertPrimaryToSecondary(primaryScore, maxPrimaryScore, examType = "EGE", customTable = null) {
  const p = Math.max(0, Number(primaryScore) || 0);
  const maxP = Math.max(1, Number(maxPrimaryScore) || 1);

  if (p <= 0) return 0;
  if (p >= maxP) return 100;

  // 1. Custom table lookup if provided (as object or JSON string)
  let tableObj = customTable;
  if (typeof customTable === "string") {
    try {
      tableObj = JSON.parse(customTable);
    } catch {
      tableObj = null;
    }
  }

  if (tableObj && tableObj[p] !== undefined && tableObj[p] !== null) {
    return Math.min(100, Math.max(0, Number(tableObj[p])));
  }

  // 2. Non-linear piece-wise algorithm for EGE vs linear for OGE
  const ratio = p / maxP;

  if (examType === "OGE") {
    return Math.round(ratio * 100);
  }

  // EGE non-linear S-curve piecewise model:
  // Low threshold zone (0..30% max points -> 0..27 secondary pts)
  // Mid zone (30%..70% max points -> 28..77 secondary pts)
  // High zone (70%..100% max points -> 78..100 secondary pts)
  let secondary = 0;
  if (ratio <= 0.30) {
    secondary = ratio * 90;
  } else if (ratio <= 0.70) {
    secondary = 27 + ((ratio - 0.30) / 0.40) * 50;
  } else {
    secondary = 77 + ((ratio - 0.70) / 0.30) * 23;
  }

  return Math.min(100, Math.max(0, Math.round(secondary)));
}

export function calculateOgeGrade(primaryScore, maxPrimaryScore, customGradeTable = null) {
  const p = Math.max(0, Number(primaryScore) || 0);
  const maxP = Math.max(1, Number(maxPrimaryScore) || 1);

  if (customGradeTable && typeof customGradeTable === "object") {
    for (const [gradeStr, range] of Object.entries(customGradeTable)) {
      if (Array.isArray(range) && p >= range[0] && p <= range[1]) {
        return Number(gradeStr);
      }
    }
  }

  const ratio = p / maxP;
  if (ratio < 0.25) return 2;
  if (ratio < 0.45) return 3;
  if (ratio < 0.70) return 4;
  return 5;
}

export function getScoreSummary(primaryScore, maxPrimaryScore, examType = "EGE", customTable = null) {
  const secondaryScore = convertPrimaryToSecondary(primaryScore, maxPrimaryScore, examType, customTable);
  const grade = examType === "OGE" ? calculateOgeGrade(primaryScore, maxPrimaryScore) : null;
  const percentage = Math.round((Math.max(0, Number(primaryScore) || 0) / Math.max(1, Number(maxPrimaryScore) || 1)) * 100);

  return {
    primaryScore: Number(primaryScore) || 0,
    maxPrimaryScore: Number(maxPrimaryScore) || 1,
    secondaryScore,
    grade,
    percentage
  };
}
```

---

## 3. Design for `server/routes/mock-exam.js`

### 3.1 Route Endpoints Summary
1. `GET /api/mock-exams` — Returns available mock exam list metadata with `isLocked` flag based on user status.
2. `GET /api/mock-exams/:id` — Returns sanitized variant details & questions (omitting answer leaks). Returns `403 Forbidden` if premium variant requested by free user.
3. `POST /api/mock-exams/:id/submit` — Evaluates user answers, converts scores, records attempt in DB (for logged-in users), returns detailed result breakdown. Returns `403 Forbidden` for locked variants.
4. `GET /api/mock-exams/attempts` — Returns authenticated user's mock exam attempt history.

### 3.2 Implementation Design for `server/routes/mock-exam.js`
```js
import { Router } from "express";
import { db } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { convertPrimaryToSecondary, calculateOgeGrade } from "../utils/score-converter.js";

const router = Router();

// GET /api/mock-exams
router.get("/", optionalAuth, (req, res) => {
  const { subjectId, examType } = req.query || {};
  const isUserPremium = Boolean(req.user?.isPremium);

  let query = "SELECT id, subject_id, exam_type, title, description, duration_minutes, max_primary_score, is_premium, sort_order, questions_json FROM mock_exams WHERE 1=1";
  const params = [];

  if (subjectId) {
    query += " AND subject_id = ?";
    params.push(subjectId);
  }
  if (examType) {
    query += " AND exam_type = ?";
    params.push(examType);
  }
  query += " ORDER BY sort_order, id";

  const rows = db.prepare(query).all(...params);

  const mockExams = rows.map((row) => {
    let questionCount = 0;
    try {
      const qArr = JSON.parse(row.questions_json);
      questionCount = Array.isArray(qArr) ? qArr.length : 0;
    } catch {
      questionCount = 0;
    }

    const isPremium = Boolean(row.is_premium);
    const isLocked = isPremium && !isUserPremium;

    return {
      id: row.id,
      subjectId: row.subject_id,
      examType: row.exam_type,
      title: row.title,
      description: row.description,
      durationMinutes: row.duration_minutes,
      maxPrimaryScore: row.max_primary_score,
      isPremium,
      isLocked,
      questionCount
    };
  });

  res.json({ mockExams });
});

// GET /api/mock-exams/attempts (Must be registered BEFORE /:id)
router.get("/attempts", requireAuth, (req, res) => {
  const attempts = db.prepare(`
    SELECT mea.id, mea.mock_exam_id, mea.primary_score, mea.max_primary_score,
           mea.secondary_score, mea.grade, mea.time_spent_seconds, mea.created_at,
           me.title, me.subject_id, me.exam_type
    FROM mock_exam_attempts mea
    JOIN mock_exams me ON me.id = mea.mock_exam_id
    WHERE mea.user_id = ?
    ORDER BY mea.id DESC
    LIMIT 100
  `).all(req.user.id);

  res.json({ attempts });
});

// GET /api/mock-exams/:id
router.get("/:id", optionalAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM mock_exams WHERE id = ?").get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: "Пробный вариант не найден" });
  }

  const isPremium = Boolean(row.is_premium);
  const isUserPremium = Boolean(req.user?.isPremium);

  if (isPremium && !isUserPremium) {
    return res.status(403).json({
      error: "Этот вариант доступен только по подписке Premium",
      code: "PREMIUM_REQUIRED"
    });
  }

  let questions = [];
  try {
    questions = JSON.parse(row.questions_json);
  } catch {
    questions = [];
  }

  const sanitizedQuestions = questions.map((q) => ({
    id: q.id,
    type: q.type || "single",
    question: q.question,
    options: q.options || []
  }));

  res.json({
    id: row.id,
    subjectId: row.subject_id,
    examType: row.exam_type,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    maxPrimaryScore: row.max_primary_score,
    isPremium,
    questions: sanitizedQuestions
  });
});

// POST /api/mock-exams/:id/submit
router.post("/:id/submit", optionalAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM mock_exams WHERE id = ?").get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: "Пробный вариант не найден" });
  }

  const isPremium = Boolean(row.is_premium);
  const isUserPremium = Boolean(req.user?.isPremium);

  if (isPremium && !isUserPremium) {
    return res.status(403).json({
      error: "Этот вариант доступен только по подписке Premium",
      code: "PREMIUM_REQUIRED"
    });
  }

  const { answers = {}, timeSpentSeconds = 0 } = req.body || {};

  let questions = [];
  try {
    questions = JSON.parse(row.questions_json);
  } catch {
    questions = [];
  }

  let primaryScore = 0;
  const breakdown = questions.map((q) => {
    const userSelected = answers[q.id];
    const isCorrect = userSelected !== undefined && Number(userSelected) === Number(q.correctIndex);
    if (isCorrect) primaryScore += 1;

    return {
      questionId: q.id,
      question: q.question,
      options: q.options || [],
      userAnswer: userSelected !== undefined ? Number(userSelected) : null,
      correctAnswer: q.correctIndex,
      isCorrect,
      explanation: q.explanation || ""
    };
  });

  const maxPrimaryScore = row.max_primary_score || questions.length;
  const secondaryScore = convertPrimaryToSecondary(
    primaryScore,
    maxPrimaryScore,
    row.exam_type,
    row.conversion_table_json
  );
  const grade = row.exam_type === "OGE" ? calculateOgeGrade(primaryScore, maxPrimaryScore) : null;
  const percentage = Math.round((primaryScore / maxPrimaryScore) * 100);

  let attemptId = null;
  if (req.user) {
    const result = db.prepare(`
      INSERT INTO mock_exam_attempts
      (user_id, mock_exam_id, primary_score, max_primary_score, secondary_score, grade, time_spent_seconds, answers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      row.id,
      primaryScore,
      maxPrimaryScore,
      secondaryScore,
      grade,
      Number(timeSpentSeconds) || 0,
      JSON.stringify(answers)
    );
    attemptId = Number(result.lastInsertRowid);

    // Sync with general attempts table for user stats
    db.prepare(`
      INSERT INTO attempts (user_id, topic_id, title, score, total, percent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, null, `Пробник: ${row.title}`, primaryScore, maxPrimaryScore, percentage);
  }

  res.status(201).json({
    attemptId,
    mockExamId: row.id,
    title: row.title,
    subjectId: row.subject_id,
    examType: row.exam_type,
    primaryScore,
    maxPrimaryScore,
    secondaryScore,
    grade,
    percentage,
    timeSpentSeconds: Number(timeSpentSeconds) || 0,
    createdAt: new Date().toISOString(),
    breakdown
  });
});

export default router;
```

---

## 4. Free vs Premium Access Control Matrix

| Feature / Action | Guest / Free User | Premium User |
|---|---|---|
| **Variant Listing (`GET /api/mock-exams`)** | Returns all variants; Variant 1 per subject has `isLocked: false`, Variants 2+ have `isLocked: true`. | Returns all variants; all variants have `isLocked: false`. |
| **Fetch Free Variant (`GET /api/mock-exams/:freeId`)** | `200 OK` (Questions delivered without correct answers). | `200 OK` (Questions delivered without correct answers). |
| **Fetch Premium Variant (`GET /api/mock-exams/:premiumId`)** | `403 Forbidden` (`code: "PREMIUM_REQUIRED"`). | `200 OK` (Questions delivered without correct answers). |
| **Submit Free Variant (`POST /api/mock-exams/:freeId/submit`)** | `201 Created` (Evaluated & scored). Guest results not saved in `mock_exam_attempts`. | `201 Created` (Evaluated & scored; saved in `mock_exam_attempts`). |
| **Submit Premium Variant (`POST /api/mock-exams/:premiumId/submit`)** | `403 Forbidden` (`code: "PREMIUM_REQUIRED"`). | `201 Created` (Evaluated & scored; saved in `mock_exam_attempts`). |
| **View Past Attempts (`GET /api/mock-exams/attempts`)** | `401 Unauthorized` | `200 OK` (List of user's past attempts). |
