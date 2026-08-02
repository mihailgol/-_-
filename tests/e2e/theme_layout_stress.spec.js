import { test, expect } from "@playwright/test";

test.describe("Theme & Layout Stress Tests — Requirement R1", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("Layout stability: element bounding boxes remain constant when switching themes", async ({ page }) => {
    // 1. Ensure page in light theme
    await page.locator('[data-theme-val="light"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Measure bounding boxes of key structural elements in light theme
    const sidebarLightBox = await page.locator(".sidebar").boundingBox();
    const topBarLightBox = await page.locator(".top-bar").boundingBox();
    const mainContentLightBox = await page.locator(".main-area").boundingBox();
    const cardsLightCount = await page.locator(".subject-card").count();

    expect(sidebarLightBox).not.toBeNull();
    expect(topBarLightBox).not.toBeNull();
    expect(mainContentLightBox).not.toBeNull();
    expect(sidebarLightBox.width).toBeGreaterThan(200);

    // 2. Switch to dark theme
    await page.locator('[data-theme-val="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Measure bounding boxes in dark theme
    const sidebarDarkBox = await page.locator(".sidebar").boundingBox();
    const topBarDarkBox = await page.locator(".top-bar").boundingBox();
    const mainContentDarkBox = await page.locator(".main-area").boundingBox();
    const cardsDarkCount = await page.locator(".subject-card").count();

    // Verify visual layout dimensions are unchanged (no layout shift / overflow collapse)
    expect(sidebarDarkBox.width).toBeCloseTo(sidebarLightBox.width, 1);
    expect(sidebarDarkBox.height).toBeCloseTo(sidebarLightBox.height, 1);
    expect(topBarDarkBox.width).toBeCloseTo(topBarLightBox.width, 1);
    expect(mainContentDarkBox.width).toBeCloseTo(mainContentLightBox.width, 1);
    expect(cardsDarkCount).toBe(cardsLightCount);

    // 3. Switch back to light theme
    await page.locator('[data-theme-val="light"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("CSS Variables: dark and light themes define all required design system variables", async ({ page }) => {
    const requiredVars = [
      "--color-bg",
      "--color-surface",
      "--color-text",
      "--color-border",
      "--color-green",
      "--color-blue",
      "--color-purple",
      "--glass-bg",
      "--glass-border",
    ];

    for (const theme of ["light", "dark"]) {
      await page.locator(`[data-theme-val="${theme}"]`).click();

      for (const varName of requiredVars) {
        const value = await page.evaluate((v) => {
          return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
        }, varName);
        expect(value).not.toBe("");
      }
    }
  });

  test("Theme localStorage edge cases: invalid value resilience on page reload", async ({ page }) => {
    // Inject invalid theme value into localStorage before load
    await page.evaluate(() => {
      localStorage.setItem("examhub_theme", "corrupted_invalid_theme_value");
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Verify html falls back to auto and app loads cleanly without crashing
    await expect(page.locator("html")).toHaveAttribute("data-theme-setting", "auto");
    await expect(page.locator(".sidebar")).toBeVisible();
  });

  test("Rapid theme toggling stress: clicking theme buttons 30 times quickly maintains consistent state", async ({ page }) => {
    const buttons = [
      page.locator('[data-theme-val="light"]'),
      page.locator('[data-theme-val="dark"]'),
      page.locator('[data-theme-val="auto"]'),
    ];

    for (let i = 0; i < 30; i++) {
      await buttons[i % 3].click();
    }

    // After 30 clicks (ended on auto)
    await expect(page.locator("html")).toHaveAttribute("data-theme-setting", "auto");
    const savedSetting = await page.evaluate(() => localStorage.getItem("examhub_theme"));
    expect(savedSetting).toBe("auto");
  });

  test("Text contrast & visibility: key elements have non-transparent visible text in dark and light modes", async ({ page }) => {
    for (const theme of ["light", "dark"]) {
      await page.locator(`[data-theme-val="${theme}"]`).click();

      const textColors = await page.evaluate(() => {
        const brand = getComputedStyle(document.querySelector(".brand-name")).color;
        const navText = getComputedStyle(document.querySelector(".nav-item span")).color;
        const heroTitle = getComputedStyle(document.querySelector(".hero-title")).color;
        return { brand, navText, heroTitle };
      });

      expect(textColors.brand).not.toBe("rgba(0, 0, 0, 0)");
      expect(textColors.navText).not.toBe("rgba(0, 0, 0, 0)");
      expect(textColors.heroTitle).not.toBe("rgba(0, 0, 0, 0)");
    }
  });
});
