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

describe("Empirical Challenger M3-2 API Route Verification", () => {
  describe("Catalog API - /api/catalog/subjects", () => {
    it("1.1 GET /api/catalog/subjects returns status 200 and catalog structure", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("subjects");
      expect(data).toHaveProperty("otherSubjects");
      expect(Array.isArray(data.subjects)).toBe(true);
      expect(Array.isArray(data.otherSubjects)).toBe(true);
      expect(data.subjects.length).toBeGreaterThan(0);

      const math = data.subjects.find((s) => s.id === "math");
      expect(math).toBeDefined();
      expect(math.title).toBe("Математика");
      expect(Array.isArray(math.topics)).toBe(true);
      expect(math.topics.length).toBeGreaterThan(0);
    });

    it("1.2 GET /api/catalog/subjects/math returns 200 with complete math subject schema", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects/math`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("subject");
      const sub = data.subject;
      expect(sub.id).toBe("math");
      expect(sub.title).toBe("Математика");
      expect(sub.icon).toBeTruthy();
      expect(sub.color).toBeTruthy();
      expect(sub.colorHex).toBeTruthy();
      expect(sub.bgGradient).toBeTruthy();
      expect(Array.isArray(sub.topics)).toBe(true);
      expect(sub.topics.length).toBeGreaterThan(0);

      const topic = sub.topics[0];
      expect(topic).toHaveProperty("id");
      expect(topic).toHaveProperty("title");
      expect(topic).toHaveProperty("isPremium");
      expect(topic).toHaveProperty("duration");
      expect(topic).toHaveProperty("theory");
      expect(topic).toHaveProperty("questions");
      expect(Array.isArray(topic.questions)).toBe(true);

      const question = topic.questions[0];
      expect(question).toHaveProperty("id");
      expect(question).toHaveProperty("type");
      expect(question).toHaveProperty("question");
      expect(question).toHaveProperty("options");
      expect(question).toHaveProperty("correctIndex");
      expect(question).toHaveProperty("explanation");
      expect(question).toHaveProperty("points");
      expect(Array.isArray(question.options)).toBe(true);
    });

    it("1.3 GET /api/catalog/subjects/invalid_id returns 404 Not Found", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects/invalid_id`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: "Предмет не найден" });
    });

    it("1.4 GET /api/catalog/subjects edge cases (non-existent, SQL injection attempt, special characters)", async () => {
      const edgeCases = [
        "non_existent_subject_999",
        "12345",
        "math'; DROP TABLE subjects;--",
        "math OR 1=1",
        "null",
        "undefined",
        "---",
        "~!@#$%^&*()",
      ];

      for (const id of edgeCases) {
        const encodedId = encodeURIComponent(id);
        const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects/${encodedId}`);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error", "Предмет не найден");
      }
    });
  });

  describe("Mock Exam API - /api/mock-exams", () => {
    it("2.1 GET /api/mock-exams?examType=EGE returns 200 with only EGE exams", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?examType=EGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("mockExams");
      expect(Array.isArray(data.mockExams)).toBe(true);
      expect(data.mockExams.length).toBeGreaterThan(0);
      data.mockExams.forEach((exam) => {
        expect(exam.examType).toBe("EGE");
      });
    });

    it("2.2 GET /api/mock-exams?examType=OGE returns 200 with only OGE exams", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?examType=OGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("mockExams");
      expect(Array.isArray(data.mockExams)).toBe(true);
      expect(data.mockExams.length).toBeGreaterThan(0);
      data.mockExams.forEach((exam) => {
        expect(exam.examType).toBe("OGE");
      });
    });

    it("2.3 GET /api/mock-exams?exam_type=ege (lowercase and snake_case alias support)", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?exam_type=ege`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mockExams.length).toBeGreaterThan(0);
      data.mockExams.forEach((exam) => {
        expect(exam.examType).toBe("EGE");
      });
    });

    it("2.4 GET /api/mock-exams with subjectId filter", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?subjectId=math`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mockExams.length).toBeGreaterThan(0);
      data.mockExams.forEach((exam) => {
        expect(exam.subjectId).toBe("math");
      });
    });

    it("2.5 GET /api/mock-exams with combined subjectId and examType filter", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?subjectId=math&examType=OGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mockExams.length).toBeGreaterThan(0);
      data.mockExams.forEach((exam) => {
        expect(exam.subjectId).toBe("math");
        expect(exam.examType).toBe("OGE");
      });
    });

    it("2.6 GET /api/mock-exams with invalid/unknown filters (malformed params)", async () => {
      const res1 = await globalThis.fetch(`${baseUrl}/api/mock-exams?examType=INVALID_EXAM_TYPE`);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      // Should fall back to returning all mock exams safely
      expect(data1.mockExams.length).toBeGreaterThan(0);

      const res2 = await globalThis.fetch(`${baseUrl}/api/mock-exams?subjectId=non_existent_subject`);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.mockExams).toEqual([]);

      const res3 = await globalThis.fetch(`${baseUrl}/api/mock-exams?subjectId=math&examType=INVALID`);
      expect(res3.status).toBe(200);
      const data3 = await res3.json();
      // Returns all math mock exams (fallback from invalid examType)
      expect(data3.mockExams.length).toBeGreaterThan(0);
      data3.mockExams.forEach((e) => expect(e.subjectId).toBe("math"));
    });

    it("2.7 GET /api/mock-exams with array query parameter (e.g. ?examType[]=EGE)", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?examType[]=EGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.mockExams)).toBe(true);
    });

    it("2.8 GET /api/mock-exams/:id details (free -> 200, premium -> 403 for unauth), and non-existent exam -> 404", async () => {
      // Get all exams
      const listRes = await globalThis.fetch(`${baseUrl}/api/mock-exams`);
      const listData = await listRes.json();
      const freeExam = listData.mockExams.find((e) => !e.isPremium);
      const premiumExam = listData.mockExams.find((e) => e.isPremium);

      // Free exam detail
      if (freeExam) {
        const detailRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/${freeExam.id}`);
        expect(detailRes.status).toBe(200);
        const detailData = await detailRes.json();
        expect(detailData.id).toBe(freeExam.id);
        expect(detailData.subjectId).toBe(freeExam.subjectId);
        expect(detailData.examType).toBe(freeExam.examType);
        expect(Array.isArray(detailData.questions)).toBe(true);
      }

      // Premium exam detail (unauthenticated should be 403)
      if (premiumExam) {
        const premRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/${premiumExam.id}`);
        expect(premRes.status).toBe(403);
        const premData = await premRes.json();
        expect(premData).toEqual({ error: "Требуется Premium подписка" });
      }

      // Non-existent detail
      const notFoundRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/non_existent_mock_id_999`);
      expect(notFoundRes.status).toBe(404);
      const notFoundData = await notFoundRes.json();
      expect(notFoundData).toEqual({ error: "Пробный экзамен не найден" });
    });

    it("2.9 POST /api/mock-exams/:id/submit submission and non-existent submit", async () => {
      const listRes = await globalThis.fetch(`${baseUrl}/api/mock-exams`);
      const listData = await listRes.json();
      const existingExam = listData.mockExams.find((e) => !e.isPremium);

      if (existingExam) {
        const submitRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/${existingExam.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: { 1: 0 },
            timeSpentSeconds: 120,
          }),
        });
        expect(submitRes.status).toBe(200);
        const submitData = await submitRes.json();
        expect(submitData.ok).toBe(true);
        expect(submitData).toHaveProperty("primaryScore");
        expect(submitData).toHaveProperty("maxPrimaryScore");
        expect(submitData).toHaveProperty("secondaryScore");
        expect(submitData).toHaveProperty("breakdown");
      }

      // Non-existent exam submission
      const notFoundSubmit = await globalThis.fetch(`${baseUrl}/api/mock-exams/non_existent_mock_id/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: {} }),
      });
      expect(notFoundSubmit.status).toBe(404);
      const notFoundSubmitData = await notFoundSubmit.json();
      expect(notFoundSubmitData).toEqual({ error: "Пробный экзамен не найден" });
    });
  });
});
