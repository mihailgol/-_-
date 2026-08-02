import { appState } from "./state.js";

const STORAGE_KEY = "examhub_exam_type";

export function getExamType() {
  return localStorage.getItem(STORAGE_KEY) || appState.selectedExamType || "all";
}

export function setExamType(type) {
  const validTypes = ["all", "EGE", "OGE"];
  const normalized = validTypes.includes(type) ? type : "all";
  appState.selectedExamType = normalized;
  localStorage.setItem(STORAGE_KEY, normalized);
  updateToggleUI(normalized);

  window.dispatchEvent(new CustomEvent("examTypeChanged", { detail: { examType: normalized } }));
}

export function initExamTypeToggle() {
  const savedType = getExamType();
  setExamType(savedType);

  const container = document.getElementById("examTypeToggle");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".exam-type-btn");
    if (!btn) return;
    const type = btn.getAttribute("data-exam-type");
    if (type) {
      setExamType(type);
    }
  });
}

function updateToggleUI(type) {
  const container = document.getElementById("examTypeToggle");
  if (!container) return;

  const buttons = container.querySelectorAll(".exam-type-btn");
  buttons.forEach((btn) => {
    const btnType = btn.getAttribute("data-exam-type");
    if (btnType === type) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}
