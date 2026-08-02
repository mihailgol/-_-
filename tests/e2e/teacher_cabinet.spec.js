import { test, expect } from "@playwright/test";

test.describe("Teacher Cabinet — Groups & Assignments", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("переход в раздел Кабинет учителя из сайдбара", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(page.locator("#view-teacher")).toBeVisible();
    await expect(page.locator("#view-teacher h2")).toContainText("Кабинет Учителя и Репетитора");
  });

  test("открывает модальное окно создания группы", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await page.locator("#createGroupBtn").click();
    await expect(page.locator("#newGroupNameInput")).toBeVisible();
  });

  test("открывает модальное окно входа в группу по коду", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await page.locator("#joinGroupBtn").click();
    await expect(page.locator("#joinInviteCodeInput")).toBeVisible();
  });
});
