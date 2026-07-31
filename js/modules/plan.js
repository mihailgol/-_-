import { appState } from "./state.js";
import { showToast, openModal } from "./ui.js";

export function initPlanEvents() {
  const checkboxes = document.querySelectorAll(".plan-check-input");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const parentLabel = cb.closest(".plan-task-item");
      if (cb.checked) {
        parentLabel.classList.add("done");
      } else {
        parentLabel.classList.remove("done");
      }

      calculatePlanProgress();
    });
  });

  const planUpgradeBtn = document.getElementById("planUpgradeBtn");
  if (planUpgradeBtn) {
    planUpgradeBtn.addEventListener("click", () => {
      openModal("premiumModal");
    });
  }
}

export function calculatePlanProgress() {
  const checkboxes = document.querySelectorAll(".plan-check-input");
  let checkedCount = 2;
  const totalTasks = 7;

  checkboxes.forEach((cb) => {
    if (cb.checked) checkedCount++;
  });

  const percent = Math.round((checkedCount / totalTasks) * 100);

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

  if (percent === 100) {
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
