import { test, expect } from "@playwright/test";

test.describe("ExamHub — smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("приложение загружается с корректным заголовком и структурой", async ({ page }) => {
    await expect(page).toHaveTitle(/ExamHub/);
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator("#view-subjects")).toBeVisible();
    await expect(page.locator(".brand-name")).toHaveText("ExamHub");
  });

  test("работает боковая навигация по всем разделам", async ({ page }) => {
    const views = ["subjects", "notes", "videos", "tests", "plan", "analytics", "cart", "profile", "support"];
    for (const view of views) {
      await page.locator(`.sidebar-nav .nav-item[data-view="${view}"]`).click();
      await expect(page.locator(`#view-${view}`)).toBeVisible();
    }
  });

  test("работает мобильная навигация (Bottom Nav)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
    await page.locator('.mobile-bottom-nav .mobile-nav-item[data-view="videos"]').click();
    await expect(page.locator("#view-videos")).toBeVisible();
    await page.locator('.mobile-bottom-nav .mobile-nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();
  });

  test("работают основные кнопки главной страницы", async ({ page }) => {
    await page.locator("#heroStartBtn").click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();
    await expect(page.locator("#subjectDetailTitle")).toHaveText("Биология");

    await page.locator("#subjectBackBtn").click();
    await expect(page.locator("#view-subjects")).toBeVisible();

    await page.locator("#heroHowBtn").click();
    await expect(page.locator("#toastMessage")).toHaveClass(/active/);
  });

  test("работает глобальный поиск", async ({ page }) => {
    await expect(page.locator(".subject-card").first()).toBeVisible();
    await page.locator("#globalSearch").fill("клет");
    await expect(page.locator("#searchDropdown .search-result-item").first()).toBeVisible();
  });

  test("работает форма обратной связи", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="support"]').click();
    await page.locator("#view-support input[type='text']").first().fill("Иван");
    await page.locator("#view-support textarea").first().fill("Тестовое обращение в поддержку");
    await page.locator("#supportSendBtn").click();
    await expect(page.locator("#toastMessage")).toHaveClass(/active/);
    await expect(page.locator("#toastText")).toContainText("отправлено");
  });

  test("нет ошибок в консоли браузера", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("401")) errors.push(msg.text());
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    expect(errors).toEqual([]);
  });

  test("нет критических сетевых ошибок", async ({ page }) => {
    const critical = [];
    page.on("response", (res) => {
      if (res.status() >= 500) critical.push(res.url());
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (url.includes("localhost") || /\.(js|css)$/.test(url)) critical.push(url);
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    expect(critical).toEqual([]);
  });

  test("авторизация: регистрация, вход, выход", async ({ page }) => {
    const email = `ivan${Date.now()}@example.ru`;
    const pass = "secret123";
    const expectedName = email.split("@")[0];

    // Регистрация нового пользователя
    await page.locator("#loginBtn").click();
    await expect(page.locator("#authModal")).toHaveClass(/active/);
    await page.locator("#authToggleLink").click();
    await page.locator("#manualEmail").fill(email);
    await page.locator("#manualPass").fill(pass);
    await page.locator("#authSubmitManual").click();

    await expect(page.locator("#authModal")).not.toHaveClass(/active/);
    await expect(page.locator("#logoutBtn")).toBeVisible();
    await expect(page.locator("#sidebarName")).toHaveText(expectedName);

    // Выход
    await page.locator("#logoutBtn").click();
    await expect(page.locator("#loginBtn")).toBeVisible();
    await expect(page.locator("#sidebarName")).toHaveText("Гость");

    // Повторный вход
    await page.locator("#loginBtn").click();
    await page.locator("#manualEmail").fill(email);
    await page.locator("#manualPass").fill(pass);
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#logoutBtn")).toBeVisible();
  });

  test("полный цикл прохождения теста", async ({ page }) => {
    await page.locator("#heroStartBtn").click();
    await page.locator('.sub-tab-btn[data-tab="tab-quizzes"]').click();
    await expect(page.locator(".quiz-list-item").first()).toBeVisible();
    await page.locator(".quiz-list-item").first().click();

    await expect(page.locator("#view-quiz-player")).toBeVisible();
    await expect(page.locator("#quizPlayerTitle")).toHaveText(/Тест: /);
    await expect(page.locator("#quizOptionsGrid .quiz-option-btn").first()).toBeVisible();

    const total = await page.locator("#quizProgressText").textContent();
    const match = total.match(/Вопрос 1 из (\d+)/);
    expect(match).not.toBeNull();

    // Пройти все вопросы теста
    const questionCount = parseInt(match[1], 10);
    for (let i = 0; i < questionCount; i++) {
      await page.locator("#quizOptionsGrid .quiz-option-btn").first().click();
      await page.locator("#quizNextBtn").click();
      await expect(page.locator("#quizExplanationBox")).toBeVisible();
      if (i < questionCount - 1) {
        await page.locator("#quizNextBtn").click();
      }
    }

    // На последнем вопросе кнопка меняется на «Завершить тест»
    await page.locator("#quizNextBtn").click();
    await expect(page.locator("#view-quiz-results")).toBeVisible();
    await expect(page.locator("#resultsPercentText")).toBeVisible();
  });

  test("отслеживание изучения конспектов и серии дней", async ({ page }) => {
    await page.locator("#heroStartBtn").click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();

    const firstNoteCard = page.locator(".note-item-card").first();
    await expect(firstNoteCard.locator(".note-item-meta").last()).toHaveText("Не изучено");

    await firstNoteCard.click();
    await expect(page.locator("#view-note-reader")).toBeVisible();
    await expect(page.locator("#statStreak")).toHaveText("1");

    await page.locator("#noteReaderBackBtn").click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();
    await expect(page.locator(".note-item-card").first().locator(".note-item-meta").last()).toHaveText("Изучено");
  });

  test("прогресс плана сохраняется в localStorage", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="plan"]').click();
    await expect(page.locator("#view-plan")).toBeVisible();

    await expect(page.locator("#planWeekPercentText")).toHaveText("0%");
    await page.locator("#planTask1").evaluate((el) => {
      el.checked = true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("#planWeekPercentText")).toHaveText("20%");

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("examhub_state")));
    expect(saved.stats.planTasks.t1).toBe(true);
  });

  test("работает навигация кнопками браузера «Назад»/«Вперёд»", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.locator("#heroStartBtn").click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#view-subjects")).toBeVisible();

    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#view-subject-detail")).toBeVisible();

    await page.locator('.sidebar-nav .nav-item[data-view="notes"]').click();
    await expect(page.locator("#view-notes")).toBeVisible();

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#view-subject-detail")).toBeVisible();

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#view-subjects")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("работает переключение темы оформления", async ({ page }) => {
    await page.locator('[data-theme-val="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator('[data-theme-val="light"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.locator('[data-theme-val="auto"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-setting", "auto");
  });

  test("генерация и прохождение AI теста", async ({ page }) => {
    const email = `aiuser${Date.now()}@example.ru`;
    const pass = "secret123";

    await page.locator("#loginBtn").click();
    await page.locator("#authToggleLink").click();
    await page.locator("#manualEmail").fill(email);
    await page.locator("#manualPass").fill(pass);
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();
    await page.locator("#btnTestTabAI").click();
    await expect(page.locator("#aiLimitBadge")).toBeVisible();

    await page.locator("#aiPromptInput").fill("Строение митохондрий");
    await page.locator("#generateAITestBtn").click();

    await expect(page.locator("#view-quiz-player")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#quizPlayerTitle")).toContainText("AI Тест:");
  });

  test("создание собственного пробника через модальное окно", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
    await expect(page.locator("#view-mock-exam")).toBeVisible();

    await page.locator("#openCreateMockModalBtn").click();
    await expect(page.locator("#createMockModal")).toHaveClass(/active/);

    const mockTitle = `Авторский вариант ${Date.now()}`;
    await page.locator("#createMockTitle").fill(mockTitle);
    await page.locator("#createMockForm button[type='submit']").click();

    await expect(page.locator("#createMockModal")).not.toHaveClass(/active/);
    await expect(page.locator("#mockExamList")).toContainText(mockTitle);
  });
});
