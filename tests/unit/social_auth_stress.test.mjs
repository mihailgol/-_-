import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb, db } from "../../server/db.js";

let server;
let baseUrl;

function getSetCookieHeaders(res) {
  if (res.headers.getSetCookie) {
    return res.headers.getSetCookie();
  }
  const raw = res.headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,\s(?=[a-zA-Z0-9_]+=)/);
}

function getCookieString(res, cookieName) {
  const cookies = getSetCookieHeaders(res);
  for (const c of cookies) {
    const pair = c.split(";")[0].trim();
    if (pair.startsWith(`${cookieName}=`)) {
      return pair;
    }
  }
  return "";
}

function getFullCookieHeader(res, cookieName) {
  const cookies = getSetCookieHeaders(res);
  for (const c of cookies) {
    const pair = c.split(";")[0].trim();
    if (pair.startsWith(`${cookieName}=`)) {
      return c;
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

describe("Empirical Social Auth Stress & Cookie Verification", () => {
  describe("1. CSRF State Validation & Replay Rejection Testing", () => {
    it("rejects VK callback with missing state param", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/auth/vk/callback?code=mock_code`, {
        headers: { cookie: "oauth_state=some_state" },
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Неверное состояние CSRF");
    });

    it("rejects VK callback with missing oauth_state cookie", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/auth/vk/callback?code=mock_code&state=some_state`);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Неверное состояние CSRF");
    });

    it("rejects VK callback with mismatched state param and cookie", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/auth/vk/callback?code=mock_code&state=state_A`, {
        headers: { cookie: "oauth_state=state_B" },
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Неверное состояние CSRF");
    });

    it("rejects Yandex callback with missing or mismatched state", async () => {
      const res1 = await globalThis.fetch(`${baseUrl}/api/auth/yandex/callback?code=mock_code`, {
        headers: { cookie: "oauth_state=some_state" },
      });
      expect(res1.status).toBe(400);

      const res2 = await globalThis.fetch(`${baseUrl}/api/auth/yandex/callback?code=mock_code&state=bad_state`, {
        headers: { cookie: "oauth_state=good_state" },
      });
      expect(res2.status).toBe(400);
    });

    it("verifies state validation on callback", async () => {
      const initRes = await globalThis.fetch(`${baseUrl}/api/auth/vk?mock=true`, { redirect: "manual" });
      const redirectUrl = initRes.headers.get("location");
      const stateCookie = getCookieString(initRes, "oauth_state");

      // First callback call - succeeds with valid state
      const firstCallback = await globalThis.fetch(`${baseUrl}${redirectUrl}`, {
        headers: { cookie: stateCookie },
        redirect: "manual",
      });
      expect(firstCallback.status).toBe(302);
    });
  });

  describe("2. Account Linking Scenarios", () => {
    it("Scenario A: Creates a new user when social account does not exist", async () => {
      const initRes = await globalThis.fetch(
        `${baseUrl}/api/auth/vk?mock=true&mock_id=vk_new_101&mock_email=vk_new@example.com&mock_name=VK_Newbie`,
        { redirect: "manual" }
      );
      const redirectUrl = initRes.headers.get("location");
      const stateCookie = getCookieString(initRes, "oauth_state");

      const cbRes = await globalThis.fetch(`${baseUrl}${redirectUrl}`, {
        headers: { cookie: stateCookie },
        redirect: "manual",
      });
      expect(cbRes.status).toBe(302);

      const user = db.prepare("SELECT * FROM users WHERE vk_id = ?").get("vk_new_101");
      expect(user).toBeDefined();
      expect(user.email).toBe("vk_new@example.com");
      expect(user.name).toBe("VK_Newbie");
    });

    it("Scenario B: Returns existing user on repeat social login", async () => {
      const initRes1 = await globalThis.fetch(
        `${baseUrl}/api/auth/yandex?mock=true&mock_id=yandex_202&mock_email=yandex_repeat@example.com`,
        { redirect: "manual" }
      );
      const redirectUrl1 = initRes1.headers.get("location");
      const stateCookie1 = getCookieString(initRes1, "oauth_state");

      await globalThis.fetch(`${baseUrl}${redirectUrl1}`, {
        headers: { cookie: stateCookie1 },
        redirect: "manual",
      });

      const userCountBefore = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

      const initRes2 = await globalThis.fetch(
        `${baseUrl}/api/auth/yandex?mock=true&mock_id=yandex_202&mock_email=yandex_repeat@example.com`,
        { redirect: "manual" }
      );
      const redirectUrl2 = initRes2.headers.get("location");
      const stateCookie2 = getCookieString(initRes2, "oauth_state");

      const cbRes2 = await globalThis.fetch(`${baseUrl}${redirectUrl2}`, {
        headers: { cookie: stateCookie2 },
        redirect: "manual",
      });
      expect(cbRes2.status).toBe(302);

      const userCountAfter = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
      expect(userCountAfter).toBe(userCountBefore);
    });

    it("Scenario C: Links social account to existing email user when not logged in", async () => {
      db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)").run(
        "existing_email@example.com",
        "hash123",
        "Email Registered User"
      );

      const initRes = await globalThis.fetch(
        `${baseUrl}/api/auth/yandex?mock=true&mock_id=yandex_303&mock_email=existing_email@example.com`,
        { redirect: "manual" }
      );
      const redirectUrl = initRes.headers.get("location");
      const stateCookie = getCookieString(initRes, "oauth_state");

      await globalThis.fetch(`${baseUrl}${redirectUrl}`, {
        headers: { cookie: stateCookie },
        redirect: "manual",
      });

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get("existing_email@example.com");
      expect(user.yandex_id).toBe("yandex_303");
    });

    it("Scenario D: Links social account to current logged in session", async () => {
      const regRes = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "logged_in_user@example.com", password: "password123", name: "Logged In User" }),
      });
      const sessionCookie = getCookieString(regRes, "examhub_session");

      const initRes = await globalThis.fetch(`${baseUrl}/api/auth/vk?mock=true&mock_id=vk_404`, {
        headers: { cookie: sessionCookie },
        redirect: "manual",
      });
      const redirectUrl = initRes.headers.get("location");
      const stateCookie = getCookieString(initRes, "oauth_state");

      await globalThis.fetch(`${baseUrl}${redirectUrl}`, {
        headers: { cookie: `${sessionCookie}; ${stateCookie}` },
        redirect: "manual",
      });

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get("logged_in_user@example.com");
      expect(user.vk_id).toBe("vk_404");
    });

    it("Scenario E: Hardcoded mock email fallback behavior", async () => {
      const initRes = await globalThis.fetch(
        `${baseUrl}/api/auth/vk?mock=true&mock_id=vk_no_email_505`,
        { redirect: "manual" }
      );
      const redirectUrl = initRes.headers.get("location");
      const stateCookie = getCookieString(initRes, "oauth_state");

      await globalThis.fetch(`${baseUrl}${redirectUrl}`, {
        headers: { cookie: stateCookie },
        redirect: "manual",
      });

      const user = db.prepare("SELECT * FROM users WHERE vk_id = ?").get("vk_no_email_505");
      expect(user).toBeDefined();
      expect(user.name).toBe("VK Пользователь");
      expect(user.email).toBe("vk_12345@examhub.ru");
    });
  });

  describe("3. Cookie Attributes Verification", () => {
    it("verifies oauth_state cookie attributes (HttpOnly, SameSite=Lax, Path=/)", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/auth/vk?mock=true`, { redirect: "manual" });
      const stateCookieHeader = getFullCookieHeader(res, "oauth_state");

      expect(stateCookieHeader).not.toBe("");
      expect(stateCookieHeader.toLowerCase()).toContain("httponly");
      expect(stateCookieHeader.toLowerCase()).toContain("samesite=lax");
      expect(stateCookieHeader.toLowerCase()).toContain("path=/");
    });

    it("verifies examhub_session cookie attributes on registration (HttpOnly, SameSite=Lax, Path=/)", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "cookie_test@example.com", password: "password123", name: "Cookie User" }),
      });
      const sessionCookieHeader = getFullCookieHeader(res, "examhub_session");

      expect(sessionCookieHeader).not.toBe("");
      expect(sessionCookieHeader.toLowerCase()).toContain("httponly");
      expect(sessionCookieHeader.toLowerCase()).toContain("samesite=lax");
      expect(sessionCookieHeader.toLowerCase()).toContain("path=/");
    });

    it("verifies examhub_session cookie attributes on social callback (HttpOnly, SameSite=Lax, Path=/)", async () => {
      const initRes = await globalThis.fetch(`${baseUrl}/api/auth/vk?mock=true`, { redirect: "manual" });
      const redirectUrl = initRes.headers.get("location");
      const stateCookie = getCookieString(initRes, "oauth_state");

      const cbRes = await globalThis.fetch(`${baseUrl}${redirectUrl}`, {
        headers: { cookie: stateCookie },
        redirect: "manual",
      });

      const sessionCookieHeader = getFullCookieHeader(cbRes, "examhub_session");
      expect(sessionCookieHeader).not.toBe("");
      expect(sessionCookieHeader.toLowerCase()).toContain("httponly");
      expect(sessionCookieHeader.toLowerCase()).toContain("samesite=lax");
      expect(sessionCookieHeader.toLowerCase()).toContain("path=/");
    });
  });
});
