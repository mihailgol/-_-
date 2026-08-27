import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appState } from "../../js/modules/state.js";
import {
  startQuiz,
  goToQuestion,
  checkQuizAnswer,
  finishQuiz,
  initQuizEvents,
} from "../../js/modules/quiz.js";

const generateQuestions = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `q_${i + 1}`,
    question: `Вопрос ${i + 1}: Тестовый вопрос по биологии?`,
    options: [
      `Вариант A вопроса ${i + 1}`,
      `Вариант B вопроса ${i + 1}`,
      `Вариант C вопроса ${i + 1}`,
      `Вариант D вопроса ${i + 1}`,
    ],
    correctIndex: (i % 4), // 0, 1, 2, 3 cyclical
    explanation: `Подробное объяснение для вопроса ${i + 1}`,
  }));
};

describe("Adversarial Challenger R3: Quiz Keyboard Shortcuts Stress Testing", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div class="view-container">
        <section class="view-section active" id="view-quiz-player">
          <div class="quiz-layout">
            <div class="quiz-header">
              <span class="quiz-title" id="quizPlayerTitle">Тест</span>
              <div class="quiz-progress-wrapper">
                <div class="quiz-progress-bar" id="quizProgressBar"></div>
              </div>
              <span class="quiz-progress-text" id="quizProgressText">Вопрос 1 из 10</span>
            </div>

            <div class="quiz-minimap-container" id="quizMinimapContainer">
              <div class="quiz-minimap-label">Вопросы:</div>
              <div class="quiz-minimap-grid" id="quizMinimapGrid"></div>
            </div>

            <div class="quiz-card" id="quizCard">
              <div class="quiz-question-text" id="quizQuestionText"></div>
              <div class="quiz-options-list" id="quizOptionsGrid"></div>
              <div class="quiz-explanation-box" id="quizExplanationBox" style="display: none">
                <span id="quizExplanationText"></span>
              </div>
            </div>

            <div class="quiz-actions">
              <button class="btn-secondary" id="quizQuitBtn">Выйти</button>
              <button class="btn-primary" id="quizNextBtn" disabled>Проверить ответ</button>
            </div>
          </div>
        </section>

        <section class="view-section" id="view-quiz-results">
          <div id="resultsRadialBar" style="stroke-dashoffset: 0"></div>
          <div id="resultsPercentText">0%</div>
          <div id="resultsTitleText"></div>
          <div id="resultsScoreDetails"></div>
          <div id="resultsEgeEstimation"></div>
          <button id="resultsRetryBtn">Повторить</button>
          <button id="resultsHomeBtn">На главную</button>
        </section>

        <section class="view-section" id="view-support">
          <textarea id="supportTextarea"></textarea>
        </section>
      </div>

      <div class="modal-overlay" id="selfAssessmentModal">
        <div class="modal-card">
          <button class="btn-primary" id="saveSelfAssessmentBtn">Сохранить</button>
        </div>
      </div>

      <input type="text" id="globalSearch" />
      <input type="email" id="manualEmail" />
      <textarea id="qTextarea"></textarea>
      <textarea id="mockExtendedInput"></textarea>
      <button id="mockNextBtn">Далее</button>
      <button id="mockSubmitBtn">Сдать</button>
    `;

    appState.stats = {
      testsSolved: 0,
      avgPercent: 0,
      streak: 0,
      achievements: 0,
      questionsToday: 0,
      lessonsWatched: 0,
      readTopics: [],
      lastActiveDate: null,
      planTasks: {},
    };
    appState.user = { isLoggedIn: false, name: "Гость", role: "Ученик" };
    initQuizEvents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1.1 Focus Isolation Safety", () => {
    const inputIds = ["globalSearch", "manualEmail", "qTextarea", "supportTextarea"];

    inputIds.forEach((inputId) => {
      it(`does NOT trigger option selection 1-4 when focused in #${inputId}`, () => {
        startQuiz(generateQuestions(5), "Стресс тест", "tests");
        const el = document.getElementById(inputId);
        el.focus();

        for (const digit of ["1", "2", "3", "4"]) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: digit }));
          expect(appState.activeSelectedOptionIndex).toBeNull();
        }
      });

      it(`does NOT trigger navigation (ArrowLeft/ArrowRight) when focused in #${inputId}`, () => {
        startQuiz(generateQuestions(5), "Стресс тест", "tests");
        const el = document.getElementById(inputId);
        el.focus();

        expect(appState.activeQuizIndex).toBe(0);
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(appState.activeQuizIndex).toBe(0);

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(appState.activeQuizIndex).toBe(0);
      });
    });

    it("does NOT trigger shortcuts if contenteditable element is focused", () => {
      startQuiz(generateQuestions(5), "Стресс тест", "tests");
      const editableDiv = document.createElement("div");
      editableDiv.setAttribute("contenteditable", "true");
      document.body.appendChild(editableDiv);
      editableDiv.focus();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
      expect(appState.activeSelectedOptionIndex).toBeNull();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect(appState.activeQuizIndex).toBe(0);
      editableDiv.remove();
    });

    it("does NOT trigger shortcuts when any modal overlay is active", () => {
      startQuiz(generateQuestions(5), "Стресс тест", "tests");
      const modal = document.getElementById("selfAssessmentModal");
      modal.classList.add("active");

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
      expect(appState.activeSelectedOptionIndex).toBeNull();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect(appState.activeQuizIndex).toBe(0);
    });
  });

  describe("1.2 Edge Key Events & Modifiers", () => {
    it("ignores keys 5-9 without error or side-effects", () => {
      startQuiz(generateQuestions(5), "Стресс тест", "tests");

      ["5", "6", "7", "8", "9", "0"].forEach((k) => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
        expect(appState.activeSelectedOptionIndex).toBeNull();
      });
    });

    it("ignores plain Enter without Ctrl/Meta (does not auto-submit without user action)", () => {
      startQuiz(generateQuestions(5), "Стресс тест", "tests");
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(appState.activeQuizAnswers[0]).toBeNull();
    });

    it("does not navigate past first question on ArrowLeft (index 0 boundary)", () => {
      startQuiz(generateQuestions(5), "Стресс тест", "tests");
      expect(appState.activeQuizIndex).toBe(0);

      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(appState.activeQuizIndex).toBe(0);
      }
    });

    it("does not navigate past last question on ArrowRight when unanswered", () => {
      startQuiz(generateQuestions(3), "Стресс тест", "tests");
      goToQuestion(2); // Go to index 2 (last question)
      expect(appState.activeQuizIndex).toBe(2);

      // Unanswered, quizNextBtn is disabled
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect(appState.activeQuizIndex).toBe(2);
    });

    it("handles rapid option switching without corrupted selection", () => {
      startQuiz(generateQuestions(5), "Стресс тест", "tests");

      // Rapidly press 1 -> 2 -> 3 -> 4 -> 2
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
      expect(appState.activeSelectedOptionIndex).toBe(0);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
      expect(appState.activeSelectedOptionIndex).toBe(1);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" }));
      expect(appState.activeSelectedOptionIndex).toBe(2);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "4" }));
      expect(appState.activeSelectedOptionIndex).toBe(3);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
      expect(appState.activeSelectedOptionIndex).toBe(1);

      const buttons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
      expect(buttons[1].classList.contains("selected")).toBe(true);
      expect(buttons[0].classList.contains("selected")).toBe(false);
      expect(buttons[2].classList.contains("selected")).toBe(false);
      expect(buttons[3].classList.contains("selected")).toBe(false);
    });
  });

  describe("1.3 Ctrl+Enter / Cmd+Enter Workflows", () => {
    it("works with Ctrl+Enter and Cmd+Enter (Meta) in Quiz", () => {
      startQuiz(generateQuestions(3), "Стресс тест", "tests");

      // Select option 1 (correct for Q1)
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
      expect(appState.activeSelectedOptionIndex).toBe(0);

      // Ctrl+Enter to check answer
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
      expect(appState.activeQuizAnswers[0]).toEqual({ selectedIdx: 0, isCorrect: true });
      expect(document.getElementById("quizNextBtn").textContent).toBe("Следующий вопрос");

      // Cmd+Enter (metaKey) to advance to Q2
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true }));
      expect(appState.activeQuizIndex).toBe(1);
    });

    it("triggers saveSelfAssessmentBtn on Ctrl+Enter when selfAssessmentModal is active", () => {
      const modal = document.getElementById("selfAssessmentModal");
      modal.classList.add("active");

      let saved = false;
      document.getElementById("saveSelfAssessmentBtn").onclick = () => {
        saved = true;
      };

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
      expect(saved).toBe(true);
    });

    it("triggers mockNextBtn on Ctrl+Enter inside mockExtendedInput", () => {
      const mockTextarea = document.getElementById("mockExtendedInput");
      mockTextarea.focus();

      let nextCalled = false;
      document.getElementById("mockNextBtn").onclick = () => {
        nextCalled = true;
      };

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
      expect(nextCalled).toBe(true);
    });
  });
});

describe("Adversarial Challenger R4: Question Minimap 1..N Integrity & Chaos Navigation", () => {
  const questions = generateQuestions(10);

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div class="view-container">
        <section class="view-section active" id="view-quiz-player">
          <div class="quiz-header">
            <span class="quiz-title" id="quizPlayerTitle">Тест</span>
            <div class="quiz-progress-bar" id="quizProgressBar"></div>
            <span class="quiz-progress-text" id="quizProgressText"></span>
          </div>
          <div class="quiz-minimap-container" id="quizMinimapContainer">
            <div class="quiz-minimap-label">Вопросы:</div>
            <div class="quiz-minimap-grid" id="quizMinimapGrid"></div>
          </div>
          <div class="quiz-card" id="quizCard">
            <div class="quiz-question-text" id="quizQuestionText"></div>
            <div class="quiz-options-list" id="quizOptionsGrid"></div>
            <div class="quiz-explanation-box" id="quizExplanationBox" style="display: none">
              <span id="quizExplanationText"></span>
            </div>
          </div>
          <div class="quiz-actions">
            <button class="btn-secondary" id="quizQuitBtn">Выйти</button>
            <button class="btn-primary" id="quizNextBtn" disabled>Проверить ответ</button>
          </div>
        </section>

        <section class="view-section" id="view-quiz-results">
          <div id="resultsRadialBar" style="stroke-dashoffset: 0"></div>
          <div id="resultsPercentText">0%</div>
          <div id="resultsTitleText"></div>
          <div id="resultsScoreDetails"></div>
          <div id="resultsEgeEstimation"></div>
          <button id="resultsRetryBtn">Повторить</button>
          <button id="resultsHomeBtn">На главную</button>
        </section>
      </div>
    `;

    appState.stats = {
      testsSolved: 0,
      avgPercent: 0,
      streak: 0,
      achievements: 0,
      questionsToday: 0,
      lessonsWatched: 0,
      readTopics: [],
      lastActiveDate: null,
      planTasks: {},
    };
    appState.user = { isLoggedIn: false, name: "Гость", role: "Ученик" };
    initQuizEvents();
  });

  it("2.1 renders complete 1..10 minimap buttons with correct accessible labels", () => {
    startQuiz(questions, "Тестирование 10 вопросов", "tests");

    const buttons = document.querySelectorAll(".quiz-minimap-item");
    expect(buttons.length).toBe(10);

    buttons.forEach((btn, idx) => {
      expect(btn.textContent).toBe(String(idx + 1));
      expect(btn.getAttribute("data-quiz-index")).toBe(String(idx));
      expect(btn.getAttribute("aria-label")).toBe(`Вопрос ${idx + 1}`);
      expect(btn.type).toBe("button");
      if (idx === 0) {
        expect(btn.classList.contains("active")).toBe(true);
      } else {
        expect(btn.classList.contains("active")).toBe(false);
      }
      expect(btn.classList.contains("unanswered")).toBe(true);
    });
  });

  it("2.2 Chaos navigation: Q1 -> Q5 -> Q2 -> Q8 -> Q5 -> Q1 -> Q10 preserves answer integrity and exact scores", () => {
    startQuiz(questions, "Тестирование 10 вопросов", "tests");

    // 1. On Q1 (index 0): Select option 0 (correct), check answer
    const q1Buttons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q1Buttons[0].click();
    checkQuizAnswer();
    expect(appState.activeQuizScore).toBe(1);

    // 2. Jump to Q5 (index 4) via Minimap
    goToQuestion(4);
    expect(appState.activeQuizIndex).toBe(4);
    expect(document.getElementById("quizExplanationBox").style.display).toBe("none");

    // Answer Q5 (index 4) - correctIndex is 0. Select option 0 (correct), check answer
    const q5Buttons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q5Buttons[0].click();
    checkQuizAnswer();
    expect(appState.activeQuizScore).toBe(2);

    // 3. Jump to Q2 (index 1) - leave unanswered
    goToQuestion(1);
    expect(appState.activeQuizIndex).toBe(1);
    expect(appState.activeQuizAnswers[1]).toBeNull();
    expect(document.getElementById("quizNextBtn").disabled).toBe(true);

    // 4. Jump to Q8 (index 7) - correctIndex is 3 (7 % 4 = 3). Select option 0 (incorrect!), check answer
    goToQuestion(7);
    const q8Buttons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q8Buttons[0].click();
    checkQuizAnswer();
    expect(appState.activeQuizAnswers[7].isCorrect).toBe(false);
    expect(appState.activeQuizScore).toBe(2); // Score remains 2

    // 5. Jump back to Q5 (index 4) - verify review mode restored
    goToQuestion(4);
    expect(document.getElementById("quizExplanationBox").style.display).toBe("block");
    expect(document.getElementById("quizExplanationText").textContent).toBe(questions[4].explanation);
    const q5RestoredButtons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    expect(q5RestoredButtons[0].classList.contains("checked-correct")).toBe(true);

    // 6. Jump back to Q1 (index 0) - verify review mode restored
    goToQuestion(0);
    expect(document.getElementById("quizExplanationBox").style.display).toBe("block");
    const q1RestoredButtons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    expect(q1RestoredButtons[0].classList.contains("checked-correct")).toBe(true);

    // 7. Jump to Q10 (index 9) - correctIndex is 1 (9 % 4 = 1). Select option 1 (correct), check answer
    goToQuestion(9);
    const q10Buttons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q10Buttons[1].click();
    checkQuizAnswer();
    expect(appState.activeQuizAnswers[9].isCorrect).toBe(true);
    expect(appState.activeQuizScore).toBe(3);

    // 8. Verify minimap statuses across all 10 questions
    const minimapItems = document.querySelectorAll(".quiz-minimap-item");
    // Answered indices: 0 (Q1), 4 (Q5), 7 (Q8), 9 (Q10)
    expect(minimapItems[0].classList.contains("answered")).toBe(true);
    expect(minimapItems[1].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[2].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[3].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[4].classList.contains("answered")).toBe(true);
    expect(minimapItems[5].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[6].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[7].classList.contains("answered")).toBe(true);
    expect(minimapItems[8].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[9].classList.contains("answered")).toBe(true);
    expect(minimapItems[9].classList.contains("active")).toBe(true);

    // 9. Finish Quiz and check final score calculation
    finishQuiz();
    expect(document.getElementById("resultsPercentText").textContent).toBe("30%");
    expect(document.getElementById("resultsScoreDetails").textContent).toBe(
      "Вы правильно ответили на 3 из 10 вопросов."
    );
  });

  it("2.3 Prevents double-scoring or corruption when repeatedly checking or re-visiting questions", () => {
    startQuiz(questions, "Тестирование 10 вопросов", "tests");

    // Answer Q1
    const q1Buttons = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q1Buttons[0].click();
    checkQuizAnswer();
    expect(appState.activeQuizScore).toBe(1);
    const initialToday = appState.stats.questionsToday;

    // Call checkQuizAnswer() again on the same question
    checkQuizAnswer();
    expect(appState.activeQuizScore).toBe(1);
    expect(appState.stats.questionsToday).toBe(initialToday); // No double count

    // Revisit question via minimap
    goToQuestion(0);
    checkQuizAnswer();
    expect(appState.activeQuizScore).toBe(1);
    expect(appState.stats.questionsToday).toBe(initialToday);
  });
});
