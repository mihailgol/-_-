import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb, db } from "../../server/db.js";

let server;
let baseUrl;

function getCookieValue(res, cookieName) {
  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,\s*/);
  for (const c of cookies) {
    const pair = c.split(";")[0].trim();
    if (pair.startsWith(`${cookieName}=`)) {
      return pair;
    }
  }
  return "";
}

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

beforeEach(() => {
  resetDb();
  initDb();
});

describe("AI Quiz Generation Endpoint & Rate Limiting (R3)", () => {
  it("rejects unauthenticated POST /api/ai/generate-quiz with 401", async () => {
    const res = await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: "biology", topicTitle: "Клетка" })
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Требуется авторизация");
  });

  it("enforces 3 generations per day rate limit for free users", async () => {
    const regRes = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "freeuser@example.com",
        password: "password123",
        name: "Free User"
      })
    });
    const sessionCookie = getCookieValue(regRes, "examhub_session");
    expect(sessionCookie).toContain("examhub_session=");

    for (let i = 1; i <= 3; i++) {
      const genRes = await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: sessionCookie
        },
        body: JSON.stringify({ subjectId: "biology", topicTitle: `Тема №${i}` })
      });

      expect(genRes.status).toBe(200);
      const data = await genRes.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBeGreaterThan(0);
      expect(data.remaining).toBe(3 - i);
    }

    const fourthRes = await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ subjectId: "biology", topicTitle: "Тема №4" })
    });

    expect(fourthRes.status).toBe(429);
    const fourthData = await fourthRes.json();
    expect(fourthData.error).toBe("Превышен дневной лимит генераций (3/3 для бесплатного тарифа)");
  });

  it("allows premium users to bypass daily rate limit", async () => {
    const regRes = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "premiumuser@example.com",
        password: "password123",
        name: "Premium User"
      })
    });
    const sessionCookie = getCookieValue(regRes, "examhub_session");

    const meRes = await globalThis.fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: sessionCookie }
    });
    const meData = await meRes.json();
    db.prepare("UPDATE users SET is_premium = 1 WHERE id = ?").run(meData.user.id);

    for (let i = 1; i <= 5; i++) {
      const genRes = await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: sessionCookie
        },
        body: JSON.stringify({ subjectId: "chemistry", topicTitle: `Премиум тема №${i}` })
      });

      expect(genRes.status).toBe(200);
      const data = await genRes.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.remaining).toBeNull();
    }
  });

  it("returns tailored fallback mock questions for chemistry and biology", async () => {
    const regRes = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "fallbackuser@example.com",
        password: "password123",
        name: "Fallback User"
      })
    });
    const sessionCookie = getCookieValue(regRes, "examhub_session");

    const chemRes = await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ subjectId: "chemistry", topicTitle: "Алкены и двойные связи" })
    });
    expect(chemRes.status).toBe(200);
    const chemData = await chemRes.json();
    expect(chemData.subjectId).toBe("chemistry");
    expect(chemData.questions[0].question).toContain("Алкены и двойные связи");

    const bioRes = await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ subjectId: "biology", topicTitle: "Митоз и Мейоз" })
    });
    expect(bioRes.status).toBe(200);
    const bioData = await bioRes.json();
    expect(bioData.subjectId).toBe("biology");
    expect(bioData.questions[0].question).toContain("Митоз и Мейоз");
  });

  it("returns current limit status via GET /api/ai/limit", async () => {
    const regRes = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "limituser@example.com",
        password: "password123",
        name: "Limit User"
      })
    });
    const sessionCookie = getCookieValue(regRes, "examhub_session");

    const limitRes1 = await globalThis.fetch(`${baseUrl}/api/ai/limit`, {
      headers: { cookie: sessionCookie }
    });
    expect(limitRes1.status).toBe(200);
    const limitData1 = await limitRes1.json();
    expect(limitData1.usedToday).toBe(0);
    expect(limitData1.remaining).toBe(3);

    await globalThis.fetch(`${baseUrl}/api/ai/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({ subjectId: "biology", topicTitle: "ДНК" })
    });

    const limitRes2 = await globalThis.fetch(`${baseUrl}/api/ai/limit`, {
      headers: { cookie: sessionCookie }
    });
    const limitData2 = await limitRes2.json();
    expect(limitData2.usedToday).toBe(1);
    expect(limitData2.remaining).toBe(2);
  });
});
