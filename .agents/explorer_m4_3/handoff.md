# Handoff Report: Milestone 4 Testing Strategy (R4: Mock Exam Mode "Пробники")

## 1. Observation
- Executed `npm run check` (runs ESLint, project validator `scripts/validate-project.mjs`, Vitest unit tests in `tests/unit/*.test.{js,mjs}`, and Playwright E2E tests in `tests/e2e/smoke.spec.js`).
- Inspected project setup in `package.json`, `vitest.config.mjs`, `playwright.config.js`, `scripts/validate-project.mjs`, `AGENTS.md`, and `DEVELOPMENT_RULES.md`.
- Confirmed project uses Node.js with `"type": "module"`, vanilla ES modules on frontend, and SQLite backend with Express.
- Vitest unit test environment uses `jsdom` (`vitest.config.mjs:5`), file parallelism disabled (`vitest.config.mjs:7`), and includes `tests/unit/**/*.test.{js,mjs}` (`vitest.config.mjs:6`).
- Playwright E2E test runner launches webServer `node server/index.js` on port 8000 with `NODE_ENV=test` (`playwright.config.js:21-30`).
- Rules in `AGENTS.md` and `DEVELOPMENT_RULES.md` strictly require:
  - ❌ **No comments in code** without explicit request.
  - ❌ **No frontend framework or bundler**.
  - ✅ **Exact E2E locators**: Priority `#id` > `[data-view]` > classes.
  - ✅ **Russian UI / English code identifiers**.

## 2. Logic Chain
1. Milestone 4 introduces Mock Exam Mode ("Пробники"), consisting of `server/utils/score-converter.js`, backend routes `server/routes/mock-exam.js`, and frontend view controller `js/modules/mock-exam.js` with timer countdown.
2. To ensure full quality gate compliance, test coverage must be added across both Vitest unit tests and Playwright E2E tests.
3. For unit tests (`tests/unit/mock_exam.test.mjs`), test cases must cover:
   - `score-converter.js`: EGE 100-point non-linear scale conversion, OGE primary score to grade (2, 3, 4, 5) conversion, 0-score, max-score, clamp handling for negative/excess scores, and invalid inputs.
   - Backend endpoints: `GET /api/mock-exams` (free vs premium lock status), `GET /api/mock-exams/:id` (403 for locked variants, 200 for allowed), `POST /api/mock-exams/:id/submit` (primary point calculation, secondary score conversion, DB persistence in `mock_exam_results`, response payload).
4. For E2E tests (`tests/e2e/smoke.spec.js`), test cases must cover:
   - Navigation to Mock Exam view `#view-mock-exam`.
   - Selecting a variant and launching `#view-mock-player`.
   - Display and ticking of `#mockTimerDisplay`.
   - Option selection and submitting via `#mockSubmitBtn`.
   - Score & results display in `#view-mock-results` (primary score `#mockPrimaryScore`, secondary 100-point score / grade `#mockSecondaryScore`, and question breakdown).
5. All test files must strictly adhere to the no-comment rule, ESM syntax, exact locators, and pass `npm run check`.

## 3. Caveats
- `server/utils/score-converter.js`, `server/routes/mock-exam.js`, and `js/modules/mock-exam.js` are currently being designed/implemented by Explorer 1 and Explorer 2, so exact function exports and route paths should be kept aligned during implementer phase.
- E2E tests for timer warning toasts (15 min / 5 min warnings) depend on timer trigger methods or simulated clock acceleration if required by detailed requirements.

## 4. Conclusion
A complete, actionable, and compliant test strategy for Milestone 4 (R4: Mock Exam Mode "Пробники") has been formulated and documented in `.agents/explorer_m4_3/analysis.md`.
The strategy covers:
1. Unit tests in `tests/unit/mock_exam.test.mjs` for score conversion and backend API endpoints.
2. E2E tests in `tests/e2e/smoke.spec.js` for the mock exam flow, timer, submit, and score display.
3. Strict adherence to Quality Gate (`npm run check`), no code comments, native ES modules, no bundlers, and exact locator hierarchy.

## 5. Verification Method
1. Inspect `.agents/explorer_m4_3/analysis.md` for complete test specifications.
2. Run project Quality Gate command:
   ```bash
   npm run check
   ```
3. Run specific test commands:
   ```bash
   npx vitest run tests/unit/mock_exam.test.mjs
   npx playwright test tests/e2e/smoke.spec.js -g "пробник"
   ```
4. Confirm all 4 steps (lint -> build -> unit -> e2e) complete without errors.
