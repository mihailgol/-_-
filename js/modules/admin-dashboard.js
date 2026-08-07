import { api } from "./utils.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { appState } from "./state.js";

let adminDataCache = null;

export async function renderAdminDashboard() {
  const container = document.getElementById("adminContentContainer");
  if (!container) return;

  if (!appState.user.isLoggedIn || appState.user.role !== "ADMIN") {
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
        <button class="btn btn-tab" data-admin-tab="tests">📝 Тесты</button>
        <button class="btn btn-tab" data-admin-tab="analytics">📈 Аналитика</button>
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
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${q.subject_title || "Предмет"} • ${q.topic_title || "Тема"} • Тип: ${q.type}</div>
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
    contentArea.innerHTML = `
      <div style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
        <h3 style="margin-top: 0; margin-bottom: 16px;">⚙️ Системные Настройки Платформы</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; max-width: 480px;">
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Название платформы</label>
            <input type="text" class="search-input" value="ExamHub — Изолированная платформа подготовки к ЕГЭ и ОГЭ" style="width: 100%;" disabled />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Режим изолированных экзаменов</label>
            <input type="text" class="search-input" value="Включен (ЕГЭ / ОГЭ)" style="width: 100%;" disabled />
          </div>
          <div style="margin-top: 8px;">
            <span style="font-size: 0.85rem; color: #10b981; font-weight: 600;">✅ Серверное окружение активно, RBAC включен</span>
          </div>
        </div>
      </div>
    `;
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
