import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function computeStats(userId) {
  const agg = db
    .prepare(
      `SELECT COUNT(*) AS tests_solved, AVG(percent) AS avg_percent, MAX(score) AS best_score
       FROM attempts WHERE user_id = ?`
    )
    .get(userId);
  const testsSolved = agg.tests_solved || 0;
  return {
    testsSolved,
    avgPercent: testsSolved ? Math.round(agg.avg_percent) : 0,
    bestScore: agg.best_score ?? 0,
  };
}

router.get("/stats", requireAuth, (req, res) => {
  res.json(computeStats(req.user.id));
});

router.get("/attempts", requireAuth, (req, res) => {
  const attempts = db
    .prepare(
      `SELECT id, topic_id, title, score, total, percent, created_at
       FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT 100`
    )
    .all(req.user.id);
  res.json({ attempts });
});

router.post("/attempt", requireAuth, (req, res) => {
  const { topicId, title, score, total } = req.body || {};
  if (!title || typeof score !== "number" || typeof total !== "number" || total <= 0) {
    return res.status(400).json({ error: "Некорректные данные попытки" });
  }
  const percent = Math.round((score / total) * 100);
  db.prepare(
    `INSERT INTO attempts (user_id, topic_id, title, score, total, percent) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, topicId || null, String(title).slice(0, 200), score, total, percent);

  res.status(201).json({ percent, ...computeStats(req.user.id) });
});

export default router;
