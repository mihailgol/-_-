import { describe, it, expect, beforeEach } from "vitest";
import { formatNumber, parseDuration, pluralDays } from "../../js/modules/utils.js";
import {
  appState,
  saveStateToStorage,
  loadStateFromStorage,
  markTopicRead,
  isTopicRead,
  registerActivity,
  getSubjectProgress,
  setPlanTaskDone,
} from "../../js/modules/state.js";

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
    testsSolved: 0,
    avgPercent: 0,
    streak: 0,
    achievements: 0,
    questionsToday: 0,
    lessonsWatched: 0,
    readTopics: [],
    lastActiveDate: null,
    planTasks: {},
  };
  appState.customTopics = {};
  appState.pendingAssignmentId = null;
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

describe("pluralDays", () => {
  it("pluralizes russian day words", () => {
    expect(pluralDays(1)).toBe("1 день");
    expect(pluralDays(2)).toBe("2 дня");
    expect(pluralDays(5)).toBe("5 дней");
    expect(pluralDays(11)).toBe("11 дней");
    expect(pluralDays(21)).toBe("21 день");
    expect(pluralDays(23)).toBe("23 дня");
    expect(pluralDays(0)).toBe("0 дней");
  });
});

describe("study progress tracking", () => {
  it("marks a topic as read", () => {
    markTopicRead("biology", "bio_cytology");
    expect(isTopicRead("biology", "bio_cytology")).toBe(true);
    expect(isTopicRead("biology", "bio_genetics")).toBe(false);
  });

  it("computes subject progress percentage", () => {
    const subject = {
      id: "biology",
      topics: [{ id: "a" }, { id: "b" }, { id: "c" }],
    };
    markTopicRead("biology", "a");
    markTopicRead("biology", "b");
    expect(getSubjectProgress(subject)).toBe(67);
    expect(getSubjectProgress({ id: "empty", topics: [] })).toBe(0);
  });

  it("persists read topics to localStorage", () => {
    markTopicRead("chemistry", "chem_atom");
    const saved = JSON.parse(localStorage.getItem("examhub_state"));
    expect(saved.stats.readTopics).toContain("chemistry:chem_atom");
  });
});

describe("streak calculation", () => {
  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function shiftDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return dateKey(d);
  }

  it("starts streak from the first activity", () => {
    registerActivity();
    expect(appState.stats.streak).toBe(1);
    expect(appState.stats.lastActiveDate).toBe(dateKey(new Date()));
  });

  it("keeps streak on same-day activity", () => {
    appState.stats.streak = 5;
    appState.stats.lastActiveDate = dateKey(new Date());
    registerActivity();
    expect(appState.stats.streak).toBe(5);
  });

  it("increments streak when active on consecutive days", () => {
    appState.stats.streak = 5;
    appState.stats.lastActiveDate = shiftDays(-1);
    registerActivity();
    expect(appState.stats.streak).toBe(6);
  });

  it("resets streak after a gap", () => {
    appState.stats.streak = 5;
    appState.stats.lastActiveDate = shiftDays(-3);
    registerActivity();
    expect(appState.stats.streak).toBe(1);
  });
});

describe("plan tasks persistence", () => {
  it("stores completed tasks and restores them", () => {
    setPlanTaskDone("t1", true);
    setPlanTaskDone("t2", true);
    setPlanTaskDone("t2", false);

    expect(appState.stats.planTasks).toEqual({ t1: true });

    localStorage.clear();
    loadStateFromStorage();
    expect(appState.stats.planTasks).toEqual({ t1: true });
  });
});
