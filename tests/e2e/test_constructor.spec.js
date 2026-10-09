import { test, expect } from "@playwright/test";

test.describe("Test Constructor & Part 2 Extended Questions — E2E Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("сквозной цикл: вход админа -> создание вопроса Части 2 с критериями ФИПИ -> предпросмотр -> сохранение в БД", async ({ page }) => {
    // 1. Авторизация под аккаунтом Главного Администратора
    await page.locator("#loginBtn").click();
    await expect(page.locator("#authModal")).toHaveClass(/active/);

    await page.locator("#manualEmail").fill("admin@examhub.ru");
    await page.locator("#manualPass").fill("admin123");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.status() === 200),
      page.locator("#authSubmitManual").click(),
    ]);
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    // 2. Переход в Конструктор тестов
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });

    await expect(page.locator("#view-test-editor")).toBeVisible();
    await page.locator("#qTextarea").waitFor({ state: "visible" });

    // 3. Заполнение формы для вопроса Части 2 (ФИПИ)
    await page.locator("#qSubjectSelect").selectOption("biology");
    await page.locator("#qTaskNumberInput").fill("22");
    await page.locator("#qTopicTitleInput").fill("Задание 22 (Часть 2). Анализ эксперимента по биохимии");
    await page.locator("#qTypeSelect").selectOption("extended");

    const qText = "Экспериментатор изучил влияние температуры на активность фермента каталазы в клетках картофеля. Объясните результат.";
    await page.locator("#qTextarea").fill(qText);

    // Ключ ответа и критерии ФИПИ
    const solutionKey = "Элементы ответа:\n1) При температуре 37°C скорость реакции максимальна.\n2) При 70°C происходит денатурация белка каталазы.\n3) Денатурация приводит к потере активности фермента.";
    await page.locator("#extSolutionKeyInput").fill(solutionKey);
    await page.locator("#extMaxPointsInput").fill("3");
    await page.locator("#extCriteriaInput").fill("K1: Описана зависимость скорости реакции (2 б.)\nK2: Объяснена денатурация белка (1 б.)");
    await page.locator("#qExplanationTextarea").fill("Каталаза - фермент, расщепляющий пероксид водорода.");

    // 4. Проверка интерактивного предпросмотра
    const previewArea = page.locator("#qLivePreview");
    await expect(previewArea).toContainText("Биология • Задание №22");
    await expect(previewArea).toContainText("🔑 Эталонный ключ решения ФИПИ:");
    await expect(previewArea).toContainText("Денатурация приводит к потере активности");

    // 5. Модальное окно предпросмотра глазами ученика
    await page.locator("#previewStudentTestBtn").click();
    await expect(page.locator("#adminModal")).toHaveClass(/active/);
    await expect(page.locator("#adminModalBody")).toContainText(qText);
    await page.locator("#adminModal .modal-close-btn").click();
    await expect(page.locator("#adminModal")).not.toHaveClass(/active/);

    // 6. Сохранение вопроса в базу данных SQLite
    await page.locator("#saveQuestionBtn").click();
    await expect(page.locator(".toast-message")).toContainText("Сохранено в БД");
  });

  test("автоматический выбор типа вопроса (Часть 1 / Часть 2 ФИПИ) при изменении номера задания", async ({ page }) => {
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });

    await expect(page.locator("#view-test-editor")).toBeVisible();

    // 1. При выборе Задания №1 по Математике выставляется 'single'
    await page.locator("#qSubjectSelect").selectOption("math");
    await page.locator("#qTaskNumberInput").fill("1");
    await expect(page.locator("#qTypeSelect")).toHaveValue("single");

    // 2. При вводе Задания №13 по Математике (Часть 2) автоматически выбирается 'extended'
    await page.locator("#qTaskNumberInput").fill("13");
    await expect(page.locator("#qTypeSelect")).toHaveValue("extended");
    await expect(page.locator("#extSolutionKeyInput")).toBeVisible();

    // 3. При вводе Задания №27 по Русскому языку (Сочинение Части 2) выставляется 'extended'
    await page.locator("#qSubjectSelect").selectOption("russian");
    await page.locator("#qTaskNumberInput").fill("27");
    await expect(page.locator("#qTypeSelect")).toHaveValue("extended");

    // 4. При переключении на Задание №2 по Русскому языку возвращается 'single'
    await page.locator("#qTaskNumberInput").fill("2");
    await expect(page.locator("#qTypeSelect")).toHaveValue("single");
  });

  test("кнопка «✨ Заполнить критерии по умолчанию» автоматически подставляет эталонные критерии ФИПИ и ключ решения", async ({ page }) => {
    // 1. Авторизация под аккаунтом Главного Администратора
    await page.locator("#loginBtn").click();
    await expect(page.locator("#authModal")).toHaveClass(/active/);
    await page.locator("#manualEmail").fill("admin@examhub.ru");
    await page.locator("#manualPass").fill("admin123");
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    // 2. Переход в Конструктор тестов
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });

    await expect(page.locator("#view-test-editor")).toBeVisible();
    await expect(page.locator("#fillDefaultCriteriaBtn")).toBeVisible();

    // 3. Выбор предмета Обществознание и Задания №24 (План)
    await page.locator("#qSubjectSelect").selectOption("social");
    await page.locator("#qTaskNumberInput").fill("24");
    await page.locator("#qTextarea").fill("Используя обществоведческие знания, составьте сложный план по теме «Политические партии».");

    // 4. Клик по кнопке «✨ Заполнить критерии по умолчанию»
    await page.locator("#fillDefaultCriteriaBtn").click();

    // 5. Проверка автоматического переключения и заполнения формы
    await expect(page.locator("#qTypeSelect")).toHaveValue("extended");
    await expect(page.locator("#extMaxPointsInput")).toHaveValue("4");
    await expect(page.locator("#extSolutionKeyInput")).toHaveValue(/План содержит не менее 3 пунктов/);
    await expect(page.locator("#extCriteriaInput")).toHaveValue(/K1: Раскрытие темы по существу в подпунктах \(3 б\.\)/);
    await expect(page.locator("#extCriteriaInput")).toHaveValue(/K2: Корректность формулировок пунктов и подпунктов \(1 б\.\)/);

    // 6. Проверка живого предпросмотра
    const previewArea = page.locator("#qLivePreview");
    await expect(previewArea).toContainText("Обществознание • Задание №24");
    await expect(previewArea).toContainText("🔑 Эталонный ключ решения ФИПИ:");
    await expect(previewArea).toContainText("📋 Критерии оценивания:");
    await expect(previewArea).toContainText("K1: Раскрытие темы по существу");

    // 7. Сохранение в базу данных SQLite
    await page.locator("#saveQuestionBtn").click();
    await expect(page.locator(".toast-message")).toContainText("Сохранено в БД");
  });

  test("переключатель ОГЭ/ЕГЭ в редакторе тестов и отображение созданного вопроса в разделе «Тесты»", async ({ page }) => {
    // 1. Авторизация под админом
    await page.locator("#loginBtn").click();
    await page.locator("#manualEmail").fill("admin@examhub.ru");
    await page.locator("#manualPass").fill("admin123");
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    // 2. Открытие Конструктора тестов
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });

    await expect(page.locator("#view-test-editor")).toBeVisible();
    const toggle = page.locator("#qExamTypeToggle");
    await expect(toggle).toBeVisible();

    // 3. Выбираем ОГЭ через переключатель в Конструкторе
    const ogeBtn = toggle.locator(".q-exam-btn[data-exam='OGE']");
    await ogeBtn.click();
    await expect(ogeBtn).toHaveClass(/active/);

    // 4. Заполняем задание №21 (Алгебра ОГЭ)
    await page.locator("#qSubjectSelect").selectOption("math");
    await page.locator("#qTaskNumberInput").fill("21");
    const uniqueText = `Решите систему уравнений: x^2 + y = 5, x - y = 1 [Тест #${Date.now()}]`;
    await page.locator("#qTextarea").fill(uniqueText);
    await page.locator("#fillDefaultCriteriaBtn").click();

    await page.locator("#saveQuestionBtn").click();
    await expect(page.locator(".toast-message")).toContainText("Сохранено в БД");

    // 5. Переход в раздел «Тесты» и проверка отображения задания
    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();

    // Переключаем экзамен на ОГЭ в разделе тестов
    await page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]').click();
    await page.locator("#tasksSubjectFilter").selectOption("math");

    // Карточка Задания №21 должна отображать созданный вопрос
    const card21 = page.locator('.task-number-card[data-task-num="21"]');
    await expect(card21).toBeVisible();
    await expect(card21).toContainText("Математика • OGE");

    // Клик по карточке должен запустить решение теста с текстом нашего задания
    await card21.click();
    await expect(page.locator("#view-quiz-player")).toBeVisible();
    await expect(page.locator("#quizQuestionText")).toContainText("Решите систему уравнений");
  });

  test("оформление теста (бейджи, линия, ID, Сообщить об ошибке, 'Введи ответ') и сохранение добавленных тестов после выхода из сайта", async ({ page }) => {
    // 1. Проверяем оформление карточки теста в Quiz Player
    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();

    // Кнопка быстрого перехода в Конструктор тестов прямо из раздела Тесты
    const openEditorBtn = page.locator("#openTestConstructorFromTestsBtn");
    await expect(openEditorBtn).toBeVisible();

    // Запускаем решение Задания №1
    await page.locator("#tasksSubjectFilter").selectOption("chemistry");
    const card1 = page.locator('.task-number-card[data-task-num="1"]');
    await card1.click();

    await expect(page.locator("#view-quiz-player")).toBeVisible();
    // Проверяем все элементы оформления карточки из ТЗ/скриншота
    await expect(page.locator("#quizCardHeader")).toBeVisible();
    await expect(page.locator("#quizMetaNum")).toBeVisible();
    await expect(page.locator("#quizMetaNum")).toHaveText("1");
    await expect(page.locator("#quizMetaLine")).toContainText("1 линия");
    await expect(page.locator("#quizMetaIdText")).toContainText("№");
    await expect(page.locator("#quizReportBtn")).toContainText("Сообщить об ошибке");

    // Поле ввода "Введи ответ" со стилем rounded pill
    const pillInput = page.locator("#quizPillInput");
    await expect(pillInput).toBeVisible();
    await expect(pillInput).toHaveAttribute("placeholder", "Введи ответ");

    // Вводим ответ в поле
    await pillInput.fill("15");
    await expect(page.locator("#quizNextBtn")).toBeEnabled();

    // 2. Входим под админом и добавляем новый тест с темой
    await page.locator("#quizQuitBtn").click();
    page.on("dialog", (d) => d.accept());
    await page.locator("#quizQuitBtn").click();

    await page.locator("#loginBtn").click();
    await page.locator("#manualEmail").fill("admin@examhub.ru");
    await page.locator("#manualPass").fill("admin123");
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    // Переход в Конструктор тестов
    await page.locator("#openTestConstructorFromTestsBtn").click();
    await expect(page.locator("#view-test-editor")).toBeVisible();

    const uniqueTopic = `Авторский тест по физике [${Date.now()}]`;
    const uniqueQ = `Найдите ускорение свободного падения на экваторе [${Date.now()}]`;

    await page.locator("#qSubjectSelect").selectOption("physics");
    await page.locator("#qTaskNumberInput").fill("1");
    await page.locator("#qTopicTitleInput").fill(uniqueTopic);
    await page.locator("#qTypeSelect").selectOption("text");
    await page.locator("#qTextarea").fill(uniqueQ);
    await page.locator("#textCorrectAnswerInput").fill("9.78");

    await page.locator("#saveQuestionBtn").click();
    await expect(page.locator(".toast-message")).toContainText("Сохранено в БД");

    // 3. Выход из сайта (handleLogout)
    const logoutBtn = page.locator("#logoutBtn");
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await expect(page.locator("#loginBtn")).toBeVisible();

    // 4. Проверяем, что после выхода из сайта добавленный тест НЕ пропал!
    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();

    // Переходим во вкладку «По предметам и темам»
    await page.locator("#btnTestTabSubjects").click();
    await page.locator("#generalQuizzesSubjectFilter").selectOption("physics");

    const quizzesGrid = page.locator("#allGeneralQuizzesGrid");
    await expect(quizzesGrid).toBeVisible();
    await expect(quizzesGrid).toContainText(uniqueTopic);
  });
});
