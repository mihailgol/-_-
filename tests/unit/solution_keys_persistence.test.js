import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb, db } from "../../server/db.js";

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

describe("Solution Keys & Criteria Persistence in Database & API", () => {
  it("verifies solution_key, criteria_json, max_points in SQLite database", () => {
    const questions = db.prepare("SELECT * FROM questions").all();
    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      expect(q.solution_key, `Question ${q.id} missing solution_key`).toBeDefined();
      expect(typeof q.solution_key).toBe("string");
      expect(q.solution_key.length).toBeGreaterThan(0);
      expect(q.max_points).toBeGreaterThanOrEqual(1);

      if (q.type === "extended") {
        expect(q.criteria_json, `Extended question ${q.id} missing criteria_json`).toBeDefined();
        const parsed = JSON.parse(q.criteria_json);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns questions with solutionKey, maxPoints, and criteria from API endpoints", async () => {
    const res = await fetch(`${baseUrl}/api/catalog/questions`);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.questions).toBeDefined();
    expect(data.questions.length).toBeGreaterThan(0);

    for (const q of data.questions) {
      expect(q.solutionKey, `Question ${q.id} missing solutionKey`).toBeDefined();
      expect(typeof q.solutionKey).toBe("string");
      expect(q.solutionKey.length).toBeGreaterThan(0);
      expect(q.maxPoints).toBeGreaterThanOrEqual(1);

      if (q.type === "extended") {
        expect(q.criteria, `Extended question ${q.id} missing criteria`).toBeDefined();
        expect(Array.isArray(q.criteria)).toBe(true);
        expect(q.criteria.length).toBeGreaterThan(0);
      }
    }
  });
});
