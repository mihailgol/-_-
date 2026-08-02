import { describe, it, expect, beforeEach } from "vitest";
import { initTheme, setTheme, getTheme, toggleTheme } from "../../js/modules/theme.js";

describe("theme module", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-setting");
    document.body.innerHTML = `
      <div class="theme-toggle">
        <button data-theme-val="light"></button>
        <button data-theme-val="dark"></button>
        <button data-theme-val="auto"></button>
      </div>
      <button id="themeToggleBtn"><i></i></button>
    `;
  });

  it("defaults to auto theme when no storage exists", () => {
    initTheme();
    expect(getTheme()).toBe("auto");
    expect(document.documentElement.getAttribute("data-theme-setting")).toBe("auto");
  });

  it("loads theme from localStorage", () => {
    localStorage.setItem("examhub_theme", "dark");
    initTheme();
    expect(getTheme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("sets theme and saves to localStorage", () => {
    initTheme();
    setTheme("light");
    expect(getTheme()).toBe("light");
    expect(localStorage.getItem("examhub_theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggles theme sequentially through light, dark, auto", () => {
    initTheme();
    setTheme("light");
    expect(toggleTheme()).toBe("dark");
    expect(getTheme()).toBe("dark");
    expect(toggleTheme()).toBe("auto");
    expect(getTheme()).toBe("auto");
    expect(toggleTheme()).toBe("light");
    expect(getTheme()).toBe("light");
  });

  it("falls back to auto for invalid theme values", () => {
    setTheme("invalid-theme");
    expect(getTheme()).toBe("auto");
  });
});
