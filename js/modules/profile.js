import { appState } from "./state.js";
import { showToast } from "./ui.js";
import { api } from "./utils.js";

export function initProfileView() {
  const profileSection = document.getElementById("view-profile");
  if (!profileSection) return;

  setupProfileTabs();
  setupSettingsForm();

  const quickEditBtn = document.getElementById("profileQuickEditBtn");
  if (quickEditBtn) {
    quickEditBtn.addEventListener("click", () => {
      switchProfileTab("settings");
    });
  }

  const sidebarUserBlock = document.getElementById("sidebarUserBlock");
  if (sidebarUserBlock) {
    sidebarUserBlock.addEventListener("click", () => {
      const stateModule = import("./state.js");
      stateModule.then(({ navigateTo }) => {
        navigateTo("profile");
      });
    });
  }
}

export function updateProfileUI() {
  const user = appState.user || {
    name: "Артём Иванов",
    email: "artem.ivanov@example.com",
    role: "student",
    is_premium: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
  };

  const nameEl = document.getElementById("profileHeaderName");
  const emailEl = document.getElementById("profileHeaderEmail");
  const avatarEl = document.getElementById("profileHeaderAvatar");
  const roleTagEl = document.getElementById("profileHeaderRoleTag");
  const statusTagEl = document.getElementById("profileHeaderStatusTag");
  const badgeEl = document.getElementById("profileHeaderBadge");

  if (nameEl) nameEl.textContent = user.name || "Ученик ExamHub";
  if (emailEl) emailEl.textContent = user.email || "user@examhub.ru";
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;
  if (roleTagEl) roleTagEl.textContent = user.role === "admin" ? "Администратор" : "Ученик";
  if (statusTagEl) statusTagEl.textContent = user.is_premium ? "Премиум доступ" : "Базовый доступ";
  if (badgeEl) badgeEl.textContent = user.is_premium ? "PRO" : "FREE";

  const inputName = document.getElementById("profileInputName");
  const inputEmail = document.getElementById("profileInputEmail");
  const inputAvatar = document.getElementById("profileInputAvatar");
  if (inputName) inputName.value = user.name || "";
  if (inputEmail) inputEmail.value = user.email || "";
  if (inputAvatar && user.avatar) inputAvatar.value = user.avatar;

  updateAdminVisibility(user);
  loadUserHistory();
  loadUserCourses();
}

function updateAdminVisibility(user) {
  const sidebarAdminBtn = document.getElementById("sidebarAdminBtn");
  const mobileAdminBtn = document.getElementById("mobileAdminBtn");
  
  let storedUser = null;
  try {
    const raw = localStorage.getItem("examhub_user") || localStorage.getItem("examhub_state");
    if (raw) storedUser = JSON.parse(raw);
    if (storedUser && storedUser.user) storedUser = storedUser.user;
  } catch (e) {
    void e;
  }

  const currentUser = storedUser || user || appState?.user;
  const roleStr = String(currentUser?.role || "").toLowerCase();
  const emailStr = String(currentUser?.email || "").toLowerCase();
  const isAdmin = currentUser && (roleStr === "admin" || emailStr.includes("admin"));

  if (sidebarAdminBtn) {
    sidebarAdminBtn.style.setProperty("display", isAdmin ? "flex" : "none", "important");
  }
  if (mobileAdminBtn) {
    mobileAdminBtn.style.setProperty("display", isAdmin ? "flex" : "none", "important");
  }
}

function setupProfileTabs() {
  const tabBtns = document.querySelectorAll(".profile-tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-profile-tab");
      switchProfileTab(tabName);
    });
  });
}

function switchProfileTab(tabName) {
  const tabBtns = document.querySelectorAll(".profile-tab-btn");
  const tabContents = document.querySelectorAll(".profile-tab-content");

  tabBtns.forEach((btn) => {
    if (btn.getAttribute("data-profile-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  tabContents.forEach((content) => {
    if (content.id === `profileTab${capitalize(tabName)}`) {
      content.style.display = "block";
      content.classList.add("active");
    } else {
      content.style.display = "none";
      content.classList.remove("active");
    }
  });
}

async function loadUserHistory() {
  const historyList = document.getElementById("profileHistoryList");
  if (!historyList) return;

  try {
    const data = await api("/api/progress/attempts").catch(() => ({ attempts: [] }));
    const attempts = data.attempts || [];
    if (attempts.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history-text" style="color: var(--color-text-secondary); text-align: center; padding: 30px;">
          Вы пока не проходили тесты. Пройдите первый тест во вкладке «Тесты» или «Пробники»!
        </div>
      `;
      return;
    }

    historyList.innerHTML = attempts.map((item) => `
      <div class="profile-history-item">
        <div>
          <div style="font-weight: 700; color: var(--color-text-primary); font-size: 15px;">${item.title || "Тренировочный тест"}</div>
          <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
            Результат: ${item.score} из ${item.total} (${item.percent}%)
          </div>
        </div>
        <div style="text-align: right;">
          <span style="background: ${item.percent >= 70 ? "var(--color-green-light)" : "rgba(220,53,69,0.1)"}; color: ${item.percent >= 70 ? "var(--color-green)" : "#dc3545"}; font-weight: 700; padding: 4px 10px; border-radius: 12px; font-size: 13px;">
            ${item.percent}%
          </span>
        </div>
      </div>
    `).join("");
  } catch (err) {
    void err;
    historyList.innerHTML = `<div class="empty-history-text">Ошибка загрузки истории</div>`;
  }
}

async function loadUserCourses() {
  const coursesGrid = document.getElementById("profileCoursesGrid");
  if (!coursesGrid) return;

  try {
    const catalog = await api("/api/catalog/subjects").catch(() => ({ subjects: [] }));
    const subjects = catalog.subjects || [];

    coursesGrid.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
        ${subjects.map((sub) => `
          <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--border-radius-lg); padding: 16px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px;">${sub.icon || "📚"}</span>
            <div>
              <div style="font-weight: 700; color: var(--color-text-primary); font-size: 14px;">${sub.title}</div>
              <div style="font-size: 11px; color: var(--color-green); font-weight: 600; margin-top: 2px;">Доступ открыт</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    void err;
    coursesGrid.innerHTML = `<div class="empty-history-text">Ошибка загрузки предметов</div>`;
  }
}

function setupSettingsForm() {
  const form = document.getElementById("profileSettingsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("profileInputName").value;
    const email = document.getElementById("profileInputEmail").value;
    const avatar = document.getElementById("profileInputAvatar").value;

    if (!appState.user) appState.user = {};
    appState.user.name = name;
    appState.user.email = email;
    if (avatar) appState.user.avatar = avatar;

    const sidebarName = document.getElementById("sidebarName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarAvatar && avatar) sidebarAvatar.src = avatar;

    showToast("✅ Профиль обновлен", "Изменения профиля сохранены.");
    updateProfileUI();
  });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
