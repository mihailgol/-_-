import { appState, setPlanTaskDone } from "./state.js";
import { showToast, openModal } from "./ui.js";

export function restorePlanTasks() {
  const checkboxes = document.querySelectorAll(".plan-check-input");
  checkboxes.forEach((cb) => {
    const taskId = cb.dataset.taskId;
    if (!taskId || !appState.stats.planTasks[taskId]) return;
    cb.checked = true;
    const parentLabel = cb.closest(".plan-task-item");
    if (parentLabel) parentLabel.classList.add("done");
  });
}

export function initPlanEvents() {
  restorePlanTasks();

  const checkboxes = document.querySelectorAll(".plan-check-input");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const parentLabel = cb.closest(".plan-task-item");
      if (!parentLabel) return;
      if (cb.checked) {
        parentLabel.classList.add("done");
      } else {
        parentLabel.classList.remove("done");
      }

      setPlanTaskDone(cb.dataset.taskId, cb.checked);
      calculatePlanProgress();
    });
  });

  const planUpgradeBtn = document.getElementById("planUpgradeBtn");
  if (planUpgradeBtn) {
    planUpgradeBtn.addEventListener("click", () => {
      openModal("premiumModal");
    });
  }

  calculatePlanProgress({ silent: true });
}

export function calculatePlanProgress({ silent = false } = {}) {
  const checkboxes = document.querySelectorAll(".plan-check-input");
  const totalTasks = checkboxes.length;
  const checkedCount = Array.from(checkboxes).filter((cb) => cb.checked).length;
  const percent = totalTasks === 0 ? 0 : Math.round((checkedCount / totalTasks) * 100);

  const percentText = document.getElementById("planWeekPercentText");
  if (percentText) {
    percentText.textContent = `${percent}%`;
  }

  const cb1 = document.getElementById("planTask1");
  const cb2 = document.getElementById("planTask2");
  const day2Status = document.getElementById("day2Status");
  if (cb1 && cb2 && day2Status) {
    if (cb1.checked && cb2.checked) {
      day2Status.textContent = "Выполнено";
      day2Status.className = "plan-day-status done";
    } else if (cb1.checked || cb2.checked) {
      day2Status.textContent = "В процессе";
      day2Status.className = "plan-day-status";
    } else {
      day2Status.textContent = "Предстоит";
      day2Status.className = "plan-day-status pending";
    }
  }

  if (percent === 100 && !silent) {
    showToast("🎉 План выполнен!", "Поздравляем! Вы полностью закрыли учебный трек этой недели.");
  }
}

export function updatePlanUI() {
  const overlay = document.getElementById("planPremiumOverlay");
  const content = document.getElementById("planDashboardContent");

  if (!overlay || !content) return;

  if (appState.user.isPremium) {
    overlay.style.display = "none";
    content.style.filter = "none";
    content.style.pointerEvents = "auto";
  } else {
    overlay.style.display = "flex";
    content.style.filter = "blur(5px)";
    content.style.pointerEvents = "none";
  }
}
