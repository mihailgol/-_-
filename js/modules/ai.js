import { startQuiz } from "./quiz.js";

export function initAIEvents() {
  document.querySelectorAll(".ai-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      const textarea = document.getElementById("aiPromptInput");
      if (textarea) {
        textarea.value = prompt;
        textarea.focus();
      }
    });
  });

  const generateBtn = document.getElementById("generateAITestBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", handleAIGeneration);
  }

  const triggerBtn = document.getElementById("triggerAIBtn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      const tabNav = document.querySelector(".sidebar-nav .nav-item[data-view='tests']");
      if (tabNav) tabNav.click();
    });
  }
}

export function handleAIGeneration() {
  const promptInput = document.getElementById("aiPromptInput");
  let prompt = promptInput.value.trim();

  if (!prompt) {
    prompt = "Строение растительной и животной клетки";
  }

  document.getElementById("aiInputBlock").style.display = "none";
  const loadingBlock = document.getElementById("aiLoadingBlock");
  loadingBlock.style.display = "block";

  simulateStepCompletion(1, () => {
    simulateStepCompletion(2, () => {
      simulateStepCompletion(3, () => {
        simulateStepCompletion(4, () => {
          const customQuestions = buildAIQuestions(prompt);

          document.getElementById("aiInputBlock").style.display = "block";
          loadingBlock.style.display = "none";
          resetChecklistElements();

          promptInput.value = "";

          startQuiz(customQuestions, `AI Тест: ${prompt.slice(0, 30)}...`, "tests");
        });
      });
    });
  });
}

function simulateStepCompletion(stepId, callback) {
  const stepEl = document.getElementById(`ai-step-${stepId}`);
  const checkEl = document.getElementById(`ai-check-${stepId}`);

  stepEl.className = "ai-checklist-item active";
  checkEl.innerHTML = `<i data-lucide="loader" style="width: 14px; height: 14px; stroke: var(--color-purple); animation: spin 1s linear infinite;"></i>`;
  if (window.lucide) window.lucide.createIcons();

  const delay = stepId === 2 ? 1400 : 800;

  setTimeout(() => {
    stepEl.className = "ai-checklist-item done";
    checkEl.innerHTML = `<i data-lucide="check-circle" style="width: 14px; height: 14px; stroke: var(--color-green);"></i>`;
    if (window.lucide) window.lucide.createIcons();

    callback();
  }, delay);
}

function resetChecklistElements() {
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`ai-step-${i}`);
    const checkEl = document.getElementById(`ai-check-${i}`);

    stepEl.className = "ai-checklist-item " + (i === 1 ? "active" : "pending");
    checkEl.innerHTML = `<i data-lucide="${i === 1 ? "loader" : "circle"}" style="width: 14px; height: 14px;"></i>`;
  }
}

export function buildAIQuestions(prompt) {
  const p = prompt.toLowerCase();

  if (p.includes("алкен") || p.includes("химия") || p.includes("связь") || p.includes("атом")) {
    return [
      {
        id: "ai_q_c1",
        type: "single",
        question: `[ИИ-Генерация] Какой тип связи преобладает в органических молекулах, сформированных на основе темы: "${prompt}"?`,
        options: ["Ионная связь", "Ковалентная полярная связь", "Металлическая связь", "Водородная связь"],
        correctIndex: 1,
        explanation:
          "Органические соединения образованы преимущественно неметаллами с близкой электроотрицательностью, формирующими общие пары электронов со смещением, т.е. ковалентные полярные связи.",
      },
      {
        id: "ai_q_c2",
        type: "single",
        question: `[ИИ-Генерация] Что происходит с гибридизацией атомов углерода при переходе от алканов к алкенам по вашему запросу: "${prompt}"?`,
        options: ["sp³ переходит в sp²", "sp² переходит в sp³", "sp переходит в sp³", "Гибридизация не изменяется"],
        correctIndex: 0,
        explanation:
          "Атомы углерода при двойной связи в алкенах находятся в sp²-гибридизации (плоская треугольная конфигурация), тогда как в алканах — в sp³-гибридизации.",
      },
      {
        id: "ai_q_c3",
        type: "single",
        question: `[ИИ-Генерация] Какое вещество выделится при каталитической гидратации этилена?`,
        options: ["Этиловый спирт (Этанол)", "Диэтиловый эфир", "Уксусный альдегид", "Этан"],
        correctIndex: 0,
        explanation:
          "Присоединение молекулы воды по двойной связи этилена приводит к образованию одноатомного предельного спирта — этанола.",
      },
    ];
  }

  return [
    {
      id: "ai_q_b1",
      type: "single",
      question: `[ИИ-Генерация] Какой мембранный органоид будет играть главную роль в физиологических процессах по теме: "${prompt}"?`,
      options: ["Митохондрия", "Лизосома", "Рибосома", "Аппарат Гольджи"],
      correctIndex: 0,
      explanation:
        "Для любых метаболических задач, требующих активного энергетического снабжения по указанному профилю темы, митохондрии предоставляют АТФ в качестве универсального источника энергии.",
    },
    {
      id: "ai_q_b2",
      type: "single",
      question: `[ИИ-Генерация] В каком делении клетки происходит рекомбинация генов (кроссинговер) по запросу темы "${prompt}"?`,
      options: ["Митоз", "Профаза I мейоза", "Амитоз", "Анафаза II мейоза"],
      correctIndex: 1,
      explanation:
        "Кроссинговер (обмен гомологичными участками хромосом) осуществляется в конъюгации профазы первого мейотического деления, обеспечивая генетическое разнообразие организмов.",
    },
    {
      id: "ai_q_b3",
      type: "single",
      question: `[ИИ-Генерация] Какое положение клеточной теории подтверждается исследованием данной темы?`,
      options: [
        "Все клетки развиваются из неживого вещества",
        "Новые клетки возникают только путем деления материнских клеток",
        "Все клетки имеют абсолютно одинаковую форму и размеры",
        "Животные клетки всегда имеют плотную целлюлозную стенку",
      ],
      correctIndex: 1,
      explanation:
        "Сформулированное Рудольфом Вирховым правило 'каждая клетка из клетки' подтверждает непрерывность жизни и преемственность в делении клеточных ядер.",
    },
  ];
}
