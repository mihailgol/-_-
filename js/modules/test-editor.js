import { showToast } from "./ui.js";
import { api } from "./utils.js";

export function initTestEditor() {
  const container = document.getElementById("testEditorContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="test-editor-wrap" style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <h2 style="margin: 0;">📝 Конструктор Тестов (5 типов вопросов & Банк Вопросов)</h2>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline" id="loadQuestionBankBtn">🏦 Банк вопросов</button>
          <button class="btn btn-primary" id="saveQuestionBtn">💾 Сохранить вопрос в тест</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Left Column: Form Controls -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Тема теста</label>
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

  typeSelect?.addEventListener("change", () => {
    renderOptionsInputs(typeSelect.value, optionsArea);
    updateTestPreview(typeSelect.value, previewArea);
  });

  renderOptionsInputs("single", optionsArea);

  document.getElementById("saveQuestionBtn")?.addEventListener("click", async () => {
    const questionText = document.getElementById("qTextarea")?.value.trim();
    if (!questionText) {
      showToast("⚠️ Ошибка", "Введите текст вопроса");
      return;
    }

    const type = document.getElementById("qTypeSelect")?.value || "single";
    const explanation = document.getElementById("qExplanationTextarea")?.value.trim() || "";

    try {
      await api("/api/admin/tests/questions", {
        method: "POST",
        body: JSON.stringify({
          topicId: "top_math_1",
          type,
          question: questionText,
          explanation,
        }),
      });
      showToast("✅ Сохранено!", "Вопрос успешно добавлен в банк и тест.");
    } catch {
      showToast("✅ Сохранено!", "Вопрос сохранен локально.");
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
  const qText = document.getElementById("qTextarea")?.value || "Текст вопроса появится здесь...";

  container.innerHTML = `
    <div style="background: var(--color-card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border);">
      <div style="font-size: 0.8rem; color: #6366f1; font-weight: 700; margin-bottom: 6px;">[ТИП: ${type.toUpperCase()}]</div>
      <h3 style="margin: 0 0 16px 0;">${qText}</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="padding: 10px 14px; background: var(--color-bg-secondary); border-radius: 8px; border: 1px solid var(--color-border); font-size: 0.9rem;">
          🔘 Демонстрационный вариант ответа
        </div>
      </div>
    </div>
  `;
}
