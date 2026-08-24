import { api } from "./utils.js";
import { showToast, openModal, closeModal } from "./ui.js";
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
  const isExtended = q.type === "extended";

  if (isExtended) {
    const currentVal = userAnswers[q.id] || "";
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 600; color: var(--color-purple);">Вопрос ${currentQuestionIndex + 1} из ${currentQuestions.length}</span>
        <span style="background: var(--color-purple-light, rgba(147, 51, 234, 0.1)); color: var(--color-purple); padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">
          Часть 2 • Развернутый ответ (до ${q.maxPoints || 3} б.)
        </span>
      </div>
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 1.15rem; line-height: 1.5;">${q.question}</h3>
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--color-text-secondary);">Ваш развернутый ответ:</label>
        <textarea
          id="mockExtendedInput"
          style="width: 100%; height: 160px; padding: 12px; border: 1.5px solid var(--color-border); border-radius: 12px; font-family: inherit; font-size: 0.95rem; resize: vertical; box-sizing: border-box; outline: none;"
          placeholder="Напишите подробное развернутое решение задачи или ответа на вопрос..."
        >${currentVal}</textarea>
        <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px; text-align: right;" id="mockTextCharCount">Символов: ${currentVal.length}</div>
      </div>
    `;

    const textarea = document.getElementById("mockExtendedInput");
    if (textarea) {
      textarea.addEventListener("input", (e) => {
        const val = e.target.value;
        userAnswers[q.id] = val;
        const charCount = document.getElementById("mockTextCharCount");
        if (charCount) charCount.textContent = `Символов: ${val.length}`;
        renderNavGrid();
      });
    }
  } else {
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
  }

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
      const isAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== "";
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
    let selfAssessPrompt = "";
    if (result.hasExtendedQuestions && result.extendedQuestions && result.extendedQuestions.length > 0) {
      selfAssessPrompt = `
        <div style="background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1.5px solid var(--color-purple); border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <h3 style="margin-top: 0; margin-bottom: 8px; color: var(--color-purple);">⚖️ Оценивание Части 2</h3>
          <p style="margin: 0 0 16px 0; font-size: 0.9rem; color: var(--color-text-secondary);">
            Этот вариант содержит <strong>${result.extendedQuestions.length}</strong> задание(я) с развернутым ответом. Пройдите самооценку по критериям ФИПИ, чтобы получить итоговый тестовый балл!
          </p>
          <button class="btn-primary" id="openSelfAssessBtn" style="padding: 10px 24px;">⚖️ Перейти к самооценке Части 2</button>
        </div>
      `;
    }

    breakdownContainer.innerHTML = `
      ${selfAssessPrompt}
      <h3 style="margin-top: 24px; margin-bottom: 16px;">Разбор заданий</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${result.breakdown
          .map((b, idx) => {
            if (b.type === "extended") {
              return `
                <div style="padding: 16px; border-radius: 12px; border: 1.5px solid var(--color-purple); background: var(--color-bg-secondary);">
                  <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
                    <span>Задание №${idx + 1} (Развернутый ответ)</span>
                    <span style="color: var(--color-purple);">Часть 2 (макс. ${b.maxPoints} б.)</span>
                  </div>
                  <p style="margin-top: 0; margin-bottom: 8px; font-weight: 500;">${b.question}</p>
                  <div style="font-size: 0.875rem; background: var(--color-card-bg); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                    <strong>Ваш ответ:</strong> ${b.studentAnswer || "<i>Ответ не введен</i>"}
                  </div>
                </div>
              `;
            }

            return `
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
            `;
          })
          .join("")}
      </div>
    `;

    const openSelfBtn = document.getElementById("openSelfAssessBtn");
    if (openSelfBtn) {
      openSelfBtn.addEventListener("click", () => {
        openSelfAssessmentModal(result);
      });
    }
  }
}

function openSelfAssessmentModal(result) {
  const container = document.getElementById("selfAssessmentBody");
  if (!container || !result.extendedQuestions) return;

  const extQuestions = result.extendedQuestions;

  container.innerHTML = extQuestions
    .map(
      (q, idx) => `
      <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px;" data-q-id="${q.id}">
        <div style="font-weight: 700; font-size: 1rem; color: var(--color-purple); margin-bottom: 8px;">
          Задание №${idx + 1} (Часть 2 • макс. ${q.maxPoints} б.)
        </div>
        <div style="font-weight: 600; margin-bottom: 14px; font-size: 1.05rem;">${q.question}</div>

        <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px;">Ваш написанный ответ:</div>
          <div style="font-size: 0.95rem; white-space: pre-wrap;">${q.studentAnswer || "<em style='color: var(--color-text-secondary);'>Ответ не введен</em>"}</div>
        </div>

        <div style="background: rgba(82, 196, 26, 0.08); border: 1px solid var(--color-green); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-green); text-transform: uppercase; margin-bottom: 4px;">🔑 Официальный ключ решений (ФИПИ):</div>
          <div style="font-size: 0.95rem; white-space: pre-wrap;">${q.solutionKey || "Ключ не предоставлен"}</div>
        </div>

        <div style="margin-top: 12px;">
          <label style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 8px;">Выставите вашу самооценку (от 0 до ${q.maxPoints} б.):</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${Array.from({ length: q.maxPoints + 1 })
              .map(
                (_, pts) => `
              <label style="display: inline-flex; align-items: center; gap: 6px; background: var(--color-card-bg); border: 1.5px solid var(--color-border); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
                <input type="radio" name="self_score_${q.id}" value="${pts}" ${pts === 0 ? "checked" : ""} />
                ${pts} б.
              </label>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `
    )
    .join("");

  openModal("selfAssessmentModal");

  const saveBtn = document.getElementById("saveSelfAssessmentBtn");
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const selfScores = {};
      extQuestions.forEach((q) => {
        const checkedRadio = document.querySelector(`input[name="self_score_${q.id}"]:checked`);
        const score = checkedRadio ? parseInt(checkedRadio.value, 10) : 0;
        selfScores[q.id] = { score, breakdown: { score } };
      });

      try {
        const res = await api(`/api/mock-exams/${currentMockExam.id}/self-assess`, {
          method: "POST",
          body: JSON.stringify({
            attemptId: result.attemptId,
            selfScores,
          }),
        });

        closeModal("selfAssessmentModal");
        showToast("🎉 Успешно", "Самооценка сохранена! Итоговый результат обновлен.");

        document.getElementById("mockPrimaryScore").textContent = `${res.primaryScore} / ${result.maxPrimaryScore}`;
        document.getElementById("mockSecondaryScore").textContent = res.secondaryScore;
      } catch (err) {
        console.error("Failed to save self-assessment:", err);
        showToast("⚠️ Ошибка", "Не удалось сохранить самооценку.");
      }
    };
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
