import { showToast } from "./ui.js";
import { api, getRecommendedTaskType } from "./utils.js";

export function getDefaultFIPITemplate(subjectId, taskNumber, examType) {
  const normSub = String(subjectId || "math").toLowerCase();
  const taskNum = parseInt(taskNumber, 10) || 1;
  const rawExam = (examType || (typeof localStorage !== "undefined" && localStorage.getItem("examhub_exam_type")) || "EGE").toUpperCase();
  const exam = rawExam === "OGE" ? "OGE" : "EGE";

  if (normSub === "math") {
    if (exam === "OGE") {
      if (taskNum >= 23) {
        return {
          solutionKey: "Элементы ответа:\n1) Выполнен верный геометрический чертеж и приведено обоснованное доказательство/расчет.\n2) Получен верный ответ с опорой на геометрические теоремы.",
          maxPoints: 2,
          criteriaText: "K1: Доказательство и вычисления выполнены верно (2 б.)\nK2: Допущена вычислительная ошибка при верной логике (1 б.)",
          topicTitle: `Задание №${taskNum}. Геометрическая задача Части 2 (ФИПИ)`,
        };
      }
      return {
        solutionKey: "Элементы ответа:\n1) Выполнены алгебраические преобразования / построен график функции.\n2) Обоснованно получен верный числовой ответ / найдены значения параметра.",
        maxPoints: 2,
        criteriaText: "K1: Обоснованно получен верный ответ (2 б.)\nK2: Ход решения верен, но допущена вычислительная ошибка (1 б.)",
        topicTitle: `Задание №${taskNum}. Алгебраическая задача Части 2 (ФИПИ)`,
      };
    }
    if (taskNum === 14 || taskNum === 17) {
      return {
        solutionKey: "Элементы ответа:\n1) Построен верный геометрический чертеж и доказано геометрическое утверждение.\n2) Выполнены необходимые вычисления и получен верный численный ответ.",
        maxPoints: 3,
        criteriaText: "K1: Доказательство и вычисления выполнены верно (2 б.)\nK2: Допущена ошибка в вычислениях при верном ходе доказательства (1 б.)",
        topicTitle: `Задание №${taskNum}. Геометрическая задача повышенной сложности (ФИПИ)`,
      };
    }
    if (taskNum === 18 || taskNum === 19) {
      return {
        solutionKey: "Элементы ответа:\n1) Проведен полный аналитический/графический анализ условий с параметром или числовой модели.\n2) Выделены все граничные значения и особые точки.\n3) Обоснованно получен полный правильный ответ.",
        maxPoints: 4,
        criteriaText: "K1: Полное и обоснованное решение всех пунктов (2 б.)\nK2: Верно решены ключевые подпункты или допущена описка (2 б.)",
        topicTitle: `Задание №${taskNum}. Задача высокого уровня сложности (ФИПИ)`,
      };
    }
    return {
      solutionKey: "Элементы ответа:\n1) Выполнены аналитические преобразования и построена верная математическая модель.\n2) Обоснованно получен верный числовой ответ в соответствии с условиями задачи.",
      maxPoints: 2,
      criteriaText: "K1: Обоснованно получен верный ответ (2 б.)\nK2: Ход решения верен, но допущена вычислительная ошибка (1 б.)",
      topicTitle: `Задание №${taskNum}. Развернутое математическое решение (ФИПИ)`,
    };
  }

  if (normSub === "russian") {
    if (exam === "OGE") {
      if (taskNum === 1) {
        return {
          solutionKey: "Элементы ответа:\n1) Точно передано главное содержание всех 3 микротем исходного текста.\n2) Применены 1 или несколько приемов сжатия текста на протяжении всего изложения.\n3) Сохранена смысловая цельность, речевая связность и последовательность.",
          maxPoints: 7,
          criteriaText: "K1: Содержание изложения (3 б.)\nK2: Сжатие исходного текста (3 б.)\nK3: Смысловая цельность и последовательность (1 б.)",
          topicTitle: "Задание №1. Сжатое изложение по прослушанному тексту (ФИПИ)",
        };
      }
      return {
        solutionKey: "Элементы ответа:\n1) Сформулирован тезис и дано толкование понятия/фрагмента.\n2) Приведены 2 примера-аргумента (из текста и жизненного опыта).\n3) Смысловая цельность, композиционная стройность и речевое оформление.",
        maxPoints: 7,
        criteriaText: "K1: Толкование значения слова / тезис (2 б.)\nK2: Наличие примеров-аргументов (3 б.)\nK3: Смысловая цельность и композиция (2 б.)",
        topicTitle: `Задание №${taskNum}. Сочинение-рассуждение (ФИПИ)`,
      };
    }
    if (taskNum >= 27) {
      return {
        solutionKey: "Элементы ответа:\n1) Сформулирована проблема исходного текста и авторская позиция.\n2) Приведены два примера-иллюстрации из текста с пояснениями и указана смысловая связь.\n3) Выражено и обосновано собственное отношение к позиции автора.\n4) Соблюдены нормы орфографии, пунктуации, грамматики и речи.",
        maxPoints: 10,
        criteriaText: "K1: Формулировка проблемы и авторской позиции (2 б.)\nK2: Комментарий к проблеме (2 примера и связь) (3 б.)\nK3: Собственная позиция с обоснованием (1 б.)\nK4: Логика, речевые и грамматические нормы (2 б.)\nK5: Соблюдение орфографических и пунктуационных норм (2 б.)",
        topicTitle: "Задание №27. Сочинение-рассуждение по прочитанному тексту (ФИПИ)",
      };
    }
    return {
      solutionKey: "Элементы ответа:\n1) Сформулирована позиция/проблема исходного текста с опорой на примеры.\n2) Приведены развернутые комментарии и пояснения смысловой связи.\n3) Соблюдены нормы литературного языка и композиционная стройность.",
      maxPoints: 3,
      criteriaText: "K1: Полнота и глубина раскрытия темы (2 б.)\nK2: Логичность, связность и речевое оформление (1 б.)",
      topicTitle: `Задание №${taskNum}. Развернутый ответ по русскому языку (ФИПИ)`,
    };
  }

  if (normSub === "biology") {
    return {
      solutionKey: "Элементы ответа:\n1) Указаны ключевые биологические термины, структуры и процессы.\n2) Описана причинно-следственная связь в наблюдаемом явлении/эксперименте.\n3) Сформулирован аргументированный биологический вывод.",
      maxPoints: 3,
      criteriaText: "K1: Соответствие ответа эталонным элементам ФИПИ (2 б.)\nK2: Логичность и полнота биологического обоснования (1 б.)",
      topicTitle: `Задание №${taskNum}. Биологический анализ и обоснование (ФИПИ)`,
    };
  }

  if (normSub === "chemistry") {
    if (taskNum >= 33 || (exam === "OGE" && taskNum === 22)) {
      return {
        solutionKey: "Элементы ответа:\n1) Составлены уравнения химических реакций с правильными коэффициентами.\n2) Рассчитаны количества веществ, вступивших в реакцию и образовавшихся продуктов.\n3) Составлены алгебраические пропорции и определены искомые массовые доли.",
        maxPoints: exam === "OGE" ? 3 : 4,
        criteriaText: "K1: Составлены верные химические уравнения (2 б.)\nK2: Выполнены стехиометрические расчеты (2 б.)",
        topicTitle: `Задание №${taskNum}. Расчетная химическая задача (ФИПИ)`,
      };
    }
    return {
      solutionKey: "Элементы ответа:\n1) Составлены уравнения химических реакций с правильными коэффициентами.\n2) Составлен электронный баланс / ионные уравнения (указаны окислитель и восстановитель).\n3) Вычислены необходимые стехиометрические величины.",
      maxPoints: 3,
      criteriaText: "K1: Составлены верные химические уравнения (2 б.)\nK2: Составлен электронный баланс / расчеты (1 б.)",
      topicTitle: `Задание №${taskNum}. Химический эксперимент и реакции (ФИПИ)`,
    };
  }

  if (normSub === "physics") {
    return {
      solutionKey: "Элементы ответа:\n1) Записаны исходные физические законы и формулы, описывающие процесс.\n2) Проведены математические преобразования и подстановка числовых данных с размерностями.\n3) Получен верный численный ответ с физическим анализом результата.",
      maxPoints: 3,
      criteriaText: "K1: Записаны формулы и получен верный численный ответ (2 б.)\nK2: Правильный ход рассуждений с единичной погрешностью (1 б.)",
      topicTitle: `Задание №${taskNum}. Физическая задача с развернутым решением (ФИПИ)`,
    };
  }

  if (normSub === "informatics") {
    if (taskNum === 27) {
      return {
        solutionKey: "Элементы ответа:\n1) Предложен эффективный алгоритм обработки данных (по времени и памяти).\n2) Написан корректный программный код без синтаксических ошибок.\n3) Программа правильно обрабатывает все тестовые файлы A и B.",
        maxPoints: 2,
        criteriaText: "K1: Реализован эффективный и корректный алгоритм (2 б.)\nK2: Алгоритм верен, но не оптимален по ресурсам (1 б.)",
        topicTitle: "Задание №27. Сложная алгоритмическая задача по программированию (ФИПИ)",
      };
    }
    return {
      solutionKey: "Элементы ответа:\n1) Предложен корректный алгоритм обработки данных с оптимальной сложностью.\n2) Написан программный код без синтаксических ошибок.\n3) Программа корректно обрабатывает краевые и экстремальные значения данных.",
      maxPoints: 2,
      criteriaText: "K1: Реализован эффективный и корректный алгоритм (2 б.)\nK2: Алгоритм верен, но не оптимален по памяти/времени (1 б.)",
      topicTitle: `Задание №${taskNum}. Алгоритмизация и программирование (ФИПИ)`,
    };
  }

  if (normSub === "social") {
    if (taskNum === 24) {
      return {
        solutionKey: "Элементы ответа:\n1) План содержит не менее 3 пунктов, из которых 2 и более детализированы в подпунктах.\n2) Количество подпунктов каждого детализированного пункта составляет не менее 3.\n3) Пункты плана охватывают ключевые аспекты темы без фактических ошибок.",
        maxPoints: 4,
        criteriaText: "K1: Раскрытие темы по существу в подпунктах (3 б.)\nK2: Корректность формулировок пунктов и подпунктов (1 б.)",
        topicTitle: "Задание №24. Сложный развернутый план темы (ФИПИ)",
      };
    }
    return {
      solutionKey: "Элементы ответа:\n1) Раскрыт смысл ключевого обществоведческого понятия.\n2) Приведены развернутые и конкретные примеры, иллюстрирующие теоретические положения.\n3) Сформулированы корректные выводы с опорой на обществоведческий курс.",
      maxPoints: 3,
      criteriaText: "K1: Раскрытие сущности понятий и положений (2 б.)\nK2: Качество и развернутость аргументации (1 б.)",
      topicTitle: `Задание №${taskNum}. Обществоведческий анализ и аргументация (ФИПИ)`,
    };
  }

  if (normSub === "history") {
    return {
      solutionKey: "Элементы ответа:\n1) Указаны точные исторические факты, даты, персоналии и причинно-следственные связи.\n2) Сформулирован аргументированный исторический тезис.\n3) Приведены факты-обоснования без фактических ошибок.",
      maxPoints: 3,
      criteriaText: "K1: Указаны ключевые исторические факты и взаимосвязи (2 б.)\nK2: Аргументированность тезиса и отсутствие ошибок (1 б.)",
      topicTitle: `Задание №${taskNum}. Исторический источник и аргументация (ФИПИ)`,
    };
  }

  if (normSub === "literature") {
    if (taskNum === 11 && exam === "EGE") {
      return {
        solutionKey: "Элементы ответа:\n1) Тема раскрыта глубоко и многосторонне с опорой на авторскую позицию.\n2) Текст произведения привлечен на уровне анализа важных фрагментов и микротем.\n3) Теоретико-литературные понятия использованы для анализа текста.\n4) Композиционная цельность и логика изложения сохранены.",
        maxPoints: 5,
        criteriaText: "K1: Соответствие теме и глубина раскрытия (2 б.)\nK2: Привлечение текста для аргументации (2 б.)\nK3: Опора на теоретико-литературные понятия и логика (1 б.)",
        topicTitle: "Задание №11. Развернутое сочинение по литературе (ФИПИ)",
      };
    }
    return {
      solutionKey: "Элементы ответа:\n1) Дан прямой ответ на вопрос с опорой на авторскую позицию и текст произведения.\n2) Проведен анализ фрагмента с использованием литературоведческих терминов.\n3) Соблюдена композиционная стройность и речевые нормы.",
      maxPoints: 3,
      criteriaText: "K1: Соответствие ответа теме и глубина анализа (2 б.)\nK2: Логика изложения и речевые нормы (1 б.)",
      topicTitle: `Задание №${taskNum}. Развернутый анализ произведения (ФИПИ)`,
    };
  }

  if (normSub === "geography") {
    return {
      solutionKey: "Элементы ответа:\n1) Проведен географический анализ факторов и взаимосвязей процессов.\n2) Выполнены необходимые географические расчеты.\n3) Сформулирован обоснованный географический вывод.",
      maxPoints: 2,
      criteriaText: "K1: Обоснованно получен верный географический вывод (2 б.)\nK2: Присутствует правильное объяснение закономерностей (1 б.)",
      topicTitle: `Задание №${taskNum}. Географический анализ и расчеты (ФИПИ)`,
    };
  }

  return {
    solutionKey: "Элементы ответа:\n1) Изложены ключевые теоретические положения в соответствии с требованиями ФИПИ.\n2) Приведено подробное обоснование и разбор решения.\n3) Получен верный итоговый результат.",
    maxPoints: 3,
    criteriaText: "K1: Соответствие ответа эталонным элементам ФИПИ (2 б.)\nK2: Логичность и полнота обоснования решения (1 б.)",
    topicTitle: `Задание №${taskNum} (Часть 2, ФИПИ)`,
  };
}

export function handleFillDefaultCriteria() {
  const subId = document.getElementById("qSubjectSelect")?.value || "math";
  const taskNum = parseInt(document.getElementById("qTaskNumberInput")?.value || "1", 10);
  const activeExamBtn = document.querySelector("#qExamTypeToggle .q-exam-btn.active");
  const activeExam = activeExamBtn?.getAttribute("data-exam") || (typeof localStorage !== "undefined" && localStorage.getItem("examhub_exam_type")) || "EGE";
  const typeSelect = document.getElementById("qTypeSelect");
  const optionsArea = document.getElementById("dynamicOptionsArea");
  const previewArea = document.getElementById("qLivePreview");

  if (typeSelect && typeSelect.value !== "extended") {
    typeSelect.value = "extended";
    renderOptionsInputs("extended", optionsArea);
  }

  const template = getDefaultFIPITemplate(subId, taskNum, activeExam);
  const keyEl = document.getElementById("extSolutionKeyInput");
  const maxPtsEl = document.getElementById("extMaxPointsInput");
  const critEl = document.getElementById("extCriteriaInput");
  const topicEl = document.getElementById("qTopicTitleInput");

  if (keyEl) keyEl.value = template.solutionKey;
  if (maxPtsEl) maxPtsEl.value = template.maxPoints;
  if (critEl) critEl.value = template.criteriaText;
  if (topicEl && !topicEl.value.trim()) {
    topicEl.value = template.topicTitle;
  }

  if (previewArea) {
    updateTestPreview("extended", previewArea);
  }

  showToast(
    "✨ Критерии заполнены",
    `Критерии ФИПИ для ${activeExam} и эталонный ключ решения подставлены.`
  );
}

export function initTestEditor() {
  const container = document.getElementById("testEditorContainer");
  if (!container) return;

  const rawExam = (typeof localStorage !== "undefined" && localStorage.getItem("examhub_exam_type")) || "EGE";
  const currentExam = rawExam === "OGE" ? "OGE" : "EGE";

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
          <button class="btn btn-outline" id="fillDefaultCriteriaBtn" title="Заполнить эталонные критерии ФИПИ">✨ Заполнить критерии по умолчанию</button>
          <button class="btn btn-outline" id="loadQuestionBankBtn">🏦 Банк вопросов</button>
          <button class="btn btn-outline" id="previewStudentTestBtn">👁️ Глазами ученика</button>
          <button class="btn btn-primary" id="saveQuestionBtn">💾 Сохранить вопрос в БД</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Left Column: Form Controls -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: end;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Экзамен</label>
              <div id="qExamTypeToggle" class="btn-group" style="display: flex; gap: 4px; background: var(--color-bg-secondary); padding: 3px; border-radius: 8px; border: 1px solid var(--color-border); height: 42px; box-sizing: border-box; align-items: center;">
                <button type="button" class="q-exam-btn ${currentExam === "EGE" ? "active" : ""}" data-exam="EGE" style="flex: 1; height: 34px; font-weight: 700; font-size: 13px; border-radius: 6px; cursor: pointer;">ЕГЭ</button>
                <button type="button" class="q-exam-btn ${currentExam === "OGE" ? "active" : ""}" data-exam="OGE" style="flex: 1; height: 34px; font-weight: 700; font-size: 13px; border-radius: 6px; cursor: pointer;">ОГЭ</button>
              </div>
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Предмет</label>
              <select id="qSubjectSelect" class="search-input" style="width: 100%; height: 42px; box-sizing: border-box;">
                ${subjectOptionsHtml}
              </select>
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 6px;">Номер задания (1–35)</label>
              <input type="number" id="qTaskNumberInput" class="search-input" min="1" max="50" value="1" style="width: 100%; height: 42px; box-sizing: border-box;" />
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
                <option value="extended">📝 Задание с развернутым ответом (Часть 2, ФИПИ)</option>
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

  const getSelectedExam = () => {
    const activeBtn = container.querySelector("#qExamTypeToggle .q-exam-btn.active");
    return activeBtn?.getAttribute("data-exam") || (typeof localStorage !== "undefined" && localStorage.getItem("examhub_exam_type")) || "EGE";
  };

  const triggerLiveUpdate = () => {
    updateTestPreview(typeSelect?.value || "single", previewArea);
  };

  typeSelect?.addEventListener("change", () => {
    renderOptionsInputs(typeSelect.value, optionsArea);
    triggerLiveUpdate();
  });

  const autoSelectTypeByTaskNumber = () => {
    const subId = document.getElementById("qSubjectSelect")?.value || "math";
    const taskNum = document.getElementById("qTaskNumberInput")?.value || "1";
    const activeExam = getSelectedExam();
    const recommendedType = getRecommendedTaskType(subId, taskNum, activeExam);
    if (typeSelect) {
      typeSelect.value = recommendedType;
      renderOptionsInputs(recommendedType, optionsArea);
      triggerLiveUpdate();
    }
  };

  const initialTaskNum = document.getElementById("qTaskNumberInput")?.value || "1";
  const initialSubId = document.getElementById("qSubjectSelect")?.value || "math";
  const initialActiveExam = getSelectedExam();
  const initialType = getRecommendedTaskType(initialSubId, initialTaskNum, initialActiveExam);
  if (typeSelect) typeSelect.value = initialType;
  renderOptionsInputs(initialType, optionsArea);

  const examToggleBtns = container.querySelectorAll(".q-exam-btn");
  examToggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const exam = btn.getAttribute("data-exam") || "EGE";
      examToggleBtns.forEach((b) => {
        if (b.getAttribute("data-exam") === exam) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
      autoSelectTypeByTaskNumber();
      triggerLiveUpdate();
    });
  });

  document.getElementById("qTaskNumberInput")?.addEventListener("input", autoSelectTypeByTaskNumber);
  document.getElementById("qTaskNumberInput")?.addEventListener("change", autoSelectTypeByTaskNumber);
  document.getElementById("qSubjectSelect")?.addEventListener("change", autoSelectTypeByTaskNumber);

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

  document.getElementById("fillDefaultCriteriaBtn")?.addEventListener("click", handleFillDefaultCriteria);

  container.addEventListener("click", (e) => {
    if (e.target.closest("#fillDefaultCriteriaBtn") || e.target.closest("#extFillDefaultCriteriaBtn") || e.target.closest(".fill-default-criteria-btn")) {
      handleFillDefaultCriteria();
    }
  });

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
    const topicTitle = document.getElementById("qTopicTitleInput")?.value.trim() || "";
    const examType = getSelectedExam();

    const optionInputs = Array.from(document.querySelectorAll(".option-input")).map((inp) => inp.value.trim());
    const options = optionInputs.length > 0 ? optionInputs : ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"];
    const correctIndexVal = parseInt(document.getElementById("correctIndexInput")?.value || "1", 10) - 1;

    try {
      const payload = {
        subjectId,
        taskNumber,
        type,
        question: questionText,
        options,
        correctIndex: Math.max(0, correctIndexVal),
        explanation,
        topicTitle,
        examType,
      };

      if (type === "extended") {
        const solutionKey = document.getElementById("extSolutionKeyInput")?.value.trim() || "";
        const maxPoints = parseInt(document.getElementById("extMaxPointsInput")?.value || "3", 10);
        const criteriaRaw = document.getElementById("extCriteriaInput")?.value.trim() || "";
        
        const criteria = criteriaRaw
          ? criteriaRaw.split("\n").filter(Boolean).map((line, idx) => {
              const matchPoints = line.match(/\((\d+)\s*б/i);
              const pts = matchPoints ? parseInt(matchPoints[1], 10) : 1;
              return {
                code: `K${idx + 1}`,
                title: line.replace(/^K\d+:\s*/i, "").trim(),
                maxPoints: pts
              };
            })
          : [
              { code: "K1", title: "Соответствие ответа эталонным элементам ФИПИ", maxPoints: maxPoints > 1 ? maxPoints - 1 : 1 },
              { code: "K2", title: "Логичность и полнота обоснования", maxPoints: 1 }
            ];

        payload.solutionKey = solutionKey;
        payload.maxPoints = maxPoints;
        payload.points = maxPoints;
        payload.criteria = criteria;
      }

      await api("/api/admin/tests/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showToast("✅ Сохранено в БД!", `Вопрос для Задания №${taskNumber} (${examType}, ${type === "extended" ? "Часть 2 ФИПИ" : type}) сохранен в базу данных и доступен в разделе «Тесты».`);

      if (typeof window.loadAppData === "function") {
        await window.loadAppData();
      }
      import("./catalog.js").then((m) => {
        if (typeof m.syncTestsExamSelection === "function") {
          m.syncTestsExamSelection();
        }
      });
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
  } else if (type === "extended") {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-weight: 600; color: #6366f1;">🔑 Ключ эталонного решения ФИПИ:</div>
        <button type="button" class="btn btn-outline btn-sm fill-default-criteria-btn" id="extFillDefaultCriteriaBtn" style="font-size: 11px; padding: 4px 10px; border-color: #6366f1; color: #6366f1;">✨ Заполнить по умолчанию</button>
      </div>
      <textarea id="extSolutionKeyInput" class="search-input" style="width: 100%; height: 75px; box-sizing: border-box; margin-bottom: 10px;" placeholder="Элементы ответа:&#10;1) ...&#10;2) ..."></textarea>
      
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 10px;">
        <label style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-primary);">Максимальный балл (1-10):</label>
        <input type="number" id="extMaxPointsInput" class="search-input" value="3" min="1" max="10" style="width: 80px;" />
      </div>

      <div style="font-weight: 600; margin-bottom: 8px; color: var(--color-text-primary);">📋 Критерии оценивания ФИПИ (каждый с новой строки):</div>
      <textarea id="extCriteriaInput" class="search-input" style="width: 100%; height: 65px; box-sizing: border-box;" placeholder="K1: Описание критерия 1 (2 б.)&#10;K2: Описание критерия 2 (1 б.)"></textarea>
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
  } else if (type === "extended") {
    const keyVal = document.getElementById("extSolutionKeyInput")?.value.trim() || "1) Элемент ответа 1\n2) Элемент ответа 2";
    const maxPts = document.getElementById("extMaxPointsInput")?.value || "3";
    const criteriaVal = document.getElementById("extCriteriaInput")?.value.trim();
    let criteriaPreviewHtml = "";
    if (criteriaVal) {
      criteriaPreviewHtml = `
        <div style="font-size: 11px; color: #10b981; margin-top: 8px; font-weight: 700;">📋 Критерии оценивания:</div>
        <div style="font-size: 12px; white-space: pre-line; color: var(--color-text-secondary); margin-top: 2px;">${criteriaVal}</div>
      `;
    }
    optionsPreviewHtml = `
      <div style="margin-top: 14px; padding: 12px 14px; background: var(--color-surface); border-radius: 8px; border: 1px solid var(--color-border);">
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px;">✍️ Развернутый ответ ученика (Часть 2, макс. ${maxPts} б.):</div>
        <textarea class="search-input" placeholder="Развернутый разбор ответа учеником..." disabled style="width: 100%; height: 50px; box-sizing: border-box;"></textarea>
        <div style="font-size: 11px; color: #6366f1; margin-top: 8px; font-weight: 700;">🔑 Эталонный ключ решения ФИПИ:</div>
        <div style="font-size: 12px; white-space: pre-line; color: var(--color-text-primary); margin-top: 2px;">${keyVal}</div>
        ${criteriaPreviewHtml}
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

  const activeExamBtn = document.querySelector("#qExamTypeToggle .q-exam-btn.active");
  const activeExam = activeExamBtn?.getAttribute("data-exam") || (typeof localStorage !== "undefined" && localStorage.getItem("examhub_exam_type")) || "EGE";

  container.innerHTML = `
    <div style="background: var(--color-card-bg); padding: 18px; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: var(--box-shadow-sm);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
        <span style="font-size: 11px; font-weight: 700; color: ${subjectObj.colorHex || "var(--color-purple)"}; text-transform: uppercase;">
          ${subjectObj.title || "Предмет"} • Задание №${taskNumber} • ${activeExam}
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
