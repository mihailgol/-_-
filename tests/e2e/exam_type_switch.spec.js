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
});
