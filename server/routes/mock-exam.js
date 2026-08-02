import { Router } from "express";
import { db } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { convertScore } from "../utils/score-converter.js";

const router = Router();

router.get("/", optionalAuth, (req, res) => {
  const { subjectId } = req.query;
  let rows;
  if (subjectId) {
    rows = db
      .prepare(
        `SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, created_at
         FROM mock_exams WHERE subject_id = ? ORDER BY id ASC`
      )
      .all(String(subjectId));
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
    points: q.points || 1,
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

  questions.forEach((q, idx) => {
    const qPoints = q.points || 1;
    maxPrimaryScore += qPoints;

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
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation || "",
      points: q.points || 1,
    });
  });

  const secondaryScore = convertScore({
    examType: exam.exam_type,
    primaryScore,
    maxPrimaryScore,
    conversionTable: exam.conversion_table_json,
  });

  const timeSpent = Math.max(0, Number(timeSpentSeconds) || 0);

  if (req.user) {
    db.prepare(
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
  }

  res.json({
    ok: true,
    primaryScore,
    maxPrimaryScore,
    secondaryScore,
    examType: exam.exam_type,
    timeSpentSeconds: timeSpent,
    breakdown,
  });
});

export default router;
