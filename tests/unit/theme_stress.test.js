import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTheme, setTheme, getTheme, toggleTheme } from "../../js/modules/theme.js";

describe("theme module — empirical stress tests", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-setting");
    document.body.innerHTML = `
      <div class="theme-toggle">
        <button class="theme-toggle-btn" data-theme-val="light"></button>
        <button class="theme-toggle-btn" data-theme-val="dark"></button>
        <button class="theme-toggle-btn" data-theme-val="auto"></button>
      </div>
      <button id="themeToggleBtn"><i data-lucide="sun"></i></button>
    `;
  });

  describe("1. Invalid localStorage & invalid setTheme values", () => {
    const invalidValues = [
      "invalid_theme",
      "DARK",
      "LIGHT",
      "AUTO",
      "null",
      "undefined",
      "[object Object]",
      "12345",
      "",
      "   ",
      "custom-theme",
    ];

    invalidValues.forEach((val) => {
      it(`initTheme() falls back to "auto" when localStorage contains "${val}"`, () => {
        localStorage.setItem("examhub_theme", val);
        initTheme();
        expect(getTheme()).toBe("auto");
        expect(document.documentElement.getAttribute("data-theme-setting")).toBe("auto");
      });

      it(`setTheme("${val}") falls back to "auto"`, () => {
        initTheme();
        setTheme(val);
        expect(getTheme()).toBe("auto");
        expect(localStorage.getItem("examhub_theme")).toBe("auto");
        expect(document.documentElement.getAttribute("data-theme-setting")).toBe("auto");
      });
    });

    it("handles non-string values passed to setTheme gracefully", () => {
      initTheme();
      // @ts-ignore
      setTheme(null);
      expect(getTheme()).toBe("auto");
      // @ts-ignore
      setTheme(123);
      expect(getTheme()).toBe("auto");
      // @ts-ignore
      setTheme({});
      expect(getTheme()).toBe("auto");
      // @ts-ignore
      setTheme(true);
      expect(getTheme()).toBe("auto");
    });
  });

  describe("2. Rapid theme toggling & state consistency", () => {
    it("maintains strict cyclic state (light -> dark -> auto -> light) over 100 rapid toggles", () => {
      initTheme();
      setTheme("light");

      const expectedCycle = ["dark", "auto", "light"];
      for (let i = 0; i < 100; i++) {
        const expected = expectedCycle[i % 3];
        const result = toggleTheme();
        expect(result).toBe(expected);
        expect(getTheme()).toBe(expected);
        expect(localStorage.getItem("examhub_theme")).toBe(expected);
        expect(document.documentElement.getAttribute("data-theme-setting")).toBe(expected);
      }
    });

    it("maintains button active state synchronization across 50 rapid random setTheme calls", () => {
      initTheme();
      const themes = ["light", "dark", "auto"];

      for (let i = 0; i < 50; i++) {
        const targetTheme = themes[i % 3];
        setTheme(targetTheme);

        const buttons = document.querySelectorAll("[data-theme-val]");
        buttons.forEach((btn) => {
          const val = btn.getAttribute("data-theme-val");
          if (val === targetTheme) {
            expect(btn.classList.contains("active")).toBe(true);
          } else {
            expect(btn.classList.contains("active")).toBe(false);
          }
        });
      }
    });
  });

  describe("3. System media query event handling", () => {
    it("updates data-theme dynamically on prefers-color-scheme change when theme is auto", () => {
      let mediaCallback = null;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((event, cb) => {
          mediaCallback = cb;
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn((cb) => {
          mediaCallback = cb;
        }),
        removeListener: vi.fn(),
      }));

      initTheme();
      setTheme("auto");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");

      // Simulate system dark mode activation
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      if (mediaCallback) {
        mediaCallback({ matches: true });
      }

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("does NOT change data-theme on prefers-color-scheme change when theme is explicitly set to light or dark", () => {
      let mediaCallback = null;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((event, cb) => {
          mediaCallback = cb;
        }),
        removeEventListener: vi.fn(),
      }));

      initTheme();
      setTheme("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      if (mediaCallback) {
        mediaCallback({ matches: true });
      }

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("4. Re-initialization & event listener accumulation stress test", () => {
    it("accumulates click event listeners if initTheme() is called multiple times", () => {
      initTheme();
      initTheme();
      initTheme();

      setTheme("light");
      const toggleBtn = document.getElementById("themeToggleBtn");
      
      toggleBtn.click();
      
      const current = getTheme();
      expect(current).toBe("dark");
    });
  });

  describe("5. Lucide SVG replace icon update failure test", () => {
    it("fails to update icon on theme switch if <i> was replaced by <svg> by Lucide", () => {
      window.lucide = {
        createIcons: vi.fn(() => {
          const btn = document.getElementById("themeToggleBtn");
          const icon = btn.querySelector("i");
          if (icon) {
            const svg = document.createElement("svg");
            svg.setAttribute("data-lucide", icon.getAttribute("data-lucide"));
            btn.replaceChild(svg, icon);
          }
        }),
      };

      initTheme();
      setTheme("light");

      const btn = document.getElementById("themeToggleBtn");
      expect(btn.querySelector("svg")).not.toBeNull();
      expect(btn.querySelector("i")).toBeNull();

      setTheme("dark");

      const svg = btn.querySelector("svg");
      expect(svg.getAttribute("data-lucide")).toBe("moon");
    });
  });

  describe("6. Storage error resilience", () => {
    it("handles localStorage.getItem throwing SecurityError gracefully", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Access denied", "SecurityError");
      });

      expect(() => initTheme()).not.toThrow();
      expect(getTheme()).toBe("auto");
      vi.restoreAllMocks();
    });

    it("handles localStorage.setItem throwing QuotaExceededError gracefully", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });

      initTheme();
      expect(() => setTheme("dark")).not.toThrow();
      expect(getTheme()).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      vi.restoreAllMocks();
    });
  });
});
