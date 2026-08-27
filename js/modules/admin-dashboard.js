import { api } from "./utils.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { appState } from "./state.js";

let adminDataCache = null;

export async function renderAdminDashboard() {
  const container = document.getElementById("adminContentContainer");
  if (!container) return;

  let storedUser = null;
  try {
    const raw = localStorage.getItem("examhub_user") || localStorage.getItem("examhub_state");
    if (raw) storedUser = JSON.parse(raw);
    if (storedUser && storedUser.user) storedUser = storedUser.user;
  } catch (e) {
    void e;
  }

  const u = storedUser || appState.user;
  const isLoggedIn = u.isLoggedIn || !!localStorage.getItem("examhub_token") || !!storedUser;
  const roleStr = String(u?.role || "").toUpperCase();

  if (!isLoggedIn || roleStr !== "ADMIN") {
    container.innerHTML = `
      <div style="text-align: center; color: var(--color-text-secondary); padding: 60px 20px; background: var(--color-card-bg); border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="font-size: 3rem; margin-bottom: 16px;">🔒</div>
        <h2 style="margin-bottom: 12px;">Доступ ограничен</h2>
        <p style="margin-bottom: 24px; font-size: 1rem;">Раздел предназначен только для Администратора системы.</p>
        <button class="btn btn-primary" id="openAdminLoginModalBtn">🔑 Войти как Администратор</button>
      </div>
    `;
    document.getElementById("openAdminLoginModalBtn")?.addEventListener("click", () => {
      openModal("adminLoginModal");
    });
    return;
  }

  try {
    const data = await api("/api/admin/dashboard");
    adminDataCache = data;
    renderAdminOverview(container, data);
  } catch (err) {
    showToast("⚠️ Ошибка", err.message || "Не удалось загрузить данные администратора");
  }
}

function renderAdminOverview(container, data) {
  const { kpis, recentRegistrations, recentLogins, activityGraph } = data;

  container.innerHTML = `
    <div class="admin-panel" style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Admin Nav Tabs -->
      <div class="admin-tabs" style="display: flex; gap: 8px; flex-wrap: wrap; background: var(--color-bg-secondary); padding: 8px; border-radius: 12px; border: 1px solid var(--color-border);">
        <button class="btn btn-tab active" data-admin-tab="dashboard">📊 Dashboard</button>
        <button class="btn btn-tab" data-admin-tab="users">👥 Пользователи</button>
        <button class="btn btn-tab" data-admin-tab="teachers">👨‍🏫 Учителя</button>
        <button class="btn btn-tab" data-admin-tab="subscriptions">💳 Подписки</button>
        <button class="btn btn-tab" data-admin-tab="theory">📖 Теория</button>
        <button class="btn btn-tab" data-admin-tab="questions">❓ База вопросов</button>
        <button class="btn btn-tab" data-admin-tab="tests">📝 Тесты</button>
        <button class="btn btn-tab" data-admin-tab="analytics">📈 Аналитика</button>
        <button class="btn btn-tab" data-admin-tab="support">📩 Обращения</button>
        <button class="btn btn-tab" data-admin-tab="settings">⚙️ Настройки</button>
      </div>

      <div id="adminTabContent">
        <!-- Dashboard Overview Tab -->
        <div class="admin-kpis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div class="kpi-card" style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px;">Всего пользователей</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--color-text);">${kpis.totalUsers}</div>
          </div>
          <div class="kpi-card" style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px;">Активные</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #10b981;">${kpis.activeUsers}</div>
          </div>
          <div class="kpi-card" style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px;">Новые за неделю</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #6366f1;">${kpis.newUsers}</div>
          </div>
          <div class="kpi-card" style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px;">Преподаватели</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #8b5cf6;">${kpis.teachersCount}</div>
          </div>
          <div class="kpi-card" style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px;">Подписки</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b;">${kpis.subscriptionsCount}</div>
          </div>
          <div class="kpi-card" style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px;">Выручка</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #10b981;">${kpis.revenue.toLocaleString("ru-RU")} ₽</div>
          </div>
        </div>

        <!-- Activity Graph & Tables -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 24px;">
          <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <h4 style="margin: 0 0 16px 0;">📊 Динамика регистраций и тестов</h4>
            <div id="adminActivityChart" style="height: 180px; display: flex; align-items: flex-end; gap: 12px; padding-top: 20px;">
              ${activityGraph
                .map((g) => {
                  const regHeight = Math.min(100, (g.registrations || 0) * 20 + 10);
                  const testHeight = Math.min(100, (g.testsSolved || 0) * 10 + 10);
                  return `
                  <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <div style="display: flex; gap: 4px; align-items: flex-end; height: 120px; width: 100%; justify-content: center;">
                      <div style="width: 40%; height: ${regHeight}%; background: #6366f1; border-radius: 4px;" title="Регистраций: ${g.registrations}"></div>
                      <div style="width: 40%; height: ${testHeight}%; background: #10b981; border-radius: 4px;" title="Тестов: ${g.testsSolved}"></div>
                    </div>
                    <span style="font-size: 0.7rem; color: var(--color-text-secondary);">${g.date.split("-").slice(1).join(".")}</span>
                  </div>
                `;
                })
                .join("")}
            </div>
            <div style="display: flex; gap: 16px; justify-content: center; margin-top: 12px; font-size: 0.8rem;">
              <span style="color: #6366f1;">■ Регистрации</span>
              <span style="color: #10b981;">■ Решенные тесты</span>
            </div>
          </div>

          <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
            <h4 style="margin: 0 0 16px 0;">🕒 Последние регистрации и входы</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${recentRegistrations
                .slice(0, 3)
                .map(
                  (u) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-radius: 8px;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">${u.name} (Регистрация)</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary);">${u.email}</div>
                  </div>
                  <span class="free-badge" style="font-size: 0.75rem;">${u.role}</span>
                </div>
              `
                )
                .join("")}
              ${recentLogins
                .slice(0, 3)
                .map(
                  (u) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-radius: 8px;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">${u.name} (Вход)</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary);">${u.email}</div>
                  </div>
                  <span class="free-badge" style="font-size: 0.75rem; background: #e0f2fe; color: #0284c7;">${u.role}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  bindAdminTabs(container);
}

function bindAdminTabs(container) {
  const tabs = container.querySelectorAll("[data-admin-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-admin-tab");
      loadAdminTabContent(target);
    });
  });
}

async function loadAdminTabContent(tabName) {
  const contentArea = document.getElementById("adminTabContent");
  if (!contentArea) return;

  if (tabName === "dashboard") {
    renderAdminOverview(document.getElementById("adminContentContainer"), adminDataCache);
    return;
  }

  if (tabName === "support") {
    await renderAdminSupportTickets(contentArea);
    return;
  }

  if (tabName === "users") {
    const data = await api("/api/admin/users");
    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;">Управление пользователями</h3>
          <input type="text" id="adminUserSearchInput" class="search-input" placeholder="Поиск по имени или email..." style="width: 260px;" />
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-secondary);">
                <th style="padding: 10px;">ID</th>
                <th style="padding: 10px;">Имя</th>
                <th style="padding: 10px;">Email</th>
                <th style="padding: 10px;">Роль</th>
                <th style="padding: 10px;">Статус</th>
                <th style="padding: 10px;">Экзамен</th>
                <th style="padding: 10px;">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${data.users
                .map(
                  (u) => `
                <tr style="border-bottom: 1px solid var(--color-border-light);">
                  <td style="padding: 10px;">#${u.id}</td>
                  <td style="padding: 10px; font-weight: 600;">${u.name}</td>
                  <td style="padding: 10px;">${u.email}</td>
                  <td style="padding: 10px;"><span class="free-badge">${u.role}</span></td>
                  <td style="padding: 10px;">
                    <span style="color: ${u.status === "active" ? "#10b981" : "#ef4444"}; font-weight: 600;">
                      ${u.status === "active" ? "Активен" : "Отключен"}
                    </span>
                  </td>
                  <td style="padding: 10px;">${u.exam_type || "EGE"}</td>
                  <td style="padding: 10px; display: flex; gap: 6px;">
                    <button class="btn btn-outline edit-user-btn" data-id="${u.id}" style="padding: 4px 8px; font-size: 0.75rem;">Редактировать</button>
                    <button class="btn btn-outline toggle-status-btn" data-id="${u.id}" data-status="${u.status}" style="padding: 4px 8px; font-size: 0.75rem; color: ${u.status === "active" ? "#ef4444" : "#10b981"};">
                      ${u.status === "active" ? "Отключить" : "Включить"}
                    </button>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    contentArea.querySelectorAll(".toggle-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const currentStatus = btn.getAttribute("data-status");
        const newStatus = currentStatus === "active" ? "disabled" : "active";
        await api(`/api/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
        showToast("✅ Успешно", "Статус пользователя обновлен");
        loadAdminTabContent("users");
      });
    });
    return;
  }

  if (tabName === "teachers") {
    const data = await api("/api/admin/teachers");
    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0;">Учителя и Репетиторы</h3>
            <p style="margin: 4px 0 0 0; color: var(--color-text-secondary); font-size: 0.85rem;">Учителя создаются только Администратором.</p>
          </div>
          <button class="btn btn-primary" id="adminCreateTeacherBtn">➕ Создать Кабинет Учителя</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          ${
            data.teachers.length === 0
              ? `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 30px;">Нет зарегистрированных учителей</div>`
              : data.teachers
                  .map(
                    (t) => `
                <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                      <h4 style="margin: 0;">${t.name}</h4>
                      <span style="font-family: monospace; font-weight: 700; color: #6366f1; background: rgba(99, 102, 241, 0.1); padding: 2px 8px; border-radius: 6px; font-size: 0.8rem;">${t.teacherId}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 12px;">📧 ${t.email}</div>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-outline delete-teacher-btn" data-id="${t.id}" style="flex: 1; padding: 6px; font-size: 0.8rem; color: #ef4444;">Удалить</button>
                  </div>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      </div>
    `;

    document.getElementById("adminCreateTeacherBtn")?.addEventListener("click", openCreateTeacherModal);

    contentArea.querySelectorAll(".delete-teacher-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Вы уверены, что хотите удалить кабинет этого учителя?")) {
          await api(`/api/admin/teachers/${id}`, { method: "DELETE" });
          showToast("🗑️ Удалено", "Кабинет учителя успешно удален");
          loadAdminTabContent("teachers");
        }
      });
    });
    return;
  }

  if (tabName === "theory") {
    let theoryList;
    try {
      const res = await api("/api/admin/theory");
      theoryList = res?.theory || [];
    } catch {
      theoryList = [];
    }


    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="margin: 0;">📖 Управление Теоретическими Материалами</h3>
            <p style="margin: 4px 0 0 0; color: var(--color-text-secondary); font-size: 0.85rem;">Создавайте конспекты с поддержкой Markdown, HTML, формул и медиа.</p>
          </div>
          <button class="btn btn-primary" id="adminOpenTheoryEditorBtn">➕ Открыть Редактор Теории (Rich Editor)</button>
        </div>

        <div style="margin-bottom: 20px; background: var(--color-bg-secondary); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border); font-size: 0.9rem;">
          <div style="font-weight: 600; margin-bottom: 8px;">🚀 Возможности Редактора Теории:</div>
          <ul style="margin: 0; padding-left: 20px; color: var(--color-text-secondary); line-height: 1.6;">
            <li>Полная поддержка Markdown & HTML форматирования</li>
            <li>Вставка математических формул LaTeX ($$E=mc^2$$)</li>
            <li>Интеграция видеоуроков и учебных PDF-материалов</li>
            <li>Автосохранение черновиков и живой предпросмотр (Live Preview)</li>
          </ul>
        </div>

        <h4 style="margin-bottom: 12px;">📚 Опубликованные Темы и Конспекты (${theoryList.length})</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${
            theoryList.length === 0
              ? `<div style="color: var(--color-text-secondary); padding: 16px; text-align: center;">Темы в базе данных еще не созданы</div>`
              : theoryList
                  .map(
                    (item) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--color-bg-secondary); border-radius: 10px; border: 1px solid var(--color-border);">
                  <div>
                    <div style="font-weight: 600;">${item.title}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${item.subject_title || item.subject_id || "Предмет"} • ID: ${item.id}</div>
                  </div>
                  <button class="btn btn-outline delete-theory-btn" data-id="${item.id}" style="color: #ef4444; border-color: #fca5a5; padding: 4px 10px; font-size: 0.8rem;">🗑️ Удалить</button>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      </div>
    `;

    document.getElementById("adminOpenTheoryEditorBtn")?.addEventListener("click", () => {
      import("./navigation.js").then((m) => m.switchView("theory-editor"));
      import("./theory-editor.js").then((m) => m.initTheoryEditor());
    });

    contentArea.querySelectorAll(".delete-theory-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Вы действительно хотите удалить эту тему из базы данных?")) {
          await api(`/api/admin/theory/${id}`, { method: "DELETE" });
          showToast("🗑️ Удалено", "Тема теории удалена из базы данных");
          loadAdminTabContent("theory");
        }
      });
    });
    return;
  }

  if (tabName === "questions") {
    let questionsList;
    try {
      const res = await api("/api/admin/tests/questions");
      questionsList = res?.questions || [];
    } catch (err) {
      showToast("⚠️ Ошибка", err.message || "Не удалось загрузить вопросы");
      questionsList = [];
    }

    renderQuestionsTab(contentArea, questionsList);
    return;
  }

  if (tabName === "tests") {
    let questionsList;
    try {
      const res = await api("/api/admin/tests");
      questionsList = res?.questions || [];
    } catch {
      questionsList = [];
    }


    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="margin: 0;">📝 Конструктор Тестов и Банк Вопросов</h3>
            <p style="margin: 4px 0 0 0; color: var(--color-text-secondary); font-size: 0.85rem;">Создавайте тестовые задания всех типов в формате ЕГЭ/ОГЭ.</p>
          </div>
          <button class="btn btn-primary" id="adminOpenTestEditorBtn">➕ Открыть Конструктор Тестов (Test Constructor)</button>
        </div>

        <div style="margin-bottom: 20px; background: var(--color-bg-secondary); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border); font-size: 0.9rem;">
          <div style="font-weight: 600; margin-bottom: 8px;">🎯 Поддерживаемые 5 типов вопросов:</div>
          <ul style="margin: 0; padding-left: 20px; color: var(--color-text-secondary); line-height: 1.6;">
            <li>1️⃣ Одиночный выбор ответа</li>
            <li>☑️ Множественный выбор ответов</li>
            <li>✍️ Текстовый ввод решения</li>
            <li>🔄 Установление соответствия между столбцами</li>
            <li>🔢 Упорядочивание правильной последовательности</li>
          </ul>
        </div>

        <h4 style="margin-bottom: 12px;">🏦 Банк вопросов и тестовые задания (${questionsList.length})</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${
            questionsList.length === 0
              ? `<div style="color: var(--color-text-secondary); padding: 16px; text-align: center;">Вопросы в базе данных еще не созданы</div>`
              : questionsList
                  .map(
                    (q) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--color-bg-secondary); border-radius: 10px; border: 1px solid var(--color-border);">
                  <div>
                    <div style="font-weight: 600;">${q.question}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${q.subject_title || "Предмет"} • Задание №${q.task_number || 0} • ${q.topic_title || "Тема"} • Тип: ${q.type}</div>
                  </div>
                  <button class="btn btn-outline delete-question-btn" data-id="${q.id}" style="color: #ef4444; border-color: #fca5a5; padding: 4px 10px; font-size: 0.8rem;">🗑️ Удалить</button>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      </div>
    `;

    document.getElementById("adminOpenTestEditorBtn")?.addEventListener("click", () => {
      import("./navigation.js").then((m) => m.switchView("test-editor"));
      import("./test-editor.js").then((m) => m.initTestEditor());
    });

    contentArea.querySelectorAll(".delete-question-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Вы действительно хотите удалить этот вопрос из БД?")) {
          await api(`/api/admin/tests/questions/${id}`, { method: "DELETE" });
          showToast("🗑️ Удалено", "Вопрос удален из банка тестовых заданий");
          loadAdminTabContent("tests");
        }
      });
    });
    return;
  }


  if (tabName === "subscriptions") {
    const data = await api("/api/admin/dashboard");
    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
        <h3 style="margin-top: 0; margin-bottom: 16px;">💳 Управление Подписками и Тарифами</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px;">
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Активных Premium подписок</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #f59e0b;">${data.kpis.subscriptionsCount}</div>
          </div>
          <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px;">
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Общая выручка</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #10b981;">${data.kpis.revenue.toLocaleString("ru-RU")} ₽</div>
          </div>
        </div>
        <p style="color: var(--color-text-secondary); font-size: 0.9rem;">Все платежи и активные тарифы пользователей валидируются сервером и отражаются в едином финансовом отчете.</p>
      </div>
    `;
    return;
  }

  if (tabName === "settings") {
    let settings;
    try {
      const res = await api("/api/admin/site/settings");
      settings = res.settings || {};
    } catch {
      settings = {};
    }

    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border); max-width: 650px;">
        <h3 style="margin-top: 0; margin-bottom: 8px;">⚙️ Настройки и Юридические реквизиты</h3>
        <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-bottom: 20px;">
          Укажите ваши реквизиты ИП/Самозанятого/ООО и контакты поддержки. Они автоматически отобразятся в Оферте, Политике и Условиях возврата.
        </p>

        <form id="adminLegalSettingsForm" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">ФИО / Наименование Исполнителя</label>
            <input type="text" id="adminSettingLegalName" class="search-input" value="${settings.legal_name || ''}" placeholder="Например: ИП Иванов Иван Иванович" style="width: 100%; box-sizing: border-box;" required />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Статус (Самозанятый / ИП / ООО)</label>
            <input type="text" id="adminSettingLegalStatus" class="search-input" value="${settings.legal_status || ''}" placeholder="Индивидуальный предприниматель / Самозанятый" style="width: 100%; box-sizing: border-box;" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">ИНН</label>
              <input type="text" id="adminSettingLegalInn" class="search-input" value="${settings.legal_inn || ''}" placeholder="12 цифр ИНН" style="width: 100%; box-sizing: border-box;" required />
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">ОГРНИП / ОГРН</label>
              <input type="text" id="adminSettingLegalOgrn" class="search-input" value="${settings.legal_ogrn || ''}" placeholder="15 цифр ОГРНИП" style="width: 100%; box-sizing: border-box;" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Email поддержки</label>
              <input type="email" id="adminSettingSupportEmail" class="search-input" value="${settings.support_email || ''}" placeholder="support@examhub.ru" style="width: 100%; box-sizing: border-box;" required />
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Телефон поддержки</label>
              <input type="text" id="adminSettingSupportPhone" class="search-input" value="${settings.support_phone || ''}" placeholder="8 (800) 555-35-35" style="width: 100%; box-sizing: border-box;" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 8px; align-self: flex-start; padding: 10px 24px;">💾 Сохранить реквизиты</button>
        </form>
      </div>
    `;

    document.getElementById("adminLegalSettingsForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const legal_name = document.getElementById("adminSettingLegalName")?.value.trim();
      const legal_status = document.getElementById("adminSettingLegalStatus")?.value.trim();
      const legal_inn = document.getElementById("adminSettingLegalInn")?.value.trim();
      const legal_ogrn = document.getElementById("adminSettingLegalOgrn")?.value.trim();
      const support_email = document.getElementById("adminSettingSupportEmail")?.value.trim();
      const support_phone = document.getElementById("adminSettingSupportPhone")?.value.trim();

      try {
        await api("/api/admin/site/settings", {
          method: "PUT",
          body: JSON.stringify({
            settings: { legal_name, legal_status, legal_inn, legal_ogrn, support_email, support_phone }
          })
        });
        showToast("✅ Реквизиты сохранены", "Юридические данные и контакты обновлены в оферте и документах.");
      } catch (err) {
        showToast("⚠️ Ошибка", err.message || "Не удалось сохранить реквизиты");
      }
    });
    return;
  }

  if (tabName === "analytics") {
    const data = await api("/api/admin/analytics");
    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;">Расширенная Аналитика</h3>
          <div style="display: flex; gap: 10px;">
            <a href="/api/admin/analytics/export?format=csv" download class="btn btn-outline" style="font-size: 0.85rem;">📥 Экспорт CSV</a>
            <a href="/api/admin/analytics/export?format=excel" download class="btn btn-primary" style="font-size: 0.85rem;">📊 Экспорт Excel</a>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px;">
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Всего решено вопросов</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #6366f1;">${data.totalSolved}</div>
          </div>
          <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px;">
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Средний процент прохождения</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${data.avgPercent}%</div>
          </div>
        </div>

        <h4 style="margin-bottom: 12px;">🔥 Популярные предметы</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${data.popularSubjects
            .map(
              (s) => `
            <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: var(--color-bg-secondary); border-radius: 8px;">
              <span>${s.title}</span>
              <strong style="color: #6366f1;">${s.attempts_count} тестов</strong>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
    return;
  }


  contentArea.innerHTML = `
    <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
      <h3 style="margin-bottom: 12px;">Раздел "${tabName}"</h3>
      <p style="color: var(--color-text-secondary);">Раздел готов к использованию и обновляется в реальном времени.</p>
    </div>
  `;
}

export function openCreateTeacherModal() {
  const content = `
    <div style="padding: 16px;">
      <h3 style="margin-top: 0; margin-bottom: 16px;">Создать кабинет учителя</h3>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600;">ФИО Преподавателя</label>
        <input type="text" id="newTeacherName" class="search-input" placeholder="Иванова Ольга Сергеевна" style="width: 100%; box-sizing: border-box;" />
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email (необязательно, сгенерируется автоматически)</label>
        <input type="email" id="newTeacherEmail" class="search-input" placeholder="teacher@examhub.ru" style="width: 100%; box-sizing: border-box;" />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button class="btn btn-outline" id="cancelCreateTeacherBtn">Отмена</button>
        <button class="btn btn-primary" id="confirmCreateTeacherBtn">Сгенерировать Кабинет</button>
      </div>
    </div>
  `;

  const body = document.getElementById("adminModalBody");
  if (!body) return;
  body.innerHTML = content;
  openModal("adminModal");

  document.getElementById("cancelCreateTeacherBtn")?.addEventListener("click", () => closeModal("adminModal"));
  document.getElementById("confirmCreateTeacherBtn")?.addEventListener("click", async () => {
    const name = document.getElementById("newTeacherName")?.value.trim();
    const email = document.getElementById("newTeacherEmail")?.value.trim();

    try {
      const res = await api("/api/admin/teachers", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });

      const { teacher } = res;
      closeModal("adminModal");

      const successContent = `
        <div style="padding: 20px;">
          <div style="font-size: 2.5rem; text-align: center; margin-bottom: 12px;">🎉</div>
          <h3 style="text-align: center; margin-bottom: 16px;">Кабинет Учителя Создан!</h3>
          <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 12px; font-family: monospace; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.6;">
            <div><strong>ID:</strong> ${teacher.teacherId}</div>
            <div><strong>Логин:</strong> ${teacher.email}</div>
            <div><strong>Пароль:</strong> ${teacher.password}</div>
          </div>
          <div style="display: flex; justify-content: center; gap: 12px;">
            <button class="btn btn-primary" id="copyTeacherCredsBtn">📋 Скопировать данные в 1 клик</button>
          </div>
        </div>
      `;

      body.innerHTML = successContent;
      openModal("adminModal");

      document.getElementById("copyTeacherCredsBtn")?.addEventListener("click", () => {
        const text = `Данные для входа учителя:\nID: ${teacher.teacherId}\nЛогин: ${teacher.email}\nПароль: ${teacher.password}`;
        navigator.clipboard.writeText(text).then(() => {
          showToast("📋 Скопировано!", "Учетные данные учителя скопированы в буфер обмена");
          closeModal("adminModal");
          loadAdminTabContent("teachers");
        });
      });
    } catch (err) {
      showToast("⚠️ Ошибка", err.message || "Не удалось создать преподавателя");
    }
  });
}

async function renderAdminSupportTickets(contentArea) {
  try {
    const data = await api("/api/admin/support/tickets");
    const tickets = data.tickets || [];

    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <h3 style="margin: 0;">📩 Обращения клиентов (${tickets.length})</h3>
          <span style="font-size: 0.85rem; color: var(--color-text-secondary);">Все поступившие вопросы и обращения пользователей</span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-secondary);">
                <th style="padding: 10px;">ID</th>
                <th style="padding: 10px;">Дата</th>
                <th style="padding: 10px;">Email / Ученик</th>
                <th style="padding: 10px;">Тема обращения</th>
                <th style="padding: 10px;">Текст сообщения</th>
                <th style="padding: 10px;">Статус</th>
                <th style="padding: 10px;">Действие</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.length === 0 ? `
                <tr>
                  <td colspan="7" style="padding: 24px; text-align: center; color: var(--color-text-secondary);">Обращений пока нет</td>
                </tr>
              ` : tickets.map((t) => `
                <tr style="border-bottom: 1px solid var(--color-border-light);">
                  <td style="padding: 10px; font-weight: 700;">#${t.id}</td>
                  <td style="padding: 10px; font-size: 0.8rem; color: var(--color-text-secondary);">${t.created_at || '—'}</td>
                  <td style="padding: 10px; font-weight: 600;">${t.user_email}</td>
                  <td style="padding: 10px; font-weight: 700; color: var(--color-text-primary);">${t.subject}</td>
                  <td style="padding: 10px; max-width: 300px; word-break: break-word;">${t.message}</td>
                  <td style="padding: 10px;">
                    <span style="padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; background: ${t.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color: ${t.status === 'resolved' ? '#10b981' : '#f59e0b'};">
                      ${t.status === 'resolved' ? '✅ Решено' : '⏳ В обработке'}
                    </span>
                  </td>
                  <td style="padding: 10px;">
                    ${t.status === 'open' ? `
                      <button class="btn btn-outline resolve-ticket-btn" data-id="${t.id}" style="padding: 4px 8px; font-size: 0.75rem; color: #10b981; border-color: #10b981;">
                        ✓ Отметить решенным
                      </button>
                    ` : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    contentArea.querySelectorAll(".resolve-ticket-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await api(`/api/admin/support/tickets/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "resolved" })
          });
          showToast("✅ Статус обновлен", `Обращение #${id} отмечено решенным`);
          renderAdminSupportTickets(contentArea);
        } catch (e) {
          showToast("⚠️ Ошибка", e.message);
        }
      });
    });
  } catch (err) {
    showToast("⚠️ Ошибка", err.message || "Не удалось загрузить обращения");
  }
}

const SUBJECTS_LIST = [
  { id: "math", title: "Математика" },
  { id: "russian", title: "Русский язык" },
  { id: "biology", title: "Биология" },
  { id: "chemistry", title: "Химия" },
  { id: "physics", title: "Физика" },
  { id: "informatics", title: "Информатика" },
  { id: "social", title: "Обществознание" },
  { id: "history", title: "История" },
  { id: "literature", title: "Литература" },
  { id: "geography", title: "География" },
];

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTypeBadge(type) {
  switch (type) {
    case "single":
      return '<span style="background: rgba(99, 102, 241, 0.12); color: #6366f1; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">1️⃣ Одиночный</span>';
    case "multiple":
      return '<span style="background: rgba(16, 185, 129, 0.12); color: #10b981; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">☑️ Множественный</span>';
    case "text":
      return '<span style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">✍️ Текст</span>';
    case "extended":
      return '<span style="background: rgba(236, 72, 153, 0.12); color: #ec4899; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">📝 Часть 2 (ФИПИ)</span>';
    case "matching":
      return '<span style="background: rgba(139, 92, 246, 0.12); color: #8b5cf6; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">🔄 Соответствие</span>';
    case "sequence":
      return '<span style="background: rgba(14, 165, 233, 0.12); color: #0ea5e9; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">🔢 Последовательность</span>';
    default:
      return `<span style="background: var(--color-bg-secondary); color: var(--color-text-secondary); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem;">${escapeHtml(type) || "Стандарт"}</span>`;
  }
}

function renderQuestionsTab(contentArea, initialQuestions) {
  let questions = [...initialQuestions];
  let filter = {
    q: "",
    subjectId: "all",
    taskNumber: "",
    type: "all",
  };

  function getFilteredQuestions() {
    return questions.filter((item) => {
      if (filter.subjectId !== "all" && item.subject_id !== filter.subjectId) {
        return false;
      }
      if (filter.taskNumber && String(item.task_number) !== String(filter.taskNumber)) {
        return false;
      }
      if (filter.type !== "all" && item.type !== filter.type) {
        return false;
      }
      if (filter.q) {
        const query = filter.q.toLowerCase();
        const textMatch = String(item.question || "").toLowerCase().includes(query);
        const idMatch = String(item.id || "").toLowerCase().includes(query);
        const subjMatch = String(item.subject_title || "").toLowerCase().includes(query);
        const topicMatch = String(item.topic_title || "").toLowerCase().includes(query);
        if (!textMatch && !idMatch && !subjMatch && !topicMatch) {
          return false;
        }
      }
      return true;
    });
  }

  function renderTableRows(filtered) {
    const tbody = document.getElementById("adminQuestionsTableBody");
    const countBadge = document.getElementById("adminQuestionsCountBadge");
    if (countBadge) {
      countBadge.textContent = `${filtered.length} из ${questions.length}`;
    }
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 32px; text-align: center; color: var(--color-text-secondary);">
            Вопросы по заданным фильтрам не найдены
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((q) => {
        const previewText =
          q.question && q.question.length > 120
            ? q.question.slice(0, 120) + "..."
            : q.question || "—";
        return `
          <tr style="border-bottom: 1px solid var(--color-border-light);">
            <td style="padding: 10px; font-family: monospace; font-size: 0.8rem; color: var(--color-text-secondary); white-space: nowrap;">
              #${escapeHtml(q.id)}
            </td>
            <td style="padding: 10px; white-space: nowrap;">
              <span style="font-weight: 600;">${escapeHtml(q.subject_title || q.subject_id || "Предмет")}</span>
            </td>
            <td style="padding: 10px; text-align: center; white-space: nowrap;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: var(--color-bg-secondary); font-weight: 700; font-size: 0.8rem;">
                №${q.task_number || 0}
              </span>
            </td>
            <td style="padding: 10px; white-space: nowrap;">
              ${getTypeBadge(q.type)}
            </td>
            <td style="padding: 10px; max-width: 360px; word-break: break-word; font-size: 0.88rem; line-height: 1.4;">
              <div style="font-weight: 500;">${escapeHtml(previewText)}</div>
              ${q.topic_title ? `<div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px;">Тема: ${escapeHtml(q.topic_title)}</div>` : ""}
            </td>
            <td style="padding: 10px; white-space: nowrap;">
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-outline edit-question-btn" data-id="${escapeHtml(q.id)}" style="padding: 4px 8px; font-size: 0.78rem;">
                  ✏️ Редактировать
                </button>
                <button class="btn btn-outline delete-question-btn" data-id="${escapeHtml(q.id)}" style="padding: 4px 8px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;">
                  🗑️ Удалить
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    tbody.querySelectorAll(".edit-question-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const item = questions.find((x) => x.id === id);
        if (item) {
          openEditQuestionModal(item, async () => {
            try {
              const res = await api("/api/admin/tests/questions");
              questions = res?.questions || [];
              renderTableRows(getFilteredQuestions());
            } catch (err) {
              void err;
            }
          });
        }
      });
    });

    tbody.querySelectorAll(".delete-question-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm(`Вы действительно хотите удалить вопрос #${id} из базы данных?`)) {
          try {
            await api(`/api/admin/tests/questions/${id}`, { method: "DELETE" });
            showToast("🗑️ Удалено", "Вопрос успешно удален из базы данных");
            questions = questions.filter((x) => x.id !== id);
            renderTableRows(getFilteredQuestions());
          } catch (err) {
            showToast("⚠️ Ошибка", err.message || "Не удалось удалить вопрос");
          }
        }
      });
    });
  }

  contentArea.innerHTML = `
    <div style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h3 style="margin: 0;">❓ База вопросов и заданий</h3>
            <span id="adminQuestionsCountBadge" style="background: var(--color-bg-secondary); padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; color: var(--color-text-secondary);">
              ${questions.length} вопросов
            </span>
          </div>
          <p style="margin: 4px 0 0 0; color: var(--color-text-secondary); font-size: 0.85rem;">
            Табличный реестр всех вопросов платформы по 10 предметам с фильтрацией, редактированием и удалением.
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" id="adminCreateQuestionFromRegistryBtn">➕ Создать вопрос в Конструкторе</button>
        </div>
      </div>

      <!-- Toolbar / Filters -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; background: var(--color-bg-secondary); padding: 14px; border-radius: 12px; border: 1px solid var(--color-border);">
        <div style="flex: 2; min-width: 220px;">
          <input type="text" id="adminQuestionSearchInput" class="search-input" placeholder="🔍 Поиск по тексту вопроса, ID или теме..." style="width: 100%; box-sizing: border-box;" />
        </div>
        <div style="flex: 1; min-width: 160px;">
          <select id="adminQuestionSubjectFilter" class="search-input" style="width: 100%; box-sizing: border-box;">
            <option value="all">Все 10 предметов</option>
            ${SUBJECTS_LIST.map((s) => `<option value="${s.id}">${s.title}</option>`).join("")}
          </select>
        </div>
        <div style="width: 120px;">
          <input type="number" id="adminQuestionTaskNumberFilter" class="search-input" placeholder="№ задания" min="1" max="50" style="width: 100%; box-sizing: border-box;" />
        </div>
        <div style="flex: 1; min-width: 160px;">
          <select id="adminQuestionTypeFilter" class="search-input" style="width: 100%; box-sizing: border-box;">
            <option value="all">Все типы вопросов</option>
            <option value="single">1️⃣ Одиночный выбор</option>
            <option value="multiple">☑️ Множественный выбор</option>
            <option value="text">✍️ Текстовый ввод</option>
            <option value="extended">📝 Часть 2 (ФИПИ)</option>
            <option value="matching">🔄 Соответствие</option>
            <option value="sequence">🔢 Последовательность</option>
          </select>
        </div>
        <div>
          <button class="btn btn-outline" id="adminQuestionResetBtn" style="padding: 8px 14px; font-size: 0.85rem;">
            🔄 Сброс
          </button>
        </div>
      </div>

      <!-- Questions Table -->
      <div style="overflow-x: auto;">
        <table id="adminQuestionsTable" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-secondary);">
              <th style="padding: 10px;">ID</th>
              <th style="padding: 10px;">Предмет</th>
              <th style="padding: 10px; text-align: center;">№ Задания</th>
              <th style="padding: 10px;">Тип</th>
              <th style="padding: 10px;">Текст вопроса</th>
              <th style="padding: 10px;">Действия</th>
            </tr>
          </thead>
          <tbody id="adminQuestionsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const searchInput = document.getElementById("adminQuestionSearchInput");
  const subjectFilter = document.getElementById("adminQuestionSubjectFilter");
  const taskNumberFilter = document.getElementById("adminQuestionTaskNumberFilter");
  const typeFilter = document.getElementById("adminQuestionTypeFilter");
  const resetBtn = document.getElementById("adminQuestionResetBtn");
  const createBtn = document.getElementById("adminCreateQuestionFromRegistryBtn");

  searchInput?.addEventListener("input", (e) => {
    filter.q = e.target.value;
    renderTableRows(getFilteredQuestions());
  });

  subjectFilter?.addEventListener("change", (e) => {
    filter.subjectId = e.target.value;
    renderTableRows(getFilteredQuestions());
  });

  taskNumberFilter?.addEventListener("input", (e) => {
    filter.taskNumber = e.target.value.trim();
    renderTableRows(getFilteredQuestions());
  });

  typeFilter?.addEventListener("change", (e) => {
    filter.type = e.target.value;
    renderTableRows(getFilteredQuestions());
  });

  resetBtn?.addEventListener("click", () => {
    filter = { q: "", subjectId: "all", taskNumber: "", type: "all" };
    if (searchInput) searchInput.value = "";
    if (subjectFilter) subjectFilter.value = "all";
    if (taskNumberFilter) taskNumberFilter.value = "";
    if (typeFilter) typeFilter.value = "all";
    renderTableRows(getFilteredQuestions());
  });

  createBtn?.addEventListener("click", () => {
    import("./navigation.js").then((m) => m.switchView("test-editor"));
    import("./test-editor.js").then((m) => m.initTestEditor());
  });

  renderTableRows(getFilteredQuestions());
}

function openEditQuestionModal(q, onSaved) {
  const body = document.getElementById("adminModalBody");
  if (!body) return;

  let optionsArr = [];
  try {
    if (typeof q.options_json === "string") {
      optionsArr = JSON.parse(q.options_json);
    } else if (Array.isArray(q.options)) {
      optionsArr = q.options;
    }
  } catch {
    optionsArr = [];
  }

  const optionsAsText = Array.isArray(optionsArr) ? optionsArr.join("\n") : "";

  body.innerHTML = `
    <div style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 1.25rem;">✏️ Редактирование вопроса</h3>
        <span style="font-family: monospace; font-size: 0.8rem; background: var(--color-bg-secondary); padding: 2px 8px; border-radius: 6px;">#${escapeHtml(q.id)}</span>
      </div>

      <form id="adminEditQuestionForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Предмет</label>
          <select id="editQuestionSubject" class="search-input" style="width: 100%; box-sizing: border-box;">
            ${SUBJECTS_LIST.map((s) => `<option value="${s.id}" ${q.subject_id === s.id ? "selected" : ""}>${s.title}</option>`).join("")}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">№ Задания</label>
            <input type="number" id="editQuestionTaskNumber" class="search-input" value="${q.task_number || 1}" min="1" max="50" style="width: 100%; box-sizing: border-box;" required />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Тип вопроса</label>
            <select id="editQuestionType" class="search-input" style="width: 100%; box-sizing: border-box;">
              <option value="single" ${q.type === "single" ? "selected" : ""}>1️⃣ Одиночный</option>
              <option value="multiple" ${q.type === "multiple" ? "selected" : ""}>☑️ Множественный</option>
              <option value="text" ${q.type === "text" ? "selected" : ""}>✍️ Текст</option>
              <option value="extended" ${q.type === "extended" ? "selected" : ""}>📝 Часть 2 (ФИПИ)</option>
              <option value="matching" ${q.type === "matching" ? "selected" : ""}>🔄 Соответствие</option>
              <option value="sequence" ${q.type === "sequence" ? "selected" : ""}>🔢 Последовательность</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Баллы (Max)</label>
            <input type="number" id="editQuestionPoints" class="search-input" value="${q.max_points || q.points || 1}" min="1" max="10" style="width: 100%; box-sizing: border-box;" required />
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Текст вопроса</label>
          <textarea id="editQuestionText" class="search-input" rows="3" style="width: 100%; box-sizing: border-box; resize: vertical;" required>${escapeHtml(q.question || "")}</textarea>
        </div>

        <div id="editQuestionOptionsWrapper">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Варианты ответов (по одному на строку)</label>
          <textarea id="editQuestionOptions" class="search-input" rows="3" placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3&#10;Вариант 4" style="width: 100%; box-sizing: border-box; resize: vertical;">${escapeHtml(optionsAsText)}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Правильный вариант (1..N)</label>
            <input type="number" id="editQuestionCorrectIndex" class="search-input" value="${typeof q.correct_index === "number" ? q.correct_index + 1 : 1}" min="1" max="10" style="width: 100%; box-sizing: border-box;" />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Ключ / Эталонный ответ</label>
            <input type="text" id="editQuestionSolutionKey" class="search-input" value="${escapeHtml(q.solution_key || "")}" placeholder="Ответ или ключ" style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Пояснение решения</label>
          <textarea id="editQuestionExplanation" class="search-input" rows="2" placeholder="Объяснение правильного решения..." style="width: 100%; box-sizing: border-box; resize: vertical;">${escapeHtml(q.explanation || "")}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
          <button type="button" class="btn btn-outline" id="cancelEditQuestionBtn">Отмена</button>
          <button type="submit" class="btn btn-primary" id="saveEditQuestionBtn">💾 Сохранить изменения</button>
        </div>
      </form>
    </div>
  `;

  openModal("adminModal");

  document.getElementById("cancelEditQuestionBtn")?.addEventListener("click", () => closeModal("adminModal"));

  document.getElementById("adminEditQuestionForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subjectId = document.getElementById("editQuestionSubject")?.value;
    const taskNumber = Number(document.getElementById("editQuestionTaskNumber")?.value || 0);
    const type = document.getElementById("editQuestionType")?.value;
    const points = Number(document.getElementById("editQuestionPoints")?.value || 1);
    const questionText = document.getElementById("editQuestionText")?.value.trim();
    const optionsRaw = document.getElementById("editQuestionOptions")?.value.trim();
    const correctIdxVal = Number(document.getElementById("editQuestionCorrectIndex")?.value || 1) - 1;
    const solutionKey = document.getElementById("editQuestionSolutionKey")?.value.trim();
    const explanation = document.getElementById("editQuestionExplanation")?.value.trim();

    const options = optionsRaw
      ? optionsRaw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      await api(`/api/admin/tests/questions/${q.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          subjectId,
          taskNumber,
          type,
          points,
          maxPoints: points,
          question: questionText,
          options,
          correctIndex: Math.max(0, correctIdxVal),
          solutionKey,
          explanation,
        }),
      });

      showToast("✅ Сохранено", "Вопрос успешно обновлен");
      closeModal("adminModal");
      if (onSaved) onSaved();
    } catch (err) {
      showToast("⚠️ Ошибка", err.message || "Не удалось сохранить вопрос");
    }
  });
}

