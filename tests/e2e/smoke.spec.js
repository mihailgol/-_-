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
    const views = ["subjects", "notes", "videos", "tests", "plan", "analytics", "cart", "support"];
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
    await page.locator("#globalSearch").fill("клет");
    await expect(page.locator("#searchDropdown .search-result-item").first()).toBeVisible();
  });

  test("работает форма обратной связи", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="support"]').click();
    await page.locator("#view-support input[type='text']").first().fill("Иван");
    await page.locator("#supportSendBtn").click();
    await expect(page.locator("#toastMessage")).toHaveClass(/active/);
    await expect(page.locator("#toastText")).toContainText("отправлено");
  });

  test("нет ошибок в консоли браузера", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
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

    await page.goto("/");
    await page.waitForTimeout(1500);

    expect(critical).toEqual([]);
  });

  test("авторизация: регистрация, вход, выход", async ({ page }) => {
    const email = "ivan@example.ru";
    const pass = "secret123";

    // Регистрация нового пользователя
    await page.locator("#loginBtn").click();
    await expect(page.locator("#authModal")).toHaveClass(/active/);
    await page.locator("#authToggleLink").click();
    await page.locator("#manualEmail").fill(email);
    await page.locator("#manualPass").fill(pass);
    await page.locator("#authSubmitManual").click();

    await expect(page.locator("#authModal")).not.toHaveClass(/active/);
    await expect(page.locator("#logoutBtn")).toBeVisible();
    await expect(page.locator("#sidebarName")).toHaveText("ivan");

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
});
