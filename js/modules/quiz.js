import { appState, saveStateToStorage, registerActivity } from "./state.js";
import { api } from "./utils.js";
import { showToast } from "./ui.js";
import { switchView, pushSubView } from "./navigation.js";
import { loadSubjectDetail } from "./catalog.js";
import { updateUIFromState } from "./render.js";
import { renderStudentAssignments } from "./teacher.js";

export function startQuiz(questions, title, origin) {
  appState.activeQuizQuestions = questions;
  appState.activeQuizTitle = title;
  appState.activeQuizOrigin = origin || (appState.currentSubject ? "subject" : "subjects");
  appState.activeQuizIndex = 0;
  appState.activeQuizScore = 0;
  appState.activeQuizAnswers = new Array(questions.length).fill(null);
  appState.activeSelectedOptionIndex = null;

  document.getElementById("quizPlayerTitle").textContent = title;
  renderQuizQuestion();

  const quitBtn = document.getElementById("quizQuitBtn");
  quitBtn.onclick = () => {
    if (confirm("Вы действительно хотите завершить тестирование? Прогресс будет потерян.")) {
      returnFromQuiz();
    }
  };

  const nextBtn = document.getElementById("quizNextBtn");
  nextBtn.onclick = () => {
    if (nextBtn.textContent.includes("Проверить")) {
      checkQuizAnswer();
    } else {
      goToNextQuestion();
    }
  };

  switchView("quiz-player");
  pushSubView({ view: "quiz-player" }, "#quiz-player");
}

export function renderMinimap() {
  const grid = document.getElementById("quizMinimapGrid");
  if (!grid || !appState.activeQuizQuestions) return;

  grid.innerHTML = "";
  const total = appState.activeQuizQuestions.length;

  for (let i = 0; i < total; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(i + 1);

    const isAnswered = Boolean(appState.activeQuizAnswers && appState.activeQuizAnswers[i]);
    const isActive = i === appState.activeQuizIndex;

    const statusClass = isAnswered ? "answered" : "unanswered";
    btn.className = `quiz-minimap-item ${statusClass}${isActive ? " active" : ""}`;
    btn.setAttribute("data-quiz-index", String(i));
    btn.setAttribute("aria-label", `Вопрос ${i + 1}`);

    btn.addEventListener("click", () => {
      goToQuestion(i);
    });

    grid.appendChild(btn);
  }
}

export function goToQuestion(idx) {
  if (!appState.activeQuizQuestions || idx < 0 || idx >= appState.activeQuizQuestions.length) {
    return;
  }
  appState.activeQuizIndex = idx;
  renderQuizQuestion();
}

export function goToPrevQuestion() {
  if (appState.activeQuizIndex > 0) {
    appState.activeQuizIndex--;
    renderQuizQuestion();
  }
}

export function renderQuizQuestion() {
  const total = appState.activeQuizQuestions.length;
  const curr = appState.activeQuizIndex + 1;
  const q = appState.activeQuizQuestions[appState.activeQuizIndex];

  document.getElementById("quizProgressText").textContent = `Вопрос ${curr} из ${total}`;
  const pct = (appState.activeQuizIndex / total) * 100;
  document.getElementById("quizProgressBar").style.width = `${pct}%`;

  document.getElementById("quizQuestionText").textContent = q.question;

  renderMinimap();

  const optionsGrid = document.getElementById("quizOptionsGrid");
  optionsGrid.innerHTML = "";

  const savedAnswer = appState.activeQuizAnswers ? appState.activeQuizAnswers[appState.activeQuizIndex] : null;

  if (q.type === "extended" || !Array.isArray(q.options)) {
    const isSaved = Boolean(savedAnswer);
    const savedText = isSaved ? (savedAnswer.text || "") : "";

    const extWrapper = document.createElement("div");
    extWrapper.className = "quiz-extended-container";
    extWrapper.style.cssText = "display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; width: 100%;";

    const label = document.createElement("label");
    label.style.cssText = "font-weight: 700; font-size: 13px; color: var(--color-purple); text-transform: uppercase;";
    label.textContent = "Ваше развернутое решение (Часть 2 ФИПИ):";

    const textarea = document.createElement("textarea");
    textarea.id = "quizExtendedTextarea";
    textarea.placeholder = "Введите ваше решение или развернутый ответ...";
    textarea.value = savedText;
    textarea.disabled = isSaved;
    textarea.style.cssText = "width: 100%; min-height: 120px; padding: 12px 14px; border: 1.5px solid var(--color-border); border-radius: 12px; background: var(--color-surface); color: var(--color-text-primary); font-family: inherit; font-size: 14px; resize: vertical;";

    extWrapper.appendChild(label);
    extWrapper.appendChild(textarea);
    optionsGrid.appendChild(extWrapper);

    const explanationBox = document.getElementById("quizExplanationBox");
    const explanationText = document.getElementById("quizExplanationText");

    if (isSaved) {
      let criteriaHtml = "";
      if (q.criteria && Array.isArray(q.criteria)) {
        criteriaHtml = `\n\nКритерии оценивания ФИПИ:\n` + q.criteria.map((c) => `• [${c.code}] ${c.title} (до ${c.maxPoints} б.)`).join("\n");
      }
      explanationText.textContent = (q.solutionKey || q.explanation || "Эталонное решение сохранено.") + criteriaHtml;
      explanationBox.style.display = "block";

      const nextBtn = document.getElementById("quizNextBtn");
      nextBtn.disabled = false;
      nextBtn.textContent = appState.activeQuizIndex === total - 1 ? "Завершить тест" : "Следующий вопрос";
    } else {
      document.getElementById("quizExplanationBox").style.display = "none";
      const nextBtn = document.getElementById("quizNextBtn");
      nextBtn.disabled = false;
      nextBtn.textContent = "Проверить решение";

      textarea.addEventListener("input", () => {
        appState.activeSelectedOptionIndex = textarea.value;
      });
    }
    return;
  }

  if (savedAnswer) {
    appState.activeSelectedOptionIndex = savedAnswer.selectedIdx;

    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option-btn";
      if (idx === savedAnswer.selectedIdx) {
        btn.className = savedAnswer.isCorrect ? "quiz-option-btn checked-correct" : "quiz-option-btn checked-incorrect";
      } else if (idx === q.correctIndex && !savedAnswer.isCorrect) {
        btn.className = "quiz-option-btn checked-correct";
      }
      btn.innerHTML = `
        <span>${opt}</span>
        <span class="option-badge-circle">${String.fromCharCode(65 + idx)}</span>
      `;
      optionsGrid.appendChild(btn);
    });

    const explanationBox = document.getElementById("quizExplanationBox");
    const explanationText = document.getElementById("quizExplanationText");
    explanationText.textContent = q.explanation;
    explanationBox.style.display = "block";

    const nextBtn = document.getElementById("quizNextBtn");
    nextBtn.disabled = false;
    nextBtn.textContent = appState.activeQuizIndex === total - 1 ? "Завершить тест" : "Следующий вопрос";
  } else {
    appState.activeSelectedOptionIndex = null;

    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option-btn";
      btn.innerHTML = `
        <span>${opt}</span>
        <span class="option-badge-circle">${String.fromCharCode(65 + idx)}</span>
      `;

      btn.addEventListener("click", () => {
        if (
          btn.classList.contains("checked") ||
          document.querySelector(".quiz-option-btn.checked-correct") ||
          document.querySelector(".quiz-option-btn.checked-incorrect")
        ) {
          return;
        }

        document.querySelectorAll(".quiz-option-btn").forEach((b) => {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");

        appState.activeSelectedOptionIndex = idx;

        const nextBtn = document.getElementById("quizNextBtn");
        nextBtn.disabled = false;
        nextBtn.textContent = "Проверить ответ";
      });

      optionsGrid.appendChild(btn);
    });

    document.getElementById("quizExplanationBox").style.display = "none";

    document.getElementById("quizNextBtn").disabled = true;
    document.getElementById("quizNextBtn").textContent = "Проверить ответ";
  }
}

export function checkQuizAnswer() {
  const q = appState.activeQuizQuestions[appState.activeQuizIndex];

  if (q.type === "extended" || !Array.isArray(q.options)) {
    const textarea = document.getElementById("quizExtendedTextarea");
    const textVal = textarea ? textarea.value.trim() : typeof appState.activeSelectedOptionIndex === "string" ? appState.activeSelectedOptionIndex : "";

    if (!appState.activeQuizAnswers) {
      appState.activeQuizAnswers = [];
    }
    appState.activeQuizAnswers[appState.activeQuizIndex] = { selectedIdx: 0, text: textVal, isCorrect: true, score: q.maxPoints || 3 };
    appState.activeQuizScore += q.maxPoints || 1;

    if (textarea) textarea.disabled = true;

    showToast("📝 Решение записано", "Сверьтесь с эталонным решением ФИПИ");

    appState.stats.questionsToday += 1;
    saveStateToStorage();
    updateUIFromState();

    const explanationBox = document.getElementById("quizExplanationBox");
    const explanationText = document.getElementById("quizExplanationText");
    let criteriaHtml = "";
    if (q.criteria && Array.isArray(q.criteria)) {
      criteriaHtml = `\n\nКритерии оценивания ФИПИ:\n` + q.criteria.map((c) => `• [${c.code}] ${c.title} (до ${c.maxPoints} б.)`).join("\n");
    }
    explanationText.textContent = (q.solutionKey || q.explanation || "Эталонное решение ФИПИ.") + criteriaHtml;
    explanationBox.style.display = "block";

    const nextBtn = document.getElementById("quizNextBtn");
    const total = appState.activeQuizQuestions.length;
    if (appState.activeQuizIndex === total - 1) {
      nextBtn.textContent = "Завершить тест";
    } else {
      nextBtn.textContent = "Следующий вопрос";
    }
    return;
  }

  const selectedIdx = appState.activeSelectedOptionIndex;
  if (selectedIdx === undefined || selectedIdx === null) {
    return;
  }

  if (appState.activeQuizAnswers && appState.activeQuizAnswers[appState.activeQuizIndex]) {
    return;
  }

  const options = document.querySelectorAll(".quiz-option-btn");
  const isCorrect = selectedIdx === q.correctIndex;

  if (!appState.activeQuizAnswers) {
    appState.activeQuizAnswers = [];
  }
  appState.activeQuizAnswers[appState.activeQuizIndex] = { selectedIdx, isCorrect };
  appState.activeQuizScore = appState.activeQuizAnswers.filter((a) => a && a.isCorrect).length;

  if (isCorrect) {
    if (options[selectedIdx]) options[selectedIdx].className = "quiz-option-btn checked-correct";
    showToast("🎉 Правильно!", "Отличный ответ!");
  } else {
    if (options[selectedIdx]) options[selectedIdx].className = "quiz-option-btn checked-incorrect";
    if (options[q.correctIndex]) options[q.correctIndex].className = "quiz-option-btn checked-correct";
    showToast("❌ Ошибка", "Ответ неверный.");
  }

  appState.stats.questionsToday += 1;
  saveStateToStorage();
  updateUIFromState();

  const explanationBox = document.getElementById("quizExplanationBox");
  const explanationText = document.getElementById("quizExplanationText");
  explanationText.textContent = q.explanation;
  explanationBox.style.display = "block";

  const nextBtn = document.getElementById("quizNextBtn");
  const total = appState.activeQuizQuestions.length;
  if (appState.activeQuizIndex === total - 1) {
    nextBtn.textContent = "Завершить тест";
  } else {
    nextBtn.textContent = "Следующий вопрос";
  }
  nextBtn.disabled = false;

  renderMinimap();
}

export function goToNextQuestion() {
  const total = appState.activeQuizQuestions.length;
  appState.activeQuizIndex++;

  if (appState.activeQuizIndex < total) {
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
}

export function finishQuiz() {
  const score = appState.activeQuizScore;
  const total = appState.activeQuizQuestions.length;
  const percentage = Math.round((score / total) * 100);

  appState.stats.testsSolved += 1;
  appState.stats.avgPercent = Math.round((appState.stats.avgPercent * 9 + percentage) / 10);
  registerActivity();
  saveStateToStorage();
  updateUIFromState();

  if (appState.user.isLoggedIn) {
    api("/api/progress/attempt", {
      method: "POST",
      body: JSON.stringify({
        title: appState.activeQuizTitle,
        score,
        total,
      }),
    })
      .then((res) => {
        appState.stats.testsSolved = res.testsSolved;
        appState.stats.avgPercent = res.avgPercent;
        saveStateToStorage();
        updateUIFromState();
      })
      .catch(() => {});
  }

  if (appState.pendingAssignmentId) {
    const assignmentId = appState.pendingAssignmentId;
    appState.pendingAssignmentId = null;
    api(`/api/teacher/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: JSON.stringify({ score, total }),
    })
      .then(() => {
        showToast("✅ Задание выполнено", "Результат отправлен преподавателю.");
        renderStudentAssignments();
      })
      .catch(() => {});
  }

  const ring = document.getElementById("resultsRadialBar");
  const strokeOffset = 440 - (440 * percentage) / 100;
  ring.style.strokeDashoffset = strokeOffset;
  document.getElementById("resultsPercentText").textContent = `${percentage}%`;

  let titleText = "Попробуйте еще раз!";
  if (percentage >= 80) titleText = "Отличный результат!";
  else if (percentage >= 50) titleText = "Хорошая работа!";

  document.getElementById("resultsTitleText").textContent = titleText;
  document.getElementById("resultsScoreDetails").textContent =
    `Вы правильно ответили на ${score} из ${total} вопросов.`;

  let egeScore = 32 + Math.round((percentage * 68) / 100);
  document.getElementById("resultsEgeEstimation").textContent = `Примерный балл ЕГЭ: ~${egeScore} баллов`;

  document.getElementById("resultsRetryBtn").onclick = () => {
    startQuiz(appState.activeQuizQuestions, appState.activeQuizTitle, appState.activeQuizOrigin);
  };

  document.getElementById("resultsHomeBtn").onclick = () => {
    returnFromQuiz();
  };

  switchView("quiz-results");
  pushSubView({ view: "quiz-results" }, "#quiz-results");
}

export function returnFromQuiz() {
  const origin = appState.activeQuizOrigin;
  if (origin === "tests") {
    switchView("tests");
  } else if (origin === "subject" && appState.currentSubject) {
    loadSubjectDetail(appState.currentSubject.id);
  } else if (origin === "teacher") {
    switchView("teacher");
  } else {
    switchView("subjects");
  }
}

export function handleQuizKeydown(e) {
  const activeEl = document.activeElement;
  const isInputFocused =
    activeEl &&
    (activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA" ||
      activeEl.isContentEditable ||
      activeEl.getAttribute("contenteditable") === "true");

  const isCtrlOrCmd = e.ctrlKey || e.metaKey;

  if (isCtrlOrCmd && e.key === "Enter") {
    const selfModal = document.getElementById("selfAssessmentModal");
    if (selfModal && selfModal.classList.contains("active")) {
      const saveBtn = document.getElementById("saveSelfAssessmentBtn");
      if (saveBtn) {
        e.preventDefault();
        saveBtn.click();
        return;
      }
    }

    const mockExtended = document.getElementById("mockExtendedInput");
    if (activeEl === mockExtended) {
      e.preventDefault();
      const nextMockBtn = document.getElementById("mockNextBtn");
      const submitMockBtn = document.getElementById("mockSubmitBtn");
      if (nextMockBtn && !nextMockBtn.disabled) {
        nextMockBtn.click();
      } else if (submitMockBtn) {
        submitMockBtn.click();
      }
      mockExtended.blur();
      return;
    }

    const quizView = document.getElementById("view-quiz-player");
    if (quizView && quizView.classList.contains("active")) {
      const nextBtn = document.getElementById("quizNextBtn");
      if (nextBtn && !nextBtn.disabled) {
        e.preventDefault();
        nextBtn.click();
        return;
      }
    }
  }

  if (isInputFocused) {
    return;
  }

  const openModalOverlay = document.querySelector(".modal-overlay.active");
  if (openModalOverlay) {
    return;
  }

  const quizView = document.getElementById("view-quiz-player");
  if (!quizView || !quizView.classList.contains("active")) {
    return;
  }

  if (["1", "2", "3", "4"].includes(e.key)) {
    const optionIdx = parseInt(e.key, 10) - 1;
    const optionBtns = document.querySelectorAll("#quizOptionsGrid .quiz-option-btn");
    if (optionBtns && optionBtns[optionIdx]) {
      e.preventDefault();
      optionBtns[optionIdx].click();
    }
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goToPrevQuestion();
    return;
  }

  if (e.key === "ArrowRight") {
    e.preventDefault();
    const nextBtn = document.getElementById("quizNextBtn");
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.click();
    } else if (appState.activeQuizQuestions && appState.activeQuizIndex < appState.activeQuizQuestions.length - 1) {
      goToNextQuestion();
    }
    return;
  }
}

let quizEventsInitialized = false;

export function initQuizEvents() {
  if (quizEventsInitialized) return;
  quizEventsInitialized = true;
  window.addEventListener("keydown", handleQuizKeydown);
}

