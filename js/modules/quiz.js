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
  appState.activeQuizAnswers = [];

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
    if (nextBtn.textContent === "Проверить ответ") {
      checkQuizAnswer();
    } else {
      goToNextQuestion();
    }
  };

  switchView("quiz-player");
  pushSubView({ view: "quiz-player" }, "#quiz-player");
}

export function renderQuizQuestion() {
  const total = appState.activeQuizQuestions.length;
  const curr = appState.activeQuizIndex + 1;
  const q = appState.activeQuizQuestions[appState.activeQuizIndex];

  document.getElementById("quizProgressText").textContent = `Вопрос ${curr} из ${total}`;
  const pct = (appState.activeQuizIndex / total) * 100;
  document.getElementById("quizProgressBar").style.width = `${pct}%`;

  document.getElementById("quizQuestionText").textContent = q.question;

  const optionsGrid = document.getElementById("quizOptionsGrid");
  optionsGrid.innerHTML = "";

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

export function checkQuizAnswer() {
  const q = appState.activeQuizQuestions[appState.activeQuizIndex];
  const selectedIdx = appState.activeSelectedOptionIndex;
  const options = document.querySelectorAll(".quiz-option-btn");

  const isCorrect = selectedIdx === q.correctIndex;

  if (isCorrect) {
    appState.activeQuizScore++;
    options[selectedIdx].className = "quiz-option-btn checked-correct";
    showToast("🎉 Правильно!", "Отличный ответ!");
  } else {
    options[selectedIdx].className = "quiz-option-btn checked-incorrect";
    options[q.correctIndex].className = "quiz-option-btn checked-correct";
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
