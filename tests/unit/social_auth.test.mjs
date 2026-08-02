import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb } from "../../server/db.js";

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

describe("Social Auth VK & Yandex", () => {
  it("authenticates via VK OAuth mock flow and sets user session", async () => {
    const res1 = await globalThis.fetch(`${baseUrl}/api/auth/vk?mock=true`, {
      redirect: "manual",
    });
    expect(res1.status).toBe(302);
    const location1 = res1.headers.get("location");
    expect(location1).toContain("/api/auth/vk/callback");

    const stateCookie = getCookieValue(res1, "oauth_state");
    expect(stateCookie).toContain("oauth_state=");

    const res2 = await globalThis.fetch(`${baseUrl}${location1}`, {
      headers: { cookie: stateCookie },
      redirect: "manual",
    });

    expect(res2.status).toBe(302);
    expect(res2.headers.get("location")).toBe("/?auth=success");
    const sessionCookie = getCookieValue(res2, "examhub_session");
    expect(sessionCookie).toContain("examhub_session=");

    const meRes = await globalThis.fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: sessionCookie },
    });
    const meData = await meRes.json();
    expect(meData.user).not.toBeNull();
    expect(meData.user.vkId).toBe("vk_12345");
    expect(meData.user.avatarUrl).toBe("https://vk.com/avatar.jpg");
  });

  it("authenticates via Yandex OAuth mock flow and sets user session", async () => {
    const res1 = await globalThis.fetch(`${baseUrl}/api/auth/yandex?mock=true`, {
      redirect: "manual",
    });
    expect(res1.status).toBe(302);
    const location1 = res1.headers.get("location");
    expect(location1).toContain("/api/auth/yandex/callback");

    const stateCookie = getCookieValue(res1, "oauth_state");
    expect(stateCookie).toContain("oauth_state=");

    const res2 = await globalThis.fetch(`${baseUrl}${location1}`, {
      headers: { cookie: stateCookie },
      redirect: "manual",
    });

    expect(res2.status).toBe(302);
    expect(res2.headers.get("location")).toBe("/?auth=success");
    const sessionCookie = getCookieValue(res2, "examhub_session");
    expect(sessionCookie).toContain("examhub_session=");

    const meRes = await globalThis.fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: sessionCookie },
    });
    const meData = await meRes.json();
    expect(meData.user).not.toBeNull();
    expect(meData.user.yandexId).toBe("yandex_67890");
    expect(meData.user.avatarUrl).toBe("https://yandex.ru/avatar.jpg");
  });

  it("rejects callback requests with invalid CSRF state", async () => {
    const res = await globalThis.fetch(`${baseUrl}/api/auth/vk/callback?code=mock_code&state=invalid_state`, {
      headers: { cookie: "oauth_state=correct_state" },
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Неверное состояние CSRF");
  });

  it("links social account to existing logged in session", async () => {
    const regRes = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "session_user@example.com",
        password: "password123",
        name: "Session User",
      }),
    });
    const sessionCookie = getCookieValue(regRes, "examhub_session");

    const res1 = await globalThis.fetch(`${baseUrl}/api/auth/vk?mock=true&mock_id=vk_linked_111`, {
      headers: { cookie: sessionCookie },
      redirect: "manual",
    });
    const location1 = res1.headers.get("location");
    const stateCookie = getCookieValue(res1, "oauth_state");
    const combinedCookie = `${sessionCookie}; ${stateCookie}`;

    const res2 = await globalThis.fetch(`${baseUrl}${location1}`, {
      headers: { cookie: combinedCookie },
      redirect: "manual",
    });
    const updatedSession = getCookieValue(res2, "examhub_session") || sessionCookie;

    const meRes = await globalThis.fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: updatedSession },
    });
    const meData = await meRes.json();
    expect(meData.user.email).toBe("session_user@example.com");
    expect(meData.user.vkId).toBe("vk_linked_111");
  });

  it("links social account by matching email when not logged in", async () => {
    await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "existing_email@example.com",
        password: "password123",
        name: "Existing Email User",
      }),
    });

    const res1 = await globalThis.fetch(
      `${baseUrl}/api/auth/yandex?mock=true&mock_id=yandex_email_222&mock_email=existing_email@example.com`,
      { redirect: "manual" }
    );
    const location1 = res1.headers.get("location");
    const stateCookie = getCookieValue(res1, "oauth_state");

    const res2 = await globalThis.fetch(`${baseUrl}${location1}`, {
      headers: { cookie: stateCookie },
      redirect: "manual",
    });
    expect(res2.status).toBe(302);
    const newSessionCookie = getCookieValue(res2, "examhub_session");

    const meRes = await globalThis.fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: newSessionCookie },
    });
    const meData = await meRes.json();
    expect(meData.user.email).toBe("existing_email@example.com");
    expect(meData.user.yandexId).toBe("yandex_email_222");
  });
});
