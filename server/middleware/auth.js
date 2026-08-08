import { config } from "../config.js";
import { db } from "../db.js";

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status || "active",
    avatar: row.avatar_url || row.avatar || "",
    isPremium: !!row.is_premium,
    premiumUntil: row.premium_until || null,
    vkId: row.vk_id || null,
    yandexId: row.yandex_id || null,
    avatarUrl: row.avatar_url || row.avatar || "",
    examType: row.exam_type || "EGE",
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at || null,
  };
}

export function getUserByToken(token) {
  if (!token) return null;
  const row = db
    .prepare(`SELECT s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`)
    .get(token);
  if (!row) return null;
  if (row.status === "disabled") {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return serializeUser(row);
}

export function optionalAuth(req, _res, next) {
  const tokenFromHeader = req.headers.authorization
    ? (req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : req.headers.authorization)
    : null;
  const token = req.cookies?.[config.cookieName] || tokenFromHeader;
  req.user = getUserByToken(token);
  next();
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    if (req.user.status === "disabled") {
      return res.status(403).json({ error: "Ваш аккаунт отключен администратором" });
    }
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Доступ запрещен: требуется роль Администратора" });
    }
    next();
  });
}

export function requireTeacher(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN" && req.user.role !== "Учитель") {
      return res.status(403).json({ error: "Доступ запрещен: требуется роль Учителя" });
    }
    next();
  });
}

