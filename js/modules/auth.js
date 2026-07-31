import { appState, GUEST_USER, saveStateToStorage } from "./state.js";
import { api } from "./utils.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { updateUIFromState } from "./render.js";
import { renderSubjects, renderGeneralNotes, renderGeneralVideos, loadSubjectDetail } from "./catalog.js";

let authMode = "login";
let lastAuthSignature = "";

export function renderAuthHeader() {
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

export function initAuthEvents() {
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

export function toggleAuthMode() {
  authMode = authMode === "login" ? "register" : "login";
  const titleEl = document.getElementById("authModalTitle");
  const toggleLink = document.getElementById("authToggleLink");
  const submitBtn = document.getElementById("authSubmitManual");

  if (titleEl) titleEl.textContent = authMode === "register" ? "Регистрация" : "Вход в личный кабинет";
  if (toggleLink)
    toggleLink.textContent = authMode === "register" ? "У меня уже есть аккаунт" : "Нет аккаунта? Зарегистрироваться";
  if (submitBtn) submitBtn.textContent = authMode === "register" ? "Создать аккаунт" : "Войти в систему";
}

export function handleSocialLogin(provider) {
  showToast("🔜 Скоро", `Вход через ${provider} будет доступен позже. Пока используйте вход по email.`);
}

export async function handleManualLogin() {
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
      isRegister ? "Аккаунт создан. Добро пожаловать!" : `Добро пожаловать, ${user.name}!`
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

export async function handleLogout() {
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

  renderSubjects();
  renderGeneralNotes();
  renderGeneralVideos();
  if (appState.currentSubject) {
    loadSubjectDetail(appState.currentSubject.id);
  }

  showToast("🚪 Выход", "Вы вышли из учетной записи.");
}
