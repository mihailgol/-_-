import { test, expect } from "@playwright/test";

test.describe("Admin Panel & Editor Systems — QA E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("examhub_token", "admin_session_token");
      localStorage.setItem("examhub_user", JSON.stringify({ role: "ADMIN", email: "admin@examhub.ru", isPremium: true }));
    });
  });

  test("переход в панель администратора и переключение вкладок", async ({ page }) => {
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { renderAdminDashboard } = await import("/js/modules/admin-dashboard.js");
      switchView("admin");
      renderAdminDashboard();
    });

    await expect(page.locator("#view-admin")).toBeVisible();
    await expect(page.locator("#view-admin h2").first()).toContainText("Система Администратора");
  });

  test("редактор теории — предпросмотр глазами ученика и очистка текста", async ({ page }) => {
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTheoryEditor } = await import("/js/modules/theory-editor.js");
      switchView("theory-editor");
      initTheoryEditor();
    });

    await expect(page.locator("#view-theory-editor")).toBeVisible();
    await page.locator("#theoryTitleInput").fill("Тестовая тема по физике");
    await page.locator("#theoryContentTextarea").fill("## Важные законы\n\\[ F = m \\cdot a \\]");

    // Проверка модального окна предпросмотра
    await page.locator("#previewStudentTheoryBtn").click();
    await expect(page.locator("#adminModal")).toBeVisible();
    await expect(page.locator("#adminModalBody")).toContainText("Тестовая тема по физике");
    await page.locator("#adminModal .modal-close-btn").click();

    // Проверка кнопки очистки
    await page.locator("#clearTheoryBtn").click();
    await expect(page.locator("#theoryContentTextarea")).toHaveValue("");
    await expect(page.locator("#theoryTitleInput")).toHaveValue("");
  });

  test("конструктор тестов — предпросмотр вопроса и очистка формы", async ({ page }) => {
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });

    await expect(page.locator("#view-test-editor")).toBeVisible();
    await page.locator("#qTextarea").fill("Найдите корень уравнения x^2 = 16");

    // Предпросмотр глазами ученика
    await page.locator("#previewStudentTestBtn").click();
    await expect(page.locator("#adminModal")).toBeVisible();
    await expect(page.locator("#adminModalBody")).toContainText("Найдите корень уравнения x^2 = 16");
    await page.locator("#adminModal .modal-close-btn").click();

    // Очистка формы
    await page.locator("#clearQuestionBtn").click();
    await expect(page.locator("#qTextarea")).toHaveValue("");
  });
});
