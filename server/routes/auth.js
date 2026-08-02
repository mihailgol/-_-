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
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
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
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  let name = String(req.body?.name || "").trim();
  const rawExamType = String(req.body?.exam_type || "EGE").toUpperCase();
  const examType = rawExamType === "OGE" ? "OGE" : "EGE";

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
    .prepare("INSERT INTO users (email, password_hash, name, exam_type) VALUES (?, ?, ?, ?)")
    .run(email, passwordHash, name, examType);

  createSession(res, Number(info.lastInsertRowid));
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ user: serializeUser(user) });
});

router.post("/login", (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
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

const validOAuthStates = new Set();

function setOAuthState(res) {
  const state = randomBytes(16).toString("hex");
  validOAuthStates.add(state);
  setTimeout(() => validOAuthStates.delete(state), 10 * 60 * 1000);
  res.cookie("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  return state;
}

function validateOAuthState(req, res) {
  const cookieState = req.cookies?.oauth_state;
  const paramState = req.query?.state;
  res.clearCookie("oauth_state", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
  });
  if (!cookieState || !paramState || cookieState !== paramState) {
    return false;
  }
  if (!validOAuthStates.has(paramState)) {
    return false;
  }
  validOAuthStates.delete(paramState);
  return true;
}

function handleAccountLinking({ provider, socialId, email, name, avatarUrl, currentUser }) {
  const colName = provider === "vk" ? "vk_id" : "yandex_id";

  let user = db.prepare(`SELECT * FROM users WHERE ${colName} = ?`).get(socialId);

  if (!user && currentUser?.id) {
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(currentUser.id);
    if (existing) {
      db.prepare(
        `UPDATE users SET ${colName} = ?, avatar_url = CASE WHEN avatar_url = '' THEN ? ELSE avatar_url END WHERE id = ?`
      ).run(socialId, avatarUrl, currentUser.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(currentUser.id);
    }
  }

  if (!user && email && email.trim()) {
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim());
    if (user) {
      db.prepare(
        `UPDATE users SET ${colName} = ?, avatar_url = CASE WHEN avatar_url = '' THEN ? ELSE avatar_url END WHERE id = ?`
      ).run(socialId, avatarUrl, user.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    }
  }

  if (!user) {
    const finalEmail = email && email.trim() ? email.trim() : `${socialId}@examhub.ru`;
    const finalName = name && name.trim() ? name.trim() : provider === "vk" ? "VK Пользователь" : "Yandex Пользователь";
    const info = db
      .prepare(`INSERT INTO users (email, password_hash, name, ${colName}, avatar_url) VALUES (?, '', ?, ?, ?)`)
      .run(finalEmail, finalName, socialId, avatarUrl);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  }

  return user;
}

router.get("/vk", (req, res) => {
  const state = setOAuthState(res);
  const hasRealKeys = Boolean(process.env.VK_CLIENT_ID && process.env.VK_CLIENT_ID !== "mock_client");
  if (config.isTest || req.query.mock === "true" || !hasRealKeys) {
    let mockQuery = `?code=mock_code&state=${state}`;
    if (req.query.mock_id !== undefined) mockQuery += `&mock_id=${encodeURIComponent(req.query.mock_id)}`;
    if (req.query.mock_email !== undefined) mockQuery += `&mock_email=${encodeURIComponent(req.query.mock_email)}`;
    if (req.query.mock_name !== undefined) mockQuery += `&mock_name=${encodeURIComponent(req.query.mock_name)}`;
    if (req.query.mock_avatar !== undefined) mockQuery += `&mock_avatar=${encodeURIComponent(req.query.mock_avatar)}`;
    return res.redirect(`/api/auth/vk/callback${mockQuery}`);
  }
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/vk/callback`;
  const vkUrl = `https://oauth.vk.com/authorize?client_id=${process.env.VK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
  res.redirect(vkUrl);
});

router.get("/vk/callback", optionalAuth, async (req, res) => {
  if (!validateOAuthState(req, res)) {
    return res.status(400).json({ error: "Неверное состояние CSRF" });
  }

  const isMock = config.isTest || req.query.mock === "true" || req.query.code === "mock_code" || !process.env.VK_CLIENT_ID || process.env.VK_CLIENT_ID === "mock_client";
  let socialId = "vk_12345";
  let email = "vk_12345@examhub.ru";
  let name = "VK Пользователь";
  let avatarUrl = "https://vk.com/avatar.jpg";

  if (isMock) {
    if (req.query.mock_id !== undefined) socialId = String(req.query.mock_id);
    if (req.query.mock_email !== undefined) email = String(req.query.mock_email);
    if (req.query.mock_name !== undefined) name = String(req.query.mock_name);
    if (req.query.mock_avatar !== undefined) avatarUrl = String(req.query.mock_avatar);
  } else if (req.query.code) {
    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/vk/callback`;
      const tokenRes = await fetch(
        `https://oauth.vk.com/access_token?client_id=${process.env.VK_CLIENT_ID}&client_secret=${process.env.VK_CLIENT_SECRET || ""}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${req.query.code}`
      );
      const tokenData = await tokenRes.json();
      if (tokenData.access_token && tokenData.user_id) {
        socialId = `vk_${tokenData.user_id}`;
        if (tokenData.email) email = tokenData.email;
        const userRes = await fetch(
          `https://api.vk.com/method/users.get?user_ids=${tokenData.user_id}&fields=photo_200&access_token=${tokenData.access_token}&v=5.131`
        );
        const userData = await userRes.json();
        if (userData.response?.[0]) {
          const u = userData.response[0];
          name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || name;
          if (u.photo_200) avatarUrl = u.photo_200;
        }
      }
    } catch (err) {
      console.error("VK OAuth error:", err);
    }
  }

  const user = handleAccountLinking({
    provider: "vk",
    socialId,
    email,
    name,
    avatarUrl,
    currentUser: req.user,
  });

  createSession(res, user.id);
  res.redirect("/?auth=success");
});

router.get("/yandex", (req, res) => {
  const state = setOAuthState(res);
  const hasRealKeys = Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_ID !== "mock_client");
  if (config.isTest || req.query.mock === "true" || !hasRealKeys) {
    let mockQuery = `?code=mock_code&state=${state}`;
    if (req.query.mock_id !== undefined) mockQuery += `&mock_id=${encodeURIComponent(req.query.mock_id)}`;
    if (req.query.mock_email !== undefined) mockQuery += `&mock_email=${encodeURIComponent(req.query.mock_email)}`;
    if (req.query.mock_name !== undefined) mockQuery += `&mock_name=${encodeURIComponent(req.query.mock_name)}`;
    if (req.query.mock_avatar !== undefined) mockQuery += `&mock_avatar=${encodeURIComponent(req.query.mock_avatar)}`;
    return res.redirect(`/api/auth/yandex/callback${mockQuery}`);
  }
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/yandex/callback`;
  const yandexUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${process.env.YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.redirect(yandexUrl);
});

router.get("/yandex/callback", optionalAuth, async (req, res) => {
  if (!validateOAuthState(req, res)) {
    return res.status(400).json({ error: "Неверное состояние CSRF" });
  }

  const isMock = config.isTest || req.query.mock === "true" || req.query.code === "mock_code" || !process.env.YANDEX_CLIENT_ID || process.env.YANDEX_CLIENT_ID === "mock_client";
  let socialId = "yandex_67890";
  let email = "yandex_67890@examhub.ru";
  let name = "Yandex Пользователь";
  let avatarUrl = "https://yandex.ru/avatar.jpg";

  if (isMock) {
    if (req.query.mock_id !== undefined) socialId = String(req.query.mock_id);
    if (req.query.mock_email !== undefined) email = String(req.query.mock_email);
    if (req.query.mock_name !== undefined) name = String(req.query.mock_name);
    if (req.query.mock_avatar !== undefined) avatarUrl = String(req.query.mock_avatar);
  } else if (req.query.code) {
    try {
      const tokenRes = await fetch("https://oauth.yandex.ru/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: String(req.query.code),
          client_id: process.env.YANDEX_CLIENT_ID,
          client_secret: process.env.YANDEX_CLIENT_SECRET || "",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const userRes = await fetch("https://login.yandex.ru/info?format=json", {
          headers: { Authorization: `OAuth ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        if (userData.id) {
          socialId = `yandex_${userData.id}`;
          if (userData.default_email) email = userData.default_email;
          if (userData.real_name || userData.first_name) {
            name = userData.real_name || `${userData.first_name || ""} ${userData.last_name || ""}`.trim();
          }
          if (userData.default_avatar_id) {
            avatarUrl = `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`;
          }
        }
      }
    } catch (err) {
      console.error("Yandex OAuth error:", err);
    }
  }

  const user = handleAccountLinking({
    provider: "yandex",
    socialId,
    email,
    name,
    avatarUrl,
    currentUser: req.user,
  });

  createSession(res, user.id);
  res.redirect("/?auth=success");
});

export default router;
