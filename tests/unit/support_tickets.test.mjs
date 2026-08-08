import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../server/index.js";

describe("Support Tickets API Verification", () => {
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

  it("should create a support ticket and return ticketId", async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Тестовый вопрос по платформе",
        message: "Здравствуйте! Как получить доступ к генератору ИИ?",
        email: "test_user@examhub.ru"
      })
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.ticketId).toBeGreaterThan(0);
  });

  it("should reject support ticket with missing subject or message", async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "",
        message: ""
      })
    });
    expect(res.status).toBe(400);
  });

  it("should retrieve support tickets in admin endpoint for authenticated admin", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@examhub.ru", password: "admin123" })
    });
    const cookie = loginRes.headers.get("set-cookie");

    const res = await fetch(`${baseUrl}/api/admin/support/tickets`, {
      headers: { Cookie: cookie || "" }
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.tickets)).toBe(true);
    expect(data.tickets.length).toBeGreaterThan(0);

    const ticket = data.tickets.find((t) => t.subject === "Тестовый вопрос по платформе");
    expect(ticket).toBeDefined();
    expect(ticket.message).toContain("Как получить доступ");
  });
});
