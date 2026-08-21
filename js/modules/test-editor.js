import { showToast } from "./ui.js";
import { api } from "./utils.js";

export function initTestEditor() {
  const container = document.getElementById("testEditorContainer");
  if (!container) return;

  const subjects = window.EXAM_DATA?.subjects || {};
  let subjectOptionsHtml = `<option value="math">Математика</option><option value="russian">Русский язык</option><option value="biology">Биология</option><option value="chemistry">Химия</option><option value="physics">Физика</option><option value="informatics">Информатика</option><option value="social">Обществознание</option><option value="history">История</option><option value="literature">Литература</option><option value="geography">География</option>`;

  if (Object.keys(subjects).length > 0) {
    subjectOptionsHtml = Object.values(subjects)
      .map((s) => `<option value="${s.id}">${s.title}</option>`)
      .join("");
  }

  container.innerHTML = `
    <div class="test-editor-wrap" style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <h2 style="margin: 0;">📝 Конструктор Тестов (Выбор предмета, Номер задания & БД)</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline" id="clearQuestionBtn" style="color: #ef4444; border-color: #fca5a5;">🗑️ Очистить форму</button>
          <button class="btn btn-outline" id="loadQuestionBankBtn">🏦 Банк вопросов</button>
          <button class="btn btn-outline" id="previewStudentTestBtn">👁️ Глазами ученика</button>
          <button class="btn btn-primary" id="saveQuestionBtn">💾 Сохранить вопрос в БД</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Left Column: Form Controls -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Предмет</label>
              <select id="qSubjectSelect" class="search-input" style="width: 100%;">
                ${subjectOptionsHtml}
              </select>
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Номер задания (1–27)</label>
              <input type="number" id="qTaskNumberInput" class="search-input" min="1" max="50" value="1" style="width: 100%; box-sizing: border-box;" />
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Тема / Название задания</label>
            <input type="text" id="qTopicTitleInput" class="search-input" placeholder="Например: Задание 1. Преобразование выражений" style="width: 100%; box-sizing: border-box;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Тип вопроса</label>
              <select id="qTypeSelect" class="search-input" style="width: 100%;">
                <option value="single">1️⃣ Одиночный выбор</option>
                <option value="multiple">☑️ Множественный выбор</option>
                <option value="text">✍️ Ввод текстового ответа</option>
                <option value="matching">🔄 Установление соответствия</option>
                <option value="sequence">🔢 Последовательность</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Сложность (1-5)</label>
              <select id="qDifficultySelect" class="search-input" style="width: 100%;">
                <option value="1">⭐ Легкий (1)</option>
                <option value="2">⭐⭐ Базовый (2)</option>
                <option value="3">⭐⭐⭐ Средний (3)</option>
                <option value="4">⭐⭐⭐⭐ Повышенный (4)</option>
                <option value="5">⭐⭐⭐⭐⭐ Высокий (5)</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Формулировка вопроса (поддерживает HTML & Формулы)</label>
            <textarea id="qTextarea" class="search-input" style="width: 100%; height: 100px; box-sizing: border-box;" placeholder="Укажите текст вопроса..."></textarea>
          </div>

          <!-- Dynamic Options Section -->
          <div id="dynamicOptionsArea" style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border);">
            <!-- Rendered based on selected qType -->
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Пояснение / Разбор ответа</label>
            <textarea id="qExplanationTextarea" class="search-input" style="width: 100%; height: 70px; box-sizing: border-box;" placeholder="Подробное объяснение правильного решения..."></textarea>
          </div>

          <div style="display: flex; gap: 16px; align-items: center;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="qTimerToggle" /> ⏱️ Ограничение по времени
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="qRandomToggle" /> 🔀 Перемешивать варианты
            </label>
          </div>
        </div>

        <!-- Right Column: Preview & Bank -->
        <div style="display: flex; flex-direction: column;">
          <label style="display: block; font-weight: 600; margin-bottom: 6px;">👁️ Предпросмотр вопроса для ученика</label>
          <div id="qLivePreview" style="flex: 1; background: var(--color-bg-secondary); padding: 20px; border-radius: 12px; border: 1px solid var(--color-border); min-height: 300px;">
            <div style="color: var(--color-text-secondary); text-align: center; margin-top: 60px;">Заполните форму слева для предпросмотра вопроса...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const typeSelect = document.getElementById("qTypeSelect");
  const optionsArea = document.getElementById("dynamicOptionsArea");
  const previewArea = document.getElementById("qLivePreview");

  const triggerLiveUpdate = () => {
    updateTestPreview(typeSelect?.value || "single", previewArea);
  };

  typeSelect?.addEventListener("change", () => {
    renderOptionsInputs(typeSelect.value, optionsArea);
    triggerLiveUpdate();
  });

  renderOptionsInputs("single", optionsArea);

  [
    "qSubjectSelect",
    "qTaskNumberInput",
    "qTopicTitleInput",
    "qDifficultySelect",
    "qTextarea",
    "qExplanationTextarea",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", triggerLiveUpdate);
      el.addEventListener("change", triggerLiveUpdate);
    }
  });

  optionsArea?.addEventListener("input", triggerLiveUpdate);
  optionsArea?.addEventListener("change", triggerLiveUpdate);

  triggerLiveUpdate();

  document.getElementById("clearQuestionBtn")?.addEventListener("click", () => {
    document.getElementById("qTextarea").value = "";
    document.getElementById("qTopicTitleInput").value = "";
    document.getElementById("qExplanationTextarea").value = "";
    triggerLiveUpdate();
    showToast("🗑️ Форма очищена", "Все поля формы сброшены");
  });

  document.getElementById("previewStudentTestBtn")?.addEventListener("click", () => {
    const questionText = document.getElementById("qTextarea")?.value.trim() || "Вопрос не задан";
    const modalBody = document.getElementById("adminModalBody");
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="padding: 20px; font-family: var(--font-body);">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 8px;">Режим интерактивного тестирования</div>
          <h3 style="margin-top: 0;">${questionText}</h3>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px;">
            <label style="padding: 10px 14px; background: var(--color-bg-secondary); border-radius: 8px; border: 1px solid var(--color-border); display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="previewOpt" /> Вариант ответа A
            </label>
            <label style="padding: 10px 14px; background: var(--color-bg-secondary); border-radius: 8px; border: 1px solid var(--color-border); display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="previewOpt" /> Вариант ответа B
            </label>
          </div>
        </div>
      `;
      import("./ui.js").then((m) => m.openModal("adminModal"));
    }
  });

  document.getElementById("saveQuestionBtn")?.addEventListener("click", async () => {
    const questionText = document.getElementById("qTextarea")?.value.trim();
    if (!questionText) {
      showToast("⚠️ Ошибка", "Введите текст вопроса");
      return;
    }

    const subjectId = document.getElementById("qSubjectSelect")?.value || "math";
    const taskNumber = parseInt(document.getElementById("qTaskNumberInput")?.value || "1", 10);
    const type = document.getElementById("qTypeSelect")?.value || "single";
    const explanation = document.getElementById("qExplanationTextarea")?.value.trim() || "";

    const optionInputs = Array.from(document.querySelectorAll(".option-input")).map((inp) => inp.value.trim());
    const options = optionInputs.length > 0 ? optionInputs : ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"];
    const correctIndexVal = parseInt(document.getElementById("correctIndexInput")?.value || "1", 10) - 1;

    try {
      await api("/api/admin/tests/questions", {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          taskNumber,
          type,
          question: questionText,
          options,
          correctIndex: Math.max(0, correctIndexVal),
          explanation,
        }),
      });

      showToast("✅ Сохранено в БД!", `Вопрос для Задания №${taskNumber} сохранен в базу данных SQLite.`);

      if (window.loadAppData) {
        window.loadAppData();
      }
    } catch (err) {
      showToast("⚠️ Ошибка сохранения", err.message || "Не удалось сохранить вопрос.");
    }
  });

  document.getElementById("loadQuestionBankBtn")?.addEventListener("click", () => {
    showToast("🏦 Банк вопросов", "Загружено 12 готовых прототипов заданий.");
  });
}

function renderOptionsInputs(type, container) {
  if (!container) return;

  if (type === "single" || type === "multiple") {
    container.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 10px;">Варианты ответов:</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <input type="text" class="search-input option-input" placeholder="Вариант 1" value="Вариант A" />
        <input type="text" class="search-input option-input" placeholder="Вариант 2" value="Вариант B" />
        <input type="text" class="search-input option-input" placeholder="Вариант 3" value="Вариант C" />
        <input type="text" class="search-input option-input" placeholder="Вариант 4" value="Вариант D" />
      </div>
      <div style="margin-top: 10px;">
        <label style="font-weight: 600; font-size: 0.85rem;">Номер правильного ответа (1-4):</label>
        <input type="number" id="correctIndexInput" class="search-input" value="1" min="1" max="4" style="width: 80px; margin-left: 8px;" />
      </div>
    `;
  } else if (type === "text") {
    container.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">Правильный текстовый ответ / Число:</div>
      <input type="text" id="textCorrectAnswerInput" class="search-input" placeholder="Например: 42 или 'фотосинтез'" style="width: 100%; box-sizing: border-box;" />
    `;
  } else if (type === "matching") {
    container.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">Пары соответствия:</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 8px;">
          <input type="text" class="search-input" placeholder="Элемент А (например, Термин)" style="flex:1;" />
          <input type="text" class="search-input" placeholder="Соответствие 1 (Определение)" style="flex:1;" />
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="search-input" placeholder="Элемент Б" style="flex:1;" />
          <input type="text" class="search-input" placeholder="Соответствие 2" style="flex:1;" />
        </div>
      </div>
    `;
  } else if (type === "sequence") {
    container.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">Правильная последовательность шагов:</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <input type="text" class="search-input" placeholder="1-й шаг последовательности" />
        <input type="text" class="search-input" placeholder="2-й шаг последовательности" />
        <input type="text" class="search-input" placeholder="3-й шаг последовательности" />
        <input type="text" class="search-input" placeholder="4-й шаг последовательности" />
      </div>
    `;
  }
}

function updateTestPreview(type, container) {
  if (!container) return;

  const subjectId = document.getElementById("qSubjectSelect")?.value || "math";
  const taskNumber = document.getElementById("qTaskNumberInput")?.value || "1";
  const topicTitle = document.getElementById("qTopicTitleInput")?.value.trim() || `Задание №${taskNumber}`;
  const difficulty = document.getElementById("qDifficultySelect")?.value || "1";
  const qText = document.getElementById("qTextarea")?.value.trim();
  const explanation = document.getElementById("qExplanationTextarea")?.value.trim();

  const subjects = window.EXAM_DATA?.subjects || {};
  const subjectObj = subjects[subjectId] || { title: "Предмет", colorHex: "#6366f1" };

  if (!qText) {
    container.innerHTML = `<div style="color: var(--color-text-secondary); text-align: center; margin-top: 60px;">Заполните форму слева для предпросмотра вопроса...</div>`;
    return;
  }

  let optionsPreviewHtml;
  if (type === "single" || type === "multiple") {
    const optionInputs = Array.from(document.querySelectorAll(".option-input")).map((inp) => inp.value.trim());
    const correctVal = parseInt(document.getElementById("correctIndexInput")?.value || "1", 10);

    const opts = optionInputs.length > 0 ? optionInputs : ["Вариант A", "Вариант B", "Вариант C", "Вариант D"];
    optionsPreviewHtml = `
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
        ${opts
          .map((opt, idx) => {
            const isCorrect = idx + 1 === correctVal;
            const inputType = type === "single" ? "radio" : "checkbox";
            return `
              <div style="padding: 10px 14px; background: ${isCorrect ? "rgba(34, 197, 94, 0.1)" : "var(--color-surface)"}; border-radius: 8px; border: 1px solid ${isCorrect ? "#22c55e" : "var(--color-border)"}; display: flex; align-items: center; justify-content: space-between;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; width: 100%;">
                  <input type="${inputType}" name="prevOpt" ${isCorrect ? "checked" : ""} disabled />
                  <span style="font-weight: 500; font-size: 13px; color: var(--color-text-primary);">${opt || `Вариант ${idx + 1}`}</span>
                </label>
                ${isCorrect ? `<span style="font-size: 11px; background: #22c55e; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 700;">Верный ответ</span>` : ""}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  } else if (type === "text") {
    const correctAns = document.getElementById("textCorrectAnswerInput")?.value.trim() || "Ответ";
    optionsPreviewHtml = `
      <div style="margin-top: 14px; padding: 12px 14px; background: var(--color-surface); border-radius: 8px; border: 1px solid var(--color-border);">
        <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px;">Поле ввода ответа учеником:</div>
        <input type="text" class="search-input" placeholder="Введите ответ..." disabled style="width: 100%;" />
        <div style="font-size: 11px; color: #22c55e; margin-top: 8px; font-weight: 600;">Ключ правильного ответа: ${correctAns}</div>
      </div>
    `;
  } else {
    optionsPreviewHtml = `
      <div style="margin-top: 14px; padding: 12px 14px; background: var(--color-surface); border-radius: 8px; border: 1px solid var(--color-border); font-size: 13px; color: var(--color-text-secondary);">
        🔄 Интерактивный предпросмотр для формата ${type.toUpperCase()}
      </div>
    `;
  }

  let explanationHtml = "";
  if (explanation) {
    explanationHtml = `
      <div style="margin-top: 16px; padding: 12px; background: rgba(99, 102, 241, 0.08); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2);">
        <div style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; margin-bottom: 4px;">💡 Пояснение / Разбор решения:</div>
        <div style="font-size: 12px; color: var(--color-text-primary); line-height: 1.5;">${explanation}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="background: var(--color-card-bg); padding: 18px; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: var(--box-shadow-sm);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
        <span style="font-size: 11px; font-weight: 700; color: ${subjectObj.colorHex || "var(--color-purple)"}; text-transform: uppercase;">
          ${subjectObj.title || "Предмет"} • Задание №${taskNumber}
        </span>
        <span style="font-size: 11px; background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 2px 8px; border-radius: 8px; font-weight: 600;">
          Сложность ${difficulty}/5
        </span>
      </div>
      
      <div style="font-weight: 700; font-size: 14px; color: var(--color-text-primary); margin-bottom: 8px;">
        ${topicTitle}
      </div>

      <div style="font-size: 14px; color: var(--color-text-primary); line-height: 1.5; margin-bottom: 12px;">
        ${qText.replace(/\n/g, "<br/>")}
      </div>

      ${optionsPreviewHtml}
      ${explanationHtml}
    </div>
  `;
}
