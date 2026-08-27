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

describe("Student Work Photo Upload & Teacher Review API", () => {
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

  it("successfully uploads a photo via POST /api/upload", async () => {
    const student = await registerUser("Студент Фото", "photo_student@test.com");

    const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await globalThis.fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({ image: sampleBase64 }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.url).toMatch(/^\/uploads\/work_\d+_\d+\.png$/);
  });

  it("stores attached photos in extended_submissions during self-assessment and exposes them to teacher", async () => {
    // 1. Setup teacher & group
    const teacher = await registerUser("Репетитор Задач", "teacher_photo@test.com");
    await globalThis.fetch(`${baseUrl}/api/teacher/switch-role`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify({ role: "Репетитор" }),
    });

    const groupRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify({ name: "Группа 10-Б" }),
    });
    const groupData = await groupRes.json();

    // 2. Setup student
    const student = await registerUser("Анна Студентка", "anna_photo@test.com");
    await globalThis.fetch(`${baseUrl}/api/teacher/join`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({ inviteCode: groupData.group.inviteCode }),
    });

    // 3. Create mock exam
    const extQuestion = {
      id: "q_photo_1",
      question: "Задание 25 (Часть 2). Решите физическую задачу и приложите фото рисунка.",
      type: "extended",
      maxPoints: 3,
      solutionKey: "1) Вторая закон Ньютона. 2) Чертеж. 3) Ответ 24 Н.",
    };

    await globalThis.fetch(`${baseUrl}/api/mock-exams`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: teacher.cookie },
      body: JSON.stringify({
        id: "mock_photo_exam",
        subjectId: "physics",
        title: "Физика с фото",
        examType: "EGE",
        durationMinutes: 235,
        totalQuestions: 1,
        isPremium: 0,
        questions: [extQuestion],
      }),
    });

    // 4. Submit mock exam
    const submitRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/mock_photo_exam/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({
        answers: { q_photo_1: "Решение приложено на фотографиях бланка 2" },
        timeSpentSeconds: 120,
      }),
    });
    const submitData = await submitRes.json();
    const attemptId = submitData.attemptId;

    // 5. Upload photo & save self-assessment with attached photos
    const uploadRes = await globalThis.fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({
        image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      }),
    });
    const photoData = await uploadRes.json();

    const selfAssessRes = await globalThis.fetch(`${baseUrl}/api/mock-exams/mock_photo_exam/self-assess`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: student.cookie },
      body: JSON.stringify({
        attemptId,
        selfScores: { q_photo_1: { score: 3, breakdown: { score: 3 } } },
        attachedPhotos: { q_photo_1: [photoData.url] },
      }),
    });
    expect(selfAssessRes.status).toBe(200);

    // 6. Verify in DB
    const dbSub = db.prepare("SELECT * FROM extended_submissions WHERE user_id = ?").get(student.user.id);
    expect(dbSub.attached_photos_json).toContain(photoData.url);

    // 7. Teacher gets submissions and sees attached photos
    const teacherSubsRes = await globalThis.fetch(`${baseUrl}/api/teacher/submissions`, {
      headers: { cookie: teacher.cookie },
    });
    expect(teacherSubsRes.status).toBe(200);
    const teacherSubsData = await teacherSubsRes.json();
    expect(teacherSubsData.submissions[0].attachedPhotos).toContain(photoData.url);
  });
});
