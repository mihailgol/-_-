import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const notifications = db
    .prepare(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY id DESC LIMIT 50`
    )
    .all(req.user.id);

  const unreadCount = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0`
    )
    .get(req.user.id).cnt;

  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
    unreadCount,
  });
});

router.post("/:id/read", requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(
    req.params.id,
    req.user.id
  );
  res.json({ success: true });
});

router.post("/read-all", requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.user.id);
  res.json({ success: true });
});

export default router;
