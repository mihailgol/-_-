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

  const subjectMap = {
    bio: "biology",
    rus: "russian",
    chem: "chemistry",
    inf: "informatics",
    his: "history",
    soc: "social",
  };

  const finalSubjectId = subjectMap[subjectId] || subjectId;

  // Check if subject exists in subjects table, auto-create if missing to preserve DB integrity
  let sub = db.prepare("SELECT id FROM subjects WHERE id = ?").get(finalSubjectId);
  if (!sub) {
    try {
      db.prepare("INSERT OR IGNORE INTO subjects (id, title, icon, color) VALUES (?, ?, '📚', '#6366f1')").run(
        finalSubjectId,
        title || finalSubjectId
      );
    } catch (e) {
      console.error("Failed to auto-create subject:", e);
    }
  }

  const topicId = `top_${Date.now()}_${randomBytes(2).toString("hex")}`;

  try {
    db.prepare(
      "INSERT INTO topics (id, subject_id, title, is_premium, duration, theory) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, finalSubjectId, title, isPremium ? 1 : 0, duration || "45 мин", theory || "");

    logAdminActivity(req.user.id, "CREATE_THEORY", { topicId, title }, req.ip);
    res.status(201).json({ id: topicId, ok: true });
  } catch (err) {
    console.error("Error creating theory topic:", err);
    res.status(400).json({ error: err.message || "Не удалось сохранить теорию в БД" });
  }
});

router.delete("/theory/:id", (req, res) => {
  db.prepare("DELETE FROM topics WHERE id = ?").run(req.params.id);
  logAdminActivity(req.user.id, "DELETE_THEORY", { id: req.params.id }, req.ip);
  res.json({ ok: true });
});

function getAdminQuestions(queryObj = {}) {
  const { subjectId, subject, taskNumber, task_number, q, type, examType, exam_type } = queryObj;
  let sql = `
    SELECT q.*, t.subject_id, t.title as topic_title, s.title as subject_title 
    FROM questions q 
    JOIN topics t ON t.id = q.topic_id 
    JOIN subjects s ON s.id = t.subject_id 
    WHERE 1=1
  `;
  const params = [];

  const subj = subjectId || subject;
  if (subj && String(subj).trim() !== "" && subj !== "all") {
    sql += ` AND t.subject_id = ?`;
    params.push(String(subj).trim());
  }

  const taskNum = taskNumber ?? task_number;
  if (taskNum !== undefined && taskNum !== null && String(taskNum).trim() !== "" && taskNum !== "all") {
    sql += ` AND q.task_number = ?`;
    params.push(Number(taskNum));
  }

  if (type && String(type).trim() !== "" && type !== "all") {
    sql += ` AND q.type = ?`;
    params.push(String(type).trim());
  }

  const targetExam = examType || exam_type;
  if (targetExam && String(targetExam).trim() !== "" && targetExam !== "all") {
    sql += ` AND q.exam_type = ?`;
    params.push(String(targetExam).trim().toUpperCase());
  }

  sql += ` ORDER BY q.task_number ASC, q.sort_order ASC, q.id ASC`;

  let rows = db.prepare(sql).all(...params);

  if (q && String(q).trim() !== "") {
    const searchTerms = String(q).trim().toLowerCase().split(/\s+/).filter(Boolean);
    rows = rows.filter((item) => {
      const qText = String(item.question || "").toLowerCase();
      const topicText = String(item.topic_title || "").toLowerCase();
      const subjText = String(item.subject_title || "").toLowerCase();
      const idText = String(item.id || "").toLowerCase();
      return searchTerms.every(
        (term) =>
          qText.includes(term) ||
          topicText.includes(term) ||
          subjText.includes(term) ||
          idText.includes(term)
      );
    });
  }

  return rows;
}

router.get("/tests/questions", (req, res) => {
  try {
    const questions = getAdminQuestions(req.query);
    res.json({ questions });
  } catch (err) {
    console.error("Error fetching admin questions:", err);
    res.status(500).json({ error: "Не удалось получить список вопросов" });
  }
});

router.get("/tests", (req, res) => {
  try {
    const questions = getAdminQuestions(req.query);
    res.json({ questions });
  } catch (err) {
    console.error("Error fetching admin questions:", err);
    res.status(500).json({ error: "Не удалось получить список вопросов" });
  }
});

router.get("/tests/questions/:id", (req, res) => {
  try {
    const question = db
      .prepare(
        `SELECT q.*, t.subject_id, t.title as topic_title, s.title as subject_title 
         FROM questions q 
         JOIN topics t ON t.id = q.topic_id 
         JOIN subjects s ON s.id = t.subject_id 
         WHERE q.id = ?`
      )
      .get(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Вопрос не найден" });
    }
    res.json({ question });
  } catch (err) {
    console.error("Error fetching question by id:", err);
    res.status(500).json({ error: "Не удалось получить вопрос" });
  }
});

router.post("/tests/questions", (req, res) => {
  let {
    subjectId,
    subject_id,
    topicId,
    topic_id,
    taskNumber,
    task_number,
    type,
    question,
    options,
    options_json,
    correctIndex,
    correct_index,
    correctAnswer,
    solutionKey,
    maxPoints,
    criteria,
    criteria_json,
    explanation,
    points,
    examType,
    exam_type,
  } = req.body || {};

  const targetSubjectId = subjectId || subject_id;
  let finalTopicId = topicId || topic_id;
  const targetExamType = String(examType || exam_type || "EGE").toUpperCase();

  if (!question || (!finalTopicId && !targetSubjectId)) {
    return res.status(400).json({ error: "Укажите предмет/тему и текст вопроса" });
  }

  if (finalTopicId) {
    const existingTopic = db.prepare("SELECT id FROM topics WHERE id = ?").get(finalTopicId);
    if (!existingTopic && targetSubjectId) {
      finalTopicId = null;
    }
  }

  if (!finalTopicId && targetSubjectId) {
    const firstTopic = db
      .prepare("SELECT id FROM topics WHERE subject_id = ? ORDER BY sort_order ASC")
      .get(targetSubjectId);
    if (firstTopic) {
      finalTopicId = firstTopic.id;
    } else {
      finalTopicId = `top_${targetSubjectId}_gen_${Date.now()}`;
      db.prepare(
        "INSERT INTO topics (id, subject_id, title, is_premium, duration, theory) VALUES (?, ?, ?, 0, '45 мин', '')"
      ).run(finalTopicId, targetSubjectId, "Общие задания");
    }
  }

  if (!finalTopicId) {
    return res.status(400).json({ error: "Не найдена тема для указанного вопроса" });
  }

  const qTaskNum = Number(taskNumber ?? task_number ?? 0);
  const qId = `q_${Date.now()}_${randomBytes(2).toString("hex")}`;
  const finalPoints = type === "extended" ? Number(maxPoints || points || 3) : Number(points || 1);
  const finalCriteria = Array.isArray(criteria)
    ? criteria
    : typeof criteria_json === "string"
      ? JSON.parse(criteria_json || "[]")
      : [];
  const finalCorrectAnswer =
    type === "extended"
      ? { solutionKey: solutionKey || "", maxPoints: finalPoints, criteria: finalCriteria }
      : correctAnswer || null;

  let optionsArr = [];
  if (Array.isArray(options)) {
    optionsArr = options;
  } else if (typeof options_json === "string") {
    try {
      optionsArr = JSON.parse(options_json);
    } catch {
      optionsArr = [];
    }
  }

  const finalCorrectIndex = typeof correctIndex === "number" ? correctIndex : (typeof correct_index === "number" ? correct_index : 0);

  db.prepare(
    `INSERT INTO questions (id, topic_id, type, question, options_json, correct_index, correct_answer_json, explanation, points, task_number, solution_key, criteria_json, max_points, exam_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    qId,
    finalTopicId,
    type || "single",
    question,
    JSON.stringify(optionsArr),
    finalCorrectIndex,
    JSON.stringify(finalCorrectAnswer),
    explanation || "",
    finalPoints,
    qTaskNum,
    solutionKey || "",
    JSON.stringify(finalCriteria),
    finalPoints,
    targetExamType
  );

  logAdminActivity(req.user.id, "CREATE_QUESTION", { qId, topicId: finalTopicId, taskNumber: qTaskNum, examType: targetExamType }, req.ip);

  res.status(201).json({ id: qId, ok: true });
});

router.patch("/tests/questions/:id", (req, res) => {
  const qId = req.params.id;
  const existing = db.prepare("SELECT * FROM questions WHERE id = ?").get(qId);
  if (!existing) {
    return res.status(404).json({ error: "Вопрос не найден" });
  }

  const body = req.body || {};
  const {
    question,
    taskNumber,
    task_number,
    type,
    options,
    options_json,
    correctIndex,
    correct_index,
    solutionKey,
    solution_key,
    maxPoints,
    max_points,
    criteria,
    criteria_json,
    explanation,
    points,
    correctAnswer,
    correct_answer_json,
    topicId,
    topic_id,
    subjectId,
    subject_id,
    examType,
    exam_type,
  } = body;

  const updatedQuestion = question !== undefined ? String(question) : existing.question;
  const updatedType = type !== undefined ? String(type) : existing.type;
  const updatedTaskNumber =
    taskNumber !== undefined
      ? Number(taskNumber)
      : task_number !== undefined
        ? Number(task_number)
        : existing.task_number;
  const updatedExamType =
    examType !== undefined
      ? String(examType).toUpperCase()
      : exam_type !== undefined
        ? String(exam_type).toUpperCase()
        : existing.exam_type || "EGE";

  let updatedOptionsJson = existing.options_json;
  if (options !== undefined) {
    updatedOptionsJson = JSON.stringify(Array.isArray(options) ? options : []);
  } else if (options_json !== undefined) {
    updatedOptionsJson = typeof options_json === "string" ? options_json : JSON.stringify(options_json);
  }

  const updatedCorrectIndex =
    correctIndex !== undefined
      ? Number(correctIndex)
      : correct_index !== undefined
        ? Number(correct_index)
        : existing.correct_index;

  const updatedExplanation = explanation !== undefined ? String(explanation) : existing.explanation;

  const updatedPoints =
    points !== undefined
      ? Number(points)
      : maxPoints !== undefined
        ? Number(maxPoints)
        : existing.points;
  const updatedMaxPoints =
    maxPoints !== undefined
      ? Number(maxPoints)
      : max_points !== undefined
        ? Number(max_points)
        : updatedType === "extended"
          ? updatedPoints
          : existing.max_points || 1;

  const updatedSolutionKey =
    solutionKey !== undefined
      ? String(solutionKey)
      : solution_key !== undefined
        ? String(solution_key)
        : existing.solution_key || "";

  let updatedCriteriaJson = existing.criteria_json;
  if (criteria !== undefined) {
    updatedCriteriaJson = JSON.stringify(Array.isArray(criteria) ? criteria : []);
  } else if (criteria_json !== undefined) {
    updatedCriteriaJson = typeof criteria_json === "string" ? criteria_json : JSON.stringify(criteria_json);
  }

  let updatedCorrectAnswerJson = existing.correct_answer_json;
  if (correctAnswer !== undefined) {
    updatedCorrectAnswerJson = typeof correctAnswer === "string" ? correctAnswer : JSON.stringify(correctAnswer);
  } else if (correct_answer_json !== undefined) {
    updatedCorrectAnswerJson = typeof correct_answer_json === "string" ? correct_answer_json : JSON.stringify(correct_answer_json);
  } else if (updatedType === "extended") {
    let parsedCriteria = [];
    try {
      if (updatedCriteriaJson) parsedCriteria = JSON.parse(updatedCriteriaJson);
    } catch {
      parsedCriteria = [];
    }
    updatedCorrectAnswerJson = JSON.stringify({
      solutionKey: updatedSolutionKey,
      maxPoints: updatedMaxPoints,
      criteria: parsedCriteria,
    });
  }

  let updatedTopicId = existing.topic_id;
  const targetTopicId = topicId || topic_id;
  const targetSubjectId = subjectId || subject_id;

  if (targetTopicId) {
    const topicExists = db.prepare("SELECT id FROM topics WHERE id = ?").get(targetTopicId);
    if (topicExists) updatedTopicId = targetTopicId;
  } else if (targetSubjectId) {
    const firstTopic = db
      .prepare("SELECT id FROM topics WHERE subject_id = ? ORDER BY sort_order ASC")
      .get(targetSubjectId);
    if (firstTopic) {
      updatedTopicId = firstTopic.id;
    }
  }

  db.prepare(
    `UPDATE questions SET
      topic_id = ?,
      type = ?,
      question = ?,
      options_json = ?,
      correct_index = ?,
      explanation = ?,
      points = ?,
      correct_answer_json = ?,
      task_number = ?,
      solution_key = ?,
      criteria_json = ?,
      max_points = ?,
      exam_type = ?
    WHERE id = ?`
  ).run(
    updatedTopicId,
    updatedType,
    updatedQuestion,
    updatedOptionsJson,
    updatedCorrectIndex,
    updatedExplanation,
    updatedPoints,
    updatedCorrectAnswerJson,
    updatedTaskNumber,
    updatedSolutionKey,
    updatedCriteriaJson,
    updatedMaxPoints,
    updatedExamType,
    qId
  );

  logAdminActivity(req.user.id, "UPDATE_QUESTION", { qId, taskNumber: updatedTaskNumber }, req.ip);

  res.json({ ok: true, id: qId });
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
