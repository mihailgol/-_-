import { describe, it, expect, beforeEach } from "vitest";
import { formatNumber, parseDuration } from "../../js/modules/utils.js";
import { appState, saveStateToStorage, loadStateFromStorage } from "../../js/modules/state.js";

beforeEach(() => {
  localStorage.clear();
  appState.user = {
    isLoggedIn: false,
    name: "Артём Иванов",
    role: "Ученик",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
    isPremium: false,
  };
  appState.stats = {
    testsSolved: 1248,
    avgPercent: 87,
    streak: 23,
    achievements: 15,
    questionsToday: 125,
    lessonsWatched: 0,
  };
  appState.customTopics = {};
});

describe("formatNumber", () => {
  it("formats thousands with spaces", () => {
    expect(formatNumber(1248)).toBe("1 248");
    expect(formatNumber(125)).toBe("125");
    expect(formatNumber(1000000)).toBe("1 000 000");
  });
});

describe("parseDuration", () => {
  it("parses MM:SS to seconds", () => {
    expect(parseDuration("21:40")).toBe(1300);
    expect(parseDuration("08:15")).toBe(495);
    expect(parseDuration("00:30")).toBe(30);
  });

  it("falls back to 1200 for unexpected formats", () => {
    expect(parseDuration("1:00:00")).toBe(1200);
    expect(parseDuration("")).toBe(1200);
  });
});

describe("state persistence", () => {
  it("saves appState to localStorage", () => {
    appState.user.name = "Тестовый Ученик";
    appState.stats.testsSolved = 42;
    saveStateToStorage();

    const saved = JSON.parse(localStorage.getItem("examhub_state"));
    expect(saved.user.name).toBe("Тестовый Ученик");
    expect(saved.stats.testsSolved).toBe(42);
  });

  it("loads appState from localStorage", () => {
    localStorage.setItem(
      "examhub_state",
      JSON.stringify({
        user: { name: "Загруженный", role: "Premium" },
        stats: { testsSolved: 7 },
        customTopics: {},
      })
    );
    loadStateFromStorage();

    expect(appState.user.name).toBe("Загруженный");
    expect(appState.user.role).toBe("Premium");
    expect(appState.stats.testsSolved).toBe(7);
  });

  it("tolerates corrupted storage payload", () => {
    localStorage.setItem("examhub_state", "{not valid json");
    expect(() => loadStateFromStorage()).not.toThrow();
    expect(appState.user.name).toBe("Артём Иванов");
  });
});
