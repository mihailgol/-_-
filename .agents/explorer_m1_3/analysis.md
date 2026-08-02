# Technical Analysis & Architecture Blueprint: Requirements R3, R4, R5

## Executive Summary
This document defines the architectural blueprint and implementation specifications for ExamHub Requirements **R3 (AI Quiz Generator)**, **R4 (Mock Exam Mode - "Пробники")**, and **R5 (Teacher / Tutor Module)**.

The analysis is based on deep inspection of the current ExamHub codebase (`server/db.js`, `server/routes/*`, `js/modules/*`, `index.html`, `DEVELOPMENT_RULES.md`, `.agent/architecture.md`, `PROJECT.md`).

---

## 1. Requirement R3: AI Generator & OpenRouter / DeepSeek Integration

### 1.1 Overview & Goals
- Provide dynamic, AI-powered quiz generation for any specified topic across EGE/OGE subjects.
- Use OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`) with the `deepseek/deepseek-chat` model (or direct DeepSeek API).
- Enforce strict daily usage limits: **3 generations per day for Free users**, **unlimited for Premium users**.
- Support reliable fallback/mock generation if `OPENROUTER_API_KEY` is absent or API call fails.

### 1.2 Database Schema Extension (`server/db.js`)
To track daily AI usage per user reliably:
```sql
CREATE TABLE IF NOT EXISTS ai_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  subject_id TEXT,
  questions_count INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_user_date ON ai_generations(user_id, created_at);
```

### 1.3 Server Route Specification (`server/routes/ai.js`)
- **Endpoint**: `POST /api/ai/generate-quiz`
- **Middleware**: `requireAuth`
- **Rate Limit Enforcement**:
  1. Check `req.user.isPremium`. If `true`, bypass daily limit check.
  2. If `false`, execute SQL query:
     ```sql
     SELECT COUNT(*) AS count FROM ai_generations 
     WHERE user_id = ? AND date(created_at) = date('now')
     ```
  3. If `count >= 3`, return HTTP `429 Too Many Requests`:
     ```json
     {
       "error": "Достигнут суточный лимит генераций для бесплатного тарифа (3/день). Оформите Premium для безлимитного доступа."
     }
     ```
- **Prompt Engineering**:
  System Prompt sent to OpenRouter / DeepSeek:
  ```text
  You are an expert tutor preparing Russian high school students for EGE/OGE state exams.
  Generate exactly {count} multiple-choice quiz questions based on the prompt/topic: "{prompt}".
  Subject context: "{subjectTitle}".
  Format requirements:
  - Respond ONLY with valid JSON (no markdown block wrapper or conversational text).
  - Each question must have:
    - id: string
    - type: "single"
    - question: string (clear, academic EGE/OGE level)
    - options: array of exactly 4 strings
    - correctIndex: integer (0..3)
    - explanation: string (detailed pedagogical breakdown of why the option is correct)
  JSON structure:
  {
    "questions": [
      {
        "id": "q1",
        "type": "single",
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "explanation": "..."
      }
    ]
  }
  ```
- **Fallback / Mock Mechanism**:
  If `process.env.OPENROUTER_API_KEY` is missing or the external fetch fails / times out (abort after 10s), the server logs a warning and returns structured fallback questions matching the user's topic keyword, ensuring 100% uptime and testability.

### 1.4 Frontend Integration (`js/modules/ai.js`)
- Replace simulated steps with real API invocation:
  ```js
  const res = await api("/api/ai/generate-quiz", {
    method: "POST",
    body: JSON.stringify({ prompt, subjectId })
  });
  ```
- Handling 429 limit error: trigger `openModal("premiumModal")` with toast message `"🔒 Лимит превышен. Оформите Premium!"`.
- On success: invoke `startQuiz(res.questions, `AI Тест: ${prompt}`, "tests")`.

---

## 2. Requirement R4: Mock Exam Mode ("Пробники")

### 2.1 Overview & Goals
- Provide full-fledged exam simulation ("Пробные экзамены") for EGE and OGE formats.
- Subject-specific countdown timers: **3.5 hours (210 mins)** for OGE / standard, **3.9 hours (235 mins)** for EGE Math/Physics/Literature.
- Primary-to-Secondary score conversion algorithm (первичные баллы -> 100-балльная шкала).
- Free vs Premium bank access control (`is_premium` flag on mock exam variants).
- Complete results review screen with question breakdown and mistake explanations.

### 2.2 Database Schema Extension (`server/db.js`)
```sql
CREATE TABLE IF NOT EXISTS mock_exams (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL DEFAULT 'EGE', -- 'EGE' | 'OGE'
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 235,
  max_primary_score INTEGER NOT NULL DEFAULT 36,
  is_premium INTEGER NOT NULL DEFAULT 0,
  questions_json TEXT NOT NULL,
  conversion_table_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mock_exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mock_exam_id TEXT NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  primary_score INTEGER NOT NULL,
  max_primary_score INTEGER NOT NULL,
  secondary_score INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.3 Primary-to-Secondary Score Conversion Algorithm (`server/utils/score-converter.js`)
The conversion algorithm uses official Rosobrnadzor scaling tables (100-point scale for EGE, 2-5 grade scale / primary score bounds for OGE).

**Algorithm Structure**:
```js
export function convertPrimaryToSecondary(primaryScore, maxPrimaryScore, conversionTable) {
  // If exact mapping exists in JSON table:
  if (conversionTable && conversionTable[primaryScore] !== undefined) {
    return conversionTable[primaryScore];
  }
  // Linear piecewise fallback formula:
  if (primaryScore <= 0) return 0;
  if (primaryScore >= maxPrimaryScore) return 100;
  
  // Standard non-linear scaling approximation:
  const percent = primaryScore / maxPrimaryScore;
  if (percent < 0.3) {
    return Math.round(percent * 100 * 0.9); // Threshold zone
  } else if (percent < 0.7) {
    return Math.round(27 + (percent - 0.3) * 1.25 * 50); // Mid zone
  } else {
    return Math.round(77 + (percent - 0.7) * 3.33 * 23); // High zone
  }
}
```

### 2.4 Server Routes Specification (`server/routes/mock-exam.js`)
1. `GET /api/mock-exams`: List available mock exams (without full questions content).
2. `GET /api/mock-exams/:id`: Fetch specific mock exam.
   - Gating check: If `exam.is_premium && !req.user?.isPremium`, return `403 Forbidden` (`"Этот вариант доступен только по подписке Premium"`).
3. `POST /api/mock-exams/:id/submit`: Submit student answers.
   - Input: `{ answers: Record<questionId, selectedIdx>, timeSpentSeconds: number }`.
   - Calculate primary score, convert to secondary score using algorithm.
   - Save record into `mock_exam_attempts`.
   - Output:
     ```json
     {
       "attemptId": 42,
       "primaryScore": 28,
       "maxPrimaryScore": 36,
       "secondaryScore": 78,
       "timeSpentSeconds": 11200,
       "percentage": 78,
       "breakdown": [
         { "questionId": "m1_1", "isCorrect": true, "userAnswer": 1, "correctAnswer": 1, "explanation": "..." }
       ]
     }
     ```
4. `GET /api/mock-exams/attempts`: Return user's past mock exam history.

### 2.5 Frontend Module (`js/modules/mock-exam.js`) & UI (`#view-mock-exam`)
- View layout in `index.html`: `#view-mock-exam` containing:
  - Header: Exam Title, Live Timer (`03:55:00`), Progress Bar (`1 / 20`), Finish Exam Button.
  - Question Container: Question Text, Options, Flag for review.
  - Exam Navigation Grid: Quick jump buttons for questions `[1] [2] [3] ... [20]`.
  - Results Modal / Sub-view: Primary vs Secondary score display, radial progress gauge, detailed per-question mistake analysis.
- Countdown Timer Logic:
  - `setInterval(tick, 1000)` updating DOM `#mockExamTimer`.
  - Toast warning when 15 minutes remain.
  - Automatic force submit when time reaches `00:00:00`.

---

## 3. Requirement R5: Teacher / Tutor Module ("Кабинет репетитора")

### 3.1 Overview & Goals
- Provide custom test constructor for teachers/tutors.
- Generate unique assignment token links (e.g. `https://examhub.ru/#homework:tok_123456`).
- Render inline SVG / Data-URL QR codes for easy sharing with students via smartphone scans.
- Teacher dashboard displaying student progress table, completion dates, scores, and question-level analytics.

### 3.2 Database Schema Extension (`server/db.js`)
```sql
CREATE TABLE IF NOT EXISTS teacher_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  questions_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES teacher_tests(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES teacher_assignments(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percent INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.3 QR Code Generation Strategy (`server/routes/teacher.js`)
To avoid third-party external HTTP network calls (complying with CODE_ONLY network restrictions and self-contained zero-dependency design):
- Use a lightweight, pure JavaScript SVG QR code generator helper in `server/utils/qr-generator.js` (or embedding standard matrix generation logic).
- Output format: Data URL (`data:image/svg+xml;utf8,...`) or SVG string returned directly in response payload `{ qrCodeDataUrl: "data:image/svg+xml;utf8,..." }`.
- Rendered in frontend `<img>` tag: `<img src="${assignment.qrCodeDataUrl}" alt="QR-код ДЗ">`.

### 3.4 Server Routes Specification (`server/routes/teacher.js`)
1. `POST /api/teacher/tests`: Save custom test created by teacher (`requireAuth`).
2. `GET /api/teacher/tests`: Fetch teacher's custom test library (`requireAuth`).
3. `POST /api/teacher/assignments`: Create assignment for a test (`requireAuth`).
   - Generates 12-char random alphanumeric token (`tok_...`).
   - Returns `{ token, shareUrl, qrCodeDataUrl, assignmentId }`.
4. `GET /api/teacher/assignments`: List teacher's assignments with total completion counts (`requireAuth`).
5. `GET /api/teacher/assignments/:token`: Public/student endpoint to fetch assignment details and questions by token without teacher auth.
6. `POST /api/teacher/assignments/:token/submit`: Submit homework completion results.
7. `GET /api/teacher/assignments/:id/results`: Teacher dashboard endpoint to get full student results table (`requireAuth`).

### 3.5 Frontend Module (`js/modules/teacher.js`) & UI Views
- Sections in `index.html`:
  - `#view-teacher`: Teacher Dashboard with tabs "Мои ДЗ", "Конструктор тестов", "Успеваемость учеников".
  - `#view-test-constructor`: Interactive test builder with subject selection, question catalog search, manual question creation, and preview.
- Homework URL Routing:
  - Deep link support: `#homework:<token>` restored via `restoreView()` in `navigation.js`.
  - When opened by student, loads assignment content via `GET /api/teacher/assignments/:token` and runs customized quiz player.

---

## 4. Routing & State Integration Architecture

### 4.1 `HASH_VIEWS` Update in `js/modules/state.js`
Update `HASH_VIEWS` array to include top-level views:
```js
export const HASH_VIEWS = [
  "subjects", "notes", "videos", "tests", "plan", 
  "analytics", "admin", "cart", "support", 
  "mock-exam", "teacher"
];
```

### 4.2 Sub-View Router Handling in `js/modules/navigation.js`
Add restore support for new deep links:
```js
if (view === "mock-exam-player" && state.examId) {
  loadMockExamPlayer(state.examId, { replace: true });
  return;
}
if (view === "homework" && state.token) {
  loadHomeworkAssignment(state.token, { replace: true });
  return;
}
```

---

## 5. Verification & Quality Gate Plan

To maintain 100% compliance with `DEVELOPMENT_RULES.md` Quality Gate:
1. **ESLint (`npm run lint`)**: Ensure zero lint errors across new modules and server routes.
2. **Project Validator (`npm run build`)**: Update `scripts/validate-project.mjs` if new view IDs are added to `index.html`.
3. **Unit Tests (`npm run test`)**:
   - Write Vitest tests in `tests/unit/score-converter.test.mjs` testing primary-to-secondary score calculations for all edge cases (0 score, max score, intermediate bounds).
   - Write unit test for QR code generator payload.
4. **E2E Tests (`npm run test:e2e`)**:
   - Update `tests/e2e/smoke.spec.js` to cover navigation to `#view-mock-exam` and `#view-teacher`.
   - Add test case verifying AI rate limit message when 3 generations are completed.
5. **Full Quality Command**:
   ```bash
   npm run check
   ```
