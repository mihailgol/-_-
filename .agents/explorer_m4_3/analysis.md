# Strategic Test Analysis for Milestone 4 (R4: Mock Exam Mode "Пробники")

## 1. Executive Summary

Milestone 4 introduces Mock Exam Mode ("Пробники") into ExamHub. This component includes backend scoring utilities (`server/utils/score-converter.js`), mock exam REST API endpoints (`server/routes/mock-exam.js`), and frontend SPA views for selecting, playing, timing, and reviewing mock exam results (`js/modules/mock-exam.js`, `index.html`).

This document formulates the comprehensive testing strategy, unit test suite specifications, E2E test suite specifications, and project validator compliance rules for Milestone 4.

---

## 2. Test Architecture & Validation Framework Overview

### 2.1 Quality Gate (`npm run check`)
The project Quality Gate consists of four sequential execution steps:
1. **ESLint (`npm run lint`)**: ESLint v10 enforcing strict syntax and project linting rules.
2. **Project Validator (`npm run build`)**: Executes `scripts/validate-project.mjs`.
   - Validates all local asset references in `index.html`.
   - Performs `--check` syntax verification on all runtime JS files under `js/` (excluding vendored `lucide.min.js`).
   - Evaluates `js/data.js` structure in a new VM context (`vm.runInNewContext`).
3. **Unit Tests (`npm run test`)**: Vitest v4 configured in `vitest.config.mjs` with `environment: "jsdom"`, matching `tests/unit/**/*.test.{js,mjs}`.
4. **E2E Tests (`npm run test:e2e`)**: Playwright v1.62 configured in `playwright.config.js` running on Chromium at `http://localhost:8000`.

---

## 3. Unit Test Strategy (`tests/unit/mock_exam.test.mjs`)

Unit tests will be created in `tests/unit/mock_exam.test.mjs` (or split into `tests/unit/score_converter.test.js` and `tests/unit/mock_exam.test.mjs`).

### 3.1 Score Converter (`server/utils/score-converter.js`) Unit Tests
`score-converter.js` converts primary exam scores (первичные баллы) into secondary scores (100-балльная шкала для ЕГЭ / оценки 2-5 для ОГЭ).

**Test Specifications:**
1. **EGE Conversion Mode (`examType: "EGE"`)**:
   - `0` primary score => `0` secondary score.
   - `maxPrimaryScore` (e.g. 58 for EGE Math/Russian) => `100` secondary score.
   - Intermediate non-linear score mapping verification (e.g. 30 primary points -> expected scale points).
   - Out-of-bounds handling: negative primary score clamped to `0`, score exceeding max primary score clamped to `100`.
   - Edge input handling: null/undefined/string inputs handled gracefully without throwing unhandled exceptions.
2. **OGE Conversion Mode (`examType: "OGE"`)**:
   - Primary score range to 5-point grade mapping:
     - 0 – 9 points => Grade `2` ("неудовлетворительно")
     - 10 – 15 points => Grade `3` ("удовлетворительно")
     - 16 – 22 points => Grade `4` ("хорошо")
     - 23 – 37 points => Grade `5` ("отлично")
   - Also returns 100-point equivalent scale for unified progress tracking.

### 3.2 Mock Exam Backend API Endpoints (`server/routes/mock-exam.js`)
Endpoints to test against Express instance using ephemeral port and database reset hooks (`resetDb()` / `initDb()`):

1. **`GET /api/mock-exams`**:
   - Unauthenticated / Free user request: returns mock exam list where 1st variant per subject has `isLocked: false` and subsequent variants have `isLocked: true`.
   - Premium user request (`is_premium = 1`): returns all variants with `isLocked: false`.
2. **`GET /api/mock-exams/:id`**:
   - Free user requesting allowed variant (e.g., `variant-1`) => returns status `200 OK` with variant metadata (title, subject, durationMinutes, maxPrimaryScore, questions).
   - Free user requesting locked variant (e.g., `variant-2`) => returns status `403 Forbidden` (`{ error: "Доступно только в Premium" }`).
   - Premium user requesting locked variant => returns status `200 OK`.
   - Requesting non-existent variant ID => returns status `404 Not Found`.
3. **`POST /api/mock-exams/:id/submit`**:
   - Unauthenticated submit request => returns status `401 Unauthorized` or handles allowed guest submission.
   - Authenticated user submitting answers `{ answers: { q1: 0, q2: 1, ... }, durationSpentSeconds: 3600 }`:
     - Calculates correct primary score based on correct options.
     - Invokes `score-converter.js` to compute secondary score and grade.
     - Inserts result record into `mock_exam_results` table in SQLite DB.
     - Returns `{ ok: true, primaryScore, maxPrimaryScore, secondaryScore, grade, detailedResults: [...] }`.
   - Submitting to invalid variant ID => returns status `404 Not Found`.

---

## 4. E2E Test Strategy (`tests/e2e/smoke.spec.js`)

New E2E test cases added directly to `tests/e2e/smoke.spec.js` to cover full user journey for Mock Exam mode.

### 4.1 Test Scenarios
1. **Mock Exam Catalog & Navigation**:
   - Navigate to `#view-mock-exam` via sidebar item `[data-view="mock-exam"]` or button on `#view-tests`.
   - Assert `#view-mock-exam` is visible.
   - Check presence of mock exam variant cards, duration badges (e.g. `235 мин` / `210 мин`), and Free/Premium indicators.

2. **Starting Exam & Countdown Timer**:
   - Click `#mockStartBtn-math-1` to open the mock exam player.
   - Assert `#view-mock-player` is visible.
   - Verify `#mockTimerDisplay` displays initial formatted duration (e.g., `03:55:00`).
   - Verify timer ticks down properly.

3. **Answering Questions & Submitting**:
   - Select option buttons in `#mockQuestionsGrid`.
   - Click `#mockSubmitBtn` to finalize submission.
   - Confirm submission in modal if modal prompt appears (`#mockConfirmSubmitBtn`).

4. **Results View & Score Breakdown**:
   - Assert view switches to `#view-mock-results` (or `#mockResultsModal` is displayed).
   - Assert `#mockPrimaryScore` text contains primary score (e.g., `X из Y первичных баллов`).
   - Assert `#mockSecondaryScore` displays converted 100-point score.
   - Verify question breakdown list displays correct vs incorrect tags.

---

## 5. Strict Code Quality & Constraint Rules

To prevent quality gate failure or rule violations, all tests must satisfy:

1. **No Code Comments**: ❌ Absolute prohibition on `//` or `/* */` comments anywhere in code files.
2. **Native ES Modules**: `"type": "module"` in `package.json`, standard `import`/`export` syntax with explicit `.js`/`.mjs` extensions.
3. **No Bundlers**: Direct browser ES-module loading via `<script type="module">`.
4. **Exact Locators in E2E**:
   - Primary: `#id` (e.g., `#view-mock-exam`, `#mockTimerDisplay`, `#mockSubmitBtn`).
   - Secondary: `[data-view]` (e.g., `[data-view="mock-exam"]`).
   - Tertiary: `[data-action]` or `[data-variant-id]`.
   - Classes only as last resort.
5. **Idempotent E2E Auth**: Unique email per test execution (`mockuser${Date.now()}@example.ru`).

---

## 6. Implementation Action Plan

| Component | Target File | Description |
|---|---|---|
| Score Converter Unit Tests | `tests/unit/mock_exam.test.mjs` | Tests for EGE/OGE primary-to-secondary score conversion & edge cases |
| Backend Endpoint Unit Tests | `tests/unit/mock_exam.test.mjs` | Tests for GET /api/mock-exams, GET /api/mock-exams/:id, POST submit, and access control |
| E2E Smoke Tests | `tests/e2e/smoke.spec.js` | Full UI test flow: navigation -> timer -> answering -> submission -> score display |
| Project Validator | `scripts/validate-project.mjs` | Run `npm run build` to ensure all asset refs and JS syntax validate |
