import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../server/index.js";

describe("Site Settings API Verification", () => {
  let server;
  let baseUrl;

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
    if (server) server.close();
  });

  it("should fetch public site settings", async () => {
    const res = await fetch(`${baseUrl}/api/site/settings`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.settings).toBeDefined();
    expect(data.settings.legal_name).toBeDefined();
    expect(data.settings.support_email).toBeDefined();
  });

  it("should allow admin to update legal settings and retrieve updated values", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@examhub.ru", password: "admin123" })
    });
    const cookie = loginRes.headers.get("set-cookie");

    const updateRes = await fetch(`${baseUrl}/api/admin/site/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie || ""
      },
      body: JSON.stringify({
        settings: {
          legal_name: "ИП Смирнов Алексей Петрович",
          legal_status: "Индивидуальный предприниматель",
          legal_inn: "771234567890",
          legal_ogrn: "320774600000000",
          support_email: "help@examhub.ru",
          support_phone: "8 (800) 100-20-30"
        }
      })
    });
    const updateData = await updateRes.json();
    expect(updateRes.status).toBe(200);
    expect(updateData.ok).toBe(true);

    const publicRes = await fetch(`${baseUrl}/api/site/settings`);
    const publicData = await publicRes.json();
    expect(publicData.settings.legal_name).toBe("ИП Смирнов Алексей Петрович");
    expect(publicData.settings.legal_inn).toBe("771234567890");
    expect(publicData.settings.support_email).toBe("help@examhub.ru");
  });
});
