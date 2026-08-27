import { test, expect } from "@playwright/test";

test.describe("Empirical Challenger R3 & R4: Quiz Shortcuts & Minimap Stress Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".subject-card", { timeout: 10000 });
    // Click first subject card (Biology)
    await page.locator(".subject-card").first().click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();
    await page.locator('.sub-tab-btn[data-tab="tab-quizzes"]').click();
    await page.waitForSelector(".quiz-list-item", { timeout: 10000 });
    await page.locator(".quiz-list-item").first().click();
    await expect(page.locator("#view-quiz-player")).toBeVisible();
    await expect(page.locator("#quizMinimapGrid")).toBeVisible();
  });

  test("R3.1 Keyboard selection 1-4, Ctrl+Enter, and Arrow navigation in Quiz Player", async ({ page }) => {
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 1 из");
    const minimapItems = page.locator(".quiz-minimap-item");
    const count = await minimapItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Initial minimap item 1 should be active and unanswered
    await expect(minimapItems.nth(0)).toHaveClass(/active/);
    await expect(minimapItems.nth(0)).toHaveClass(/unanswered/);

    // Press 'ArrowLeft' at question 1 -> boundary guard should keep on Q1
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 1 из");

    // Press '2' -> option B (index 1) should become selected
    await page.keyboard.press("2");
    const optionBtns = page.locator("#quizOptionsGrid .quiz-option-btn");
    await expect(optionBtns.nth(1)).toHaveClass(/selected/);

    // Press '1' -> switch selection to option A (index 0)
    await page.keyboard.press("1");
    await expect(optionBtns.nth(0)).toHaveClass(/selected/);
    await expect(optionBtns.nth(1)).not.toHaveClass(/selected/);

    // Press 'Ctrl+Enter' -> checks answer
    await page.keyboard.press("Control+Enter");
    await expect(page.locator("#quizExplanationBox")).toBeVisible();
    await expect(minimapItems.nth(0)).toHaveClass(/answered/);

    // Press 'ArrowRight' -> moves to Q2
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 2 из");
    await expect(minimapItems.nth(1)).toHaveClass(/active/);
  });

  test("R3.2 Focus safety: Typing inside inputs/textareas does not trigger quiz shortcuts", async ({ page }) => {
    // Focus global search bar
    const search = page.locator("#globalSearch");
    await search.focus();
    await page.keyboard.type("1234");
    await expect(search).toHaveValue("1234");

    // Verify no option was selected in quiz behind the scenes
    const selectedOptions = page.locator("#quizOptionsGrid .quiz-option-btn.selected");
    expect(await selectedOptions.count()).toBe(0);

    // Press ArrowRight while focused in search -> quiz should still be on question 1
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 1 из");
  });

  test("R4.1 Minimap non-linear navigation (Q1 -> Q3 -> Q2 -> Q3) and state preservation", async ({ page }) => {
    const minimapItems = page.locator(".quiz-minimap-item");

    // 1. Answer Q1
    await page.keyboard.press("1");
    await page.keyboard.press("Control+Enter");
    await expect(minimapItems.nth(0)).toHaveClass(/answered/);

    // 2. Click Minimap button 3
    await minimapItems.nth(2).click();
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 3 из");
    await expect(page.locator("#quizExplanationBox")).not.toBeVisible();
    await expect(minimapItems.nth(2)).toHaveClass(/active/);
    await expect(minimapItems.nth(2)).toHaveClass(/unanswered/);

    // 3. Answer Q3 with option 2
    await page.keyboard.press("2");
    await page.keyboard.press("Control+Enter");
    await expect(minimapItems.nth(2)).toHaveClass(/answered/);

    // 4. Click Minimap button 2 (Q2 is unanswered)
    await minimapItems.nth(1).click();
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 2 из");
    await expect(page.locator("#quizNextBtn")).toBeDisabled();
    await expect(page.locator("#quizExplanationBox")).not.toBeVisible();

    // 5. Jump back to Q1 -> verify review mode restored
    await minimapItems.nth(0).click();
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 1 из");
    await expect(page.locator("#quizExplanationBox")).toBeVisible();
    await expect(page.locator("#quizNextBtn")).toBeEnabled();

    // 6. Jump back to Q3 -> verify review mode restored
    await minimapItems.nth(2).click();
    await expect(page.locator("#quizProgressText")).toContainText("Вопрос 3 из");
    await expect(page.locator("#quizExplanationBox")).toBeVisible();
  });

  test("R4.2 Accessibility attributes and dark theme contrast", async ({ page }) => {
    const minimapItems = page.locator(".quiz-minimap-item");
    const count = await minimapItems.count();

    for (let i = 0; i < count; i++) {
      const item = minimapItems.nth(i);
      await expect(item).toHaveAttribute("aria-label", `Вопрос ${i + 1}`);
      await expect(item).toHaveAttribute("data-quiz-index", String(i));
    }

    // Switch to dark theme via UI button
    await page.locator('[data-theme-val="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const containerBg = await page.locator("#quizMinimapContainer").evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // Dark theme container should be #1e293b (rgb(30, 41, 59))
    expect(containerBg).toBe("rgb(30, 41, 59)");

    // Switch back to light theme
    await page.locator('[data-theme-val="light"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
