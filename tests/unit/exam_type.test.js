import { describe, it, expect, beforeEach } from "vitest";
import { initExamTypeToggle, setExamType, getExamType } from "../../js/modules/exam-type.js";
import { appState } from "../../js/modules/state.js";

describe("exam-type module", () => {
  beforeEach(() => {
    localStorage.clear();
    appState.selectedExamType = "all";
    document.body.innerHTML = `
      <div class="exam-type-toggle" id="examTypeToggle">
        <button class="exam-type-btn active" data-exam-type="all">Все</button>
        <button class="exam-type-btn" data-exam-type="EGE">ЕГЭ</button>
        <button class="exam-type-btn" data-exam-type="OGE">ОГЭ</button>
      </div>
    `;
  });

  it("defaults to 'all' when no storage exists", () => {
    initExamTypeToggle();
    expect(getExamType()).toBe("all");
    expect(appState.selectedExamType).toBe("all");
  });

  it("loads exam type from localStorage", () => {
    localStorage.setItem("examhub_exam_type", "EGE");
    initExamTypeToggle();
    expect(getExamType()).toBe("EGE");
    expect(appState.selectedExamType).toBe("EGE");
  });

  it("updates appState, localStorage, and active class when setExamType is called", () => {
    initExamTypeToggle();
    setExamType("OGE");
    expect(getExamType()).toBe("OGE");
    expect(appState.selectedExamType).toBe("OGE");
    expect(localStorage.getItem("examhub_exam_type")).toBe("OGE");

    const activeBtn = document.querySelector(".exam-type-btn.active");
    expect(activeBtn).not.toBeNull();
    expect(activeBtn.getAttribute("data-exam-type")).toBe("OGE");
  });

  it("falls back to 'all' for invalid exam types", () => {
    initExamTypeToggle();
    setExamType("INVALID");
    expect(getExamType()).toBe("all");
  });

  it("switches exam type on button click", () => {
    initExamTypeToggle();
    const egeBtn = document.querySelector('[data-exam-type="EGE"]');
    egeBtn.click();
    expect(getExamType()).toBe("EGE");
    expect(egeBtn.classList.contains("active")).toBe(true);
  });
});
