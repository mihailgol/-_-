import { appState } from "./state.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { switchView, pushSubView } from "./navigation.js";
import { startQuiz } from "./quiz.js";
import { openVideoPlayer } from "./video.js";

let subjectTabsInitDone = false;

function initSubjectTabs() {
  if (subjectTabsInitDone) return;
  subjectTabsInitDone = true;

  const tabContainer = document.querySelector(".subject-tabs");
  if (!tabContainer) return;

  tabContainer.addEventListener("click", (e) => {
    const tab = e.target.closest(".sub-tab-btn");
    if (!tab) return;

    const targetPanelId = tab.getAttribute("data-tab");
    document.querySelectorAll(".subject-tabs .sub-tab-btn").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".subject-tab-panel").forEach((p) => {
      p.classList.remove("active");
      if (p.id === targetPanelId) {
        p.classList.add("active");
      }
    });
  });
}

export function renderSubjects() {
  const grid = document.getElementById("subjectGrid");
  if (!grid) return;
  grid.innerHTML = "";

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

export function renderAllSubjectsModal() {
  const grid = document.getElementById("allSubjectsGrid");
  if (!grid) return;
  grid.innerHTML = "";

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

export function loadSubjectDetail(subjectId, { replace = false } = {}) {
  const subject = window.EXAM_DATA.subjects[subjectId];
  if (!subject) return;

  appState.currentSubject = subject;

  document.getElementById("subjectDetailTitle").textContent = subject.title;
  document.getElementById("subjectDetailIcon").textContent = subject.icon;
  document.getElementById("subjectDetailSubtitle").textContent =
    `Полный интерактивный курс ЕГЭ/ОГЭ по предмету ${subject.title}`;

  const banner = document.getElementById("subjectBanner");
  banner.style.background =
    subject.bgGradient || `linear-gradient(135deg, ${subject.colorHex || "#4096FF"}15 0%, #FFFFFF 100%)`;
  banner.style.borderColor = `${subject.colorHex || "#4096FF"}25`;

  const tabContainer = document.querySelector(".subject-tabs");
  tabContainer.style.setProperty("--tab-color-active", subject.color);

  renderSubjectNotes(subject);
  renderSubjectVideos(subject);
  renderSubjectQuizzes(subject);

  const tabs = document.querySelectorAll(".subject-tabs .sub-tab-btn");
  const panels = document.querySelectorAll(".subject-tab-panel");

  tabs.forEach((tab) => {
    tab.className = "sub-tab-btn";
    if (tab.getAttribute("data-tab") === "tab-notes") {
      tab.classList.add("active");
    }
  });

  initSubjectTabs();

  document.getElementById("subjectBackBtn").onclick = () => {
    switchView("subjects");
  };

  panels.forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-notes").classList.add("active");

  switchView("subject-detail");

  if (replace) {
    history.replaceState({ view: "subject-detail", subjectId }, "", `#subject-detail:${subjectId}`);
  } else {
    pushSubView({ view: "subject-detail", subjectId }, `#subject-detail:${subjectId}`);
  }
}

export function renderSubjectNotes(subject) {
  const container = document.getElementById("subjectDetailNotesGrid");
  if (!container) return;
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

export function renderSubjectVideos(subject) {
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

export function renderSubjectQuizzes(subject) {
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

export function loadNoteReader(subjectId, noteId, { replace = false } = {}) {
  const subject = window.EXAM_DATA.subjects[subjectId];
  if (!subject) return;

  const topic = subject.topics.find((t) => t.id === noteId);
  if (!topic) return;

  appState.activeNoteId = noteId;
  appState.currentSubject = subject;

  document.getElementById("noteContentTitle").textContent = topic.title;

  const lockOverlay = document.getElementById("notePremiumOverlay");
  if (topic.isPremium && !appState.user.isPremium) {
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

  document.getElementById("noteReaderBackBtn").onclick = () => {
    loadSubjectDetail(subjectId);
  };

  const sidebarNav = document.getElementById("noteSidebarNav");
  sidebarNav.innerHTML = "";

  subject.topics.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = `note-nav-btn ${t.id === noteId ? "active" : ""} ${t.isPremium ? "premium" : ""}`;
    btn.textContent = t.title.split(":")[0];

    btn.addEventListener("click", () => {
      loadNoteReader(subjectId, t.id);
    });

    sidebarNav.appendChild(btn);
  });

  switchView("note-reader");

  if (replace) {
    history.replaceState({ view: "note-reader", subjectId, noteId }, "", `#note-reader:${subjectId}:${noteId}`);
  } else {
    pushSubView({ view: "note-reader", subjectId, noteId }, `#note-reader:${subjectId}:${noteId}`);
  }
}

export function renderGeneralNotes() {
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

export function renderGeneralVideos() {
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
