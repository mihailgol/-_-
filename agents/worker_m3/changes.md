# Changes Summary — Milestone M3: Quiz Shortcuts & Interactive Minimap

## 1. `index.html`
- Added `#quizMinimapContainer` with label «Вопросы:» and `#quizMinimapGrid` immediately before `#quizCard` inside `#view-quiz-player`.

## 2. `css/style.css`
- Added `.quiz-minimap-container`, `.quiz-minimap-label`, `.quiz-minimap-grid`, `.quiz-minimap-item`.
- Implemented visual status classes:
  - `.unanswered`: Default background and border color (`var(--color-bg-secondary)`, `var(--color-border)`).
  - `.active`: Purple border and tint (`var(--color-purple)`, `rgba(99, 102, 241, 0.15)`).
  - `.answered`: Green background and border (`var(--color-green)`, `rgba(82, 196, 26, 0.15)`).
- Added `[data-theme="dark"]` rules ensuring high-contrast rendering in dark theme.

## 3. `js/modules/quiz.js`
- Added `renderMinimap()` rendering numbered badges 1..N with `.unanswered`, `.active`, `.answered` classes.
- Added `goToQuestion(idx)` and `goToPrevQuestion()` enabling full bidirectional and random-access navigation across questions.
- Updated `startQuiz()`, `renderQuizQuestion()`, and `checkQuizAnswer()` to cache answer state in `appState.activeQuizAnswers`, preserving selected options, score, explanations, and next/finish buttons when navigating back to already answered questions.
- Implemented `handleQuizKeydown(e)` with:
  - Digit keys `1`, `2`, `3`, `4` selecting options A, B, C, D respectively.
  - `ArrowLeft` navigating to previous question.
  - `ArrowRight` navigating to next question / checking answer.
  - `Ctrl+Enter` / `Cmd+Enter` triggering answer check / next question in `#view-quiz-player`, saving `#selfAssessmentModal`, or advancing in `#mockExtendedInput`.
  - Strict focus isolation checking `isInputFocused` (`INPUT`, `TEXTAREA`, `contenteditable`) and open modal overlays to prevent hijacking global search, auth forms, feedback, or constructor inputs.
- Exported `initQuizEvents()` which attaches a single `keydown` listener on `window`.

## 4. `js/app.js`
- Imported `initQuizEvents` from `./modules/quiz.js` and called `initQuizEvents()` on `DOMContentLoaded`.

## 5. `tests/unit/quiz_shortcuts_minimap.test.js`
- Created comprehensive test suite covering:
  - Minimap button rendering with initial status classes.
  - Status transition to `.answered` on answer submission.
  - Random-access navigation via minimap buttons and state restoration.
  - Backward navigation via `goToPrevQuestion()`.
  - Option selection with digits 1-4.
  - ArrowLeft and ArrowRight navigation.
  - `Ctrl+Enter` and `Cmd+Enter` execution for quiz, self-assessment modal, and mock exam.
  - Focus isolation and inactive view protections.
