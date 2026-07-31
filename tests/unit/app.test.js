import { describe, it, expect, beforeEach } from "vitest";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_SRC = readFileSync(resolve(process.cwd(), "js/app.js"), "utf8");

function createLocalStorageStub() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

function loadAppSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    document: { addEventListener: () => {}, querySelectorAll: () => [] },
    localStorage: createLocalStorageStub(),
    location: { hash: "" },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(APP_SRC, sandbox, { filename: "app.js" });
  vm.runInContext("globalThis.__appState = appState;", sandbox);
  return sandbox;
}

describe("formatNumber", () => {
  it("formats thousands with spaces", () => {
    const s = loadAppSandbox();
    expect(s.formatNumber(1248)).toBe("1 248");
    expect(s.formatNumber(125)).toBe("125");
    expect(s.formatNumber(1000000)).toBe("1 000 000");
  });
});

describe("parseDuration", () => {
  it("parses MM:SS to seconds", () => {
    const s = loadAppSandbox();
    expect(s.parseDuration("21:40")).toBe(1300);
    expect(s.parseDuration("08:15")).toBe(495);
    expect(s.parseDuration("00:30")).toBe(30);
  });

  it("falls back to 1200 for unexpected formats", () => {
    const s = loadAppSandbox();
    expect(s.parseDuration("1:00:00")).toBe(1200);
    expect(s.parseDuration("")).toBe(1200);
  });
});

describe("state persistence", () => {
  let s;

  beforeEach(() => {
    s = loadAppSandbox();
  });

  it("saves appState to localStorage", () => {
    s.__appState.user.name = "Тестовый Ученик";
    s.__appState.stats.testsSolved = 42;
    s.saveStateToStorage();

    const saved = JSON.parse(s.localStorage.getItem("examhub_state"));
    expect(saved.user.name).toBe("Тестовый Ученик");
    expect(saved.stats.testsSolved).toBe(42);
  });

  it("loads appState from localStorage", () => {
    s.localStorage.setItem(
      "examhub_state",
      JSON.stringify({
        user: { name: "Загруженный", role: "Premium" },
        stats: { testsSolved: 7 },
        customTopics: {},
      })
    );
    s.loadStateFromStorage();

    expect(s.__appState.user.name).toBe("Загруженный");
    expect(s.__appState.user.role).toBe("Premium");
    expect(s.__appState.stats.testsSolved).toBe(7);
  });

  it("tolerates corrupted storage payload", () => {
    s.localStorage.setItem("examhub_state", "{not valid json");
    expect(() => s.loadStateFromStorage()).not.toThrow();
    expect(s.__appState.user.name).toBe("Артём Иванов");
  });
});
