// ExamHub SPA Application Logic

// 1. Initial State
const HASH_VIEWS = ["subjects", "notes", "videos", "tests", "plan", "analytics", "admin", "cart", "support"];

let appState = {
  currentView: "subjects",
  user: {
    isLoggedIn: false,
    name: "Артём Иванов",
    role: "Ученик",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
    isPremium: false,
  },
  stats: {
    testsSolved: 1248,
    avgPercent: 87,
    streak: 23,
    achievements: 15,
    questionsToday: 125,
    lessonsWatched: 0,
  },
  currentSubject: null,
  activeNoteId: null,
  activeQuizQuestions: [],
  activeQuizTitle: "",
  activeQuizOrigin: null,
  activeQuizIndex: 0,
  activeQuizScore: 0,
  activeQuizAnswers: [],
  activeSelectedOptionIndex: null,
  customTopics: {},
  videoState: {
    isPlaying: false,
    finished: false,
    rewarded: false,
    timer: null,
    currentTime: 495, // starts at 08:15
    duration: 1300, // 21:40
  },
};

// Local storage backup
function loadStateFromStorage() {
  const saved = localStorage.getItem("examhub_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState.user = { ...appState.user, ...parsed.user };
      appState.stats = { ...appState.stats, ...parsed.stats };

      // Restore topics added via the Admin panel
      if (parsed.customTopics) {
        appState.customTopics = parsed.customTopics;
        Object.entries(appState.customTopics).forEach(([subjectId, topics]) => {
          const subj = window.EXAM_DATA.subjects[subjectId];
          if (subj && Array.isArray(topics)) {
            subj.topics.push(...topics);
          }
        });
      }
    } catch (e) {
      console.error("Failed to load local storage state:", e);
    }
  }
}

function saveStateToStorage() {
  localStorage.setItem(
    "examhub_state",
    JSON.stringify({
      user: appState.user,
      stats: appState.stats,
      customTopics: appState.customTopics,
    })
  );
}

// 2. Application Init
document.addEventListener("DOMContentLoaded", () => {
  loadStateFromStorage();
  initRouter();
  initAuthEvents();
  initPremiumEvents();
  initVideoPlayerEvents();
  initAIEvents();
  initPlanEvents();
  initAdminEvents();

  // Load content catalog + current session from the backend, then render
  loadAppData()
    .then(() => {
      renderSubjects();
      renderGeneralNotes();
      renderGeneralVideos();
      updateUIFromState();

      // Restore view from URL hash (deep-link / refresh support)
      const initialView = (location.hash || "#subjects").replace("#", "");
      if (HASH_VIEWS.includes(initialView)) {
        switchView(initialView);
      }
    })
    .catch((err) => {
      console.error("Failed to load app data:", err);
      showToast("⚠️ Ошибка сети", "Не удалось загрузить данные. Проверьте соединение с сервером.");
    });

  // Support manual hash navigation (browser back/forward)
  window.addEventListener("hashchange", () => {
    const view = (location.hash || "#subjects").replace("#", "");
    if (HASH_VIEWS.includes(view) && view !== appState.currentView) {
      switchView(view);
    }
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

  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// 2B. Backend data loading
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data;
}

const GUEST_USER = {
  isLoggedIn: false,
  name: "Гость",
  role: "Ученик",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
  isPremium: false,
};

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

  // Session: server is the source of truth for the user
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

// 3. UI State Updates
function updateUIFromState() {
  // Update Profile Sidebar
  const nameEl = document.getElementById("sidebarName");
  const roleEl = document.getElementById("sidebarRole");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl) nameEl.textContent = appState.user.name;
  if (roleEl) roleEl.textContent = appState.user.isPremium ? "Premium Ученик" : "Ученик";
  if (avatarEl) avatarEl.src = appState.user.avatar;

  // Update Premium Card sidebar
  const premiumCard = document.getElementById("sidebarPremiumCard");
  if (premiumCard) {
    if (appState.user.isPremium) {
      premiumCard.className = "premium-promo-card";
      premiumCard.style.background = "linear-gradient(145deg, #FFF9E6 0%, #FFFFFF 100%)";
      premiumCard.style.borderColor = "rgba(250, 140, 22, 0.4)";
      premiumCard.querySelector(".premium-promo-icon").textContent = "👑";
      premiumCard.querySelector(".premium-promo-title").innerHTML =
        "ExamHub <span style='color: var(--color-orange)'>Premium</span>";
      premiumCard.querySelector(".premium-promo-text").textContent =
        "У вас активен полный доступ к теории, практике и ИИ без ограничений.";
      premiumCard.querySelector(".premium-promo-btn").style.display = "none";
    } else {
      premiumCard.removeAttribute("style");
      premiumCard.querySelector(".premium-promo-icon").textContent = "👑";
      premiumCard.querySelector(".premium-promo-title").textContent = "Стань Premium";
      premiumCard.querySelector(".premium-promo-text").textContent =
        "Открой полный доступ ко всем материалам и возможностям ИИ без ограничений.";
      premiumCard.querySelector(".premium-promo-btn").style.display = "block";
    }
  }

  // Update Header Auth block (re-rendered only when user data actually changes)
  renderAuthHeader();

  // Update statistics dashboard values
  const solvedEl = document.getElementById("statTestsSolved");
  const percentEl = document.getElementById("statAvgPercent");
  const streakEl = document.getElementById("statStreak");
  const achievementEl = document.getElementById("statAchievements");
  const todayEl = document.getElementById("statQuestionsToday");

  if (solvedEl) solvedEl.textContent = formatNumber(appState.stats.testsSolved);
  if (percentEl) percentEl.textContent = `${appState.stats.avgPercent}%`;
  if (streakEl) streakEl.textContent = appState.stats.streak;
  if (achievementEl) achievementEl.textContent = appState.stats.achievements;
  if (todayEl) todayEl.textContent = appState.stats.questionsToday;

  // Update Plan and Analytics dashboards
  updatePlanUI();
  updateAnalyticsUI();
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Renders the auth header block only when the user data signature changes,
// avoiding DOM rebuild + avatar reloads on every stats update.
let lastAuthSignature = "";
function renderAuthHeader() {
  const authArea = document.getElementById("authHeaderArea");
  if (!authArea) return;

  const signature = `${appState.user.isLoggedIn}|${appState.user.name}|${appState.user.avatar}`;
  if (signature === lastAuthSignature) return;
  lastAuthSignature = signature;
  authArea.innerHTML = "";

  if (appState.user.isLoggedIn) {
    const badge = document.createElement("div");
    badge.className = "user-badge";

    const avatar = document.createElement("img");
    avatar.className = "user-badge-avatar";
    avatar.src = appState.user.avatar;
    avatar.alt = "Аватар";

    const nameSpan = document.createElement("span");
    nameSpan.className = "user-badge-name";
    nameSpan.textContent = appState.user.name;

    const logoutBtn = document.createElement("button");
    logoutBtn.className = "user-badge-logout";
    logoutBtn.id = "logoutBtn";
    logoutBtn.textContent = "Выйти";
    logoutBtn.addEventListener("click", handleLogout);

    badge.append(avatar, nameSpan, logoutBtn);
    authArea.appendChild(badge);
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.className = "auth-btn";
    loginBtn.id = "loginBtn";
    loginBtn.textContent = "Войти";
    loginBtn.addEventListener("click", () => openModal("authModal"));
    authArea.appendChild(loginBtn);
  }
}

// 4. SPA Router Logic
function initRouter() {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      switchView(view);
    });
  });

  // Mobile bottom nav listeners
  const mobileNavItems = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
  mobileNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      switchView(view);
    });
  });

  // Feature quick links
  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.getAttribute("data-target");
      switchView(target);
    });
  });

  // Header Search behavior is handled by the dynamic dropdown below.

  // General dashboard buttons
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

  // Support view submit
  const supportSendBtn = document.getElementById("supportSendBtn");
  if (supportSendBtn) {
    supportSendBtn.addEventListener("click", () => {
      showToast("✉️ Обращение отправлено", "Наш репетитор свяжется с вами в течение 15 минут.");
      const inputs = document.querySelectorAll("#view-support input, #view-support textarea");
      inputs.forEach((i) => (i.value = ""));
    });
  }

  // Notification Dropdown toggle
  const notifBtn = document.getElementById("notificationBtn");
  const notifDropdown = document.getElementById("notificationDropdown");
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("active");
      // Close search if open
      const searchDropdown = document.getElementById("searchDropdown");
      if (searchDropdown) searchDropdown.classList.remove("active");
    });
  }

  // Mark all read button
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

  // Click on single notification item
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

  // Global search dynamic suggestions dropdown
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

      // Filter database
      let results = [];
      Object.values(window.EXAM_DATA.subjects).forEach((subject) => {
        subject.topics.forEach((topic) => {
          // Check notes title
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
          // Check video title
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

        // Attach click listeners to suggestions
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

    // Hide search dropdown on blur or click away
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) {
        searchDropdown.classList.remove("active");
      }
      if (!e.target.closest(".notification-wrapper")) {
        notifDropdown.classList.remove("active");
      }
    });
  }

  // Sidebar profile card actions
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
}

function switchView(viewName) {
  appState.currentView = viewName;

  const sections = document.querySelectorAll(".view-section");
  sections.forEach((s) => s.classList.remove("active"));

  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Sync Sidebar Active Item
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach((n) => {
    if (n.getAttribute("data-view") === viewName) {
      n.classList.add("active");
    } else {
      n.classList.remove("active");
    }
  });

  // Sync Mobile Active Item
  const mobileNavItems = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
  mobileNavItems.forEach((n) => {
    if (n.getAttribute("data-view") === viewName) {
      n.classList.add("active");
    } else {
      n.classList.remove("active");
    }
  });

  // Scroll to top of view
  document.querySelector(".view-container").scrollTop = 0;

  // Keep hash in sync for top-level navigable views (deep links & refresh support)
  if (HASH_VIEWS.includes(viewName) && location.hash !== `#${viewName}`) {
    history.replaceState(null, "", `#${viewName}`);
  }

  // Re-run icons render if needed
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// 5. Subject Catalog Rendering
function renderSubjects() {
  const grid = document.getElementById("subjectGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // 1. Active Subjects (Biology & Chemistry)
  Object.values(window.EXAM_DATA.subjects).forEach((sub) => {
    const card = document.createElement("div");
    card.className = "subject-card active-subject";
    card.style.setProperty("--theme-color", sub.color);
    card.style.background = sub.bgGradient;
    card.innerHTML = `
      <div class="subject-icon-box" style="background-color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.03); color: ${sub.color}; font-size: 20px;">
        ${sub.icon}
      </div>
      <div class="subject-details">
        <span class="subject-title">${sub.title}</span>
        <span class="subject-status">${sub.topics.length} тем доступно</span>
      </div>
    `;
    card.addEventListener("click", () => {
      loadSubjectDetail(sub.id);
    });
    grid.appendChild(card);
  });

  // 2. Other/Locked Subjects
  window.EXAM_DATA.otherSubjects.forEach((sub) => {
    const card = document.createElement("div");
    card.className = "subject-card locked-subject";
    card.innerHTML = `
      <span class="lock-badge">Скоро</span>
      <div class="subject-icon-box" style="font-size: 16px;">
        ${sub.icon}
      </div>
      <div class="subject-details">
        <span class="subject-title">${sub.title}</span>
        <span class="subject-status">Разработка материалов</span>
      </div>
    `;
    card.addEventListener("click", () => {
      showToast(
        "🔒 Скоро на платформе",
        `Подготовка по предмету "${sub.title}" станет доступна к новому учебному году!`
      );
    });
    grid.appendChild(card);
  });
}

// 5B. All subjects modal rendering
function renderAllSubjectsModal() {
  const grid = document.getElementById("allSubjectsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Active subjects (open subject detail)
  Object.values(window.EXAM_DATA.subjects).forEach((sub) => {
    const card = document.createElement("button");
    card.className = "all-subject-item";
    card.style.setProperty("--theme-color", sub.color);
    card.innerHTML = `
      <span class="subject-icon-box" style="color: ${sub.color};">${sub.icon}</span>
      <span class="subject-title">${sub.title}</span>
      <span class="subject-status">${sub.topics.length} тем</span>
    `;
    card.addEventListener("click", () => {
      closeModal("allSubjectsModal");
      loadSubjectDetail(sub.id);
    });
    grid.appendChild(card);
  });

  // Locked / coming soon subjects
  window.EXAM_DATA.otherSubjects.forEach((sub) => {
    const card = document.createElement("button");
    card.className = "all-subject-item locked-subject";
    card.innerHTML = `
      <span class="lock-badge">Скоро</span>
      <span class="subject-icon-box">${sub.icon}</span>
      <span class="subject-title">${sub.title}</span>
      <span class="subject-status">Разработка материалов</span>
    `;
    card.addEventListener("click", () => {
      showToast(
        "🔒 Скоро на платформе",
        `Подготовка по предмету "${sub.title}" станет доступна к новому учебному году!`
      );
    });
    grid.appendChild(card);
  });
}

// 6. Subject Detail Screen logic
function loadSubjectDetail(subjectId) {
  const subject = window.EXAM_DATA.subjects[subjectId];
  if (!subject) return;

  appState.currentSubject = subject;

  // Set details in elements
  document.getElementById("subjectDetailTitle").textContent = subject.title;
  document.getElementById("subjectDetailIcon").textContent = subject.icon;
  document.getElementById("subjectDetailSubtitle").textContent =
    `Полный интерактивный курс ЕГЭ/ОГЭ по предмету ${subject.title}`;

  const banner = document.getElementById("subjectBanner");
  banner.style.background =
    subject.bgGradient || `linear-gradient(135deg, ${subject.colorHex || "#4096FF"}15 0%, #FFFFFF 100%)`;
  banner.style.borderColor = `${subject.colorHex || "#4096FF"}25`;

  // Set tab active styling variable
  const tabContainer = document.querySelector(".subject-tabs");
  tabContainer.style.setProperty("--tab-color-active", subject.color);

  // Load content elements
  renderSubjectNotes(subject);
  renderSubjectVideos(subject);
  renderSubjectQuizzes(subject);

  // Initialize tabs behaviors
  const tabs = document.querySelectorAll(".subject-tabs .sub-tab-btn");
  const panels = document.querySelectorAll(".subject-tab-panel");

  tabs.forEach((tab) => {
    // Reset tab status
    tab.className = "sub-tab-btn";
    if (tab.getAttribute("data-tab") === "tab-notes") {
      tab.classList.add("active");
    }

    tab.addEventListener("click", () => {
      const targetPanelId = tab.getAttribute("data-tab");

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      panels.forEach((p) => {
        p.classList.remove("active");
        if (p.id === targetPanelId) {
          p.classList.add("active");
        }
      });
    });
  });

  // Back button event
  document.getElementById("subjectBackBtn").onclick = () => {
    switchView("subjects");
  };

  // Trigger dynamic tab panel reset
  panels.forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-notes").classList.add("active");

  switchView("subject-detail");
}

// Sub-renders
function renderSubjectNotes(subject) {
  const container = document.getElementById("subjectDetailNotesGrid");
  container.innerHTML = "";

  subject.topics.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "note-item-card";
    card.innerHTML = `
      <div class="note-item-header">
        <span class="note-item-tag ${topic.isPremium ? "premium" : ""}">
          ${topic.isPremium ? "👑 Premium" : "Теория"}
        </span>
        <span class="note-item-meta">${topic.duration}</span>
      </div>
      <h4 class="note-item-title">${topic.title}</h4>
      <div class="note-item-footer">
        <span class="note-item-meta">100% изучено</span>
        <button class="note-item-btn ${topic.isPremium ? "premium" : ""}">Читать конспект →</button>
      </div>
    `;
    card.addEventListener("click", () => {
      loadNoteReader(subject.id, topic.id);
    });
    container.appendChild(card);
  });
}

function renderSubjectVideos(subject) {
  const container = document.getElementById("subjectDetailVideosGrid");
  container.innerHTML = "";

  subject.topics.forEach((topic) => {
    if (!topic.video) return;
    const v = topic.video;

    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <div class="video-thumbnail" style="background-image: url('${v.thumbnail}'); background-size: cover; background-position: center;">
        <div class="video-thumbnail-overlay">
          <button class="video-play-btn" style="--btn-color: ${subject.color}">▶</button>
        </div>
        <span class="video-duration">${v.duration}</span>
      </div>
      <div class="video-info-box">
        <h4 class="video-card-title">${v.title}</h4>
        <p class="video-card-instructor">${v.instructor}</p>
        <div class="video-card-footer">
          <span>Просмотры: ${v.views}</span>
          <span style="display: flex; align-items: center; gap: 3px;">
            ${topic.isPremium ? '<span style="color: var(--color-orange); font-weight:700">👑 Premium</span>' : "Бесплатно"}
          </span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      if (topic.isPremium && !appState.user.isPremium) {
        openModal("premiumModal");
        showToast("🔒 Доступ ограничен", "Эта лекция входит в Premium программу обучения.");
      } else {
        openVideoPlayer(v);
      }
    });
    container.appendChild(card);
  });
}

function renderSubjectQuizzes(subject) {
  const container = document.getElementById("subjectDetailQuizzesGrid");
  container.innerHTML = "";

  subject.topics.forEach((topic) => {
    if (!topic.questions || topic.questions.length === 0) return;

    const card = document.createElement("div");
    card.className = "quiz-list-item";
    card.innerHTML = `
      <div class="quiz-item-left">
        <span class="quiz-item-badge">📋</span>
        <div class="quiz-item-details">
          <h4>Практика: ${topic.title}</h4>
          <p>${topic.questions.length} вопросов • Формат ЕГЭ/ОГЭ</p>
        </div>
      </div>
      <div class="quiz-item-actions">
        <span class="note-item-tag ${topic.isPremium ? "premium" : ""}" style="margin-right: 8px;">
          ${topic.isPremium ? "👑 Premium" : "Базовый"}
        </span>
        <button class="btn-primary" style="padding: 8px 16px; font-size: 12px; background-color: ${topic.isPremium ? "var(--color-orange)" : "var(--color-green)"}">Начать тест</button>
      </div>
    `;

    card.addEventListener("click", () => {
      if (topic.isPremium && !appState.user.isPremium) {
        openModal("premiumModal");
        showToast("🔒 Доступ ограничен", "Сложные тематические тесты доступны только в Premium.");
      } else {
        startQuiz(topic.questions, `Тест: ${topic.title}`, "subject");
      }
    });
    container.appendChild(card);
  });
}

// 7. Note Reader view logic
function loadNoteReader(subjectId, noteId) {
  const subject = window.EXAM_DATA.subjects[subjectId];
  if (!subject) return;

  const topic = subject.topics.find((t) => t.id === noteId);
  if (!topic) return;

  appState.activeNoteId = noteId;
  appState.currentSubject = subject;

  // Set reader headers
  document.getElementById("noteContentTitle").textContent = topic.title;

  // Premium lock overlay check
  const lockOverlay = document.getElementById("notePremiumOverlay");
  if (topic.isPremium && !appState.user.isPremium) {
    // Teaser mode: Truncate note content to avoid super-long blurred scroll container
    const teaser = `
      <div class="premium-badge-inline">Доступно только в Premium</div>
      <h3>Введение в тему</h3>
      <p>Эта сложная тема подробно разбирается в рамках Premium программы подготовки. В конспекте содержатся разборы реальных заданий ЕГЭ прошлых лет, классификации и аналитические таблицы.</p>
      <p>Для продолжения чтения теории необходимо активировать Premium доступ...</p>
    `;
    document.getElementById("noteBody").innerHTML = teaser;
    lockOverlay.style.display = "flex";
    document.getElementById("noteUpgradeBtn").onclick = () => {
      openModal("premiumModal");
    };
  } else {
    document.getElementById("noteBody").innerHTML = topic.theory;
    lockOverlay.style.display = "none";
  }

  // Back button action
  document.getElementById("noteReaderBackBtn").onclick = () => {
    loadSubjectDetail(subjectId);
  };

  // Render Note Sidebar topics
  const sidebarNav = document.getElementById("noteSidebarNav");
  sidebarNav.innerHTML = "";

  subject.topics.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = `note-nav-btn ${t.id === noteId ? "active" : ""} ${t.isPremium ? "premium" : ""}`;
    btn.textContent = t.title.split(":")[0]; // keep short name

    btn.addEventListener("click", () => {
      loadNoteReader(subjectId, t.id);
    });

    sidebarNav.appendChild(btn);
  });

  switchView("note-reader");
}

// 8. General Theory & Video Directories
function renderGeneralNotes() {
  const container = document.getElementById("generalNotesGrid");
  if (!container) return;
  container.innerHTML = "";

  Object.values(window.EXAM_DATA.subjects).forEach((subject) => {
    subject.topics.forEach((topic) => {
      const card = document.createElement("div");
      card.className = "note-item-card";
      card.innerHTML = `
        <div class="note-item-header">
          <span class="note-item-tag ${topic.isPremium ? "premium" : ""}" style="color: ${subject.color};">
            ${subject.title} • ${topic.isPremium ? "👑 Premium" : "Теория"}
          </span>
          <span class="note-item-meta">${topic.duration}</span>
        </div>
        <h4 class="note-item-title">${topic.title}</h4>
        <div class="note-item-footer">
          <span class="note-item-meta">100% изучено</span>
          <button class="note-item-btn" style="color: ${subject.color}">Читать →</button>
        </div>
      `;
      card.addEventListener("click", () => {
        loadNoteReader(subject.id, topic.id);
      });
      container.appendChild(card);
    });
  });
}

function renderGeneralVideos() {
  const container = document.getElementById("generalVideosGrid");
  if (!container) return;
  container.innerHTML = "";

  Object.values(window.EXAM_DATA.subjects).forEach((subject) => {
    subject.topics.forEach((topic) => {
      if (!topic.video) return;
      const v = topic.video;

      const card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML = `
        <div class="video-thumbnail" style="background-image: url('${v.thumbnail}'); background-size: cover; background-position: center;">
          <div class="video-thumbnail-overlay">
            <button class="video-play-btn" style="--btn-color: ${subject.color}">▶</button>
          </div>
          <span class="video-duration">${v.duration}</span>
        </div>
        <div class="video-info-box">
          <span style="font-size: 11px; font-weight: 700; color: ${subject.color}; display: block; margin-bottom: 6px;">${subject.title}</span>
          <h4 class="video-card-title">${v.title}</h4>
          <p class="video-card-instructor">${v.instructor}</p>
          <div class="video-card-footer">
            <span>Просмотры: ${v.views}</span>
            <span>
              ${topic.isPremium ? '<span style="color: var(--color-orange); font-weight:700">👑 Premium</span>' : "Бесплатно"}
            </span>
          </div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (topic.isPremium && !appState.user.isPremium) {
          openModal("premiumModal");
          showToast("🔒 Доступ ограничен", "Эта лекция входит в Premium программу обучения.");
        } else {
          openVideoPlayer(v);
        }
      });
      container.appendChild(card);
    });
  });
}

// 9. Interactive Quiz Player
function startQuiz(questions, title, origin) {
  appState.activeQuizQuestions = questions;
  appState.activeQuizTitle = title;
  appState.activeQuizOrigin = origin || (appState.currentSubject ? "subject" : "subjects");
  appState.activeQuizIndex = 0;
  appState.activeQuizScore = 0;
  appState.activeQuizAnswers = [];

  document.getElementById("quizPlayerTitle").textContent = title;
  renderQuizQuestion();

  // Setup control buttons
  const quitBtn = document.getElementById("quizQuitBtn");
  quitBtn.onclick = () => {
    if (confirm("Вы действительно хотите завершить тестирование? Прогресс будет потерян.")) {
      returnFromQuiz();
    }
  };

  const nextBtn = document.getElementById("quizNextBtn");
  nextBtn.onclick = () => {
    if (nextBtn.textContent === "Проверить ответ") {
      checkQuizAnswer();
    } else {
      goToNextQuestion();
    }
  };

  switchView("quiz-player");
}

function renderQuizQuestion() {
  const total = appState.activeQuizQuestions.length;
  const curr = appState.activeQuizIndex + 1;
  const q = appState.activeQuizQuestions[appState.activeQuizIndex];

  // Progress Header
  document.getElementById("quizProgressText").textContent = `Вопрос ${curr} из ${total}`;
  const pct = (appState.activeQuizIndex / total) * 100;
  document.getElementById("quizProgressBar").style.width = `${pct}%`;

  // Question Title
  document.getElementById("quizQuestionText").textContent = q.question;

  // Options Grid
  const optionsGrid = document.getElementById("quizOptionsGrid");
  optionsGrid.innerHTML = "";

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-btn";
    btn.innerHTML = `
      <span>${opt}</span>
      <span class="option-badge-circle">${String.fromCharCode(65 + idx)}</span>
    `;

    btn.addEventListener("click", () => {
      if (
        btn.classList.contains("checked") ||
        document.querySelector(".quiz-option-btn.checked-correct") ||
        document.querySelector(".quiz-option-btn.checked-incorrect")
      ) {
        return; // already confirmed
      }

      // Toggle select indicator visual
      document.querySelectorAll(".quiz-option-btn").forEach((b) => {
        b.style.borderColor = "var(--color-border)";
        b.style.background = "#FFFFFF";
      });
      btn.style.borderColor = "var(--color-green)";
      btn.style.background = "var(--color-green-light)";

      // Save current chosen option index on global state
      appState.activeSelectedOptionIndex = idx;

      // Enable confirm check action
      const nextBtn = document.getElementById("quizNextBtn");
      nextBtn.disabled = false;
      nextBtn.textContent = "Проверить ответ";
    });

    optionsGrid.appendChild(btn);
  });

  // Hide explanation
  document.getElementById("quizExplanationBox").style.display = "none";

  // Disable next button initially
  document.getElementById("quizNextBtn").disabled = true;
  document.getElementById("quizNextBtn").textContent = "Проверить ответ";
}

function checkQuizAnswer() {
  const q = appState.activeQuizQuestions[appState.activeQuizIndex];
  const selectedIdx = appState.activeSelectedOptionIndex;
  const options = document.querySelectorAll(".quiz-option-btn");

  const isCorrect = selectedIdx === q.correctIndex;

  if (isCorrect) {
    appState.activeQuizScore++;
    options[selectedIdx].className = "quiz-option-btn checked-correct";
    showToast("🎉 Правильно!", "Отличный ответ!");
  } else {
    options[selectedIdx].className = "quiz-option-btn checked-incorrect";
    options[q.correctIndex].className = "quiz-option-btn checked-correct";
    showToast("❌ Ошибка", "Ответ неверный.");
  }

  // Increment today stats questions count
  appState.stats.questionsToday += 1;
  saveStateToStorage();
  updateUIFromState();

  // Show detailed explanation text
  const explanationBox = document.getElementById("quizExplanationBox");
  const explanationText = document.getElementById("quizExplanationText");
  explanationText.textContent = q.explanation;
  explanationBox.style.display = "block";

  // Toggle next btn text
  const nextBtn = document.getElementById("quizNextBtn");
  const total = appState.activeQuizQuestions.length;
  if (appState.activeQuizIndex === total - 1) {
    nextBtn.textContent = "Завершить тест";
  } else {
    nextBtn.textContent = "Следующий вопрос";
  }
}

function goToNextQuestion() {
  const total = appState.activeQuizQuestions.length;
  appState.activeQuizIndex++;

  if (appState.activeQuizIndex < total) {
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  const score = appState.activeQuizScore;
  const total = appState.activeQuizQuestions.length;
  const percentage = Math.round((score / total) * 100);

  // Update overall User statistics
  appState.stats.testsSolved += 1;
  appState.stats.avgPercent = Math.round((appState.stats.avgPercent * 9 + percentage) / 10); // moving average weight
  saveStateToStorage();
  updateUIFromState();

  // Persist the attempt to the backend for logged-in users
  if (appState.user.isLoggedIn) {
    api("/api/progress/attempt", {
      method: "POST",
      body: JSON.stringify({
        title: appState.activeQuizTitle,
        score,
        total,
      }),
    })
      .then((res) => {
        appState.stats.testsSolved = res.testsSolved;
        appState.stats.avgPercent = res.avgPercent;
        saveStateToStorage();
        updateUIFromState();
      })
      .catch(() => {
        // keep local stats if the request fails
      });
  }

  // Render Circle results
  const ring = document.getElementById("resultsRadialBar");
  const strokeOffset = 440 - (440 * percentage) / 100;
  ring.style.strokeDashoffset = strokeOffset;
  document.getElementById("resultsPercentText").textContent = `${percentage}%`;

  // Render headers
  let titleText = "Попробуйте еще раз!";
  if (percentage >= 80) titleText = "Отличный результат!";
  else if (percentage >= 50) titleText = "Хорошая работа!";

  document.getElementById("resultsTitleText").textContent = titleText;
  document.getElementById("resultsScoreDetails").textContent =
    `Вы правильно ответили на ${score} из ${total} вопросов.`;

  // Calculate EGE equivalent
  let egeScore = 32 + Math.round((percentage * 68) / 100); // map to scale of 32-100 EGE points
  document.getElementById("resultsEgeEstimation").textContent = `Примерный балл ЕГЭ: ~${egeScore} баллов`;

  // Setup Actions
  document.getElementById("resultsRetryBtn").onclick = () => {
    startQuiz(appState.activeQuizQuestions, appState.activeQuizTitle, appState.activeQuizOrigin);
  };

  document.getElementById("resultsHomeBtn").onclick = () => {
    returnFromQuiz();
  };

  switchView("quiz-results");
}

// Returns the user to the screen where the quiz was launched from
function returnFromQuiz() {
  const origin = appState.activeQuizOrigin;
  if (origin === "tests") {
    switchView("tests");
  } else if (origin === "subject" && appState.currentSubject) {
    loadSubjectDetail(appState.currentSubject.id);
  } else {
    switchView("subjects");
  }
}

// 10. AI Test Generation Simulator
function initAIEvents() {
  // Suggestion chips handler
  document.querySelectorAll(".ai-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      const textarea = document.getElementById("aiPromptInput");
      if (textarea) {
        textarea.value = prompt;
        textarea.focus();
      }
    });
  });

  const generateBtn = document.getElementById("generateAITestBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", handleAIGeneration);
  }

  // Trigger generator link from details page
  const triggerBtn = document.getElementById("triggerAIBtn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      const tabNav = document.querySelector(".sidebar-nav .nav-item[data-view='tests']");
      if (tabNav) tabNav.click();
    });
  }
}

function handleAIGeneration() {
  const promptInput = document.getElementById("aiPromptInput");
  let prompt = promptInput.value.trim();

  if (!prompt) {
    prompt = "Строение растительной и животной клетки";
  }

  // Switch form to loading block display
  document.getElementById("aiInputBlock").style.display = "none";
  const loadingBlock = document.getElementById("aiLoadingBlock");
  loadingBlock.style.display = "block";

  // Checklist steps progress simulator
  simulateStepCompletion(1, () => {
    simulateStepCompletion(2, () => {
      simulateStepCompletion(3, () => {
        simulateStepCompletion(4, () => {
          // Finish generation
          const customQuestions = buildAIQuestions(prompt);

          // Reset simulator view state
          document.getElementById("aiInputBlock").style.display = "block";
          loadingBlock.style.display = "none";
          resetChecklistElements();

          promptInput.value = ""; // clear textarea

          // Play generated quiz
          startQuiz(customQuestions, `AI Тест: ${prompt.slice(0, 30)}...`, "tests");
        });
      });
    });
  });
}

function simulateStepCompletion(stepId, callback) {
  const stepEl = document.getElementById(`ai-step-${stepId}`);
  const checkEl = document.getElementById(`ai-check-${stepId}`);

  // Set current step as active running state
  stepEl.className = "ai-checklist-item active";
  checkEl.innerHTML = `<i data-lucide="loader" style="width: 14px; height: 14px; stroke: var(--color-purple); animation: spin 1s linear infinite;"></i>`;
  if (window.lucide) window.lucide.createIcons();

  // Dynamic wait times depending on task sizes
  const delay = stepId === 2 ? 1400 : 800;

  setTimeout(() => {
    // Completed state
    stepEl.className = "ai-checklist-item done";
    checkEl.innerHTML = `<i data-lucide="check-circle" style="width: 14px; height: 14px; stroke: var(--color-green);"></i>`;
    if (window.lucide) window.lucide.createIcons();

    // Trigger next step
    callback();
  }, delay);
}

function resetChecklistElements() {
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`ai-step-${i}`);
    const checkEl = document.getElementById(`ai-check-${i}`);

    stepEl.className = "ai-checklist-item " + (i === 1 ? "active" : "pending");
    checkEl.innerHTML = `<i data-lucide="${i === 1 ? "loader" : "circle"}" style="width: 14px; height: 14px;"></i>`;
  }
}

function buildAIQuestions(prompt) {
  const p = prompt.toLowerCase();

  // 1. Chemistry Alkene match
  if (p.includes("алкен") || p.includes("химия") || p.includes("связь") || p.includes("атом")) {
    return [
      {
        id: "ai_q_c1",
        type: "single",
        question: `[ИИ-Генерация] Какой тип связи преобладает в органических молекулах, сформированных на основе темы: "${prompt}"?`,
        options: ["Ионная связь", "Ковалентная полярная связь", "Металлическая связь", "Водородная связь"],
        correctIndex: 1,
        explanation:
          "Органические соединения образованы преимущественно неметаллами с близкой электроотрицательностью, формирующими общие пары электронов со смещением, т.е. ковалентные полярные связи.",
      },
      {
        id: "ai_q_c2",
        type: "single",
        question: `[ИИ-Генерация] Что происходит с гибридизацией атомов углерода при переходе от алканов к алкенам по вашему запросу: "${prompt}"?`,
        options: ["sp³ переходит в sp²", "sp² переходит в sp³", "sp переходит в sp³", "Гибридизация не изменяется"],
        correctIndex: 0,
        explanation:
          "Атомы углерода при двойной связи в алкенах находятся в sp²-гибридизации (плоская треугольная конфигурация), тогда как в алканах — в sp³-гибридизации.",
      },
      {
        id: "ai_q_c3",
        type: "single",
        question: `[ИИ-Генерация] Какое вещество выделится при каталитической гидратации этилена?`,
        options: ["Этиловый спирт (Этанол)", "Диэтиловый эфир", "Уксусный альдегид", "Этан"],
        correctIndex: 0,
        explanation:
          "Присоединение молекулы воды по двойной связи этилена приводит к образованию одноатомного предельного спирта — этанола.",
      },
    ];
  }

  // 2. Biology / Default match
  return [
    {
      id: "ai_q_b1",
      type: "single",
      question: `[ИИ-Генерация] Какой мембранный органоид будет играть главную роль в физиологических процессах по теме: "${prompt}"?`,
      options: ["Митохондрия", "Лизосома", "Рибосома", "Аппарат Гольджи"],
      correctIndex: 0,
      explanation:
        "Для любых метаболических задач, требующих активного энергетического снабжения по указанному профилю темы, митохондрии предоставляют АТФ в качестве универсального источника энергии.",
    },
    {
      id: "ai_q_b2",
      type: "single",
      question: `[ИИ-Генерация] В каком делении клетки происходит рекомбинация генов (кроссинговер) по запросу темы "${prompt}"?`,
      options: ["Митоз", "Профаза I мейоза", "Амитоз", "Анафаза II мейоза"],
      correctIndex: 1,
      explanation:
        "Кроссинговер (обмен гомологичными участками хромосом) осуществляется в конъюгации профазы первого мейотического деления, обеспечивая генетическое разнообразие организмов.",
    },
    {
      id: "ai_q_b3",
      type: "single",
      question: `[ИИ-Генерация] Какое положение клеточной теории подтверждается исследованием данной темы?`,
      options: [
        "Все клетки развиваются из неживого вещества",
        "Новые клетки возникают только путем деления материнских клеток",
        "Все клетки имеют абсолютно одинаковую форму и размеры",
        "Животные клетки всегда имеют плотную целлюлозную стенку",
      ],
      correctIndex: 1,
      explanation:
        "Сформулированное Рудольфом Вирховым правило 'каждая клетка из клетки' подтверждает непрерывность жизни и преемственность в делении клеточных ядер.",
    },
  ];
}

// 11. Authorization Flow
let authMode = "login";

function initAuthEvents() {
  const vkBtn = document.getElementById("authVkBtn");
  const yandexBtn = document.getElementById("authYandexBtn");
  const manualBtn = document.getElementById("authSubmitManual");
  const toggleLink = document.getElementById("authToggleLink");

  if (vkBtn) vkBtn.addEventListener("click", () => handleSocialLogin("VK"));
  if (yandexBtn) yandexBtn.addEventListener("click", () => handleSocialLogin("Yandex"));
  if (manualBtn) manualBtn.addEventListener("click", handleManualLogin);

  if (toggleLink) {
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      toggleAuthMode();
    });
  }
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "register" : "login";
  const titleEl = document.getElementById("authModalTitle");
  const toggleLink = document.getElementById("authToggleLink");
  const submitBtn = document.getElementById("authSubmitManual");

  if (titleEl) titleEl.textContent = authMode === "register" ? "Регистрация" : "Вход в личный кабинет";
  if (toggleLink) toggleLink.textContent = authMode === "register" ? "У меня уже есть аккаунт" : "Нет аккаунта? Зарегистрироваться";
  if (submitBtn) submitBtn.textContent = authMode === "register" ? "Создать аккаунт" : "Войти в систему";
}

function handleSocialLogin(provider) {
  showToast(
    "🔜 Скоро",
    `Вход через ${provider} будет доступен позже. Пока используйте вход по email.`
  );
}

async function handleManualLogin() {
  const emailInput = document.getElementById("manualEmail");
  const passInput = document.getElementById("manualPass");
  const emailVal = emailInput.value.trim();
  const passVal = passInput.value;

  if (!emailVal || !passVal) {
    showToast("❌ Ошибка ввода", "Пожалуйста, заполните email и пароль.");
    return;
  }

  try {
    const isRegister = authMode === "register";
    const { user } = isRegister
      ? await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email: emailVal, password: passVal }),
        })
      : await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: emailVal, password: passVal }),
        });

    appState.user.isLoggedIn = true;
    appState.user.name = user.name;
    appState.user.role = user.role;
    appState.user.avatar = user.avatar || appState.user.avatar;
    appState.user.isPremium = user.isPremium;

    saveStateToStorage();
    updateUIFromState();
    closeModal("authModal");
    showToast(
      isRegister ? "✅ Регистрация" : "🔑 Вход выполнен",
      isRegister
        ? "Аккаунт создан. Добро пожаловать!"
        : `Добро пожаловать, ${user.name}!`
    );

    if (isRegister) {
      authMode = "login";
      const titleEl = document.getElementById("authModalTitle");
      const toggleLink = document.getElementById("authToggleLink");
      const submitBtn = document.getElementById("authSubmitManual");
      if (titleEl) titleEl.textContent = "Вход в личный кабинет";
      if (toggleLink) toggleLink.textContent = "Нет аккаунта? Зарегистрироваться";
      if (submitBtn) submitBtn.textContent = "Войти в систему";
    }

    emailInput.value = "";
    passInput.value = "";
  } catch (e) {
    showToast("❌ Ошибка", e.message);
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // proceed with local logout even if the server is unreachable
  }

  appState.user = { ...GUEST_USER };
  appState.stats.testsSolved = 0;
  appState.stats.avgPercent = 0;

  saveStateToStorage();
  updateUIFromState();

  // Re-render subjects and lists to reflect free status blockings
  renderSubjects();
  renderGeneralNotes();
  renderGeneralVideos();
  if (appState.currentSubject) {
    loadSubjectDetail(appState.currentSubject.id);
  }

  showToast("🚪 Выход", "Вы вышли из учетной записи.");
}

// 12. Premium activation events
function initPremiumEvents() {
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

  // Cart button upgrade trigger
  const cartBtn = document.getElementById("cartOpenPremiumBtn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => openModal("premiumModal"));
  }
  // Subscribe Checkout Simulator (stub payment, real provider later)
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

          // Unlock active reader view or subparts if currently looking at one
          if (appState.currentView === "note-reader") {
            const lockOverlay = document.getElementById("notePremiumOverlay");
            if (lockOverlay) lockOverlay.style.display = "none";
          }

          // Re-render other lists
          renderGeneralNotes();
          renderGeneralVideos();

          // If user is reading a Premium note, reload the full theory instead of redirecting away
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

  // Plan selector cards styling toggling
  const plans = document.querySelectorAll(".premium-plans-grid .premium-plan-card");
  plans.forEach((plan) => {
    plan.addEventListener("click", () => {
      plans.forEach((p) => p.classList.remove("active"));
      plan.classList.add("active");
    });
  });
}

// 13. Video Player Modal simulation
function initVideoPlayerEvents() {
  const timeline = document.getElementById("videoTimelineWrapper");
  if (timeline) {
    timeline.addEventListener("click", (e) => {
      const rect = timeline.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;

      appState.videoState.currentTime = Math.round(appState.videoState.duration * pct);
      updateVideoProgressUI();
    });
  }

  const playToggle = document.getElementById("videoPlayToggleBtn");
  if (playToggle) {
    playToggle.addEventListener("click", toggleMockVideoPlay);
  }

  const canvas = document.getElementById("mockVideoCanvas");
  if (canvas) {
    canvas.addEventListener("click", (e) => {
      if (e.target.closest(".video-mock-controls")) return; // ignore control panel
      toggleMockVideoPlay();
    });
  }
}

function openVideoPlayer(video) {
  document.getElementById("videoPlayerTitle").textContent = video.title;

  // Set duration, reset time
  appState.videoState.duration = parseDuration(video.duration);
  appState.videoState.currentTime = 0;
  appState.videoState.isPlaying = false;
  appState.videoState.finished = false;
  appState.videoState.rewarded = false;

  if (appState.videoState.timer) {
    clearInterval(appState.videoState.timer);
  }

  updateVideoProgressUI();

  // Set play toggle state icon
  const playIcon = document.getElementById("videoPlayToggleBtn").querySelector("i");
  playIcon.setAttribute("data-lucide", "play");
  document.getElementById("videoCanvasPlayIcon").style.display = "block";
  document.getElementById("videoCanvasStatusText").textContent = "Нажмите для воспроизведения";
  if (window.lucide) window.lucide.createIcons();

  openModal("videoModal");
}

function parseDuration(durStr) {
  // Parses "21:40" -> 1300 seconds
  const parts = durStr.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 1200;
}

function toggleMockVideoPlay() {
  const canvasPlayIcon = document.getElementById("videoCanvasPlayIcon");
  const playToggleIcon = document.getElementById("videoPlayToggleBtn").querySelector("i");
  const statusText = document.getElementById("videoCanvasStatusText");

  // Restart from the end state (replay icon)
  if (appState.videoState.finished) {
    appState.videoState.finished = false;
    appState.videoState.rewarded = false;
    appState.videoState.currentTime = 0;
    updateVideoProgressUI();
    statusText.textContent = "Перезапуск...";
  }

  if (appState.videoState.isPlaying) {
    // PAUSE
    appState.videoState.isPlaying = false;
    clearInterval(appState.videoState.timer);

    canvasPlayIcon.style.display = "block";
    statusText.textContent = "Воспроизведение приостановлено";
    playToggleIcon.setAttribute("data-lucide", "play");
  } else {
    // PLAY
    appState.videoState.isPlaying = true;
    canvasPlayIcon.style.display = "none";
    statusText.textContent = "Идет воспроизведение лекции...";
    playToggleIcon.setAttribute("data-lucide", "pause");

    appState.videoState.timer = setInterval(() => {
      appState.videoState.currentTime++;
      if (appState.videoState.currentTime >= appState.videoState.duration) {
        // Finished
        clearInterval(appState.videoState.timer);
        appState.videoState.isPlaying = false;
        appState.videoState.currentTime = appState.videoState.duration;
        appState.videoState.finished = true;
        canvasPlayIcon.style.display = "block";
        statusText.textContent = "Просмотр завершен";
        playToggleIcon.setAttribute("data-lucide", "rotate-ccw");

        // Reward the viewer once per full watch (per opened session)
        if (!appState.videoState.rewarded) {
          appState.videoState.rewarded = true;
          appState.stats.lessonsWatched = (appState.stats.lessonsWatched || 0) + 1;
          saveStateToStorage();
          updateUIFromState();
          showToast("🎓 Лекция изучена", "Вы прослушали лекцию до конца. Прогресс сохранен!");
        }
      }
      updateVideoProgressUI();
    }, 1000);
  }

  if (window.lucide) window.lucide.createIcons();
}

function updateVideoProgressUI() {
  const current = appState.videoState.currentTime;
  const duration = appState.videoState.duration;

  // Timeline progress width
  const pct = (current / duration) * 100;
  document.getElementById("videoTimelineProgress").style.width = `${pct}%`;
  document.getElementById("videoTimelineHandle").style.left = `${pct}%`;

  // Set text timer
  const format = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  document.getElementById("videoTimeText").textContent = `${format(current)} / ${format(duration)}`;
}

// 14. Modals Controller Wrapper
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden"; // block background scroll
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";

    // Specific cleanups
    if (modalId === "videoModal" && appState.videoState.timer) {
      clearInterval(appState.videoState.timer);
      appState.videoState.isPlaying = false;
    }
  }
}

// Attach generic close buttons event listeners
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-close-modal");
    closeModal(target);
  });
});

// Click outside overlay to close modal
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal(overlay.id);
    }
  });
});

// 15. Custom alert Toast Notifications
let toastTimeout = null;
function showToast(title, message) {
  const toast = document.getElementById("toastMessage");
  const icon = document.getElementById("toastIcon");
  const text = document.getElementById("toastText");

  if (!toast) return;

  // Determine icon based on message context keywords
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

// Window globally scoped close hook
window.closeModal = closeModal;
window.openModal = openModal;
window.showToast = showToast;

// --- Advanced MVP Features (Personal Plan, SVG Analytics, Admin Panel) ---

// 1. Personal Plan Logic
function initPlanEvents() {
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

function calculatePlanProgress() {
  const checkboxes = document.querySelectorAll(".plan-check-input");
  let checkedCount = 2; // Monday has 2 pre-checked default tasks
  const totalTasks = 7; // Monday(2) + Wednesday(2) + Friday(2) + Sunday(1) = 7

  checkboxes.forEach((cb) => {
    if (cb.checked) checkedCount++;
  });

  const percent = Math.round((checkedCount / totalTasks) * 100);

  const percentText = document.getElementById("planWeekPercentText");
  if (percentText) {
    percentText.textContent = `${percent}%`;
  }

  // Wednesday progress
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

  // Update study streaks stats
  if (percent === 100) {
    showToast("🎉 План выполнен!", "Поздравляем! Вы полностью закрыли учебный трек этой недели.");
  }
}

function updatePlanUI() {
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

// 2. SVG Analytics Logic
function updateAnalyticsUI() {
  const solved = appState.stats.testsSolved;
  const avgPercent = appState.stats.avgPercent || 0;

  // Base progress + modest growth per solved test (weighted by average score)
  const baseBio = 50 + Math.round(avgPercent * 0.3);
  const baseChem = 42 + Math.round(avgPercent * 0.28);
  const bioPercentVal = Math.min(100, Math.round(baseBio + solved * 0.015));
  const chemPercentVal = Math.min(100, Math.round(baseChem + solved * 0.015));

  const bioPercentText = document.getElementById("analyticsBioPercent");
  const bioBar = document.getElementById("analyticsBioBar");
  const chemPercentText = document.getElementById("analyticsChemPercent");
  const chemBar = document.getElementById("analyticsChemBar");

  if (bioPercentText) bioPercentText.textContent = `${bioPercentVal}%`;
  if (bioBar) bioBar.style.width = `${bioPercentVal}%`;

  if (chemPercentText) chemPercentText.textContent = `${chemPercentVal}%`;
  if (chemBar) chemBar.style.width = `${chemPercentVal}%`;
}

// 3. Admin Creator Panel Logic
function initAdminEvents() {
  const publishBtn = document.getElementById("adminPublishBtn");
  if (!publishBtn) return;

  publishBtn.addEventListener("click", () => {
    const subjectSelect = document.getElementById("adminSubjectSelect");
    const topicTitle = document.getElementById("adminTopicTitle");
    const topicDuration = document.getElementById("adminTopicDuration");
    const theoryContent = document.getElementById("adminTheoryContent");

    const videoTitle = document.getElementById("adminVideoTitle");
    const videoDuration = document.getElementById("adminVideoDuration");
    const videoLecturer = document.getElementById("adminVideoLecturer");
    const videoCover = document.getElementById("adminVideoCover");

    const questionText = document.getElementById("adminQuestionText");
    const optA = document.getElementById("adminOptA");
    const optB = document.getElementById("adminOptB");
    const optC = document.getElementById("adminOptC");
    const optD = document.getElementById("adminOptD");
    const correctSelect = document.getElementById("adminCorrectSelect");
    const explanation = document.getElementById("adminExplanation");

    if (!topicTitle.value.trim() || !theoryContent.value.trim()) {
      showToast("❌ Ошибка ввода", "Пожалуйста, укажите название темы и заполните текст конспекта.");
      return;
    }

    const subjectId = subjectSelect.value;
    const subject = window.EXAM_DATA.subjects[subjectId];
    if (!subject) return;

    // Create dynamic new topic entry in DB
    const topicId = "dyn_" + Date.now();
    const newTopic = {
      id: topicId,
      title: topicTitle.value.trim(),
      isPremium: false,
      duration: topicDuration.value.trim() || "40 мин",
      theory: theoryContent.value,
      video: {
        title: videoTitle.value.trim() || "Тематическая лекция",
        instructor: videoLecturer.value.trim() || "Преподаватель ExamHub",
        duration: videoDuration.value.trim() || "20:00",
        youtubeId: "dyn_vid_" + Date.now(),
        views: "1",
        thumbnail:
          videoCover.value.trim() ||
          "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=400",
      },
      questions: [
        {
          id: "q_dyn_" + Date.now(),
          type: "single",
          question: questionText.value.trim() || "Вопрос по теме?",
          options: [
            optA.value.trim() || "Вариант 1",
            optB.value.trim() || "Вариант 2",
            optC.value.trim() || "Вариант 3",
            optD.value.trim() || "Вариант 4",
          ],
          correctIndex: parseInt(correctSelect.value),
          explanation: explanation.value.trim() || "Разбор ответа.",
        },
      ],
    };

    // Push into subject topics
    subject.topics.push(newTopic);

    // Persist custom topics so they survive page reloads
    appState.customTopics[subjectId] = appState.customTopics[subjectId] || [];
    appState.customTopics[subjectId].push(newTopic);
    saveStateToStorage();

    // Refresh general views
    renderSubjects();
    renderGeneralNotes();
    renderGeneralVideos();

    // Reset inputs
    topicTitle.value = "";
    theoryContent.value = "";
    videoTitle.value = "";
    questionText.value = "";

    showToast("🚀 Тема добавлена", "Новый конспект, видеоурок и тест успешно опубликованы на платформе!");

    // Redirect to newly updated subject details page
    loadSubjectDetail(subjectId);
  });
}
