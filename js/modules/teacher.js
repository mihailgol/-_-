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

    renderTeacherSubmissions();
  } catch (err) {
    console.error("Failed to load teacher groups:", err);
  }
}

export async function renderTeacherSubmissions() {
  const container = document.getElementById("teacherSubmissionsList");
  if (!container) return;
  if (!appState.user || !appState.user.isLoggedIn) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-secondary); padding: 24px;">Войдите в аккаунт учителя для проверки работ.</div>`;
    return;
  }

  try {
    const data = await api("/api/teacher/submissions");
    const submissions = data.submissions || [];

    if (submissions.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-text-secondary); padding: 24px; background: var(--color-card-bg); border-radius: 12px; border: 1px solid var(--color-border);">Нет работ, требующих вашей проверки.</div>`;
      return;
    }

    container.innerHTML = submissions
      .map(
        (s) => `
        <div style="background: var(--color-card-bg); border-radius: 12px; padding: 16px; border: 1px solid var(--color-border); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-weight: 700; font-size: 0.95rem;">${s.studentName}</span>
              <span style="font-size: 0.8rem; color: var(--color-text-secondary);">(${s.studentEmail})</span>
              <span class="${s.status === "reviewed_by_teacher" ? "free-badge" : "premium-badge"}" style="font-size: 0.75rem;">
                ${s.status === "reviewed_by_teacher" ? "✓ Проверено" : "⏳ Требует проверки"}
              </span>
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-purple); margin-bottom: 4px;">${s.contextTitle}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">
              Самооценка ученика: <strong>${s.selfScore !== null ? s.selfScore + " б." : "не выставлена"}</strong> |
              Оценка учителя: <strong>${s.teacherScore !== null ? s.teacherScore + " б." : "—"}</strong>
            </div>
          </div>
          <div>
            <button class="btn btn-primary review-sub-btn" data-id="${s.id}" style="font-size: 0.85rem; padding: 8px 16px;">
              ${s.status === "reviewed_by_teacher" ? "Изменить оценку" : "Проверить работу"}
            </button>
          </div>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".review-sub-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const sub = submissions.find((item) => String(item.id) === String(id));
        if (sub) openTeacherReviewModal(sub);
      });
    });
  } catch (err) {
    console.error("Failed to load teacher submissions:", err);
  }
}

function openTeacherReviewModal(sub) {
  const modalBody = document.getElementById("teacherReviewBody");
  if (!modalBody) return;

  const qInfo = sub.questionInfo || {
    question: "Задание Части 2",
    maxPoints: 3,
    solutionKey: "Ключ ответа не найден",
  };

  modalBody.innerHTML = `
    <div style="margin-bottom: 16px; font-size: 0.9rem; color: var(--color-text-secondary);">
      Ученик: <strong>${sub.studentName}</strong> (${sub.studentEmail}) • ${sub.contextTitle}
    </div>

    <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; margin-bottom: 14px;">
      <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 6px;">Условие задания:</div>
      <div style="font-size: 0.95rem; line-height: 1.5;">${qInfo.question}</div>
    </div>

    <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; margin-bottom: 14px;">
      <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px;">Ответ ученика:</div>
      <div style="font-size: 0.95rem; white-space: pre-wrap;">${sub.studentAnswer || "<em style='color: var(--color-text-secondary);'>Ответ отсутствует</em>"}</div>
      <div style="margin-top: 8px; font-size: 0.85rem; color: var(--color-purple); font-weight: 600;">
        Самооценка ученика: ${sub.selfScore !== null ? sub.selfScore + " б." : "не проведена"}
      </div>
    </div>

    ${
      sub.attachedPhotos && sub.attachedPhotos.length > 0
        ? `
    <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; margin-bottom: 14px;">
      <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-purple); text-transform: uppercase; margin-bottom: 8px;">📷 Прикрепенные фотографии работы (${sub.attachedPhotos.length}):</div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        ${sub.attachedPhotos
          .map(
            (photoUrl) => `
          <img src="${photoUrl}" class="attached-work-photo" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border); cursor: pointer; transition: transform 0.2s;" title="Нажмите для просмотра в полном размере" />
        `
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }

    <div style="background: rgba(82, 196, 26, 0.08); border: 1px solid var(--color-green); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
      <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-green); text-transform: uppercase; margin-bottom: 4px;">🔑 Ключ ответа (ФИПИ):</div>
      <div style="font-size: 0.9rem; white-space: pre-wrap;">${qInfo.solutionKey || "Ключ не указан"}</div>
    </div>

    <form id="teacherReviewForm" style="display: flex; flex-direction: column; gap: 14px;">
      <div>
        <label style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Итоговая оценка учителя (от 0 до ${qInfo.maxPoints} б.):</label>
        <input type="number" id="teacherScoreInput" class="search-input" value="${sub.teacherScore !== null ? sub.teacherScore : sub.selfScore !== null ? sub.selfScore : 0}" min="0" max="${qInfo.maxPoints}" style="width: 120px;" required />
      </div>

      <div>
        <label style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Комментарий / Рецензия для ученика:</label>
        <textarea id="teacherCommentInput" class="search-input" style="width: 100%; height: 100px; padding: 10px; resize: vertical; box-sizing: border-box;" placeholder="Напишите рецензию, укажите на ошибки или похвалите за решение...">${sub.teacherComment || ""}</textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
        <button type="button" class="btn btn-outline" id="closeTeacherReviewBtn">Отмена</button>
        <button type="submit" class="btn btn-primary">💾 Сохранить проверку</button>
      </div>
    </form>
  `;

  modalBody.querySelectorAll(".attached-work-photo").forEach((img) => {
    img.addEventListener("click", () => {
      const lbImg = document.getElementById("lightboxImage");
      if (lbImg) {
        lbImg.src = img.src;
        openModal("imageLightboxModal");
      }
    });
  });

  openModal("teacherReviewModal");

  document.getElementById("closeTeacherReviewBtn")?.addEventListener("click", () => closeModal("teacherReviewModal"));

  document.getElementById("teacherReviewForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const scoreVal = parseInt(document.getElementById("teacherScoreInput").value, 10);
    const commentVal = document.getElementById("teacherCommentInput").value.trim();

    try {
      await api(`/api/teacher/submissions/${sub.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          teacherScore: scoreVal,
          teacherComment: commentVal,
        }),
      });

      closeModal("teacherReviewModal");
      showToast("🎉 Проверка сохранена", "Ученик получит уведомление с вашей оценкой и комментарием!");
      renderTeacherSubmissions();
    } catch (err) {
      console.error("Failed to submit teacher review:", err);
      showToast("⚠️ Ошибка", err.message || "Не удалось сохранить проверку");
    }
  });
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
