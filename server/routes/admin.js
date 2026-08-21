import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { requireAdmin, serializeUser } from "../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

function logAdminActivity(adminId, action, details, ip) {
  try {
    db.prepare("INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)").run(
      adminId,
      action,
      JSON.stringify(details || {}),
      ip || "127.0.0.1"
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

router.get("/dashboard", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get()?.count || 0;
  const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get()?.count || 0;
  const newUsers =
    db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')").get()?.count || 0;
  const teachersCount =
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('TEACHER', 'Учитель')").get()?.count || 0;
  const subscriptionsCount =
    db.prepare("SELECT COUNT(*) as count FROM payments WHERE status = 'paid'").get()?.count || 0;
  const revenue = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status = 'paid'").get()?.total || 0;
  const testsCount = db.prepare("SELECT COUNT(*) as count FROM questions").get()?.count || 0;
  const theoryCount = db.prepare("SELECT COUNT(*) as count FROM topics").get()?.count || 0;

  const recentRegistrations = db
    .prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5")
    .all();
  const recentLogins = db
    .prepare(
      "SELECT id, name, email, role, last_login_at FROM users WHERE last_login_at IS NOT NULL ORDER BY last_login_at DESC LIMIT 5"
    )
    .all();

  const activityGraph = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = new Date(Date.now() - i * 864e5).toISOString().split("T")[0];
    const regCount =
      db
        .prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?")
        .get(dateStr)?.count || 0;
    const testCount =
      db
        .prepare("SELECT COUNT(*) as count FROM attempts WHERE date(created_at) = ?")
        .get(dateStr)?.count || 0;
    activityGraph.push({ date: dateStr, registrations: regCount, testsSolved: testCount });
  }

  res.json({
    kpis: {
      totalUsers,
      activeUsers,
      newUsers,
      subscriptionsCount,
      revenue,
      teachersCount,
      testsCount,
      theoryCount,
    },
    recentRegistrations,
    recentLogins,
    activityGraph,
  });
});

router.get("/users", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  let query = "SELECT id, email, name, role, status, is_premium, exam_type, created_at, last_login_at FROM users";
  let params = [];

  if (q) {
    query += " WHERE LOWER(email) LIKE ? OR LOWER(name) LIKE ?";
    params.push(`%${q}%`, `%${q}%`);
  }

  query += " ORDER BY created_at DESC";
  const users = db.prepare(query).all(...params);
  res.json({ users });
});

router.patch("/users/:id", (req, res) => {
  const userId = Number(req.params.id);
  const { role, status, isPremium, password } = req.body || {};

  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!existing) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  let updates = [];
  let params = [];

  if (role) {
    updates.push("role = ?");
    params.push(role);
  }
  if (status) {
    updates.push("status = ?");
    params.push(status);
  }
  if (typeof isPremium === "boolean") {
    updates.push("is_premium = ?");
    params.push(isPremium ? 1 : 0);
  }
  if (password && password.length >= 6) {
    updates.push("password_hash = ?");
    params.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }

  logAdminActivity(req.user.id, "UPDATE_USER", { userId, updates }, req.ip);

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  res.json({ user: serializeUser(updated) });
});

router.get("/teachers", (req, res) => {
  const teachers = db
    .prepare("SELECT id, email, name, role, status, created_at, last_login_at FROM users WHERE role IN ('TEACHER', 'Учитель') ORDER BY created_at DESC")
    .all();

  const formatted = teachers.map((t) => ({
    ...t,
    teacherId: `TCH-${String(t.id).padStart(4, "0")}`,
  }));

  res.json({ teachers: formatted });
});

router.post("/teachers", (req, res) => {
  const name = String(req.body?.name || "").trim() || "Преподаватель";
  const customEmail = String(req.body?.email || "").trim().toLowerCase();

  const uid = randomBytes(3).toString("hex").toUpperCase();
  const autoEmail = customEmail || `teacher_${uid.toLowerCase()}@examhub.ru`;
  const autoPassword = `TchP@ss_${randomBytes(4).toString("hex")}`;
  const teacherId = `TCH-${uid}`;

  if (db.prepare("SELECT id FROM users WHERE email = ?").get(autoEmail)) {
    return res.status(409).json({ error: "Пользователь с таким email уже существует" });
  }

  const passwordHash = bcrypt.hashSync(autoPassword, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, name, role, status) VALUES (?, ?, ?, 'TEACHER', 'active')")
    .run(autoEmail, passwordHash, name);

  logAdminActivity(
    req.user.id,
    "CREATE_TEACHER",
    { teacherId, email: autoEmail, id: info.lastInsertRowid },
    req.ip
  );

  res.status(201).json({
    teacher: {
      id: Number(info.lastInsertRowid),
      teacherId,
      email: autoEmail,
      password: autoPassword,
      name,
      role: "TEACHER",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  });
});

router.delete("/teachers/:id", (req, res) => {
  const teacherId = Number(req.params.id);
  db.prepare("DELETE FROM users WHERE id = ? AND role IN ('TEACHER', 'Учитель')").run(teacherId);
  logAdminActivity(req.user.id, "DELETE_TEACHER", { teacherId }, req.ip);
  res.json({ ok: true });
});

router.get("/subscriptions", (req, res) => {
  const payments = db
    .prepare(
      `SELECT p.*, u.name as user_name, u.email as user_email 
       FROM payments p 
       JOIN users u ON u.id = p.user_id 
       ORDER BY p.created_at DESC`
    )
    .all();

  const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status = 'paid'").get()?.total || 0;
  const activeCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_premium = 1").get()?.count || 0;

  res.json({ payments, totalRevenue, activeCount });
});

router.get("/theory", (req, res) => {
  const items = db
    .prepare(
      `SELECT t.*, s.title as subject_title 
       FROM topics t 
       LEFT JOIN subjects s ON s.id = t.subject_id 
       ORDER BY t.sort_order ASC`
    )
    .all();
  res.json({ theory: items });
});

router.post("/theory", (req, res) => {
  const { subjectId, title, theory, isPremium, duration } = req.body || {};
  if (!subjectId || !title) {
    return res.status(400).json({ error: "Необходимы subjectId и title" });
  }

  const topicId = `top_${Date.now()}_${randomBytes(2).toString("hex")}`;
  db.prepare(
    "INSERT INTO topics (id, subject_id, title, is_premium, duration, theory) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(topicId, subjectId, title, isPremium ? 1 : 0, duration || "45 мин", theory || "");

  logAdminActivity(req.user.id, "CREATE_THEORY", { topicId, title }, req.ip);
  res.status(201).json({ id: topicId, ok: true });
});

router.delete("/theory/:id", (req, res) => {
  db.prepare("DELETE FROM topics WHERE id = ?").run(req.params.id);
  logAdminActivity(req.user.id, "DELETE_THEORY", { id: req.params.id }, req.ip);
  res.json({ ok: true });
});

router.get("/tests", (req, res) => {
  const questions = db
    .prepare(
      `SELECT q.*, t.subject_id, t.title as topic_title, s.title as subject_title 
       FROM questions q 
       JOIN topics t ON t.id = q.topic_id 
       JOIN subjects s ON s.id = t.subject_id 
       ORDER BY q.task_number ASC, q.sort_order ASC`
    )
    .all();
  res.json({ questions });
});

router.post("/tests/questions", (req, res) => {
  let { subjectId, topicId, taskNumber, task_number, type, question, options, correctIndex, correctAnswer, explanation, points } = req.body || {};
  if (!question || (!topicId && !subjectId)) {
    return res.status(400).json({ error: "Укажите предмет/тему и текст вопроса" });
  }

  let finalTopicId = topicId;

  if (finalTopicId) {
    const existingTopic = db.prepare("SELECT id FROM topics WHERE id = ?").get(finalTopicId);
    if (!existingTopic && subjectId) {
      finalTopicId = null;
    }
  }

  if (!finalTopicId && subjectId) {
    const firstTopic = db.prepare("SELECT id FROM topics WHERE subject_id = ? ORDER BY sort_order ASC").get(subjectId);
    if (firstTopic) {
      finalTopicId = firstTopic.id;
    } else {
      finalTopicId = `top_${subjectId}_gen_${Date.now()}`;
      db.prepare(
        "INSERT INTO topics (id, subject_id, title, is_premium, duration, theory) VALUES (?, ?, ?, 0, '45 мин', '')"
      ).run(finalTopicId, subjectId, "Общие задания");
    }
  }

  if (!finalTopicId) {
    return res.status(400).json({ error: "Не найдена тема для указанного вопроса" });
  }

  const qTaskNum = Number(taskNumber ?? task_number ?? 0);
  const qId = `q_${Date.now()}_${randomBytes(2).toString("hex")}`;

  db.prepare(
    `INSERT INTO questions (id, topic_id, type, question, options_json, correct_index, correct_answer_json, explanation, points, task_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    qId,
    finalTopicId,
    type || "single",
    question,
    JSON.stringify(options || []),
    typeof correctIndex === "number" ? correctIndex : 0,
    JSON.stringify(correctAnswer || null),
    explanation || "",
    points || 1,
    qTaskNum
  );

  logAdminActivity(req.user.id, "CREATE_QUESTION", { qId, topicId: finalTopicId, taskNumber: qTaskNum }, req.ip);

  res.status(201).json({ id: qId, ok: true });
});

router.delete("/tests/questions/:id", (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  logAdminActivity(req.user.id, "DELETE_QUESTION", { id: req.params.id }, req.ip);
  res.json({ ok: true });
});

router.get("/videos", (req, res) => {
  const videos = db
    .prepare(
      `SELECT v.*, t.title as topic_title, s.title as subject_title 
       FROM videos v 
       JOIN topics t ON t.id = v.topic_id 
       JOIN subjects s ON s.id = t.subject_id`
    )
    .all();
  res.json({ videos });
});

router.post("/videos", (req, res) => {
  const { topicId, subjectId, title, instructor, duration, youtubeId, thumbnail, description } = req.body || {};
  if (!title || (!topicId && !subjectId)) {
    return res.status(400).json({ error: "Укажите тему и название видео" });
  }

  let finalTopicId = topicId;
  if (!finalTopicId && subjectId) {
    const firstTopic = db.prepare("SELECT id FROM topics WHERE subject_id = ?").get(subjectId);
    if (firstTopic) {
      finalTopicId = firstTopic.id;
    } else {
      finalTopicId = `top_${subjectId}_gen_${Date.now()}`;
      db.prepare(
        "INSERT INTO topics (id, subject_id, title, is_premium, duration, theory) VALUES (?, ?, ?, 0, '45 мин', '')"
      ).run(finalTopicId, subjectId, "Общая тема");
    }
  }

  const videoId = `vid_${Date.now()}_${randomBytes(2).toString("hex")}`;
  db.prepare(
    `INSERT INTO videos (id, topic_id, title, instructor, duration, youtube_id, views, thumbnail, description)
     VALUES (?, ?, ?, ?, ?, ?, '0', ?, ?)`
  ).run(
    videoId,
    finalTopicId,
    title,
    instructor || "Преподаватель ExamHub",
    duration || "20:00",
    youtubeId || "dQw4w9WgXcQ",
    thumbnail || "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=400",
    description || ""
  );

  logAdminActivity(req.user.id, "CREATE_VIDEO", { videoId, title }, req.ip);
  res.status(201).json({ id: videoId, ok: true });
});

router.delete("/videos/:id", (req, res) => {
  db.prepare("DELETE FROM videos WHERE id = ?").run(req.params.id);
  logAdminActivity(req.user.id, "DELETE_VIDEO", { id: req.params.id }, req.ip);
  res.json({ ok: true });
});

router.post("/subjects", (req, res) => {
  const { id, title, icon, color, colorHex, bgGradient } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: "Укажите название предмета" });
  }

  const subId = id || `sub_${Date.now()}`;
  db.prepare(
    `INSERT INTO subjects (id, title, icon, color, color_hex, bg_gradient, is_active, is_other)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`
  ).run(
    subId,
    title,
    icon || "📚",
    color || "blue",
    colorHex || "#3b82f6",
    bgGradient || "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
  );

  logAdminActivity(req.user.id, "CREATE_SUBJECT", { subId, title }, req.ip);
  res.status(201).json({ id: subId, ok: true });
});

router.delete("/subjects/:id", (req, res) => {
  db.prepare("DELETE FROM subjects WHERE id = ?").run(req.params.id);
  logAdminActivity(req.user.id, "DELETE_SUBJECT", { id: req.params.id }, req.ip);
  res.json({ ok: true });
});

router.get("/analytics", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get()?.count || 0;
  const attempts = db.prepare("SELECT score, total, percent FROM attempts").all();
  const totalSolved = attempts.reduce((acc, a) => acc + (a.total || 0), 0);
  const avgPercent = attempts.length
    ? Math.round(attempts.reduce((acc, a) => acc + a.percent, 0) / attempts.length)
    : 0;

  const popularSubjects = db
    .prepare(
      `SELECT s.title, COUNT(a.id) as attempts_count 
       FROM attempts a 
       JOIN topics t ON t.id = a.topic_id 
       JOIN subjects s ON s.id = t.subject_id 
       GROUP BY s.id ORDER BY attempts_count DESC LIMIT 5`
    )
    .all();

  const monthlyStats = [
    { month: "Янв", users: 120, revenue: 14900 },
    { month: "Фев", users: 180, revenue: 23800 },
    { month: "Мар", users: 240, revenue: 31200 },
    { month: "Апр", users: 310, revenue: 42900 },
    { month: "Май", users: 420, revenue: 58500 },
    { month: "Июн", users: 510, revenue: 74000 },
    { month: "Июл", users: totalUsers, revenue: db.prepare("SELECT SUM(amount) as total FROM payments").get()?.total || 89000 },
  ];

  res.json({
    totalUsers,
    totalSolved,
    avgPercent,
    popularSubjects,
    monthlyStats,
  });
});

router.get("/analytics/export", (req, res) => {
  const format = String(req.query.format || "csv").toLowerCase();
  const users = db.prepare("SELECT id, name, email, role, status, exam_type, created_at, last_login_at FROM users").all();

  if (format === "excel" || format === "xlsx") {
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Пользователи">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">ID</Data></Cell>
    <Cell><Data ss:Type="String">Имя</Data></Cell>
    <Cell><Data ss:Type="String">Email</Data></Cell>
    <Cell><Data ss:Type="String">Роль</Data></Cell>
    <Cell><Data ss:Type="String">Статус</Data></Cell>
    <Cell><Data ss:Type="String">Экзамен</Data></Cell>
    <Cell><Data ss:Type="String">Дата регистрации</Data></Cell>
   </Row>`;

    users.forEach((u) => {
      xml += `
   <Row>
    <Cell><Data ss:Type="Number">${u.id}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(u.name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(u.email)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(u.role)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(u.status)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(u.exam_type)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(u.created_at)}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", 'attachment; filename="users_analytics.xls"');
    return res.send(xml);
  }

  let csv = "ID,Name,Email,Role,Status,ExamType,CreatedAt,LastLogin\n";
  users.forEach((u) => {
    csv += `"${u.id}","${escapeCsv(u.name)}","${escapeCsv(u.email)}","${u.role}","${u.status}","${u.exam_type}","${u.created_at}","${u.last_login_at || ""}"\n`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="users_analytics.csv"');
  res.send("\uFEFF" + csv);
});

function escapeXml(str) {
  return String(str || "").replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
    }
  });
}

function escapeCsv(str) {
  return String(str || "").replace(/"/g, '""');
}

router.get("/support/tickets", (req, res) => {
  const tickets = db.prepare("SELECT * FROM support_tickets ORDER BY id DESC").all();
  res.json({ tickets });
});

router.patch("/support/tickets/:id/status", (req, res) => {
  const ticketId = Number(req.params.id);
  const status = String(req.body?.status || "resolved");
  db.prepare("UPDATE support_tickets SET status = ? WHERE id = ?").run(status, ticketId);
  res.json({ ok: true });
});

router.get("/site/settings", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
  const settings = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json({ settings });
});

router.put("/site/settings", (req, res) => {
  const settings = req.body?.settings || {};
  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );

  db.exec("BEGIN TRANSACTION;");
  try {
    for (const [key, val] of Object.entries(settings)) {
      upsert.run(key, String(val || "").trim());
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  res.json({ ok: true, settings });
});

export default router;
