import { config } from "../config.js";
import { db } from "../db.js";

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar_url || row.avatar || "",
    isPremium: !!row.is_premium,
    premiumUntil: row.premium_until || null,
    vkId: row.vk_id || null,
    yandexId: row.yandex_id || null,
    avatarUrl: row.avatar_url || row.avatar || "",
  };
}

export function getUserByToken(token) {
  if (!token) return null;
  const row = db
    .prepare(`SELECT s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`)
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return serializeUser(row);
}

export function optionalAuth(req, _res, next) {
  req.user = getUserByToken(req.cookies?.[config.cookieName]);
  next();
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    next();
  });
}
