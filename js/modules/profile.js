import { appState, saveStateToStorage } from "./state.js";
import { showToast, openModal } from "./ui.js";
import { api } from "./utils.js";
import { switchView } from "./navigation.js";
import { updateUIFromState } from "./render.js";

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
      if (appState.user && appState.user.isLoggedIn) {
        switchView("profile");
      } else {
        openModal("authModal");
      }
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

  // Compute dynamic user stats from history or aggregated stats
  const attempts = appState.userHistory || [];
  const solvedCount = attempts.length > 0
    ? attempts.reduce((acc, a) => acc + (a.total || 0), 0)
    : (appState.stats?.testsSolved || 0);
  const avgPercent = attempts.length
    ? Math.round(attempts.reduce((acc, a) => acc + (a.percent || 0), 0) / attempts.length)
    : (appState.stats?.avgPercent || 0);
  const streak = (attempts.length > 0 || (appState.stats?.testsSolved || 0) > 0) ? (appState.streakDays || 1) : 0;
  const rank = solvedCount > 100 ? "Топ 5%" : (solvedCount > 20 ? "Продвинутый" : (solvedCount > 0 ? "Новичок" : "—"));

  const statStreak = document.getElementById("profileStatStreak");
  const statSolved = document.getElementById("profileStatSolved");
  const statAccuracy = document.getElementById("profileStatAccuracy");
  const statRank = document.getElementById("profileStatRank");

  if (statStreak) statStreak.textContent = `${streak} дн.`;
  if (statSolved) statSolved.textContent = solvedCount;
  if (statAccuracy) statAccuracy.textContent = `${avgPercent}%`;
  if (statRank) statRank.textContent = rank;

  updateAdminVisibility(user);
  loadUserHistory();
  loadUserCourses();
  loadStudentGroupInfo();
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
    appState.userHistory = attempts;
    saveStateToStorage();

    const solvedCount = attempts.length > 0
      ? attempts.reduce((acc, a) => acc + (a.total || 0), 0)
      : (appState.stats?.testsSolved || 0);
    const avgPercent = attempts.length
      ? Math.round(attempts.reduce((acc, a) => acc + (a.percent || 0), 0) / attempts.length)
      : (appState.stats?.avgPercent || 0);
    const streak = (attempts.length > 0 || (appState.stats?.testsSolved || 0) > 0) ? (appState.streakDays || 1) : 0;
    const rank = solvedCount > 100 ? "Топ 5%" : (solvedCount > 20 ? "Продвинутый" : (solvedCount > 0 ? "Новичок" : "—"));

    const statStreak = document.getElementById("profileStatStreak");
    const statSolved = document.getElementById("profileStatSolved");
    const statAccuracy = document.getElementById("profileStatAccuracy");
    const statRank = document.getElementById("profileStatRank");

    if (statStreak) statStreak.textContent = `${streak} дн.`;
    if (statSolved) statSolved.textContent = solvedCount;
    if (statAccuracy) statAccuracy.textContent = `${avgPercent}%`;
    if (statRank) statRank.textContent = rank;

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

async function loadStudentGroupInfo() {
  const area = document.getElementById("profileStudentGroupArea");
  if (!area) return;

  if (!appState.user || !appState.user.isLoggedIn) {
    area.innerHTML = `
      <div style="font-size: 0.9rem; color: var(--color-text-secondary); padding: 6px 0;">
        <span style="color: var(--color-purple); font-weight: 600; cursor: pointer;" id="profileGroupLoginLink">Войдите в аккаунт</span>, чтобы прикрепиться к группе преподавателя.
      </div>
    `;
    document.getElementById("profileGroupLoginLink")?.addEventListener("click", () => {
      openModal("authModal");
    });
    return;
  }

  try {
    const data = await api("/api/teacher/my-groups").catch(() => ({ groups: [] }));
    const groups = data.groups || [];

    if (groups.length > 0) {
      area.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${groups
            .map(
              (g) => `
            <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-text-primary);">${g.name}</div>
                <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 2px;">Преподаватель: <strong>${g.teacher_name || "Учитель"}</strong> (код: ${g.invite_code})</div>
              </div>
              <button class="btn btn-outline profile-go-homework-btn" style="font-size: 0.85rem; padding: 6px 14px;">📝 Перейти к заданиям</button>
            </div>
          `
            )
            .join("")}
          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <input type="text" id="profileJoinGroupCodeInput" class="auth-form-input" placeholder="Добавить еще группу по коду (HUB-...)" style="text-transform: uppercase; font-family: monospace; font-size: 0.85rem; max-width: 320px;" />
            <button class="btn btn-outline" id="profileJoinGroupBtn" style="white-space: nowrap; font-size: 0.85rem; padding: 0 16px;">Вступить</button>
          </div>
        </div>
      `;

      area.querySelectorAll(".profile-go-homework-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          switchView("teacher");
        });
      });
    } else {
      area.innerHTML = `
        <div style="display: flex; gap: 10px; max-width: 480px;">
          <input type="text" id="profileJoinGroupCodeInput" class="auth-form-input" placeholder="Код группы (например, HUB-9YSG)" style="text-transform: uppercase; font-family: monospace; font-weight: 600;" />
          <button class="btn btn-primary" id="profileJoinGroupBtn" style="white-space: nowrap; padding: 0 20px;">Вступить</button>
        </div>
      `;
    }

    const joinBtn = document.getElementById("profileJoinGroupBtn");
    const joinInput = document.getElementById("profileJoinGroupCodeInput");
    if (joinBtn && joinInput) {
      joinBtn.addEventListener("click", async () => {
        const code = joinInput.value.trim().toUpperCase();
        if (!code) {
          showToast("❌ Ошибка", "Введите код приглашения (например, HUB-XXXX)");
          return;
        }
        try {
          const res = await api("/api/teacher/join", {
            method: "POST",
            body: JSON.stringify({ inviteCode: code }),
          });
          showToast("🎉 Успех", `Вы успешно вступили в группу «${res?.group?.name || code}»!`);
          loadStudentGroupInfo();
        } catch (err) {
          showToast("⚠️ Ошибка", err.message || "Не удалось вступить в группу");
        }
      });
    }
  } catch {
    // ignore
  }
}

function setupSettingsForm() {
  const form = document.getElementById("profileSettingsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("profileInputName").value.trim();
    const email = document.getElementById("profileInputEmail").value.trim();
    const avatar = document.getElementById("profileInputAvatar").value.trim();

    if (!name) {
      showToast("❌ Ошибка", "Имя не может быть пустым.");
      return;
    }

    if (appState.user && appState.user.isLoggedIn) {
      try {
        const res = await api("/api/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({ name, avatar }),
        });
        if (res?.user) {
          appState.user.name = res.user.name;
          appState.user.avatar = res.user.avatar || appState.user.avatar;
        }
      } catch (err) {
        showToast("⚠️ Внимание", err.message || "Не удалось сохранить на сервере");
      }
    } else {
      if (!appState.user) appState.user = {};
      appState.user.name = name;
      appState.user.email = email;
      if (avatar) appState.user.avatar = avatar;
    }

    const sidebarName = document.getElementById("sidebarName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarAvatar && avatar) sidebarAvatar.src = avatar;

    saveStateToStorage();
    updateUIFromState();
    showToast("✅ Профиль обновлен", "Изменения профиля сохранены.");
    updateProfileUI();
  });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
