import { appState, saveStateToStorage } from "./state.js";
import { api } from "./utils.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { updateUIFromState } from "./render.js";
import { renderGeneralNotes, renderGeneralVideos, loadNoteReader, loadSubjectDetail } from "./catalog.js";

export function initPremiumEvents() {
  const triggerBtn = document.getElementById("sidebarPremiumBtn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => openModal("premiumModal"));
  }

  const upgradeCardBtn = document.getElementById("sidebarPremiumCard");
  if (upgradeCardBtn) {
    upgradeCardBtn.addEventListener("click", (e) => {
      if (e.target.className === "premium-promo-btn" || e.target.closest(".premium-promo-btn")) {
        openModal("premiumModal");
      }
    });
  }

  const cartBtn = document.getElementById("cartOpenPremiumBtn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => openModal("premiumModal"));
  }

  const subscribeBtn = document.getElementById("premiumSubscribeBtn");
  if (subscribeBtn) {
    subscribeBtn.addEventListener("click", () => {
      const activePlan = document.querySelector(".premium-plans-grid .premium-plan-card.active");
      const planId = activePlan ? activePlan.getAttribute("data-plan") : "3months";

      showToast("💳 Оплата...", "Инициализация безопасной платежной системы...");

      api("/api/premium/subscribe", {
        method: "POST",
        body: JSON.stringify({ planId }),
      })
        .then(() => {
          appState.user.isPremium = true;

          saveStateToStorage();
          updateUIFromState();
          closeModal("premiumModal");

          if (appState.currentView === "note-reader") {
            const lockOverlay = document.getElementById("notePremiumOverlay");
            if (lockOverlay) lockOverlay.style.display = "none";
          }

          renderGeneralNotes();
          renderGeneralVideos();

          if (appState.currentView === "note-reader" && appState.activeNoteId && appState.currentSubject) {
            loadNoteReader(appState.currentSubject.id, appState.activeNoteId);
          } else if (appState.currentSubject) {
            loadSubjectDetail(appState.currentSubject.id);
          }

          showToast("👑 Premium активен", "Поздравляем! Вам разблокированы все возможности ExamHub.");
        })
        .catch((e) => {
          showToast("❌ Ошибка", e.message);
        });
    });
  }

  const plans = document.querySelectorAll(".premium-plans-grid .premium-plan-card");
  plans.forEach((plan) => {
    plan.addEventListener("click", () => {
      plans.forEach((p) => p.classList.remove("active"));
      plan.classList.add("active");
    });
  });
}
