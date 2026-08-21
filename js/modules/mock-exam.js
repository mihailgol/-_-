import { api } from "./utils.js";
import { showToast, openModal } from "./ui.js";
import { appState } from "./state.js";

let currentMockExam = null;
let currentQuestions = [];
let userAnswers = {};
let currentQuestionIndex = 0;
let timerInterval = null;
let remainingSeconds = 0;
let timeSpentSeconds = 0;
let warned15m = false;
let warned5m = false;

export async function renderMockExamCatalog() {
  const container = document.getElementById("mockExamList");
  if (!container) return;

  try {
    const data = await api("/api/mock-exams");
    let mockExams = data.mockExams || [];
    if (appState.selectedExamType && appState.selectedExamType !== "all") {
      mockExams = mockExams.filter((exam) => exam.examType === appState.selectedExamType);
    }

    if (mockExams.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 40px;">Нет доступных пробных экзаменов</div>`;
      return;
    }

    container.innerHTML = mockExams
      .map((exam) => {
        const isLocked = exam.isLocked;
        const badgeText = exam.examType === "EGE" ? "ЕГЭ (235 мин)" : "ОГЭ (210 мин)";
        const lockIcon = isLocked ? `<span class="premium-badge">👑 Premium</span>` : `<span class="free-badge">Бесплатно</span>`;

        return `
          <div class="mock-exam-card ${isLocked ? "locked" : ""}" data-id="${exam.id}" style="background: var(--color-card-bg); border-radius: 16px; padding: 24px; border: 1px solid var(--color-border); position: relative; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="exam-type-badge" style="background: var(--color-bg-secondary); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;">${badgeText}</span>
                ${lockIcon}
              </div>
              <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 1.15rem;">${exam.title}</h3>
              <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 16px;">
                Вопросов: ${exam.totalQuestions} • Длительность: ${exam.durationMinutes} мин
              </p>
            </div>
            <button class="btn-primary start-mock-btn" data-id="${exam.id}" ${isLocked ? "data-locked='true'" : ""} style="width: 100%;">
              ${isLocked ? "Открыть доступ (Premium)" : "Начать пробник"}
            </button>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll(".start-mock-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const examId = btn.getAttribute("data-id");
        const isLocked = btn.getAttribute("data-locked") === "true";
        if (isLocked) {
          openModal("premiumModal");
          showToast("🔒 Доступ ограничен", "Подключите Premium для прохождения этого вариантa!");
        } else {
          startMockExam(examId);
        }
      });
    });
  } catch (err) {
    console.error("Failed to fetch mock exams catalog:", err);
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 40px;">Ошибка загрузки пробных экзаменов</div>`;
  }
}

export async function startMockExam(examId) {
  try {
    const examData = await api(`/api/mock-exams/${examId}`);
    currentMockExam = examData;
    currentQuestions = examData.questions || [];
    userAnswers = {};
    currentQuestionIndex = 0;
    warned15m = false;
    warned5m = false;

    remainingSeconds = (examData.durationMinutes || 210) * 60;
    timeSpentSeconds = 0;

    document.getElementById("mockCatalogScreen").style.display = "none";
    document.getElementById("mockResultsScreen").style.display = "none";
    document.getElementById("mockPlayerScreen").style.display = "block";

    document.getElementById("mockExamTitle").textContent = examData.title;
    document.getElementById("mockExamSubtitle").textContent = `${examData.examType} • ${currentQuestions.length} вопросов`;

    updateTimerDisplay();
    startTimer();
    renderCurrentQuestion();
    renderNavGrid();
  } catch (err) {
    console.error("Failed to start mock exam:", err);
    showToast("⚠️ Ошибка", "Не удалось запустить пробный экзамен.");
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remainingSeconds--;
    timeSpentSeconds++;

    updateTimerDisplay();

    if (remainingSeconds === 900 && !warned15m) {
      warned15m = true;
      showToast("⏳ Внимание", "Осталось 15 минут до завершения экзамена!");
    } else if (remainingSeconds === 300 && !warned5m) {
      warned5m = true;
      showToast("⚠️ Внимание", "Осталось 5 минут до завершения экзамена!");
    }

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      showToast("⏰ Время вышло!", "Ваш результат отправляется на проверку.");
      submitMockExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const display = document.getElementById("mockTimerDisplay");
  if (!display) return;

  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  display.textContent = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

  if (remainingSeconds <= 300) {
    display.style.color = "var(--color-danger, #ff4d4f)";
  } else if (remainingSeconds <= 900) {
    display.style.color = "var(--color-warning, #faad14)";
  } else {
    display.style.color = "inherit";
  }
}

function renderCurrentQuestion() {
  const container = document.getElementById("mockQuestionArea");
  if (!container || !currentQuestions[currentQuestionIndex]) return;

  const q = currentQuestions[currentQuestionIndex];
  const selectedIdx = userAnswers[q.id];

  container.innerHTML = `
    <div style="font-weight: 600; color: var(--color-purple); margin-bottom: 8px;">
      Вопрос ${currentQuestionIndex + 1} из ${currentQuestions.length}
    </div>
    <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; line-height: 1.5;">${q.question}</h3>
    <div class="mock-options-list" style="display: flex; flex-direction: column; gap: 12px;">
      ${q.options
        .map(
          (opt, idx) => `
        <button class="mock-option-item ${selectedIdx === idx ? "selected" : ""}" data-idx="${idx}">
          <span class="option-badge-circle" style="display: inline-flex; justify-content: center; align-items: center; width: 28px; height: 28px; border-radius: 50%; font-weight: 600; flex-shrink: 0;">
            ${String.fromCharCode(65 + idx)}
          </span>
          <span style="font-size: 1rem; font-weight: 500;">${opt}</span>
        </button>
      `
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll(".mock-option-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"), 10);
      userAnswers[q.id] = idx;
      renderCurrentQuestion();
      renderNavGrid();
    });
  });

  const prevBtn = document.getElementById("mockPrevBtn");
  const nextBtn = document.getElementById("mockNextBtn");
  if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
  if (nextBtn) nextBtn.disabled = currentQuestionIndex === currentQuestions.length - 1;
}

function renderNavGrid() {
  const container = document.getElementById("mockNavGrid");
  if (!container) return;

  container.innerHTML = currentQuestions
    .map((q, idx) => {
      const isAnswered = userAnswers[q.id] !== undefined;
      const isActive = idx === currentQuestionIndex;

      return `
        <button class="mock-nav-item ${isActive ? "active" : ""} ${isAnswered ? "answered" : ""}" data-idx="${idx}">
          ${idx + 1}
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".mock-nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentQuestionIndex = parseInt(btn.getAttribute("data-idx"), 10);
      renderCurrentQuestion();
      renderNavGrid();
    });
  });
}

export async function submitMockExam(_autoSubmit = false) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (!currentMockExam) return;

  try {
    const res = await api(`/api/mock-exams/${currentMockExam.id}/submit`, {
      method: "POST",
      body: JSON.stringify({
        answers: userAnswers,
        timeSpentSeconds,
      }),
    });

    renderResultsScreen(res);
  } catch (err) {
    console.error("Failed to submit mock exam:", err);
    showToast("⚠️ Ошибка", "Не удалось отправить результат экзамена.");
  }
}

function renderResultsScreen(result) {
  document.getElementById("mockPlayerScreen").style.display = "none";
  document.getElementById("mockResultsScreen").style.display = "block";

  document.getElementById("mockResultsExamTitle").textContent = currentMockExam.title;
  document.getElementById("mockPrimaryScore").textContent = `${result.primaryScore} / ${result.maxPrimaryScore}`;
  document.getElementById("mockSecondaryScore").textContent = result.secondaryScore;

  const breakdownContainer = document.getElementById("mockBreakdownArea");
  if (breakdownContainer && result.breakdown) {
    breakdownContainer.innerHTML = `
      <h3 style="margin-top: 24px; margin-bottom: 16px;">Разбор заданий</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${result.breakdown
          .map(
            (b, idx) => `
          <div style="padding: 16px; border-radius: 12px; border: 1px solid ${b.isCorrect ? "var(--color-green, #52c41a)" : "var(--color-danger, #ff4d4f)"}; background: var(--color-bg-secondary);">
            <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Задание №${idx + 1}</span>
              <span style="color: ${b.isCorrect ? "var(--color-green, #52c41a)" : "var(--color-danger, #ff4d4f)"};">
                ${b.isCorrect ? "✓ Верно" : "✗ Неверно"} (${b.isCorrect ? b.points : 0}/${b.points} б.)
              </span>
            </div>
            <p style="margin-top: 0; margin-bottom: 12px; font-weight: 500;">${b.question}</p>
            ${b.explanation ? `<div style="font-size: 0.875rem; color: var(--color-text-secondary); border-top: 1px dashed var(--color-border); padding-top: 8px;">💡 ${b.explanation}</div>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }
}

export function initMockExamEvents() {
  const prevBtn = document.getElementById("mockPrevBtn");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
        renderNavGrid();
      }
    });
  }

  const nextBtn = document.getElementById("mockNextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
        renderNavGrid();
      }
    });
  }

  const submitBtn = document.getElementById("mockSubmitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const answeredCount = Object.keys(userAnswers).length;
      const totalCount = currentQuestions.length;
      if (answeredCount < totalCount) {
        if (confirm(`Вы ответили на ${answeredCount} из ${totalCount} вопросов. Завершить экзамен?`)) {
          submitMockExam(false);
        }
      } else {
        submitMockExam(false);
      }
    });
  }

  const backBtn = document.getElementById("mockBackToCatalogBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      document.getElementById("mockResultsScreen").style.display = "none";
      document.getElementById("mockPlayerScreen").style.display = "none";
      document.getElementById("mockCatalogScreen").style.display = "block";
      renderMockExamCatalog();
    });
  }

  const openModalBtn = document.getElementById("openCreateMockModalBtn");
  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openModal("createMockModal");
    });
  }

  const examTypeSelect = document.getElementById("createMockExamType");
  const durationInput = document.getElementById("createMockDuration");
  if (examTypeSelect && durationInput) {
    examTypeSelect.addEventListener("change", () => {
      if (examTypeSelect.value === "OGE") {
        durationInput.value = "210";
      } else {
        durationInput.value = "235";
      }
    });
  }

  const createForm = document.getElementById("createMockForm");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("createMockTitle")?.value.trim();
      const subjectId = document.getElementById("createMockSubject")?.value || "math";
      const examType = document.getElementById("createMockExamType")?.value || "EGE";
      const durationMinutes = parseInt(document.getElementById("createMockDuration")?.value || "235", 10);
      const totalQuestions = parseInt(document.getElementById("createMockQuestionCount")?.value || "5", 10);
      const isPremium = Boolean(document.getElementById("createMockIsPremium")?.checked);

      if (!title) {
        showToast("⚠️ Ошибка", "Заполните название пробника");
        return;
      }

      try {
        await api("/api/mock-exams", {
          method: "POST",
          body: JSON.stringify({
            title,
            subjectId,
            examType,
            durationMinutes,
            totalQuestions,
            isPremium,
          }),
        });

        const { closeModal } = await import("./ui.js");
        closeModal("createMockModal");
        createForm.reset();
        showToast("✅ Успешно!", "Новый пробный экзамен создан.");
        renderMockExamCatalog();
      } catch (err) {
        showToast("⚠️ Ошибка создания", err.message || "Не удалось создать пробник");
      }
    });
  }
}
