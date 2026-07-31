import { appState } from "./state.js";

let toastTimeout = null;

export function showToast(title, message) {
  const toast = document.getElementById("toastMessage");
  const icon = document.getElementById("toastIcon");
  const text = document.getElementById("toastText");

  if (!toast) return;

  let iconVal = "✨";
  if (title.toLowerCase().includes("оплат") || title.toLowerCase().includes("premium")) iconVal = "👑";
  else if (title.toLowerCase().includes("выход")) iconVal = "🚪";
  else if (title.toLowerCase().includes("ошибк") || title.toLowerCase().includes("огранич")) iconVal = "🔒";
  else if (title.toLowerCase().includes("поиск")) iconVal = "🔍";
  else if (title.toLowerCase().includes("лекц") || title.toLowerCase().includes("изуч")) iconVal = "🎓";
  else if (title.toLowerCase().includes("прав")) iconVal = "🎉";

  icon.textContent = iconVal;
  text.innerHTML = "";
  const strong = document.createElement("strong");
  strong.textContent = `${title}: `;
  text.appendChild(strong);
  text.appendChild(document.createTextNode(message));

  toast.classList.add("active");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove("active");
  }, 4000);
}

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";

    if (modalId === "videoModal" && appState.videoState.timer) {
      clearInterval(appState.videoState.timer);
      appState.videoState.isPlaying = false;
    }
  }
}

export function initGlobalUIEvents() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-close-modal");
      closeModal(target);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  window.closeModal = closeModal;
  window.openModal = openModal;
  window.showToast = showToast;
}
