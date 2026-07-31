import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const PLANS = {
  "1month": { label: "1 Месяц", price: 990, days: 30 },
  "3months": { label: "3 Месяца", price: 2490, days: 90 },
  "1year": { label: "Учебный год", price: 5990, days: 365 },
};

router.get("/plans", (req, res) => {
  res.json({ plans: PLANS });
});

router.post("/subscribe", requireAuth, (req, res) => {
  const planId = String(req.body?.planId || "3months");
  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: "Неизвестный тариф" });

  const baseDate = new Date();
  const row = db.prepare("SELECT premium_until FROM users WHERE id = ?").get(req.user.id);
  if (row?.premium_until && new Date(row.premium_until).getTime() > baseDate.getTime()) {
    baseDate.setTime(new Date(row.premium_until).getTime());
  }
  baseDate.setDate(baseDate.getDate() + plan.days);

  db.prepare("INSERT INTO payments (user_id, plan_id, amount, status, provider) VALUES (?, ?, ?, 'paid', 'mock')").run(
    req.user.id,
    planId,
    plan.price
  );
  db.prepare("UPDATE users SET is_premium = 1, premium_until = ?, updated_at = datetime('now') WHERE id = ?").run(
    baseDate.toISOString(),
    req.user.id
  );

  res.json({ ok: true, isPremium: true, premiumUntil: baseDate.toISOString() });
});

export default router;
