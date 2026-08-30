import { chromium } from "@playwright/test";
import { spawn } from "child_process";

// 1. Убеждаемся, что локальный сервер запущен
let serverProcess = null;
try {
  const healthCheck = await fetch("http://localhost:8000/api/health").catch(() => null);
  if (!healthCheck || healthCheck.status !== 200) {
    console.log("Запускаем сервер ExamHub на порту 8000...");
    serverProcess = spawn("node", ["server/index.js"], {
      stdio: "inherit",
      detached: false,
      env: { ...process.env, PORT: "8000" },
    });
    // Ждем старта сервера
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch("http://localhost:8000/api/health").catch(() => null);
      if (res && res.status === 200) {
        console.log("Сервер успешно запущен!");
        break;
      }
    }
  }
} catch (err) {
  console.log("Сервер уже работает или ошибка проверки:", err.message);
}

console.log("Открываем видимое окно браузера Chromium на экране...");
const browser = await chromium.launch({
  headless: false,
  slowMo: 1200, // Медленная демонстрация, чтобы пользователь четко видел каждый шаг
  args: ["--start-maximized", "--no-sandbox"],
});

const context = await browser.newContext({ viewport: null });
const page = await context.newPage();
const timestamp = Date.now();
const createdIds = [];

try {
  console.log("1. Открываем сайт ExamHub...");
  await page.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  console.log("2. Авторизация под Администратором...");
  await page.locator("#loginBtn").click();
  await page.waitForTimeout(1000);
  await page.locator("#manualEmail").fill("admin@examhub.ru");
  await page.locator("#manualPass").fill("admin123");
  await page.waitForTimeout(800);
  await page.locator("#authSubmitManual").click();
  await page.waitForTimeout(1500);

  console.log("3. Переход в Конструктор тестов...");
  await page.evaluate(async () => {
    const { switchView } = await import("/js/modules/navigation.js");
    const { initTestEditor } = await import("/js/modules/test-editor.js");
    switchView("test-editor");
    initTestEditor();
  });
  await page.waitForTimeout(1500);

  // 3.1 Создание обычного вопроса ЕГЭ (Часть 1)
  console.log("3.1 Создание вопроса ЕГЭ (Часть 1)...");
  await page.locator('#qExamTypeToggle .q-exam-btn[data-exam="EGE"]').click();
  await page.locator("#qSubjectSelect").selectOption("russian");
  await page.locator("#qTaskNumberInput").fill("4");
  const ege1 = `[АУДИТ-ЕГЭ-1-${timestamp}] В каком слове допущена ошибка в ударении?`;
  await page.locator("#qTextarea").fill(ege1);
  await page.waitForTimeout(1000);
  await page.locator("#saveQuestionBtn").click();
  await page.waitForTimeout(1500);

  // 3.2 Создание развернутого вопроса ЕГЭ (Часть 2)
  console.log("3.2 Создание вопроса ЕГЭ (Часть 2 ФИПИ)...");
  await page.locator('#qExamTypeToggle .q-exam-btn[data-exam="EGE"]').click();
  await page.locator("#qSubjectSelect").selectOption("social");
  await page.locator("#qTaskNumberInput").fill("24");
  const ege2 = `[АУДИТ-ЕГЭ-2-${timestamp}] Составьте сложный план по теме «Рыночная экономика».`;
  await page.locator("#qTextarea").fill(ege2);
  await page.locator("#fillDefaultCriteriaBtn").click();
  await page.waitForTimeout(1000);
  await page.locator("#saveQuestionBtn").click();
  await page.waitForTimeout(1500);

  // 3.3 Создание обычного вопроса ОГЭ (Часть 1)
  console.log("3.3 Создание вопроса ОГЭ (Часть 1)...");
  await page.locator('#qExamTypeToggle .q-exam-btn[data-exam="OGE"]').click();
  await page.locator("#qSubjectSelect").selectOption("math");
  await page.locator("#qTaskNumberInput").fill("6");
  const oge1 = `[АУДИТ-ОГЭ-1-${timestamp}] Найдите значение выражения: 0.5 + 3/4.`;
  await page.locator("#qTextarea").fill(oge1);
  await page.waitForTimeout(1000);
  await page.locator("#saveQuestionBtn").click();
  await page.waitForTimeout(1500);

  // 3.4 Создание развернутого вопроса ОГЭ (Часть 2)
  console.log("3.4 Создание вопроса ОГЭ (Часть 2 ФИПИ)...");
  await page.locator('#qExamTypeToggle .q-exam-btn[data-exam="OGE"]').click();
  await page.locator("#qSubjectSelect").selectOption("math");
  await page.locator("#qTaskNumberInput").fill("21");
  const oge2 = `[АУДИТ-ОГЭ-2-${timestamp}] Решите систему уравнений: x + y = 10, x - y = 4.`;
  await page.locator("#qTextarea").fill(oge2);
  await page.locator("#fillDefaultCriteriaBtn").click();
  await page.waitForTimeout(1000);
  await page.locator("#saveQuestionBtn").click();
  await page.waitForTimeout(1500);

  // Получаем ID созданных вопросов
  const qList = await page.request.get("/api/catalog/questions");
  const qData = await qList.json();
  (qData.questions || []).forEach((q) => {
    if (q.question.includes(String(timestamp))) {
      createdIds.push(q.id);
    }
  });
  console.log("Создано 4 тестовых вопроса ID:", createdIds);

  console.log("4. Проверка раздела «Тесты» без входа (гость)...");
  await page.evaluate(() => {
    localStorage.clear();
    location.reload();
  });
  await page.waitForTimeout(2000);

  // Открываем раздел Тесты
  await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
  await page.waitForTimeout(1500);

  // Проверяем ЕГЭ (Русский №4)
  console.log("Проверяем отображение ЕГЭ задания...");
  await page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="EGE"]').click();
  await page.locator("#tasksSubjectFilter").selectOption("russian");
  await page.waitForTimeout(1500);
  await page.locator('.task-number-card[data-task-num="4"]').click();
  await page.waitForTimeout(2000);

  // Проверяем ОГЭ (Математика №6 и №21)
  console.log("Проверяем отображение ОГЭ задания...");
  await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
  await page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]').click();
  await page.locator("#tasksSubjectFilter").selectOption("math");
  await page.waitForTimeout(1500);
  await page.locator('.task-number-card[data-task-num="21"]').click();
  await page.waitForTimeout(2000);

  console.log("5. Решение задания Части 2 учеником...");
  const textarea = page.locator("#quizExtendedTextarea");
  await textarea.fill("Складываем уравнения: 2x = 14 => x = 7, y = 3. Ответ: (7; 3).");
  await page.waitForTimeout(1000);
  await page.locator("#quizNextBtn").click();
  await page.waitForTimeout(2000);
  await page.locator("#quizNextBtn").click();
  await page.waitForTimeout(2000);

  console.log("6. Очистка: удаление созданных тестовых вопросов...");
  // Вход админом для удаления
  await page.locator("#loginBtn").click();
  await page.locator("#manualEmail").fill("admin@examhub.ru");
  await page.locator("#manualPass").fill("admin123");
  await page.locator("#authSubmitManual").click();
  await page.waitForTimeout(1500);

  for (const qId of createdIds) {
    await page.request.delete(`/api/admin/tests/questions/${qId}`);
    console.log(`Удален тестовый вопрос: ${qId}`);
  }

  console.log("✅ Аудит полностью и успешно завершен!");
  await page.waitForTimeout(3000);
} catch (err) {
  console.error("Ошибка при аудите:", err);
} finally {
  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
}
