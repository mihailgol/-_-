import { appState, GUEST_USER, HASH_VIEWS, loadStateFromStorage } from "./modules/state.js";
import { api } from "./modules/utils.js";
import { showToast, initGlobalUIEvents, closeModal } from "./modules/ui.js";

import { switchView, initRouter } from "./modules/navigation.js";
import { renderSubjects, renderGeneralNotes, renderGeneralVideos } from "./modules/catalog.js";
import { updateUIFromState } from "./modules/render.js";
import { initAuthEvents } from "./modules/auth.js";
import { initPremiumEvents } from "./modules/premium.js";
import { initVideoPlayerEvents } from "./modules/video.js";
import { initAIEvents } from "./modules/ai.js";
import { initPlanEvents } from "./modules/plan.js";
import { initAdminEvents } from "./modules/admin.js";
import { initTheme } from "./modules/theme.js";
import { initExamTypeToggle, setExamType } from "./modules/exam-type.js";
import { renderMockExamCatalog, initMockExamEvents } from "./modules/mock-exam.js";
import { renderTeacherCabinet, renderStudentAssignments, initTeacherEvents } from "./modules/teacher.js";
import { renderAdminDashboard } from "./modules/admin-dashboard.js";
import { initTheoryEditor } from "./modules/theory-editor.js";
import { initTestEditor } from "./modules/test-editor.js";
import { initAnalyticsTracker } from "./modules/analytics-engine.js";
import { initProfileView } from "./modules/profile.js";

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
      if (user.examType) {
        setExamType(user.examType, false);
      }
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
    } catch (err) {
      void err;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initExamTypeToggle();
  loadStateFromStorage();
  initGlobalUIEvents();
  initRouter();
  initAuthEvents();
  initPremiumEvents();
  initVideoPlayerEvents();
  initAIEvents();
  initPlanEvents();
  initAdminEvents();
  initTeacherEvents();
  initMockExamEvents();
  initTheoryEditor();
  initTestEditor();
  initAnalyticsTracker();
  initProfileView();

  document.getElementById("adminLoginSubmitBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("adminLoginEmail")?.value.trim();
    const password = document.getElementById("adminLoginPass")?.value;

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.user) {
        appState.user.isLoggedIn = true;
        appState.user.name = res.user.name;
        appState.user.role = res.user.role;
        closeModal("adminLoginModal");
        updateUIFromState();
        showToast("🔑 Успешный вход", `Вы авторизованы как ${res.user.name}`);
        switchView("admin");
        renderAdminDashboard();
      }
    } catch (err) {
      showToast("⚠️ Ошибка входа", err.message || "Неверные данные Администратора");
    }
  });

  window.addEventListener("examTypeChanged", () => {
    renderSubjects();
    renderGeneralNotes();
    renderGeneralVideos();
    renderMockExamCatalog();
  });

  loadAppData()
    .then(() => {
      renderSubjects();
      renderGeneralNotes();
      renderGeneralVideos();
      renderTeacherCabinet();
      renderStudentAssignments();
      renderAdminDashboard();
      initTheoryEditor();
      initTestEditor();
      updateUIFromState();


      const initialView = (location.hash || "#subjects").replace("#", "");
      if (HASH_VIEWS.includes(initialView)) {
        switchView(initialView, { replace: true });
        if (initialView === "admin") {
          renderAdminDashboard();
        }
      }
    })
    .catch((err) => {
      console.error("Failed to load app data:", err);
      showToast("⚠️ Ошибка сети", "Не удалось загрузить данные. Проверьте соединение с сервером.");
    });

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

