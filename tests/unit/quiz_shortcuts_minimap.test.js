import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appState } from "../../js/modules/state.js";
import {
  startQuiz,
  goToQuestion,
  goToPrevQuestion,
  checkQuizAnswer,
  initQuizEvents,
} from "../../js/modules/quiz.js";

const sampleQuestions = [
  {
    id: "q1",
    question: "Какой органоид синтезирует АТФ?",
    options: ["Митохондрия", "Рибосома", "Лизосома", "Комплекс Гольджи"],
    correctIndex: 0,
    explanation: "Митохондрии — энергетические станции клетки.",
  },
  {
    id: "q2",
    question: "Где происходит синтез белка?",
    options: ["Ядро", "Рибосома", "Вакуоль", "Клеточная стенка"],
    correctIndex: 1,
    explanation: "Синтез белка происходит на рибосомах.",
  },
  {
    id: "q3",
    question: "Какой органоид содержит гидролитические ферменты?",
    options: ["Пластиды", "Лизосомы", "Центриоли", "Цитоскелет"],
    correctIndex: 1,
    explanation: "Лизосомы участвуют во внутриклеточном пищеварении.",
  },
];

describe("Quiz Minimap & Keyboard Shortcuts", () => {
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
              <span class="quiz-progress-text" id="quizProgressText">Вопрос 1 из 3</span>
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
      </div>

      <div class="modal-overlay" id="selfAssessmentModal">
        <div class="modal-card">
          <button class="btn-primary" id="saveSelfAssessmentBtn">Сохранить</button>
        </div>
      </div>

      <input type="text" id="globalSearch" />
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

  it("renders minimap buttons 1..N with correct initial status classes", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    const minimapItems = document.querySelectorAll(".quiz-minimap-item");
    expect(minimapItems.length).toBe(3);

    expect(minimapItems[0].textContent).toBe("1");
    expect(minimapItems[0].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[0].classList.contains("active")).toBe(true);

    expect(minimapItems[1].textContent).toBe("2");
    expect(minimapItems[1].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[1].classList.contains("active")).toBe(false);

    expect(minimapItems[2].textContent).toBe("3");
    expect(minimapItems[2].classList.contains("unanswered")).toBe(true);
    expect(minimapItems[2].classList.contains("active")).toBe(false);
  });

  it("updates minimap status to .answered upon submitting an answer", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    const optionBtns = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    optionBtns[0].click(); // Option A (correct)

    const nextBtn = document.getElementById("quizNextBtn");
    expect(nextBtn.disabled).toBe(false);
    expect(nextBtn.textContent).toBe("Проверить ответ");

    checkQuizAnswer();

    const minimapItems = document.querySelectorAll(".quiz-minimap-item");
    expect(minimapItems[0].classList.contains("answered")).toBe(true);
    expect(minimapItems[0].classList.contains("active")).toBe(true);
    expect(appState.activeQuizScore).toBe(1);
  });

  it("allows random-access navigation via minimap buttons and preserves answered state", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    // Answer Q1 correctly
    const q1Options = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q1Options[0].click();
    checkQuizAnswer();

    // Navigate to Q3 via minimap button 3
    const minimapItems = document.querySelectorAll(".quiz-minimap-item");
    minimapItems[2].click();

    expect(appState.activeQuizIndex).toBe(2);
    expect(document.getElementById("quizQuestionText").textContent).toBe(sampleQuestions[2].question);
    expect(document.getElementById("quizExplanationBox").style.display).toBe("none");

    const updatedMinimap = document.querySelectorAll(".quiz-minimap-item");
    expect(updatedMinimap[0].classList.contains("answered")).toBe(true);
    expect(updatedMinimap[2].classList.contains("active")).toBe(true);

    // Answer Q3 incorrectly
    const q3Options = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    q3Options[0].click(); // Option A is incorrect (correct is 1)
    checkQuizAnswer();

    // Navigate back to Q1
    goToQuestion(0);
    expect(appState.activeQuizIndex).toBe(0);

    // Q1 should be restored with correct visual styling and visible explanation
    const restoredOptions = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    expect(restoredOptions[0].classList.contains("checked-correct")).toBe(true);
    expect(document.getElementById("quizExplanationBox").style.display).toBe("block");
    expect(document.getElementById("quizExplanationText").textContent).toBe(sampleQuestions[0].explanation);
    expect(document.getElementById("quizNextBtn").textContent).toBe("Следующий вопрос");
  });

  it("supports backward navigation via goToPrevQuestion()", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    goToQuestion(2);
    expect(appState.activeQuizIndex).toBe(2);

    goToPrevQuestion();
    expect(appState.activeQuizIndex).toBe(1);

    goToPrevQuestion();
    expect(appState.activeQuizIndex).toBe(0);

    goToPrevQuestion(); // boundary guard
    expect(appState.activeQuizIndex).toBe(0);
  });

  it("selects options 1-4 using keyboard digits 1, 2, 3, 4", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    // Press '2' to select option B (index 1)
    const event2 = new KeyboardEvent("keydown", { key: "2" });
    window.dispatchEvent(event2);

    expect(appState.activeSelectedOptionIndex).toBe(1);
    const optionBtns = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    expect(optionBtns[1].classList.contains("selected")).toBe(true);
    expect(document.getElementById("quizNextBtn").disabled).toBe(false);

    // Press '1' to change selection to option A (index 0)
    const event1 = new KeyboardEvent("keydown", { key: "1" });
    window.dispatchEvent(event1);

    expect(appState.activeSelectedOptionIndex).toBe(0);
    expect(optionBtns[0].classList.contains("selected")).toBe(true);
    expect(optionBtns[1].classList.contains("selected")).toBe(false);
  });

  it("navigates with ArrowLeft and ArrowRight keys", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    // Press ArrowRight to move to Q2
    const arrowRight = new KeyboardEvent("keydown", { key: "ArrowRight" });
    window.dispatchEvent(arrowRight);
    expect(appState.activeQuizIndex).toBe(1);

    // Press ArrowLeft to return to Q1
    const arrowLeft = new KeyboardEvent("keydown", { key: "ArrowLeft" });
    window.dispatchEvent(arrowLeft);
    expect(appState.activeQuizIndex).toBe(0);
  });

  it("triggers answer check / next question with Ctrl+Enter or Cmd+Enter", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    // Select option 1 via key '1'
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(appState.activeSelectedOptionIndex).toBe(0);

    // Press Ctrl+Enter to check answer
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
    expect(appState.activeQuizAnswers[0]).toBeDefined();
    expect(appState.activeQuizAnswers[0].isCorrect).toBe(true);
    expect(document.getElementById("quizNextBtn").textContent).toBe("Следующий вопрос");

    // Press Cmd+Enter (Meta+Enter) to move to next question
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true }));
    expect(appState.activeQuizIndex).toBe(1);
  });

  it("triggers saveSelfAssessmentBtn when Ctrl+Enter is pressed in selfAssessmentModal", () => {
    const modal = document.getElementById("selfAssessmentModal");
    modal.classList.add("active");

    const saveBtn = document.getElementById("saveSelfAssessmentBtn");
    let clicked = false;
    saveBtn.addEventListener("click", () => {
      clicked = true;
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
    expect(clicked).toBe(true);
  });

  it("triggers mock exam navigation when Ctrl+Enter is pressed in mockExtendedInput", () => {
    const textarea = document.getElementById("mockExtendedInput");
    textarea.focus();

    const nextMockBtn = document.getElementById("mockNextBtn");
    let nextClicked = false;
    nextMockBtn.addEventListener("click", () => {
      nextClicked = true;
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
    expect(nextClicked).toBe(true);
  });

  it("strictly isolates focus: does NOT trigger quiz shortcuts when typing in search or other inputs", () => {
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");

    const searchInput = document.getElementById("globalSearch");
    searchInput.focus();

    // Typing '1' inside search input
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(appState.activeSelectedOptionIndex).toBeNull();

    // Pressing ArrowRight inside search input
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(appState.activeQuizIndex).toBe(0);

    // Pressing ArrowLeft inside search input
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(appState.activeQuizIndex).toBe(0);
  });

  it("does not trigger quiz shortcuts when view-quiz-player is inactive", () => {
    document.getElementById("view-quiz-player").classList.remove("active");
    startQuiz(sampleQuestions, "Тестирование клетки", "tests");
    document.getElementById("view-quiz-player").classList.remove("active");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(appState.activeSelectedOptionIndex).toBeNull();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(appState.activeQuizIndex).toBe(0);
  });
});
