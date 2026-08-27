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
    await expect(page.locator("#mockExamList .mock-exam-card").first()).toBeVisible();

    const ogeBtn = page.locator('#examTypeToggle .exam-type-btn[data-exam-type="OGE"]');
    await ogeBtn.click();

    await expect(page.locator("#mockExamList .exam-type-badge", { hasText: "ЕГЭ" })).toHaveCount(0);

    const badges = page.locator("#mockExamList .exam-type-badge");
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
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
    await page.locator('#tasksSubjectFilter option[value="biology"]').waitFor({ state: "attached" });
    await subjectSelect.selectOption("biology");

    const taskCards = page.locator("#taskNumbersGrid .task-number-card");
    await expect(taskCards.first()).toBeVisible();
    await expect(taskCards.first()).toContainText("OGE");
  });

  test("проверка доступности заданий по всем ключевым предметам (Математика, Русский, Биология, Химия, Физика) для ОГЭ", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();

    const ogeTaskBtn = page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]');
    await ogeTaskBtn.click();
    await expect(page.locator("#taskNumbersGrid .subject-card").first()).toBeVisible();

    const subjectSelect = page.locator("#tasksSubjectFilter");
    const subjects = ["math", "russian", "biology", "chemistry", "physics"];

    for (const s of subjects) {
      await page.locator(`#tasksSubjectFilter option[value="${s}"]`).waitFor({ state: "attached" });
      await subjectSelect.selectOption(s);
      await expect(page.locator("#taskNumbersGrid .task-number-card").first()).toBeVisible();
    }
  });

  test("открытие и решение задания Части 2 (развернутый ответ) в тренажере тестов", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(page.locator("#view-tests")).toBeVisible();

    const bioOption = page.locator('#tasksSubjectFilter option[value="biology"]');
    await bioOption.waitFor({ state: "attached", timeout: 10000 });
    await page.selectOption("#tasksSubjectFilter", "biology");

    const task22Card = page.locator('#taskNumbersGrid .task-number-card[data-task-num="22"]');
    await expect(task22Card).toBeVisible();
    await task22Card.click();

    await expect(page.locator("#view-quiz-player")).toBeVisible();
    await expect(page.locator("#quizQuestionText")).toBeVisible();

    const textarea = page.locator("#quizExtendedTextarea");
    await expect(textarea).toBeVisible();
    await textarea.fill("Мой вариант решения задачи №22 по биологии");

    const checkBtn = page.locator("#quizNextBtn");
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    await expect(page.locator("#quizExplanationBox")).toBeVisible();
    await expect(page.locator("#quizExplanationText")).toContainText("Элементы ответа");
  });
});
