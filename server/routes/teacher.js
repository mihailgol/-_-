import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HUB-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.post("/switch-role", requireAuth, (req, res) => {
  const { role } = req.body || {};
  const validRoles = ["Репетитор", "Учитель", "Ученик"];
  const newRole = validRoles.includes(role) ? role : "Ученик";

  db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(newRole, req.user.id);
  res.json({ success: true, role: newRole });
});

router.get("/groups", requireAuth, (req, res) => {
  const groups = db.prepare(`SELECT * FROM groups WHERE teacher_id = ? ORDER BY created_at DESC`).all(req.user.id);

  const result = groups.map((g) => {
    const memberCount = db.prepare(`SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ?`).get(g.id).cnt;
    const assignmentCount = db.prepare(`SELECT COUNT(*) as cnt FROM assignments WHERE group_id = ?`).get(g.id).cnt;

    return {
      id: g.id,
      name: g.name,
      inviteCode: g.invite_code,
      createdAt: g.created_at,
      memberCount,
      assignmentCount,
    };
  });

  res.json({ groups: result });
});

router.post("/groups", requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Название группы обязательно" });
  }

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = db.prepare(`SELECT id FROM groups WHERE invite_code = ?`).get(inviteCode);
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const stmt = db.prepare(`INSERT INTO groups (teacher_id, name, invite_code) VALUES (?, ?, ?)`);
  const info = stmt.run(req.user.id, name.trim(), inviteCode);

  res.json({
    group: {
      id: info.lastInsertRowid,
      name: name.trim(),
      inviteCode,
      memberCount: 0,
      assignmentCount: 0,
    },
  });
});

router.get("/groups/:id", requireAuth, (req, res) => {
  const group = db.prepare(`SELECT * FROM groups WHERE id = ?`).get(req.params.id);
  if (!group) {
    return res.status(404).json({ error: "Группа не найдена" });
  }

  const isTeacher = group.teacher_id === req.user.id;
  const isMember = db.prepare(`SELECT id FROM group_members WHERE group_id = ? AND student_id = ?`).get(group.id, req.user.id);
  if (!isTeacher && !isMember) {
    return res.status(403).json({ error: "Доступ к этой группе ограничен" });
  }

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, u.avatar_url, gm.joined_at
    FROM group_members gm
    JOIN users u ON u.id = gm.student_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at DESC
  `).all(group.id);

  const assignments = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submissions_count
    FROM assignments a
    WHERE a.group_id = ?
    ORDER BY a.created_at DESC
  `).all(group.id);

  res.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.invite_code,
      teacherId: group.teacher_id,
      createdAt: group.created_at,
    },
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar || m.avatar_url,
      joinedAt: m.joined_at,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      subjectId: a.subject_id,
      topicId: a.topic_id,
      dueDate: a.due_date,
      createdAt: a.created_at,
      submissionsCount: a.submissions_count,
    })),
  });
});

router.post("/join", requireAuth, (req, res) => {
  const { inviteCode } = req.body || {};
  if (!inviteCode || typeof inviteCode !== "string") {
    return res.status(400).json({ error: "Введите код приглашения" });
  }

  const code = inviteCode.trim().toUpperCase();
  const group = db.prepare(`SELECT * FROM groups WHERE invite_code = ?`).get(code);
  if (!group) {
    return res.status(404).json({ error: "Группа с таким кодом не найдена" });
  }

  try {
    db.prepare(`INSERT INTO group_members (group_id, student_id) VALUES (?, ?)`).run(group.id, req.user.id);
  } catch {
    return res.status(409).json({ error: "Вы уже состояте в этой группе" });
  }

  res.json({
    success: true,
    group: {
      id: group.id,
      name: group.name,
    },
  });
});

router.post("/assignments", requireAuth, (req, res) => {
  const { groupId, title, subjectId, topicId = null, dueDate = null } = req.body || {};

  if (!groupId || !title || !subjectId) {
    return res.status(400).json({ error: "Укажите группу, название и предмет" });
  }

  const group = db.prepare(`SELECT * FROM groups WHERE id = ? AND teacher_id = ?`).get(groupId, req.user.id);
  if (!group) {
    return res.status(403).json({ error: "Доступ запрещен или группа не найдена" });
  }

  const stmt = db.prepare(`
    INSERT INTO assignments (group_id, teacher_id, title, subject_id, topic_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(groupId, req.user.id, title.trim(), subjectId, topicId, dueDate);

  res.json({
    assignment: {
      id: info.lastInsertRowid,
      groupId,
      title: title.trim(),
      subjectId,
      topicId,
      dueDate,
    },
  });
});

router.post("/assignments/:id/submit", requireAuth, (req, res) => {
  const { score, total } = req.body || {};

  if (typeof score !== "number" || typeof total !== "number" || total <= 0 || score < 0 || score > total) {
    return res.status(400).json({ error: "Некорректный результат выполнения" });
  }

  const assignment = db
    .prepare(`SELECT a.* FROM assignments a WHERE a.id = ?`)
    .get(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: "Задание не найдено" });
  }

  const member = db
    .prepare(`SELECT id FROM group_members WHERE group_id = ? AND student_id = ?`)
    .get(assignment.group_id, req.user.id);
  if (!member) {
    return res.status(403).json({ error: "Вы не состоите в группе этого задания" });
  }

  const percent = Math.round((score / total) * 100);
  const existing = db
    .prepare(`SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?`)
    .get(assignment.id, req.user.id);

  if (existing) {
    db.prepare(
      `UPDATE assignment_submissions SET score = ?, total = ?, percent = ?, submitted_at = datetime('now') WHERE id = ?`
    ).run(score, total, percent, existing.id);
  } else {
    db.prepare(
      `INSERT INTO assignment_submissions (assignment_id, student_id, score, total, percent) VALUES (?, ?, ?, ?, ?)`
    ).run(assignment.id, req.user.id, score, total, percent);
  }

  res.json({ success: true, submission: { score, total, percent } });
});

router.get("/my-assignments", requireAuth, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, g.name as group_name, u.name as teacher_name,
      sub.score, sub.total, sub.percent, sub.submitted_at
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    JOIN assignments a ON a.group_id = g.id
    JOIN users u ON u.id = a.teacher_id
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE gm.student_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id, req.user.id);

  res.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      groupName: a.group_name,
      teacherName: a.teacher_name,
      title: a.title,
      subjectId: a.subject_id,
      topicId: a.topic_id,
      dueDate: a.due_date,
      createdAt: a.created_at,
      submission: a.submitted_at
        ? {
            score: a.score,
            total: a.total,
            percent: a.percent,
            submittedAt: a.submitted_at,
          }
        : null,
    })),
  });
});

router.get("/submissions", requireAuth, (req, res) => {
  const submissions = db.prepare(`
    SELECT es.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar, u.avatar_url as student_avatar_url
    FROM extended_submissions es
    JOIN users u ON u.id = es.user_id
    LEFT JOIN group_members gm ON gm.student_id = es.user_id
    LEFT JOIN groups g ON g.id = gm.group_id
    WHERE g.teacher_id = ? OR es.group_id IN (SELECT id FROM groups WHERE teacher_id = ?)
    ORDER BY es.created_at DESC
  `).all(req.user.id, req.user.id);

  // Deduplicate by submission id
  const uniqueMap = new Map();
  submissions.forEach((s) => {
    if (!uniqueMap.has(s.id)) {
      let questionInfo = null;
      let contextTitle = "Пробный экзамен / Задание";

      if (s.context_type === "mock_exam") {
        const attempt = db.prepare(`SELECT mock_exam_id FROM mock_exam_attempts WHERE id = ?`).get(Number(s.context_id) || s.context_id);
        if (attempt) {
          const exam = db.prepare(`SELECT title, questions_json FROM mock_exams WHERE id = ?`).get(attempt.mock_exam_id);
          if (exam) {
            contextTitle = exam.title;
            try {
              const questions = JSON.parse(exam.questions_json);
              const q = questions.find((qItem) => String(qItem.id) === String(s.question_id));
              if (q) {
                questionInfo = {
                  id: q.id,
                  question: q.question,
                  maxPoints: q.maxPoints || q.points || 3,
                  solutionKey: q.solutionKey || q.explanation || "",
                  criteria: q.criteria || [],
                };
              }
            } catch {
              questionInfo = null;
            }
          }
        }
      }

      uniqueMap.set(s.id, {
        id: s.id,
        userId: s.user_id,
        studentName: s.student_name,
        studentEmail: s.student_email,
        studentAvatar: s.student_avatar || s.student_avatar_url,
        contextType: s.context_type,
        contextId: s.context_id,
        contextTitle,
        questionId: s.question_id,
        questionInfo,
        studentAnswer: s.student_answer,
        selfScore: s.self_score,
        selfBreakdown: s.self_breakdown_json ? JSON.parse(s.self_breakdown_json) : null,
        teacherId: s.teacher_id,
        teacherScore: s.teacher_score,
        teacherBreakdown: s.teacher_breakdown_json ? JSON.parse(s.teacher_breakdown_json) : null,
        teacherComment: s.teacher_comment,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      });
    }
  });

  res.json({ submissions: Array.from(uniqueMap.values()) });
});

router.post("/submissions/:id/review", requireAuth, (req, res) => {
  const { teacherScore, teacherComment, teacherBreakdown = {} } = req.body || {};

  const sub = db.prepare(`SELECT * FROM extended_submissions WHERE id = ?`).get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: "Ответ не найден" });
  }

  // Check that current user is teacher of student's group
  const isTeacher = db.prepare(`
    SELECT g.id FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE g.teacher_id = ? AND gm.student_id = ?
  `).get(req.user.id, sub.user_id);

  if (!isTeacher && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Доступ запрещен" });
  }

  const finalScore = Math.max(0, Number(teacherScore) || 0);

  db.prepare(`
    UPDATE extended_submissions
    SET teacher_id = ?, teacher_score = ?, teacher_comment = ?, teacher_breakdown_json = ?, status = 'reviewed_by_teacher', updated_at = datetime('now')
    WHERE id = ?
  `).run(
    req.user.id,
    finalScore,
    String(teacherComment || "").trim(),
    JSON.stringify(teacherBreakdown),
    sub.id
  );

  // Recalculate mock exam score if applicable
  if (sub.context_type === "mock_exam") {
    const attempt = db.prepare(`SELECT * FROM mock_exam_attempts WHERE id = ?`).get(sub.context_id);
    if (attempt) {
      const exam = db.prepare(`SELECT * FROM mock_exams WHERE id = ?`).get(attempt.mock_exam_id);
      if (exam) {
        // Calculate difference between old self_score and teacher_score
        const scoreDiff = finalScore - (sub.self_score || 0);
        const newPrimary = Math.max(0, attempt.primary_score + scoreDiff);

        import("../utils/score-converter.js").then(({ convertScore }) => {
          const newSecondary = convertScore({
            examType: exam.exam_type,
            primaryScore: newPrimary,
            maxPrimaryScore: attempt.max_primary_score,
            conversionTable: exam.conversion_table_json,
          });

          db.prepare(`UPDATE mock_exam_attempts SET primary_score = ?, secondary_score = ? WHERE id = ?`).run(
            newPrimary,
            newSecondary,
            attempt.id
          );
        });
      }
    }
  }

  // Send notification to student
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (?, 'teacher_review', 'Учитель проверил вашу работу', ?, '#profile')
  `).run(
    sub.user_id,
    `Учитель ${req.user.name} проверил ваше задание. Оценка: ${finalScore} б. ${teacherComment ? `Комментарий: "${teacherComment}"` : ""}`
  );

  res.json({ success: true, teacherScore: finalScore });
});

export default router;
