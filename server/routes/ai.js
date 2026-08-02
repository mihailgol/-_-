import { Router } from "express";
import { db } from "../db.js";
import { config } from "../config.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

function buildMockQuestions(subjectId, topicTitle) {
  const subject = String(subjectId || "biology").toLowerCase();
  const topic = String(topicTitle || "Общая тема").trim();
  const topicLower = topic.toLowerCase();

  if (
    subject === "chemistry" ||
    topicLower.includes("химия") ||
    topicLower.includes("алкен") ||
    topicLower.includes("кислот") ||
    topicLower.includes("атом") ||
    topicLower.includes("веществ")
  ) {
    return [
      {
        id: `ai_q_chem_1_${Date.now()}`,
        type: "single",
        question: `[ИИ] Какая химическая особенность наиболее характерна для темы: "${topic}"?`,
        options: [
          "Реакции электрофильного присоединения по непредельным связям",
          "Образование ионных кристаллов в нормальных условиях",
          "Полная инертность ко всем окислителям",
          "Радиоактивный распад атомного ядра"
        ],
        correctIndex: 0,
        explanation: `Для химических соединений в рамках темы "${topic}" ключевыми являются реакции присоединения и функциональные превращения.`
      },
      {
        id: `ai_q_chem_2_${Date.now()}`,
        type: "single",
        question: `[ИИ] Какой реактив или способ идентификации используется для темы "${topic}"?`,
        options: [
          "Обесцвечивание бромной воды или перманганата калия",
          "Реакция с нейтральным раствором хлорида натрия",
          "Измерение показателя преломления водных растворов",
          "Выпадение белого осадка при контакте с азотом"
        ],
        correctIndex: 0,
        explanation: `Качественной реакцией для непредельных веществ темы "${topic}" служит обесцвечивание бромной воды.`
      },
      {
        id: `ai_q_chem_3_${Date.now()}`,
        type: "single",
        question: `[ИИ] Какое влияние оказывает температура на химическое равновесие при изучении темы "${topic}"?`,
        options: [
          "Повышение температуры смещает равновесие в сторону эндотермической реакции",
          "Температура никак не влияет на химическое равновесие",
          "Понижение температуры всегда ускоряет прямой процесс в 100 раз",
          "Катализатор меняет значение константы равновесия"
        ],
        correctIndex: 0,
        explanation: `Согласно принципу Ле Шателье, нагревание смещает равновесие в сторону эндотермического процесса.`
      }
    ];
  }

  if (
    subject === "physics" ||
    topicLower.includes("физик") ||
    topicLower.includes("ток") ||
    topicLower.includes("сила") ||
    topicLower.includes("энерг")
  ) {
    return [
      {
        id: `ai_q_phys_1_${Date.now()}`,
        type: "single",
        question: `[ИИ] Какой закон физики является фундаментальным для процессов темы: "${topic}"?`,
        options: [
          "Закон сохранения и превращения энергии",
          "Закон Паскаля для сжимаемых газов",
          "Правило левой руки для покоящихся зарядов",
          "Закон Стефана-Больцмана"
        ],
        correctIndex: 0,
        explanation: `Закон сохранения энергии лежит в основе всех физических превращений по теме "${topic}".`
      },
      {
        id: `ai_q_phys_2_${Date.now()}`,
        type: "single",
        question: `[ИИ] Как изменится физическая величина при увеличении определяющего параметра в 2 раза по теме "${topic}"?`,
        options: [
          "Увеличится в 2 раза при прямой пропорциональности",
          "Уменьшится в 4 раза при квадратичной зависимости",
          "Останется строго неизменной",
          "Уменьшится ровно на 10 единиц"
        ],
        correctIndex: 0,
        explanation: `Линейная зависимость параметров в законах темы "${topic}" приводит к пропорциональному росту.`
      },
      {
        id: `ai_q_phys_3_${Date.now()}`,
        type: "single",
        question: `[ИИ] В каких единицах СИ измеряется работа и энергия в задачах по теме "${topic}"?`,
        options: ["Джоуль (Дж)", "Ватт (Вт)", "Паскаль (Па)", "Ньютон (Н)"],
        correctIndex: 0,
        explanation: `Универсальной единицей измерения энергии и работы в международной системе СИ является Джоуль.`
      }
    ];
  }

  return [
    {
      id: `ai_q_bio_1_${Date.now()}`,
      type: "single",
      question: `[ИИ] Какой биологический процесс является определяющим в контексте темы: "${topic}"?`,
      options: [
        "Матричный биосинтез и ферментативная регуляция",
        "Простая нерегулируемая диффузия крахмала",
        "Бесполое почкование многоклеточных организмов",
        "Осмотическая деградация гистонов"
      ],
      correctIndex: 0,
      explanation: `Процессы в теме "${topic}" регулируются специализированными ферментами и матричными синтезами.`
    },
    {
      id: `ai_q_bio_2_${Date.now()}`,
      type: "single",
      question: `[ИИ] Какая клеточная структура снабжает энергией (АТФ) процессы по теме "${topic}"?`,
      options: ["Митохондрия", "Лизосома", "Аппарат Гольджи", "Клеточная стенка"],
      correctIndex: 0,
      explanation: `Митохондрии выполняют роль клеточных станций, генерирующих АТФ для биологических реакций.`
    },
    {
      id: `ai_q_bio_3_${Date.now()}`,
      type: "single",
      question: `[ИИ] Какое значение в биологии имеет изучение процессов по теме "${topic}"?`,
      options: [
        "Понимание механизмов адаптации и сохранения гомеостаза",
        "Полное прекращение мутагенеза в популяции",
        "Отмена естественного отбора",
        "Потеря биологического разнообразия"
      ],
      correctIndex: 0,
      explanation: `Изучение темы "${topic}" раскрывает фундаментальные механизмы поддержания гомеостаза и эволюции.`
    }
  ];
}

async function fetchFromOpenRouter(subjectId, topicTitle) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || config.isTest) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Ты — генератор вопросов для подготовки к ЕГЭ и ОГЭ. Сгенерируй 3 вопроса по теме. Верни СТРОГО JSON без markdown: {\"questions\":[{\"id\":\"q1\",\"type\":\"single\",\"question\":\"Текст\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctIndex\":0,\"explanation\":\"Пояснение\"}]}"
          },
          {
            role: "user",
            content: `Предмет: ${subjectId}, Тема: ${topicTitle}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const questionsList = parsed.questions || (Array.isArray(parsed) ? parsed : null);
    if (!Array.isArray(questionsList) || questionsList.length === 0) return null;

    return questionsList.map((q, i) => ({
      id: q.id || `ai_q_${Date.now()}_${i}`,
      type: "single",
      question: q.question || `Вопрос ${i + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["A", "B", "C", "D"],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      explanation: q.explanation || "Разбор ответа."
    }));
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

router.get("/limit", optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ isPremium: false, usedToday: 0, remaining: 3 });
  }
  if (req.user.isPremium) {
    return res.json({ isPremium: true, usedToday: 0, remaining: null });
  }
  const row = db
    .prepare("SELECT COUNT(*) as count FROM ai_generations WHERE user_id = ? AND date(created_at) = date('now')")
    .get(req.user.id);
  const count = row ? row.count : 0;
  res.json({ isPremium: false, usedToday: count, remaining: Math.max(0, 3 - count) });
});

router.post("/generate-quiz", requireAuth, async (req, res) => {
  const userId = req.user.id;

  if (!req.user.isPremium) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM ai_generations WHERE user_id = ? AND date(created_at) = date('now')")
      .get(userId);
    const count = row ? row.count : 0;
    if (count >= 3) {
      return res.status(429).json({ error: "Превышен дневной лимит генераций (3/3 для бесплатного тарифа)" });
    }
  }

  const subjectId = String(req.body?.subjectId || req.body?.subject || "biology");
  const topicTitle = String(req.body?.topicTitle || req.body?.topic || req.body?.prompt || "Общая тема");

  let questions = await fetchFromOpenRouter(subjectId, topicTitle);
  if (!questions) {
    questions = buildMockQuestions(subjectId, topicTitle);
  }

  db.prepare("INSERT INTO ai_generations (user_id) VALUES (?)").run(userId);

  const rowAfter = db
    .prepare("SELECT COUNT(*) as count FROM ai_generations WHERE user_id = ? AND date(created_at) = date('now')")
    .get(userId);
  const usedToday = rowAfter ? rowAfter.count : 1;
  const remaining = req.user.isPremium ? null : Math.max(0, 3 - usedToday);

  res.json({
    ok: true,
    questions,
    subjectId,
    topicTitle,
    remaining
  });
});

export default router;
