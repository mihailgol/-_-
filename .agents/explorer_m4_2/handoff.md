# Handoff Report — Explorer 2 (Milestone 4: Mock Exam Mode "Пробники")

## 1. Observation
- **Frontend SPA Router & View Management**:
  - `js/modules/state.js` lines 1-2 defines `HASH_VIEWS = ["subjects", "notes", "videos", "tests", "plan", "analytics", "admin", "cart", "support"]`.
  - `js/modules/navigation.js` lines 10-52 defines `switchView(viewName)` which toggles the `.active` class on elements matching `#view-[viewName]`.
  - `index.html` lines 396-490 defines `#view-tests` (AI generator view). Currently no `#view-mock-exam` section exists in `index.html`.
- **Navigation Rules (`AGENTS.md`)**:
  - `AGENTS.md` enforces sidebar navigation order: `subjects → notes → videos → tests → plan → analytics → cart → support`.
  - `tests/e2e/smoke.spec.js` lines 15-21 verifies that clicking each sidebar item displays `#view-[viewName]`.
- **Existing Quiz Architecture (`js/modules/quiz.js`)**:
  - `startQuiz(questions, title, origin)` in `js/modules/quiz.js` manages quiz progress, answer checking, radial result rendering, and attempt posting to `/api/progress/attempt`.
- **Premium Access Enforcement (`js/modules/premium.js`, `js/modules/render.js`)**:
  - `appState.user.isPremium` flags user subscription state. Unprivileged access calls `openModal("premiumModal")` and `showToast("🔒 Доступ ограничен", ...)`.

---

## 2. Logic Chain
1. **Routing Integration**:
   - To add Mock Exam mode without breaking existing sidebar navigation or E2E tests, `mock-exam` should be registered in `HASH_VIEWS` in `js/modules/state.js`.
   - `switchView("mock-exam")` will display `<section class="view-section" id="view-mock-exam">` in `index.html`.
2. **View Layout Architecture (`index.html`)**:
   - `#view-mock-exam` will contain three internal view states toggled via `display: none` / `display: block`:
     - `mockExamCatalogBlock`: Mock Exam Hub catalog grid with subject & exam type (ЕГЭ/ОГЭ) tabs.
     - `mockExamPlayerBlock`: Active player UI with timer badge `#mockExamTimer`, question workspace, and question navigation grid (`#mockNavGrid`).
     - `mockExamResultsBlock`: Detailed results card with 100-point secondary score conversion and question-by-question breakdown.
3. **Countdown Timer & Alert Warnings (`js/modules/mock-exam.js`)**:
   - Countdown timer initializes to `durationMinutes * 60` seconds (210 min for ОГЭ, 235 min for ЕГЭ).
   - `setInterval(tick, 1000)` updates `#mockExamTimerText` with `HH:MM:SS`.
   - At `t <= 900s` (15 min remaining): triggers 15min warning toast & adds `.timer-warning-15` CSS class.
   - At `t <= 300s` (5 min remaining): triggers 5min warning toast & adds `.timer-warning-5` class (pulsing red animation).
   - At `t <= 0s`: clears interval, triggers auto-submit toast, and executes `submitMockExam({ isAutoSubmit: true })`.
4. **Free vs Premium Badge & Lock Rules**:
   - Free users (`!appState.user.isPremium`): 1 free variant per subject (`isPremium === 0`). Premium variants render `<span class="mock-access-badge premium"><i data-lucide="crown"></i> Premium</span>` and a locked button that opens `premiumModal`.
   - Premium users (`appState.user.isPremium === true`): All variants unlocked with active start buttons.

---

## 3. Caveats
- No direct source code changes were made during this exploration turn (read-only investigation per role guidelines).
- Backend API endpoints (`GET /api/mock-exams`, `GET /api/mock-exams/:id`, `POST /api/mock-exams/:id/submit`) are designed in coordination with Explorer 1 and will be provided by backend implementation.
- Score conversion algorithms (ЕГЭ 100-point scale / ОГЭ 5-point scale) are processed on the server during submission and returned to the client in the API response.

---

## 4. Conclusion
The proposed design for `js/modules/mock-exam.js`, `#view-mock-exam` in `index.html`, and CSS styles in `css/style.css` provides a comprehensive, robust, and clean implementation of Milestone 4 (Mock Exam Mode "Пробники").

Detailed analysis and complete code designs are available in `.agents/explorer_m4_2/analysis.md`.

---

## 5. Verification Method
1. **Build & Syntax Verification**:
   ```bash
   node scripts/validate-project.mjs
   ```
2. **ESLint & Full Quality Gate**:
   ```bash
   npm run check
   ```
3. **Targeted E2E Testing**:
   Add test for `#view-mock-exam` navigation and timer component in `tests/e2e/smoke.spec.js` and execute:
   ```bash
   npx playwright test tests/e2e/smoke.spec.js
   ```
