import { Router } from "express";
import { db } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { convertScore } from "../utils/score-converter.js";

const router = Router();

router.get("/", optionalAuth, (req, res) => {
  const { subjectId, examType, exam_type } = req.query;
  const rawExamType = String(examType || exam_type || "").toUpperCase();
  const targetExamType = ["EGE", "OGE"].includes(rawExamType) ? rawExamType : null;

  let rows;
  if (subjectId && targetExamType) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE subject_id = ? AND exam_type = ? ORDER BY id ASC`
      )
      .all(String(subjectId), targetExamType);
  } else if (subjectId) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE subject_id = ? ORDER BY id ASC`
      )
      .all(String(subjectId));
  } else if (targetExamType) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE exam_type = ? ORDER BY id ASC`
      )
      .all(targetExamType);
  } else {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams ORDER BY id ASC`
      )
      .all();
  }

  const isUserPremium = Boolean(req.user && req.user.isPremium);

  const mockExams = rows.map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    title: r.title,
    examType: r.exam_type,
    durationMinutes: r.duration_minutes,
    totalQuestions: r.total_questions,
    isPremium: Boolean(r.is_premium),
    isLocked: Boolean(r.is_premium) && !isUserPremium,
    createdAt: r.created_at,
  }));

  res.json({ mockExams });
});

router.get("/attempts", requireAuth, (req, res) => {
  const attempts = db
    .prepare(
      `SELECT a.id, a.mock_exam_id, a.answers_json, a.primary_score, a.max_primary_score, a.secondary_score, a.time_spent_seconds, a.completed_at, m.title, m.exam_type, m.subject_id
       FROM mock_exam_attempts a
       JOIN mock_exams m ON m.id = a.mock_exam_id
       WHERE a.user_id = ?
       ORDER BY a.id DESC LIMIT 50`
    )
    .all(req.user.id);

  res.json({ attempts });
});

router.get("/:id", optionalAuth, (req, res) => {
  const exam = db
    .prepare(`SELECT * FROM mock_exams WHERE id = ?`)
    .get(req.params.id);

  if (!exam) {
    return res.status(404).json({ error: "Пробный экзамен не найден" });
  }

  const isUserPremium = Boolean(req.user && req.user.isPremium);
  if (exam.is_premium === 1 && !isUserPremium) {
    return res.status(403).json({ error: "Требуется Premium подписка" });
  }

  let questions;
  try {
    questions = JSON.parse(exam.questions_json);
  } catch {
    questions = [];
  }

  const sanitizedQuestions = questions.map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type || "single",
    options: q.options || [],
    points: q.maxPoints || q.points || 1,
    maxPoints: q.maxPoints || q.points || 1,
    solutionKey: q.solutionKey || "",
    criteria: q.criteria || [],
  }));

  res.json({
    id: exam.id,
    subjectId: exam.subject_id,
    title: exam.title,
    examType: exam.exam_type,
    durationMinutes: exam.duration_minutes,
    totalQuestions: exam.total_questions,
    isPremium: Boolean(exam.is_premium),
    questions: sanitizedQuestions,
  });
});

router.post("/:id/submit", optionalAuth, (req, res) => {
  const exam = db
    .prepare(`SELECT * FROM mock_exams WHERE id = ?`)
    .get(req.params.id);

  if (!exam) {
    return res.status(404).json({ error: "Пробный экзамен не найден" });
  }

  const isUserPremium = Boolean(req.user && req.user.isPremium);
  if (exam.is_premium === 1 && !isUserPremium) {
    return res.status(403).json({ error: "Требуется Premium подписка" });
  }

  const { answers = {}, timeSpentSeconds = 0 } = req.body || {};

  let questions;
  try {
    questions = JSON.parse(exam.questions_json);
  } catch {
    questions = [];
  }

  let primaryScore = 0;
  let maxPrimaryScore = 0;
  const breakdown = [];
  const extendedQuestions = [];

  questions.forEach((q, idx) => {
    const qPoints = q.maxPoints || q.points || 1;
    maxPrimaryScore += qPoints;

    if (q.type === "extended") {
      const studentAnswer = String(answers[q.id] || answers[idx] || "").trim();
      breakdown.push({
        questionId: q.id,
        question: q.question,
        type: "extended",
        studentAnswer,
        solutionKey: q.solutionKey || q.explanation || "",
        criteria: q.criteria || [],
        maxPoints: qPoints,
        earnedPoints: 0,
        explanation: q.explanation || "",
      });
      extendedQuestions.push({
        id: q.id,
        question: q.question,
        studentAnswer,
        solutionKey: q.solutionKey || q.explanation || "",
        criteria: q.criteria || [],
        maxPoints: qPoints,
      });
    } else {
      let selectedIndex = null;
      if (typeof answers === "object" && answers !== null) {
        if (answers[q.id] !== undefined) {
          selectedIndex = Number(answers[q.id]);
        } else if (answers[idx] !== undefined) {
          selectedIndex = Number(answers[idx]);
        }
      }

      const isCorrect = selectedIndex !== null && selectedIndex === q.correctIndex;
      if (isCorrect) {
        primaryScore += qPoints;
      }

      breakdown.push({
        questionId: q.id,
        question: q.question,
        type: q.type || "single",
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation || "",
        points: qPoints,
      });
    }
  });

  const secondaryScore = convertScore({
    examType: exam.exam_type,
    primaryScore,
    maxPrimaryScore,
    conversionTable: exam.conversion_table_json,
  });

  const timeSpent = Math.max(0, Number(timeSpentSeconds) || 0);

  let attemptId = null;
  if (req.user) {
    const info = db.prepare(
      `INSERT INTO mock_exam_attempts (user_id, mock_exam_id, answers_json, primary_score, max_primary_score, secondary_score, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id,
      exam.id,
      JSON.stringify(answers),
      primaryScore,
      maxPrimaryScore,
      secondaryScore,
      timeSpent
    );
    attemptId = Number(info.lastInsertRowid);
  }

  res.json({
    ok: true,
    attemptId,
    primaryScore,
    maxPrimaryScore,
    secondaryScore,
    examType: exam.exam_type,
    timeSpentSeconds: timeSpent,
    breakdown,
    hasExtendedQuestions: extendedQuestions.length > 0,
    extendedQuestions,
  });
});

router.post("/:id/self-assess", requireAuth, (req, res) => {
  const { attemptId, selfScores = {} } = req.body || {};

  const attempt = db
    .prepare(`SELECT * FROM mock_exam_attempts WHERE id = ? AND user_id = ?`)
    .get(attemptId, req.user.id);

  if (!attempt) {
    return res.status(404).json({ error: "Попытка прохождения не найдена" });
  }

  const exam = db
    .prepare(`SELECT * FROM mock_exams WHERE id = ?`)
    .get(attempt.mock_exam_id);

  if (!exam) {
    return res.status(404).json({ error: "Пробный экзамен не найден" });
  }

  let questions;
  try {
    questions = JSON.parse(exam.questions_json);
  } catch {
    questions = [];
  }

  let answers;
  try {
    answers = JSON.parse(attempt.answers_json);
  } catch {
    answers = {};
  }

  let extendedPrimaryEarned = 0;

  // Find student's group if any
  const member = db
    .prepare(`SELECT group_id FROM group_members WHERE student_id = ? ORDER BY joined_at DESC LIMIT 1`)
    .get(req.user.id);
  const groupId = member ? member.group_id : null;

  questions.forEach((q) => {
    if (q.type === "extended") {
      const qScoreObj = selfScores[q.id] || {};
      const score = Math.max(0, Math.min(q.maxPoints || q.points || 3, Number(qScoreObj.score) || 0));
      extendedPrimaryEarned += score;

      const studentAnswer = String(answers[q.id] || "").trim();

      // Check if extended_submission exists for this attempt/question
      const existing = db
        .prepare(
          `SELECT id FROM extended_submissions WHERE user_id = ? AND context_type = 'mock_exam' AND context_id = ? AND question_id = ?`
        )
        .get(req.user.id, String(attemptId), String(q.id));

      if (existing) {
        db.prepare(
          `UPDATE extended_submissions SET student_answer = ?, self_score = ?, self_breakdown_json = ?, status = 'self_assessed', updated_at = datetime('now') WHERE id = ?`
        ).run(studentAnswer, score, JSON.stringify(qScoreObj.breakdown || {}), existing.id);
      } else {
        db.prepare(
          `INSERT INTO extended_submissions (user_id, group_id, context_type, context_id, question_id, student_answer, self_score, self_breakdown_json, status)
           VALUES (?, ?, 'mock_exam', ?, ?, ?, ?, ?, 'self_assessed')`
        ).run(
          req.user.id,
          groupId,
          String(attemptId),
          String(q.id),
          studentAnswer,
          score,
          JSON.stringify(qScoreObj.breakdown || {})
        );
      }
    }
  });

  // Calculate new primary score (base primary score + extended score)
  // Base primary score is calculated from non-extended questions
  let nonExtendedPrimary = 0;
  questions.forEach((q, idx) => {
    if (q.type !== "extended") {
      let selectedIndex = null;
      if (answers[q.id] !== undefined) selectedIndex = Number(answers[q.id]);
      else if (answers[idx] !== undefined) selectedIndex = Number(answers[idx]);
      if (selectedIndex !== null && selectedIndex === q.correctIndex) {
        nonExtendedPrimary += q.points || 1;
      }
    }
  });

  const newPrimaryScore = nonExtendedPrimary + extendedPrimaryEarned;
  const newSecondaryScore = convertScore({
    examType: exam.exam_type,
    primaryScore: newPrimaryScore,
    maxPrimaryScore: attempt.max_primary_score,
    conversionTable: exam.conversion_table_json,
  });

  db.prepare(
    `UPDATE mock_exam_attempts SET primary_score = ?, secondary_score = ?, self_assessed = 1 WHERE id = ?`
  ).run(newPrimaryScore, newSecondaryScore, attempt.id);

  res.json({
    ok: true,
    primaryScore: newPrimaryScore,
    secondaryScore: newSecondaryScore,
    extendedPrimaryEarned,
  });
});

router.post("/", optionalAuth, (req, res) => {
  const { subjectId, title, examType, durationMinutes, totalQuestions, isPremium, questions } = req.body || {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Укажите название пробника" });
  }

  const subId = String(subjectId || "math");
  const rawExamType = String(examType || "EGE").toUpperCase();
  const type = ["EGE", "OGE"].includes(rawExamType) ? rawExamType : "EGE";
  const duration = Math.max(10, Math.min(360, Number(durationMinutes) || (type === "EGE" ? 235 : 210)));
  const count = Math.max(1, Math.min(50, Number(totalQuestions) || (Array.isArray(questions) ? questions.length : 5)));
  const isPrem = isPremium ? 1 : 0;

  let selectedQuestions = Array.isArray(questions) && questions.length > 0 ? questions : [];

  if (selectedQuestions.length === 0) {
    const dbQuestions = db
      .prepare(
        `SELECT q.id, q.question, q.type, q.options_json, q.correct_index, q.explanation, q.points
         FROM questions q
         JOIN topics t ON t.id = q.topic_id
         WHERE t.subject_id = ?
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(subId, count);

    selectedQuestions = dbQuestions.map((q, idx) => {
      let opts;
      try {
        opts = JSON.parse(q.options_json);
      } catch {
        opts = ["A", "B", "C", "D"];
      }
      return {
        id: `q_${q.id}_${idx + 1}`,
        question: q.question,
        type: q.type || "single",
        options: opts,
        correctIndex: typeof q.correct_index === "number" ? q.correct_index : 0,
        explanation: q.explanation || "",
        points: q.points || 1,
      };
    });
  }

  if (selectedQuestions.length === 0) {
    for (let i = 1; i <= count; i++) {
      selectedQuestions.push({
        id: `q_custom_${i}`,
        question: `Задание №${i} для пробника "${title.trim()}"`,
        type: "single",
        options: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
        correctIndex: 0,
        explanation: "Разбор решения для задания",
        points: 1,
      });
    }
  }

  const mockId = String(req.body.id || `mock_${subId}_${type.toLowerCase()}_${Date.now()}`);
  const conversionTableJson = JSON.stringify({});

  db.prepare(
    `INSERT INTO mock_exams (id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    mockId,
    subId,
    title.trim(),
    type,
    duration,
    selectedQuestions.length,
    isPrem,
    JSON.stringify(selectedQuestions),
    conversionTableJson
  );

  res.status(201).json({
    success: true,
    mockExam: {
      id: mockId,
      subjectId: subId,
      title: title.trim(),
      examType: type,
      durationMinutes: duration,
      totalQuestions: selectedQuestions.length,
      isPremium: Boolean(isPrem),
    },
  });
});

router.delete("/:id", optionalAuth, (req, res) => {
  const exam = db.prepare("SELECT id FROM mock_exams WHERE id = ?").get(req.params.id);
  if (!exam) {
    return res.status(404).json({ error: "Пробный экзамен не найден" });
  }

  db.prepare("DELETE FROM mock_exams WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
