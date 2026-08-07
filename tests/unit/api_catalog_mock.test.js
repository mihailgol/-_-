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

describe("Catalog & Mock Exam API Integration (Milestone 3)", () => {
  describe("GET /api/catalog/subjects", () => {
    it("returns catalog with subjects and otherSubjects arrays", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.subjects).toBeDefined();
      expect(data.otherSubjects).toBeDefined();
      expect(Array.isArray(data.subjects)).toBe(true);
      expect(data.subjects.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/catalog/subjects/:id", () => {
    it("returns subject details including topics, theory, and questions for valid subject ID", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects/math`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.subject).toBeDefined();
      expect(data.subject.id).toBe("math");
      expect(data.subject.title).toBe("Математика");
      expect(Array.isArray(data.subject.topics)).toBe(true);
      expect(data.subject.topics.length).toBeGreaterThan(0);

      const firstTopic = data.subject.topics[0];
      expect(firstTopic.id).toBeTruthy();
      expect(firstTopic.title).toBeTruthy();
      expect(firstTopic.theory).toBeTruthy();
      expect(Array.isArray(firstTopic.questions)).toBe(true);
      expect(firstTopic.questions.length).toBeGreaterThan(0);
      expect(Array.isArray(firstTopic.questions[0].options)).toBe(true);
    });

    it("returns 404 error for non-existent subject ID", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/catalog/subjects/non_existent_subject`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Предмет не найден");
    });
  });

  describe("GET /api/mock-exams filtering", () => {
    it("returns all mock exams when no filters are specified", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.mockExams)).toBe(true);
      expect(data.mockExams.length).toBeGreaterThanOrEqual(12);
    });

    it("filters mock exams by examType query parameter (OGE)", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?examType=OGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mockExams.length).toBeGreaterThan(0);
      for (const exam of data.mockExams) {
        expect(exam.examType).toBe("OGE");
      }
    });

    it("filters mock exams by exam_type query parameter (EGE)", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?exam_type=EGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mockExams.length).toBeGreaterThan(0);
      for (const exam of data.mockExams) {
        expect(exam.examType).toBe("EGE");
      }
    });

    it("filters mock exams by both subjectId and examType", async () => {
      const res = await globalThis.fetch(`${baseUrl}/api/mock-exams?subjectId=biology&examType=OGE`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mockExams.length).toBe(1);
      expect(data.mockExams[0].subjectId).toBe("biology");
      expect(data.mockExams[0].examType).toBe("OGE");
    });
  });
});
