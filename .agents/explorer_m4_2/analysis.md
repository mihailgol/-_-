# Explorer 2 Analysis: Milestone 4 (Mock Exam Mode "Пробники")

## 1. Executive Summary
This document presents the detailed architectural design and UI/UX specification for **Mock Exam Mode ("Пробники ЕГЭ / ОГЭ")** (Requirement R4).

The frontend implementation consists of:
1. `js/modules/mock-exam.js` — Client controller managing state, API communications (`/api/mock-exams`), timer logic (210–235 minutes with 15min / 5min warning thresholds and auto-submission at 0s), answer tracking, question flag/review system, and score review modal/view.
2. `<section id="view-mock-exam" class="view-section">` in `index.html` — Containing three view states: Mock Exam Hub Catalog, Active Mock Exam Player with countdown bar and question navigator grid, and Detailed Results & Solutions Review screen.
3. CSS styles in `css/style.css` — Custom card layouts, countdown timer badges (`.timer-normal`, `.timer-warning-15`, `.timer-warning-5` with pulsing glow animations), question navigation grid buttons, and Free vs Premium badge/lock badges.

---

## 2. Investigation Findings of Existing Architecture

### 2.1 Router & View Architecture (`js/app.js`, `js/modules/navigation.js`, `js/modules/state.js`)
- Single Page Application (SPA) views are declared as `<section class="view-section" id="view-[name]">` inside `<main class="main-area">` in `index.html`.
- `switchView(viewName)` in `js/modules/navigation.js` toggles `.active` class on `.view-section` elements and highlights corresponding navigation elements.
- `HASH_VIEWS` in `js/modules/state.js` defines top-level hash routes:
  ```javascript
  export const HASH_VIEWS = ["subjects", "notes", "videos", "tests", "plan", "analytics", "admin", "cart", "support", "mock-exam"];
  ```
  Adding `"mock-exam"` to `HASH_VIEWS` permits direct hash routing (`#mock-exam`) and smooth popstate back/forward browser navigation.

### 2.2 Navigation Order Compliance (`AGENTS.md`)
- `AGENTS.md` explicitly specifies sidebar navigation order:
  `subjects → notes → videos → tests → plan → analytics → cart → support`
- `#view-tests` serves as the primary tests hub in the sidebar. Inside `#view-tests`, or via a dedicated button/tab, users can launch both the AI Test Generator and Mock Exam Mode.
- Selecting a mock exam switches active view to `#view-mock-exam` via `switchView("mock-exam")` and `pushSubView({ view: "mock-exam", examId }, `#mock-exam:${examId}`)`.

### 2.3 User & Access State (`js/modules/state.js`, `js/modules/premium.js`)
- User state is stored in `appState.user`:
  - `isLoggedIn`: boolean
  - `isPremium`: boolean
- Premium promotion modals are opened via `openModal("premiumModal")`.
- When an unprivileged user (`!appState.user.isPremium`) attempts to open a Premium mock exam, the system shows toast `"🔒 Доступ ограничен"` and opens `premiumModal`.

---

## 3. Detailed Component Designs

### 3.1 Frontend Module Design (`js/modules/mock-exam.js`)

#### 3.1.1 State Schema
```javascript
export let mockExamState = {
  activeExam: null, // { id, title, subjectId, examType, durationMinutes, questions }
  currentQuestionIndex: 0,
  userAnswers: {}, // { [questionId]: optionIndex | text }
  flaggedQuestions: new Set(), // Set of questionIds
  timeRemaining: 0, // seconds
  timerInterval: null,
  isWarning15Shown: false,
  isWarning5Shown: false,
  isSubmitting: false,
  lastResult: null,
};
```

#### 3.1.2 Countdown Timer Specification
- **Duration**:
  - ОГЭ: 210 minutes (12,600 seconds)
  - ЕГЭ: 235 minutes (14,100 seconds)
  - (Or dynamically parsed from `exam.durationMinutes * 60`).
- **Formatting**: Format seconds into `HH:MM:SS` (e.g. `03:55:00` or `03:29:45`).
- **Warning Thresholds**:
  1. **15 Minutes Warning (`seconds <= 900`)**:
     - Class `.timer-warning-15` added to `#mockExamTimer`.
     - Toast: `showToast("⚠️ Осталось 15 минут!", "До окончания экзамена осталось 15 минут. Проверьте ваши ответы.")`.
  2. **5 Minutes Warning (`seconds <= 300`)**:
     - Class `.timer-warning-5` added to `#mockExamTimer` (triggers pulsing red border & shadow).
     - Toast: `showToast("🚨 Осталось 5 минут!", "Срочно завершите заполнение вариантов.")`.
  3. **Zero Timer Auto-Submit (`seconds <= 0`)**:
     - `clearInterval(timerInterval)`.
     - Toast: `showToast("⏱️ Время вышло!", "Время экзамена истекло. Ответы автоматически отправлены.")`.
     - Calls `submitMockExam({ isAutoSubmit: true })`.

#### 3.1.3 Question Navigation Grid & Answer Tracking
- Question grid renders buttons `[1] [2] ... [N]`.
- Button State Classes:
  - `.active`: Currently displayed question.
  - `.answered`: Question has a saved user answer.
  - `.flagged`: User clicked "Сомневаюсь" (`flaggedQuestions.has(q.id)`).
- Instant navigation on grid button click or Prev/Next actions.

#### 3.1.4 Submission & Results Display
- Triggered by "Завершить экзамен" or timer expiration.
- Performs `POST /api/mock-exams/:id/submit` with body `{ answers, timeSpentSeconds }`.
- Returns `{ attemptId, primaryScore, maxPrimaryScore, secondaryScore, grade, percentage, questionResults }`.
- Renders:
  - Radial score gauge with secondary 100-point scale (or 5-point mark for ОГЭ).
  - Primary score pill (`Первичный балл: 22 / 28`).
  - Time spent display.
  - Per-question mistake breakdown accordion with full solutions & explanations.

---

### 3.2 HTML View Structure (`index.html`)

Section `#view-mock-exam` layout template:

```html
<section class="view-section" id="view-mock-exam">
  <div class="mock-exam-container">
    
    <!-- State A: Mock Exam Catalog / Hub -->
    <div id="mockExamCatalogBlock" class="mock-catalog-block">
      <div class="ai-header-card mock-header-card">
        <div class="mock-header-content">
          <div>
            <span class="premium-modal-badge" style="margin-bottom: 12px; display: inline-block">ОФИЦИАЛЬНЫЕ ВАРИАНТЫ ФИПИ</span>
            <h2 class="ai-header-title">Пробные экзамены ЕГЭ и ОГЭ</h2>
            <p class="ai-header-descr">
              Пройдите полноценное тестирование в формате реального экзамена с ограничением по времени (210–235 мин), автопроверкой и подробным пересчетом в 100-балльную шкалу.
            </p>
          </div>
          <div class="mock-hub-tags">
            <span class="mock-tag-item"><i data-lucide="clock"></i> Таймер 210–235 мин</span>
            <span class="mock-tag-item"><i data-lucide="award"></i> Шкала 100 баллов</span>
          </div>
        </div>
      </div>

      <!-- Filters & Tabs -->
      <div class="mock-filters-bar">
        <div class="mock-tabs" id="mockSubjectTabs">
          <button class="mock-tab-btn active" data-subject="all">Все предметы</button>
          <button class="mock-tab-btn" data-subject="biology">🧬 Биология</button>
          <button class="mock-tab-btn" data-subject="chemistry">🧪 Химия</button>
        </div>
        <div class="mock-exam-type-filter">
          <select id="mockExamTypeSelect" class="ai-select">
            <option value="all">Все типы (ЕГЭ / ОГЭ)</option>
            <option value="ege">🎯 Только ЕГЭ (235 мин)</option>
            <option value="oge">📋 Только ОГЭ (210 мин)</option>
          </select>
        </div>
      </div>

      <!-- Mock Exams Grid -->
      <div class="mock-exams-grid" id="mockExamGrid">
        <!-- Dynamic Mock Exam Cards -->
      </div>
    </div>

    <!-- State B: Active Exam Player -->
    <div id="mockExamPlayerBlock" class="mock-player-block" style="display: none;">
      <div class="mock-exam-header-bar">
        <div class="mock-exam-info">
          <button class="btn-icon-back" id="mockExamQuitBtn" title="Выйти из экзамена">
            <i data-lucide="arrow-left"></i>
          </button>
          <div>
            <h3 class="mock-exam-player-title" id="mockPlayerExamTitle">Вариант №1: Биология (ЕГЭ 2026)</h3>
            <span class="mock-exam-subtext" id="mockPlayerExamSubtext">28 заданий • Первичный балл: max 28</span>
          </div>
        </div>

        <div class="mock-timer-wrapper">
          <div class="mock-timer-badge timer-normal" id="mockExamTimer">
            <i data-lucide="clock" class="timer-icon"></i>
            <span class="timer-value" id="mockExamTimerText">03:55:00</span>
          </div>
        </div>

        <div class="mock-header-actions">
          <button class="btn-primary mock-finish-btn" id="mockExamSubmitBtn">
            <i data-lucide="check-circle"></i>
            <span>Завершить экзамен</span>
          </button>
        </div>
      </div>

      <div class="mock-player-main-grid">
        <div class="mock-question-workspace">
          <div class="mock-question-header">
            <span class="mock-question-number" id="mockQuestionNum">Задание 1 из 28</span>
            <button class="mock-flag-btn" id="mockFlagBtn">
              <i data-lucide="bookmark"></i>
              <span>Сомневаюсь</span>
            </button>
          </div>

          <div class="mock-question-card">
            <div class="mock-question-body" id="mockQuestionBody">
              <!-- Question Text & Input Controls -->
            </div>
          </div>

          <div class="mock-question-actions">
            <button class="btn-secondary" id="mockPrevQBtn" disabled>
              <i data-lucide="chevron-left"></i> Предыдущее
            </button>
            <button class="btn-primary" id="mockNextQBtn">
              Следующее <i data-lucide="chevron-right"></i>
            </button>
          </div>
        </div>

        <aside class="mock-nav-sidebar">
          <h4 class="mock-nav-sidebar-title">Навигация по варианту</h4>
          <div class="mock-nav-grid" id="mockNavGrid">
            <!-- 1..N Question Buttons -->
          </div>

          <div class="mock-nav-legend">
            <div class="legend-item"><span class="legend-dot answered"></span> Отвечено</div>
            <div class="legend-item"><span class="legend-dot flagged"></span> На проверке</div>
            <div class="legend-item"><span class="legend-dot empty"></span> Не заполнено</div>
          </div>
        </aside>
      </div>
    </div>

    <!-- State C: Mock Exam Results -->
    <div id="mockExamResultsBlock" class="mock-results-block" style="display: none;">
      <div class="quiz-layout">
        <div class="quiz-results-card mock-results-card">
          <div class="results-radial-wrapper">
            <svg class="results-radial-svg" viewBox="0 0 160 160">
              <circle class="results-radial-bg" cx="80" cy="80" r="70" />
              <circle class="results-radial-bar" id="mockResultsRadialBar" cx="80" cy="80" r="70" />
            </svg>
            <div class="results-percentage" id="mockResultsPercentText">0%</div>
          </div>

          <h2 class="results-title" id="mockResultsTitleText">Результат экзамена</h2>
          <p class="results-score-details" id="mockResultsPrimaryScore">Первичный балл: 0 из 0</p>
          <div class="results-score-badge" id="mockResultsSecondaryBadge">Шкала: 0 баллов</div>
          <div class="mock-results-meta" id="mockResultsTimeSpent"><i data-lucide="clock"></i> Время: 00:00:00</div>

          <div class="results-btns" style="margin-top: 24px;">
            <button class="btn-primary" id="mockResultsRetryBtn">Повторить вариант</button>
            <button class="btn-secondary" id="mockResultsBackBtn">К списку пробников</button>
          </div>
        </div>

        <div class="mock-review-container">
          <h3 class="mock-review-title">Подробный разбор заданий</h3>
          <div class="mock-review-list" id="mockReviewList">
            <!-- Review items -->
          </div>
        </div>
      </div>
    </div>

  </div>
</section>
```

---

### 3.3 Free vs Premium Badges & Styling (`css/style.css`)

#### 3.3.1 Card Access Rules
- Free users (`!appState.user.isPremium`):
  - Can access 1 free variant per subject (`isPremium === 0`).
  - Card displays `<span class="mock-access-badge free"><i data-lucide="sparkles"></i> Бесплатно</span>`.
  - Locked variants display `<span class="mock-access-badge premium"><i data-lucide="crown"></i> Premium</span>` and a lock button `<button class="btn-secondary mock-start-btn locked"><i data-lucide="lock"></i> Входит в Premium</button>`.
  - Attempting to start a locked variant opens `premiumModal` with toast `"🔒 Доступ ограничен"`.
- Premium users (`appState.user.isPremium === true`):
  - All variants unlocked. Cards display `<span class="mock-access-badge unlocked"><i data-lucide="crown"></i> Premium</span>` and primary active start buttons.

#### 3.3.2 CSS Rules Formulation
```css
/* Timer Component */
.mock-timer-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--border-radius-md);
  font-weight: 700;
  font-size: 16px;
  font-family: monospace, var(--font-primary);
  transition: var(--transition-normal);
}

.mock-timer-badge.timer-normal {
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.mock-timer-badge.timer-warning-15 {
  background: var(--color-orange-light);
  border: 1px solid var(--color-orange);
  color: var(--color-orange);
}

.mock-timer-badge.timer-warning-5 {
  background: var(--color-red-light);
  border: 1px solid var(--color-red);
  color: var(--color-red);
  animation: timerPulseRed 1s infinite alternate;
}

@keyframes timerPulseRed {
  from {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
  }
  to {
    box-shadow: 0 0 0 8px rgba(255, 77, 79, 0);
  }
}

/* Card Badges */
.mock-access-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.mock-access-badge.free {
  background: var(--color-green-light);
  color: var(--color-green);
}

.mock-access-badge.premium {
  background: var(--color-orange-light);
  color: var(--color-orange);
}

.mock-access-badge.unlocked {
  background: var(--color-blue-light);
  color: var(--color-blue);
}

/* Question Navigation Grid */
.mock-nav-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.mock-nav-btn {
  height: 38px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: var(--transition-fast);
}

.mock-nav-btn.answered {
  background: var(--color-green-light);
  border-color: var(--color-green);
  color: var(--color-green);
}

.mock-nav-btn.flagged::after {
  content: "";
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-orange);
}

.mock-nav-btn.active {
  box-shadow: 0 0 0 2px var(--color-purple);
}
```

---

## 4. Proposed Handoff & Implementation Plan

| Step | Action | Files Modified / Created |
|------|--------|--------------------------|
| 1 | Register `mock-exam` view in router & state | `js/modules/state.js`, `js/modules/navigation.js`, `js/app.js` |
| 2 | Create `js/modules/mock-exam.js` module | `js/modules/mock-exam.js` |
| 3 | Add `#view-mock-exam` section | `index.html` |
| 4 | Add CSS styling | `css/style.css` |
| 5 | Quality gate check | `npm run check` |
