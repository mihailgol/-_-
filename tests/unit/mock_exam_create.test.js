import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb } from "../../server/db.js";

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
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

beforeEach(() => {
  resetDb();
  initDb();
});

describe("Mock Exam Creation API (POST & DELETE /api/mock-exams)", () => {
  it("creates a new mock exam successfully with default parameters", async () => {
    const res = await globalThis.fetch(`${baseUrl}/api/mock-exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Тестовый авторский вариант",
        subjectId: "math",
        examType: "EGE",
        durationMinutes: 235,
        totalQuestions: 5,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mockExam).toBeDefined();
    expect(data.mockExam.title).toBe("Тестовый авторский вариант");
    expect(data.mockExam.subjectId).toBe("math");
    expect(data.mockExam.examType).toBe("EGE");
    expect(data.mockExam.durationMinutes).toBe(235);
    expect(data.mockExam.totalQuestions).toBe(5);

    // Verify it appears in GET /api/mock-exams
    const listRes = await globalThis.fetch(`${baseUrl}/api/mock-exams?subjectId=math`);
    const listData = await listRes.json();
    const created = listData.mockExams.find((m) => m.id === data.mockExam.id);
    expect(created).toBeDefined();
    expect(created.title).toBe("Тестовый авторский вариант");
  });

  it("returns 400 when creating a mock exam with empty title", async () => {
    const res = await globalThis.fetch(`${baseUrl}/api/mock-exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "   ",
        subjectId: "biology",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("deletes a mock exam by ID", async () => {
    // Create first
    const createRes = await globalThis.fetch(`${baseUrl}/api/mock-exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Пробник для удаления",
        subjectId: "physics",
        examType: "OGE",
      }),
    });
    const createData = await createRes.json();
    const createdId = createData.mockExam.id;

    // Delete
    const deleteRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/${createdId}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);

    // Verify detail returns 404
    const detailRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/${createdId}`);
    expect(detailRes.status).toBe(404);
  });
});
