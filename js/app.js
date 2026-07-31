// ExamHub SPA Application Entry (ES module)

import { appState, GUEST_USER, HASH_VIEWS, loadStateFromStorage } from "./modules/state.js";
import { api } from "./modules/utils.js";
import { showToast, initGlobalUIEvents } from "./modules/ui.js";
import { switchView, initRouter } from "./modules/navigation.js";
import { renderSubjects, renderGeneralNotes, renderGeneralVideos } from "./modules/catalog.js";
import { updateUIFromState } from "./modules/render.js";
import { initAuthEvents } from "./modules/auth.js";
import { initPremiumEvents } from "./modules/premium.js";
import { initVideoPlayerEvents } from "./modules/video.js";
import { initAIEvents } from "./modules/ai.js";
import { initPlanEvents } from "./modules/plan.js";
import { initAdminEvents } from "./modules/admin.js";

async function loadAppData() {
  const catalog = await api("/api/catalog/subjects");

  const subjectsMap = {};
  catalog.subjects.forEach((s) => {
    subjectsMap[s.id] = s;
  });
  window.EXAM_DATA = {
    subjects: subjectsMap,
    otherSubjects: catalog.otherSubjects,
  };

  try {
    const { user } = await api("/api/auth/me");
    if (user) {
      appState.user.isLoggedIn = true;
      appState.user.name = user.name;
      appState.user.role = user.role;
      appState.user.avatar = user.avatar || appState.user.avatar;
      appState.user.isPremium = user.isPremium;
    } else {
      appState.user = { ...GUEST_USER };
    }
  } catch {
    appState.user = { ...GUEST_USER };
  }

  if (appState.user.isLoggedIn) {
    try {
      const stats = await api("/api/progress/stats");
      appState.stats.testsSolved = stats.testsSolved;
      appState.stats.avgPercent = stats.avgPercent;
    } catch {
      // keep local stats
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadStateFromStorage();
  initGlobalUIEvents();
  initRouter();
  initAuthEvents();
  initPremiumEvents();
  initVideoPlayerEvents();
  initAIEvents();
  initPlanEvents();
  initAdminEvents();

  loadAppData()
    .then(() => {
      renderSubjects();
      renderGeneralNotes();
      renderGeneralVideos();
      updateUIFromState();

      const initialView = (location.hash || "#subjects").replace("#", "");
      if (HASH_VIEWS.includes(initialView)) {
        switchView(initialView, { replace: true });
      }
    })
    .catch((err) => {
      console.error("Failed to load app data:", err);
      showToast("⚠️ Ошибка сети", "Не удалось загрузить данные. Проверьте соединение с сервером.");
    });

  // Graceful fallback for external images when offline
  document.addEventListener(
    "error",
    (e) => {
      const target = e.target;
      if (target && target.tagName === "IMG" && !target.dataset.fallbackApplied) {
        target.dataset.fallbackApplied = "1";
        target.src =
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
              '<rect width="120" height="120" rx="16" fill="#E8EBE8"/>' +
              '<text x="60" y="72" font-size="40" text-anchor="middle" fill="#8E988E">🎓</text></svg>'
          );
      }
    },
    true
  );

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
