import { appState, HASH_VIEWS } from "./state.js";
import { showToast, openModal } from "./ui.js";
import { api } from "./utils.js";
import { loadSubjectDetail, renderAllSubjectsModal, loadNoteReader } from "./catalog.js";
import { openVideoPlayer } from "./video.js";

export function pushSubView(state, hash) {
  history.pushState(state, "", hash || location.hash);
}

export function switchView(viewName, { replace = false } = {}) {
  appState.currentView = viewName;

  const sections = document.querySelectorAll(".view-section");
  sections.forEach((s) => s.classList.remove("active"));

  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  if (viewName === "admin") {
    import("./admin-dashboard.js").then((m) => m.renderAdminDashboard());
  }
  if (viewName === "profile") {
    import("./profile.js").then((m) => m.updateProfileUI());
  }
  if (["offer", "privacy", "terms"].includes(viewName)) {
    api("/api/site/settings").then((res) => {
      const s = res.settings || {};
      document.querySelectorAll(".legal-setting-name").forEach((el) => (el.textContent = s.legal_name || "Платформа ExamHub"));
      document.querySelectorAll(".legal-setting-status").forEach((el) => (el.textContent = s.legal_status || "Индивидуальный предприниматель / Самозанятый"));
      document.querySelectorAll(".legal-setting-inn").forEach((el) => (el.textContent = s.legal_inn || "770000000000"));
      document.querySelectorAll(".legal-setting-ogrn").forEach((el) => (el.textContent = s.legal_ogrn || "320000000000000"));
      document.querySelectorAll(".legal-setting-email").forEach((el) => (el.textContent = s.support_email || "support@examhub.ru"));
      document.querySelectorAll(".legal-setting-phone").forEach((el) => (el.textContent = s.support_phone || "8 (800) 555-35-35"));
    }).catch(() => {});
  }


  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach((n) => {
    if (n.getAttribute("data-view") === viewName) {
      n.classList.add("active");
    } else {
      n.classList.remove("active");
    }
  });

  const mobileNavItems = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
  mobileNavItems.forEach((n) => {
    if (n.getAttribute("data-view") === viewName) {
      n.classList.add("active");
    } else {
      n.classList.remove("active");
    }
  });

  document.querySelector(".view-container").scrollTop = 0;

  if (HASH_VIEWS.includes(viewName) && location.hash !== `#${viewName}`) {
    if (replace) {
      history.replaceState(null, "", `#${viewName}`);
    } else {
      history.pushState({ view: viewName }, "", `#${viewName}`);
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function restoreView(state) {
  const view = state && state.view;

  if (view === "subject-detail" && state.subjectId) {
    loadSubjectDetail(state.subjectId, { replace: true });
    return;
  }
  if (view === "note-reader" && state.subjectId && state.noteId) {
    loadNoteReader(state.subjectId, state.noteId, { replace: true });
    return;
  }
  if (view === "quiz-player" && appState.activeQuizQuestions.length > 0) {
    switchView("quiz-player", { replace: true });
    return;
  }
  if (view === "quiz-results" && appState.activeQuizQuestions.length > 0) {
    switchView("quiz-results", { replace: true });
    return;
  }
  if (view && HASH_VIEWS.includes(view)) {
    switchView(view, { replace: true });
    return;
  }

  const hashView = (location.hash || "#subjects").replace("#", "");
  if (HASH_VIEWS.includes(hashView) && hashView !== appState.currentView) {
    switchView(hashView, { replace: true });
  }
}

export function initRouter() {
  document.querySelectorAll("[data-view]").forEach((item) => {
    item.addEventListener("click", (e) => {
      const view = item.getAttribute("data-view");
      if (view && HASH_VIEWS.includes(view)) {
        e.preventDefault();
        switchView(view);
      }
    });
  });

  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.getAttribute("data-target");
      switchView(target);
    });
  });

  document.getElementById("heroStartBtn").addEventListener("click", () => {
    const firstSubjectId = Object.keys(window.EXAM_DATA.subjects)[0];
    if (firstSubjectId) {
      loadSubjectDetail(firstSubjectId);
    } else {
      switchView("notes");
    }
  });

  document.getElementById("heroHowBtn").addEventListener("click", () => {
    showToast("ℹ️ Как это работает", "Выберите предмет (Биология или Химия) для старта подготовки!");
  });

  document.getElementById("viewAllSubjectsLink").addEventListener("click", (e) => {
    e.preventDefault();
    renderAllSubjectsModal();
    openModal("allSubjectsModal");
  });

  const supportSendBtn = document.getElementById("supportSendBtn");
  if (supportSendBtn) {
    supportSendBtn.addEventListener("click", async () => {
      const inputs = document.querySelectorAll("#view-support input, #view-support textarea");
      const subject = inputs[0] ? inputs[0].value.trim() : "";
      const message = inputs[1] ? inputs[1].value.trim() : "";

      if (!subject || !message) {
        showToast("⚠️ Ошибка", "Пожалуйста, заполните тему и текст обращения.");
        return;
      }

      try {
        const res = await api("/api/support/tickets", {
          method: "POST",
          body: JSON.stringify({ subject, message })
        });
        showToast("✉️ Обращение отправлено", `Заявка #${res.ticketId || 1} принята. Свяжемся в течение 15 минут.`);
        inputs.forEach((i) => (i.value = ""));
      } catch {
        showToast("✉️ Обращение отправлено", "Наш репетитор свяжется с вами в течение 15 минут.");
        inputs.forEach((i) => (i.value = ""));
      }
    });
  }

  const notifBtn = document.getElementById("notificationBtn");
  const notifDropdown = document.getElementById("notificationDropdown");
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("active");
      const searchDropdown = document.getElementById("searchDropdown");
      if (searchDropdown) searchDropdown.classList.remove("active");
    });
  }

  const markReadBtn = document.getElementById("markReadBtn");
  if (markReadBtn) {
    markReadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".notif-item").forEach((item) => {
        item.classList.remove("unread");
      });
      const badge = document.getElementById("notificationBadge");
      if (badge) {
        badge.style.display = "none";
      }
      showToast("🔔 Уведомления", "Все уведомления отмечены как прочитанные.");
    });
  }

  document.querySelectorAll(".notif-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      if (item.classList.contains("unread")) {
        item.classList.remove("unread");
        const badge = document.getElementById("notificationBadge");
        if (badge) {
          let count = parseInt(badge.textContent) - 1;
          badge.textContent = count;
          if (count <= 0) {
            badge.style.display = "none";
          }
        }
      }
      const text = item.querySelector("p").textContent;
      showToast("🔔 Сообщение", text);
      notifDropdown.classList.remove("active");
    });
  });

  const searchInput = document.getElementById("globalSearch");
  const searchDropdown = document.getElementById("searchDropdown");

  if (searchInput && searchDropdown) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (query.length < 2) {
        searchDropdown.classList.remove("active");
        searchDropdown.innerHTML = "";
        return;
      }

      let results = [];
      Object.values(window.EXAM_DATA.subjects).forEach((subject) => {
        subject.topics.forEach((topic) => {
          if (topic.title.toLowerCase().includes(query)) {
            results.push({
              type: "note",
              title: `📖 Конспект: ${topic.title}`,
              subjectId: subject.id,
              itemId: topic.id,
              subjectName: subject.title,
              isPremium: topic.isPremium,
            });
          }
          if (topic.video && topic.video.title.toLowerCase().includes(query)) {
            results.push({
              type: "video",
              title: `🎥 Видео: ${topic.video.title}`,
              subjectId: subject.id,
              videoObj: topic.video,
              subjectName: subject.title,
              isPremium: topic.isPremium,
            });
          }
        });
      });

      if (results.length === 0) {
        searchDropdown.innerHTML = `<div class="search-result-empty">Ничего не найдено по запросу "${query}"</div>`;
      } else {
        searchDropdown.innerHTML = results
          .map(
            (res) => `
          <div class="search-result-item" data-type="${res.type}" data-subject="${res.subjectId}" data-id="${res.itemId || ""}">
            <div class="search-result-info">
              <span class="search-result-title">${res.title}</span>
              <span class="search-result-sub">${res.subjectName} ${res.isPremium ? "• 👑 Premium" : "• Бесплатно"}</span>
            </div>
          </div>
        `
          )
          .join("");

        searchDropdown.querySelectorAll(".search-result-item").forEach((item, idx) => {
          item.addEventListener("click", () => {
            const res = results[idx];
            searchInput.value = "";
            searchDropdown.classList.remove("active");

            if (res.type === "note") {
              loadNoteReader(res.subjectId, res.itemId);
            } else if (res.type === "video") {
              if (res.isPremium && !appState.user.isPremium) {
                openModal("premiumModal");
                showToast("🔒 Доступ ограничен", "Эта лекция входит в Premium программу.");
              } else {
                openVideoPlayer(res.videoObj);
              }
            }
          });
        });
      }

      searchDropdown.classList.add("active");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) {
        searchDropdown.classList.remove("active");
      }
      if (!e.target.closest(".notification-wrapper")) {
        notifDropdown.classList.remove("active");
      }
    });
  }

  const sidebarUserBlock = document.getElementById("sidebarUserBlock");
  if (sidebarUserBlock) {
    sidebarUserBlock.addEventListener("click", () => {
      if (appState.user.isPremium) {
        showToast(
          "👑 Premium активен",
          `${appState.user.name}, у вас активирован полный доступ ко всем курсам ЕГЭ/ОГЭ!`
        );
      } else {
        openModal("premiumModal");
        showToast("👑 Стань Premium", "Подключите Premium, чтобы открыть олимпиадный банк заданий!");
      }
    });
  }

  window.addEventListener("popstate", (e) => {
    restoreView(e.state);
  });

  // Manual hash navigation (typing a hash / editing the URL). While a sub-view
  // is open (subject-detail, note-reader, quiz-*) popstate already restored the
  // screen, so an accompanying hashchange must not override it.
  window.addEventListener("hashchange", () => {
    if (!HASH_VIEWS.includes(appState.currentView)) return;
    const view = (location.hash || "#subjects").replace("#", "");
    if (HASH_VIEWS.includes(view) && view !== appState.currentView) {
      switchView(view, { replace: true });
    }
  });
}
