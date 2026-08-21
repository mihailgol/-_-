import { test, expect } from "@playwright/test";

test.describe("ExamType Switcher — EGE / OGE filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("отображается переключатель Все / ЕГЭ / ОГЭ в шапке", async ({ page }) => {
    const toggle = page.locator("#examTypeToggle");
    await expect(toggle).toBeVisible();
    await expect(toggle.locator('.exam-type-btn[data-exam-type="all"]')).toBeVisible();
    await expect(toggle.locator('.exam-type-btn[data-exam-type="EGE"]')).toBeVisible();
    await expect(toggle.locator('.exam-type-btn[data-exam-type="OGE"]')).toBeVisible();
  });

  test("переключение режима меняет активный класс и сохраняется", async ({ page }) => {
    const egeBtn = page.locator('#examTypeToggle .exam-type-btn[data-exam-type="EGE"]');
    await egeBtn.click();
    await expect(egeBtn).toHaveClass(/active/);

    const savedType = await page.evaluate(() => localStorage.getItem("examhub_exam_type"));
    expect(savedType).toBe("EGE");
  });

  test("фильтрует список пробных экзаменов при переключении на ОГЭ", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
    await expect(page.locator("#view-mock-exam")).toBeVisible();

    const ogeBtn = page.locator('#examTypeToggle .exam-type-btn[data-exam-type="OGE"]');
    await ogeBtn.click();

    const badges = page.locator("#mockExamList .exam-type-badge");
    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText("ОГЭ");
    }
  });

  test("пошаговый выбор на странице тестов (ОГЭ/ЕГЭ -> Предмет -> Задание)", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();

    const ogeTaskBtn = page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]');
    await ogeTaskBtn.click();

    await expect(page.locator("#tasksExamLabel")).toHaveText("OGE");

    const subjectSelect = page.locator("#tasksSubjectFilter");
    await expect(subjectSelect).toBeVisible();

    // Сначала в сетке отображаются плашки предметов (.subject-card)
    await expect(page.locator("#taskNumbersGrid .subject-card").first()).toBeVisible();

    // Выбираем предмет или кликаем по плашке
    await subjectSelect.selectOption("biology");

    const taskCards = page.locator("#taskNumbersGrid .task-number-card");
    await expect(taskCards.first()).toBeVisible();
    await expect(taskCards.first()).toContainText("OGE");
  });
});
