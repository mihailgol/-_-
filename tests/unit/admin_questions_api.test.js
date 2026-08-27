import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { initDb, db, seedAdminUser } from "../../server/db.js";
import { seedContent } from "../../server/seed.js";

let server;
let baseUrl;
let adminToken;

beforeAll(async () => {
  initDb();
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
  seedAdminUser();
  seedContent();

  const admin = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").get();
  adminToken = `test_admin_tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date(Date.now() + 864e5).toISOString();
  db.prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    adminToken,
    admin.id,
    expiresAt
  );
});

describe("Admin Question Registry & API (Milestone 1)", () => {
  describe("GET /api/admin/tests/questions", () => {
    it("returns list of questions with all required fields", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBeGreaterThan(0);

      const q = data.questions[0];
      expect(q).toHaveProperty("id");
      expect(q).toHaveProperty("subject_id");
      expect(q).toHaveProperty("subject_title");
      expect(q).toHaveProperty("task_number");
      expect(q).toHaveProperty("type");
      expect(q).toHaveProperty("question");
      expect(q).toHaveProperty("options_json");
      expect(q).toHaveProperty("correct_index");
      expect(q).toHaveProperty("points");
      expect(q).toHaveProperty("explanation");
    });

    it("filters questions by subjectId", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions?subjectId=math`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions.length).toBeGreaterThan(0);
      for (const q of data.questions) {
        expect(q.subject_id).toBe("math");
      }
    });

    it("filters questions by taskNumber", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions?taskNumber=1`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions.length).toBeGreaterThan(0);
      for (const q of data.questions) {
        expect(q.task_number).toBe(1);
      }
    });

    it("filters questions by search query (q)", async () => {
      const allRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const allData = await allRes.json();
      const firstQ = allData.questions[0];
      const searchWord = firstQ.question.split(" ")[0].toLowerCase();

      const res = await globalThis.fetch(
        `${baseUrl}/api/admin/tests/questions?q=${encodeURIComponent(searchWord)}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions.length).toBeGreaterThan(0);
      for (const q of data.questions) {
        expect(q.question.toLowerCase()).toContain(searchWord);
      }
    });

    it("filters questions by type", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions?type=single`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions.length).toBeGreaterThan(0);
      for (const q of data.questions) {
        expect(q.type).toBe("single");
      }
    });

    it("supports combined filters", async () => {
      const res = await globalThis.fetch(
        `${baseUrl}/api/admin/tests/questions?subjectId=math&taskNumber=1&type=single`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      for (const q of data.questions) {
        expect(q.subject_id).toBe("math");
        expect(q.task_number).toBe(1);
        expect(q.type).toBe("single");
      }
    });

    it("GET /api/admin/tests acts as backward-compatible alias", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/admin/tests?subjectId=math`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBeGreaterThan(0);
    });

    it("requires admin authentication", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`);
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/admin/tests/questions/:id", () => {
    it("updates question fields successfully", async () => {
      const getRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const getData = await getRes.json();
      const target = getData.questions[0];

      const updatedText = "Обновленный проверочный текст вопроса #12345";
      const patchRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/${target.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: updatedText,
          taskNumber: 15,
          type: "single",
          options: ["Вариант A", "Вариант B", "Вариант C"],
          correctIndex: 1,
          points: 2,
          explanation: "Новое пояснение к вопросу",
          solutionKey: "Ключ15",
        }),
      });

      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.ok).toBe(true);
      expect(patchData.id).toBe(target.id);

      const verifyRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/${target.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(verifyRes.status).toBe(200);
      const verifyData = await verifyRes.json();
      expect(verifyData.question.question).toBe(updatedText);
      expect(verifyData.question.task_number).toBe(15);
      expect(verifyData.question.points).toBe(2);
      expect(verifyData.question.explanation).toBe("Новое пояснение к вопросу");
      expect(verifyData.question.solution_key).toBe("Ключ15");
      expect(JSON.parse(verifyData.question.options_json)).toEqual(["Вариант A", "Вариант B", "Вариант C"]);
    });

    it("updates extended question with FIPI criteria and maxPoints", async () => {
      const getRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const getData = await getRes.json();
      const target = getData.questions[0];

      const patchRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/${target.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "extended",
          maxPoints: 3,
          solutionKey: "Эталонное обоснованное решение",
          criteria: [
            { points: 2, description: "Обоснованно получен верный ответ" },
            { points: 1, description: "Допущена одна арифметическая ошибка" },
          ],
        }),
      });

      expect(patchRes.status).toBe(200);

      const verifyRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/${target.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const verifyData = await verifyRes.json();
      expect(verifyData.question.type).toBe("extended");
      expect(verifyData.question.max_points).toBe(3);
      expect(verifyData.question.solution_key).toBe("Эталонное обоснованное решение");
      const criteria = JSON.parse(verifyData.question.criteria_json);
      expect(criteria.length).toBe(2);
      expect(criteria[0].points).toBe(2);
    });

    it("returns 404 when updating non-existent question", async () => {
      const patchRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/non_existent_id`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: "Sample" }),
      });
      expect(patchRes.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/tests/questions/:id", () => {
    it("deletes a question and removes it from database", async () => {
      const getRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const getData = await getRes.json();
      const target = getData.questions[0];

      const deleteRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/${target.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.ok).toBe(true);

      const verifyRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/${target.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(verifyRes.status).toBe(404);
    });
  });
});
