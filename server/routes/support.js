import { Router } from "express";
import { db } from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

router.post("/tickets", optionalAuth, (req, res) => {
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();
  const email = String(req.body?.email || req.user?.email || "guest@examhub.ru").trim();

  if (!subject || !message) {
    return res.status(400).json({ error: "Заполните тему и текст обращения" });
  }

  const userId = req.user ? req.user.id : null;

  const result = db.prepare(
    "INSERT INTO support_tickets (user_id, user_email, subject, message, status) VALUES (?, ?, ?, ?, 'open')"
  ).run(userId, email, subject, message);

  res.status(201).json({
    ok: true,
    ticketId: Number(result.lastInsertRowid),
    message: "Обращение успешно отправлено"
  });
});

export default router;
