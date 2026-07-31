import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { config } from "../config.js";
import { serializeUser, optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 864e5).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    maxAge: config.sessionTtlDays * 864e5,
    path: "/",
  });
}

function clearSession(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
  });
}

router.get("/me", optionalAuth, (req, res) => {
  res.json({ user: req.user || null });
});

router.post("/register", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  let name = String(req.body?.name || "").trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Некорректный email" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль должен быть не короче 6 символов" });
  }
  if (!name) name = email.split("@")[0];

  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "Пользователь с таким email уже существует" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email, passwordHash, name);

  createSession(res, Number(info.lastInsertRowid));
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ user: serializeUser(user) });
});

router.post("/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  createSession(res, user.id);
  res.json({ user: serializeUser(user) });
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.[config.cookieName];
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  clearSession(res);
  res.json({ ok: true });
});

router.get("/premium", requireAuth, (req, res) => {
  res.json({ isPremium: req.user.isPremium, premiumUntil: req.user.premiumUntil });
});

export default router;
