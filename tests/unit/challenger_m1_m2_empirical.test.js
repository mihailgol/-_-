import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { initDb, db } from "../../server/db.js";
import { getDefaultFIPITemplate } from "../../js/modules/test-editor.js";

let server;
let baseUrl;
const adminToken = "admin_session_token";
let studentToken;
let teacherToken;

const ALL_SUBJECTS = [
  "math",
  "russian",
  "biology",
  "chemistry",
  "physics",
  "informatics",
  "social",
  "history",
  "literature",
  "geography",
];

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
  initDb();

  const expiresAt = new Date(Date.now() + 864e5).toISOString();

  // Ensure Admin session exists
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@examhub.ru");
  if (admin) {
    db.prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
      adminToken,
      admin.id,
      expiresAt
    );
  }

  // Student session
  let student = db.prepare("SELECT id FROM users WHERE email = 'student_test@examhub.ru'").get();
  if (!student) {
    const res = db.prepare(
      "INSERT INTO users (email, password_hash, name, role, status) VALUES ('student_test@examhub.ru', 'hash123', 'Student Test', 'STUDENT', 'active')"
    ).run();
    student = { id: Number(res.lastInsertRowid) };
  }
  studentToken = `test_student_tok_${Date.now()}`;
  db.prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    studentToken,
    student.id,
    expiresAt
  );

  // Teacher session
  let teacher = db.prepare("SELECT id FROM users WHERE email = 'teacher_test@examhub.ru'").get();
  if (!teacher) {
    const res = db.prepare(
      "INSERT INTO users (email, password_hash, name, role, status) VALUES ('teacher_test@examhub.ru', 'hash123', 'Teacher Test', 'TEACHER', 'active')"
    ).run();
    teacher = { id: Number(res.lastInsertRowid) };
  }
  teacherToken = `test_teacher_tok_${Date.now()}`;
  db.prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    teacherToken,
    teacher.id,
    expiresAt
  );
});

describe("Challenger 1 Empirical Challenge Suite", () => {
  describe("Mission 2: FIPI Criteria Autofill getDefaultFIPITemplate Comprehensive Stress-Test", () => {
    it("exhaustively tests 600 combinations (10 subjects x 2 exam modes x 30 task numbers)", () => {
      let testedCombinations = 0;
      const parsedStats = {
        totalParsedCriteria: 0,
        subjectsCovered: new Set(),
        examTypesCovered: new Set(),
      };

      for (const subject of ALL_SUBJECTS) {
        for (const examType of ["EGE", "OGE"]) {
          for (let taskNumber = 1; taskNumber <= 30; taskNumber++) {
            const template = getDefaultFIPITemplate(subject, taskNumber, examType);

            expect(template).toBeDefined();
            expect(typeof template).toBe("object");

            // 1. Verify solutionKey
            expect(typeof template.solutionKey).toBe("string");
            expect(template.solutionKey.trim().length).toBeGreaterThan(15);
            expect(template.solutionKey).toContain("Элементы ответа");

            // 2. Verify maxPoints
            expect(typeof template.maxPoints).toBe("number");
            expect(Number.isFinite(template.maxPoints)).toBe(true);
            expect(Number.isNaN(template.maxPoints)).toBe(false);
            expect(template.maxPoints).toBeGreaterThanOrEqual(2);
            expect(template.maxPoints).toBeLessThanOrEqual(10);

            // 3. Verify topicTitle
            expect(typeof template.topicTitle).toBe("string");
            expect(template.topicTitle.trim().length).toBeGreaterThan(5);
            expect(template.topicTitle).toContain("Задание №");

            // 4. Verify criteriaText
            expect(typeof template.criteriaText).toBe("string");
            expect(template.criteriaText.trim().length).toBeGreaterThan(10);
            expect(template.criteriaText).toContain("K1:");

            // 5. Parse criteria text line by line according to FIPI specification
            const lines = template.criteriaText.split("\n").filter(Boolean);
            expect(lines.length).toBeGreaterThanOrEqual(2);

            let sumCriteriaPoints = 0;
            const parsedCriteria = lines.map((line, idx) => {
              const matchPoints = line.match(/\((\d+)\s*б/i);
              const pts = matchPoints ? parseInt(matchPoints[1], 10) : 1;
              return {
                code: `K${idx + 1}`,
                title: line.replace(/^K\d+:\s*/i, "").trim(),
                maxPoints: pts,
              };
            });

            for (let i = 0; i < parsedCriteria.length; i++) {
              const crit = parsedCriteria[i];
              expect(crit.code).toBe(`K${i + 1}`);
              expect(crit.title.length).toBeGreaterThan(3);
              expect(Number.isFinite(crit.maxPoints)).toBe(true);
              expect(Number.isNaN(crit.maxPoints)).toBe(false);
              expect(crit.maxPoints).toBeGreaterThanOrEqual(1);
              sumCriteriaPoints += crit.maxPoints;
              parsedStats.totalParsedCriteria++;
            }

            expect(sumCriteriaPoints).toBeGreaterThanOrEqual(2);
            parsedStats.subjectsCovered.add(subject);
            parsedStats.examTypesCovered.add(examType);
            testedCombinations++;
          }
        }
      }

      expect(testedCombinations).toBe(600);
      expect(parsedStats.subjectsCovered.size).toBe(10);
      expect(parsedStats.examTypesCovered.size).toBe(2);
      expect(parsedStats.totalParsedCriteria).toBeGreaterThanOrEqual(1200);
    });

    it("verifies edge case and abnormal inputs for getDefaultFIPITemplate without crashing", () => {
      const edgeCases = [
        { sub: "unknown_subject", task: 1, exam: "EGE" },
        { sub: "", task: 1, exam: "EGE" },
        { sub: null, task: null, exam: null },
        { sub: undefined, task: undefined, exam: undefined },
        { sub: "MATH", task: "15", exam: "oge" },
        { sub: "BiOlOgY", task: 0, exam: "EGE" },
        { sub: "physics", task: -10, exam: "EGE" },
        { sub: "social", task: 9999, exam: "OGE" },
        { sub: "russian", task: "NaN_task", exam: "OGE" },
      ];

      for (const ec of edgeCases) {
        const res = getDefaultFIPITemplate(ec.sub, ec.task, ec.exam);
        expect(res).toBeDefined();
        expect(typeof res.solutionKey).toBe("string");
        expect(typeof res.topicTitle).toBe("string");
        expect(typeof res.criteriaText).toBe("string");
        expect(typeof res.maxPoints).toBe("number");
        expect(Number.isNaN(res.maxPoints)).toBe(false);
        expect(res.criteriaText).toContain("K1:");
      }
    });
  });

  describe("Mission 1: Admin Questions API Adversarial Stress-Testing", () => {
    describe("Authentication & Authorization Enforcement", () => {
      it("rejects unauthenticated GET /api/admin/tests/questions with 401", async () => {
        const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`);
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe("Требуется авторизация");
      });

      it("rejects unauthenticated PATCH /api/admin/tests/questions/:id with 401", async () => {
        const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/q1`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: "Hacked" }),
        });
        expect(res.status).toBe(401);
      });

      it("rejects student role accessing GET /api/admin/tests/questions with 403", async () => {
        const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        });
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain("Администратора");
      });

      it("rejects teacher role accessing GET /api/admin/tests/questions with 403", async () => {
        const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
          headers: { Authorization: `Bearer ${teacherToken}` },
        });
        expect(res.status).toBe(403);
      });

      it("rejects student role patching questions with 403", async () => {
        const res = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions/q1`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${studentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: "Student patch" }),
        });
        expect(res.status).toBe(403);
      });
    });

    describe("Filter Edge Cases & Robustness (GET /api/admin/tests/questions)", () => {
      it("handles unknown/non-existent subject ID without error (returns empty array)", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?subjectId=non_existent_subject_999`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
        expect(data.questions.length).toBe(0);
      });

      it("handles non-numeric task numbers gracefully", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?taskNumber=not_a_number`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
      });

      it("handles Cyrillic keywords in search query (q)", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?q=${encodeURIComponent("уравнение")}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
      });

      it("handles SQL injection payloads, quotes, and symbols in search query (q)", async () => {
        const maliciousPayloads = [
          "' OR 1=1 --",
          "'; DROP TABLE questions; --",
          "\" OR \"\"=\"",
          "<script>alert('xss')</script>",
          "%00%27%22",
          "🚀✨🎉💎",
          "\\\\///\\\\\\",
          "null",
          "undefined",
          "   ",
        ];

        for (const payload of maliciousPayloads) {
          const res = await globalThis.fetch(
            `${baseUrl}/api/admin/tests/questions?q=${encodeURIComponent(payload)}`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
          );
          if (res.status !== 200) {
            console.error(`Payload failed with status ${res.status}:`, payload);
          }
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(Array.isArray(data.questions)).toBe(true);
        }
      });

      it("handles empty query parameters without errors", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?subjectId=&taskNumber=&q=&type=`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
        expect(data.questions.length).toBeGreaterThan(0);
      });

      it("handles filter values set to 'all'", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?subjectId=all&taskNumber=all&type=all`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
        expect(data.questions.length).toBeGreaterThan(0);
      });

      it("handles invalid/unknown question type filter (returns empty array)", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?type=unknown_quantum_type`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
        expect(data.questions.length).toBe(0);
      });

      it("handles multi-word search queries with whitespace in q", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions?q=${encodeURIComponent("математика 1")}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.questions)).toBe(true);
      });
    });

    describe("Patch Edge Cases & 404 Handling (PATCH /api/admin/tests/questions/:id)", () => {
      it("returns 404 for non-existent question ID", async () => {
        const res = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/definitely_not_existing_id_999`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ question: "Updated" }),
          }
        );
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toBe("Вопрос не найден");
      });

      it("handles empty body PATCH on existing question without corruption", async () => {
        const listRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(listRes.status).toBe(200);
        const listData = await listRes.json();
        const targetQ = listData.questions[0];
        expect(targetQ).toBeDefined();

        const patchRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );
        expect(patchRes.status).toBe(200);
        const patchData = await patchRes.json();
        expect(patchData.ok).toBe(true);
        expect(patchData.id).toBe(targetQ.id);

        const verifyRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        const verifyData = await verifyRes.json();
        expect(verifyData.question.question).toBe(targetQ.question);
        expect(verifyData.question.task_number).toBe(targetQ.task_number);
      });

      it("handles Unicode, Cyrillic, and emoji payloads in PATCH", async () => {
        const listRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(listRes.status).toBe(200);
        const listData = await listRes.json();
        const targetQ = listData.questions[0];
        expect(targetQ).toBeDefined();

        const unicodeText = "🔬 Задача по биохимии: Рассчитайте выход ATP ⚡ при гликолизе 🧪 & фотосинтезе 🌿 [K_1: 2 б.]";
        const patchRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question: unicodeText,
              explanation: "Пояснение с формулами: C6H12O6 + 6O2 -> 6CO2 + 6H2O + 38 ATP ✨",
            }),
          }
        );
        expect(patchRes.status).toBe(200);

        const verifyRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        const verifyData = await verifyRes.json();
        expect(verifyData.question.question).toBe(unicodeText);
        expect(verifyData.question.explanation).toContain("C6H12O6");
      });

      it("handles subject and topic reassignment via PATCH", async () => {
        const listRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const listData = await listRes.json();
        const targetQ = listData.questions[0];

        const patchRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subjectId: "biology",
              taskNumber: 22,
            }),
          }
        );
        expect(patchRes.status).toBe(200);

        const verifyRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        const verifyData = await verifyRes.json();
        expect(verifyData.question.subject_id).toBe("biology");
        expect(verifyData.question.task_number).toBe(22);
      });

      it("handles criteria_json as string and criteria as array interchangeably", async () => {
        const listRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const listData = await listRes.json();
        const targetQ = listData.questions[0];

        const criteriaArr = [
          { code: "K1", title: "Правильный ход рассуждений", maxPoints: 2 },
          { code: "K2", title: "Верные числовые расчеты", maxPoints: 1 },
        ];

        // 1. Array format
        const patchArrRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "extended",
              criteria: criteriaArr,
              solutionKey: "Ключ решения",
            }),
          }
        );
        expect(patchArrRes.status).toBe(200);

        let verifyRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        let verifyData = await verifyRes.json();
        expect(JSON.parse(verifyData.question.criteria_json)).toEqual(criteriaArr);

        // 2. String format
        const patchStrRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              criteria_json: JSON.stringify(criteriaArr),
            }),
          }
        );
        expect(patchStrRes.status).toBe(200);

        verifyRes = await globalThis.fetch(
          `${baseUrl}/api/admin/tests/questions/${targetQ.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        verifyData = await verifyRes.json();
        expect(JSON.parse(verifyData.question.criteria_json)).toEqual(criteriaArr);
      });
    });
  });
});
