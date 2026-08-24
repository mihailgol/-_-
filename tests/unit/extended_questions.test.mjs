import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb, db } from "../../server/db.js";

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

describe("Extended Response Questions (Part 2) & Teacher Review System", () => {
  async function registerUser(name, email) {
    const res = await globalThis.fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123", name }),
    });
    const cookie = getCookieValue(res, "examhub_session");
    const data = await res.json();
    return { cookie, user: data.user };
  }

  it("handles student submission of Part 2, self-assessment, teacher review and notification flow", async () => {
    // 1. Register teacher and student
    const teacher = await registerUser("Учитель Биологии", "teacher_ext@test.com");

    // Switch teacher role
    await globalThis.fetch(`${baseUrl}/api/teacher/switch-role`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify({ role: "Учитель" }),
    });

    // Teacher creates group
    const groupRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify({ name: "11-А Биология" }),
    });
    const groupData = await groupRes.json();
    const inviteCode = groupData.group.inviteCode;

    // Register student
    const student = await registerUser("Иван Студент", "student_ext@test.com");

    // Student joins teacher's group
    await globalThis.fetch(`${baseUrl}/api/teacher/join`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({ inviteCode }),
    });

    // 2. Create mock exam with extended response question
    const extQuestion = {
      id: "q_part2_bio",
      question: "Задание 22. Объясните значение метафазы митоза.",
      type: "extended",
      maxPoints: 3,
      solutionKey: "1) Хромосомы на экваторе. 2) Нити веретена деления. 3) Равное деление.",
      criteria: [{ code: "K1", title: "Описание фазы", maxPoints: 3 }],
    };

    const examData = {
      id: "mock_bio_ext_test",
      subjectId: "biology",
      title: "Пробник с Частью 2",
      examType: "EGE",
      durationMinutes: 235,
      totalQuestions: 1,
      isPremium: 0,
      questions: [extQuestion],
    };

    await globalThis.fetch(`${baseUrl}/api/mock-exams`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify(examData),
    });

    // 3. Student submits mock exam with text answer
    const submitRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/mock_bio_ext_test/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({
        answers: { q_part2_bio: "Мой подробный развернутый ответ на вопрос по митозу" },
        timeSpentSeconds: 300,
      }),
    });

    expect(submitRes.status).toBe(200);
    const submitData = await submitRes.json();
    expect(submitData.hasExtendedQuestions).toBe(true);
    expect(submitData.extendedQuestions.length).toBe(1);
    expect(submitData.extendedQuestions[0].studentAnswer).toContain("развернутый ответ");

    const attemptId = submitData.attemptId;
    expect(attemptId).toBeTruthy();

    // 4. Student completes self-assessment (gives self 2 points)
    const selfAssessRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/mock_bio_ext_test/self-assess`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({
        attemptId,
        selfScores: {
          q_part2_bio: { score: 2, breakdown: { score: 2 } },
        },
      }),
    });

    expect(selfAssessRes.status).toBe(200);
    const selfData = await selfAssessRes.json();
    expect(selfData.primaryScore).toBe(2);

    // Verify record in extended_submissions table
    const subRecord = db.prepare("SELECT * FROM extended_submissions WHERE user_id = ?").get(student.user.id);
    expect(subRecord).toBeTruthy();
    expect(subRecord.student_answer).toContain("развернутый ответ");
    expect(subRecord.self_score).toBe(2);
    expect(subRecord.status).toBe("self_assessed");

    // 5. Teacher fetches submissions
    const teacherSubsRes = await globalThis.fetch(`${baseUrl}/api/teacher/submissions`, {
      headers: { cookie: teacher.cookie },
    });

    expect(teacherSubsRes.status).toBe(200);
    const teacherSubsData = await teacherSubsRes.json();
    expect(teacherSubsData.submissions.length).toBe(1);

    const submissionId = teacherSubsData.submissions[0].id;
    expect(teacherSubsData.submissions[0].selfScore).toBe(2);

    // 6. Teacher reviews submission (gives 3 points and comment)
    const reviewRes = await globalThis.fetch(`${baseUrl}/api/teacher/submissions/${submissionId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify({
        teacherScore: 3,
        teacherComment: "Отличная работа! Все критерии соблюдены.",
      }),
    });

    expect(reviewRes.status).toBe(200);
    const reviewData = await reviewRes.json();
    expect(reviewData.teacherScore).toBe(3);

    // 7. Student fetches notifications
    const notifRes = await globalThis.fetch(`${baseUrl}/api/notifications`, {
      headers: { cookie: student.cookie },
    });

    expect(notifRes.status).toBe(200);
    const notifData = await notifRes.json();
    expect(notifData.unreadCount).toBe(1);
    expect(notifData.notifications[0].title).toContain("Учитель проверил");
    expect(notifData.notifications[0].message).toContain("Оценка: 3 б.");
  });

  it("allows admin to create an extended Part 2 question via POST /api/admin/tests/questions", async () => {
    // 1. Admin login
    const loginRes = await globalThis.fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@examhub.ru", password: "admin123" }),
    });

    expect(loginRes.status).toBe(200);
    const adminCookie = getCookieValue(loginRes, "examhub_session");

    // 2. Create extended Part 2 question
    const createRes = await globalThis.fetch(`${baseUrl}/api/admin/tests/questions`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        subjectId: "math",
        taskNumber: 13,
        type: "extended",
        question: "Решите тригонометрическое уравнение 2sin²x + 3cosx = 0.",
        solutionKey: "а) x = ±2π/3 + 2πk; б) 7π/3, 8π/3.",
        maxPoints: 2,
        criteria: [{ code: "K1", title: "Обоснованно получены ответы", maxPoints: 2 }],
        explanation: "Подстановка cosx = t.",
      }),
    });

    expect(createRes.status).toBe(201);

    // 3. Verify in SQLite database
    const savedQ = db.prepare("SELECT * FROM questions WHERE task_number = 13 AND type = 'extended' ORDER BY id DESC LIMIT 1").get();
    expect(savedQ).toBeDefined();
    expect(savedQ.type).toBe("extended");
    expect(savedQ.points).toBe(2);

    const parsedAnswer = JSON.parse(savedQ.correct_answer_json);
    expect(parsedAnswer.solutionKey).toContain("±2π/3");
    expect(parsedAnswer.maxPoints).toBe(2);
  });
});
