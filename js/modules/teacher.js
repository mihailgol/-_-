import { api } from "./utils.js";
import { showToast, openModal, closeModal } from "./ui.js";
import { appState } from "./state.js";
import { startQuiz } from "./quiz.js";

export async function renderTeacherCabinet() {
  const container = document.getElementById("teacherGroupsList");
  if (!container) return;
  if (!appState.user.isLoggedIn) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 40px; background: var(--color-card-bg); border-radius: 16px; border: 1px solid var(--color-border);">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔒</div>
        <h3 style="margin-bottom: 8px;">Требуется авторизация</h3>
        <p style="margin-bottom: 20px; font-size: 0.95rem;">Войдите в свой аккаунт, чтобы создавать группы и видеть задания.</p>
      </div>
    `;
    return;
  }

  try {
    const data = await api("/api/teacher/groups");
    const groups = data.groups || [];

    if (groups.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 40px; background: var(--color-card-bg); border-radius: 16px; border: 1px solid var(--color-border);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">👥</div>
          <h3 style="margin-bottom: 8px;">У вас пока нет созданных групп</h3>
          <p style="margin-bottom: 20px; font-size: 0.95rem;">Создайте первую группу учеников, чтобы делиться заданиями и следить за их успеваемостью.</p>
          <button class="btn btn-primary" id="createFirstGroupBtn">➕ Создать группу</button>
        </div>
      `;
      const btn = document.getElementById("createFirstGroupBtn");
      if (btn) btn.addEventListener("click", openCreateGroupModal);
      return;
    }

    container.innerHTML = groups
      .map(
        (g) => `
        <div class="group-card" data-id="${g.id}" style="background: var(--color-card-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--color-border); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 1.15rem;">${g.name}</h3>
              <span class="invite-badge" title="Нажмите, чтобы скопировать" style="background: var(--color-bg-secondary); color: var(--color-green); font-weight: 700; font-family: monospace; padding: 4px 10px; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">${g.inviteCode}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); display: flex; gap: 16px; margin-bottom: 16px;">
              <span>👨‍🎓 ${g.memberCount} учеников</span>
              <span>📝 ${g.assignmentCount} заданий</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline view-group-btn" data-id="${g.id}" style="flex: 1; font-size: 0.85rem; padding: 8px;">Управление</button>
          </div>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".invite-badge").forEach((el) => {
      el.addEventListener("click", () => {
        const code = el.textContent;
        navigator.clipboard.writeText(code).then(() => {
          showToast("📋 Скопировано!", `Код приглашения ${code} скопирован в буфер обмена.`);
        });
      });
    });

    container.querySelectorAll(".view-group-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const groupId = btn.getAttribute("data-id");
        loadGroupDetails(groupId);
      });
    });
  } catch (err) {
    console.error("Failed to load teacher groups:", err);
  }
}

function showTeacherModal(content) {
  const body = document.getElementById("teacherModalBody");
  if (!body) return;
  body.innerHTML = content;
  openModal("teacherModal");
}

export function openCreateGroupModal() {
  const content = `
    <div style="padding: 16px;">
      <h3 style="margin-top: 0; margin-bottom: 16px;">Создать группу учеников</h3>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Название группы</label>
        <input type="text" id="newGroupNameInput" class="search-input" placeholder="Например: 11-А Математика (ЕГЭ 2026)" style="width: 100%; box-sizing: border-box;" />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button class="btn btn-outline" id="cancelGroupModal">Отмена</button>
        <button class="btn btn-primary" id="confirmCreateGroup">Создать</button>
      </div>
    </div>
  `;
  showTeacherModal(content);

  document.getElementById("cancelGroupModal")?.addEventListener("click", () => closeModal("teacherModal"));
  document.getElementById("confirmCreateGroup")?.addEventListener("click", async () => {
    const input = document.getElementById("newGroupNameInput");
    const name = input ? input.value.trim() : "";
    if (!name) {
      showToast("⚠️ Ошибка", "Введите название группы");
      return;
    }

    try {
      const res = await api("/api/teacher/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      closeModal("teacherModal");
      showToast("🎉 Группа создана!", `Группа "${res.group.name}" создана. Код приглашения: ${res.group.inviteCode}`);
      renderTeacherCabinet();
    } catch (err) {
      showToast("⚠️ Ошибка", err.message || "Не удалось создать группу");
    }
  });
}

export function openJoinGroupModal() {
  const content = `
    <div style="padding: 16px;">
      <h3 style="margin-top: 0; margin-bottom: 16px;">Вступить в группу репетитора</h3>
      <p style="color: var(--color-text-secondary); margin-bottom: 16px; font-size: 0.9rem;">Введите код приглашения, который вам передал преподаватель.</p>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Код приглашения</label>
        <input type="text" id="joinInviteCodeInput" class="search-input" placeholder="HUB-XXXX" style="width: 100%; box-sizing: border-box; text-transform: uppercase; font-family: monospace; font-size: 1.1rem; letter-spacing: 2px;" />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button class="btn btn-outline" id="cancelJoinModal">Отмена</button>
        <button class="btn btn-primary" id="confirmJoinGroup">Вступить</button>
      </div>
    </div>
  `;
  showTeacherModal(content);

  document.getElementById("cancelJoinModal")?.addEventListener("click", () => closeModal("teacherModal"));
  document.getElementById("confirmJoinGroup")?.addEventListener("click", async () => {
    const input = document.getElementById("joinInviteCodeInput");
    const inviteCode = input ? input.value.trim() : "";
    if (!inviteCode) {
      showToast("⚠️ Ошибка", "Введите код приглашения");
      return;
    }

    try {
      const res = await api("/api/teacher/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      closeModal("teacherModal");
      showToast("✅ Вы вступили в группу!", `Вы успешно присоединились к группе "${res.group.name}".`);
      renderStudentAssignments();
    } catch (err) {
      showToast("⚠️ Ошибка", err.message || "Не удалось вступить в группу");
    }
  });
}

export async function loadGroupDetails(groupId) {
  try {
    const data = await api(`/api/teacher/groups/${groupId}`);
    const { group, members, assignments } = data;

    const modalContent = `
      <div style="padding: 24px; max-width: 600px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0;">${group.name}</h2>
            <span style="font-size: 0.85rem; color: var(--color-text-secondary);">Код приглашения: <strong style="color: var(--color-green);">${group.inviteCode}</strong></span>
          </div>
          <button class="btn btn-outline" id="closeGroupDetailModal">Закрыть</button>
        </div>

        <h4 style="margin-bottom: 12px;">👨‍🎓 Состав группы (${members.length} уч.)</h4>
        <div style="max-height: 180px; overflow-y: auto; margin-bottom: 24px; border: 1px solid var(--color-border); border-radius: 12px; padding: 8px;">
          ${
            members.length === 0
              ? `<div style="text-align: center; color: var(--color-text-secondary); padding: 16px;">Пока никто не вступил по коду ${group.inviteCode}</div>`
              : members
                  .map(
                    (m) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--color-border-light);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${m.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80"}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
                    <div>
                      <div style="font-weight: 600; font-size: 0.9rem;">${m.name}</div>
                      <div style="font-size: 0.75rem; color: var(--color-text-secondary);">${m.email}</div>
                    </div>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--color-text-secondary);">Вступил ${new Date(m.joinedAt).toLocaleDateString("ru-RU")}</span>
                </div>
              `
                  )
                  .join("")
          }
        </div>

        <h4 style="margin-bottom: 12px;">📝 Выданные задания (${assignments.length})</h4>
        <div style="max-height: 180px; overflow-y: auto; margin-bottom: 20px; border: 1px solid var(--color-border); border-radius: 12px; padding: 8px;">
          ${
            assignments.length === 0
              ? `<div style="text-align: center; color: var(--color-text-secondary); padding: 16px;">Нет выданных заданий</div>`
              : assignments
                  .map(
                    (a) => `
                <div style="padding: 8px 12px; border-bottom: 1px solid var(--color-border-light); display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.9rem;">${a.title}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Сдать до: ${a.dueDate || "Без срока"}</div>
                  </div>
                  <span class="free-badge">${a.submissionsCount} сдано</span>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      </div>
    `;

    showTeacherModal(modalContent);
    document.getElementById("closeGroupDetailModal")?.addEventListener("click", () => closeModal("teacherModal"));
  } catch (err) {
    showToast("⚠️ Ошибка", err.message || "Не удалось загрузить данные группы");
  }
}

export async function renderStudentAssignments() {
  const container = document.getElementById("studentAssignmentsList");
  if (!container) return;
  if (!appState.user.isLoggedIn) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-secondary); padding: 24px;">Войдите в аккаунт, чтобы просматривать полученные задания.</div>`;
    return;
  }

  try {
    const data = await api("/api/teacher/my-assignments");
    const assignments = data.assignments || [];

    if (assignments.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-text-secondary); padding: 24px;">У вас пока нет активных домашних заданий от преподавателей.</div>`;
      return;
    }

    container.innerHTML = assignments
      .map(
        (a) => `
        <div style="background: var(--color-card-bg); border-radius: 12px; padding: 16px; border: 1px solid var(--color-border); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.8rem; color: var(--color-green); font-weight: 600; margin-bottom: 4px;">Группа: ${a.groupName} (${a.teacherName})</div>
            <h4 style="margin: 0 0 6px 0;">${a.title}</h4>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Срок: ${a.dueDate || "Без ограничения"}</div>
          </div>
          <div>
            ${
              a.submission
                ? `<span style="background: var(--color-bg-secondary); color: var(--color-green); padding: 6px 12px; border-radius: 8px; font-weight: 600;">Выполнено: ${a.submission.percent}%</span>`
                : `<button class="btn btn-primary assignment-submit-btn" data-assignment-id="${a.id}" data-subject-id="${a.subjectId}" data-topic-id="${a.topicId || ""}" style="font-size: 0.85rem; padding: 8px 16px;">Выполнить</button>`
            }
          </div>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".assignment-submit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const subjectId = btn.getAttribute("data-subject-id");
        const topicId = btn.getAttribute("data-topic-id");
        const assignmentId = btn.getAttribute("data-assignment-id");
        startAssignmentQuiz({ id: assignmentId, subjectId, topicId });
      });
    });
  } catch (err) {
    console.error("Failed to load student assignments:", err);
  }
}

function startAssignmentQuiz(assignment) {
  const subject = window.EXAM_DATA.subjects[assignment.subjectId];
  const topic = subject && subject.topics.find((t) => t.id === assignment.topicId);
  if (!topic || !topic.questions || topic.questions.length === 0) {
    showToast("⚠️ Нет теста", "К этому заданию не привязан тест. Обратитесь к преподавателю.");
    return;
  }
  appState.pendingAssignmentId = assignment.id;
  startQuiz(topic.questions, `Задание: ${topic.title}`, "teacher");
}

export function initTeacherEvents() {
  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) {
    createGroupBtn.addEventListener("click", openCreateGroupModal);
  }

  const joinGroupBtn = document.getElementById("joinGroupBtn");
  if (joinGroupBtn) {
    joinGroupBtn.addEventListener("click", openJoinGroupModal);
  }
}
