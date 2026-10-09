import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { initDb, resetDb } from "../../server/db.js";

let server;
let baseUrl;

function getCookie(res, name = "examhub_session") {
  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,\s*/);
  for (const c of cookies) {
    const pair = c.split(";")[0].trim();
    if (pair.startsWith(`${name}=`)) {
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

describe("Top 5 Improvements for Teacher & Student Ecosystem", () => {
  it("1. Teacher creates group, student joins via code, student sees my-groups", async () => {
    // 1. Учитель создает группу
    const teacherRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "feat_teacher@test.ru", password: "Password123!", name: "Иван Учитель" }),
    });
    const teacherCookie = getCookie(teacherRes);

    const groupRes = await fetch(`${baseUrl}/api/teacher/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: teacherCookie },
      body: JSON.stringify({ name: "11-А Профиль" }),
    });
    expect(groupRes.status).toBe(200);
    const groupData = await groupRes.json();
    const inviteCode = groupData.group.inviteCode;
    const groupId = groupData.group.id;
    expect(inviteCode).toMatch(/^HUB-[A-Z0-9]{4}$/);

    // 2. Ученик регистрируется
    const studentRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "feat_student@test.ru", password: "Password123!", name: "Петр Ученик" }),
    });
    const studentCookie = getCookie(studentRes);

    // 3. Ученик вступает по коду
    const joinRes = await fetch(`${baseUrl}/api/teacher/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({ inviteCode }),
    });
    expect(joinRes.status).toBe(200);
    const joinData = await joinRes.json();
    expect(joinData.success).toBe(true);

    // 4. Ученик видит группу в /api/teacher/my-groups
    const myGroupsRes = await fetch(`${baseUrl}/api/teacher/my-groups`, {
      headers: { Cookie: studentCookie },
    });
    expect(myGroupsRes.status).toBe(200);
    const myGroupsData = await myGroupsRes.json();
    expect(myGroupsData.groups.length).toBe(1);
    expect(myGroupsData.groups[0].name).toBe("11-А Профиль");
    expect(myGroupsData.groups[0].teacher_name).toBe("Иван Учитель");

    // 5. Учитель выгружает ведомость в CSV
    const exportRes = await fetch(`${baseUrl}/api/teacher/groups/${groupId}/export`, {
      headers: { Cookie: teacherCookie },
    });
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get("content-type")).toContain("text/csv");
    const csvContent = await exportRes.text();
    expect(csvContent).toContain("ФИО ученика;Email;Дата вступления");
    expect(csvContent).toContain("Петр Ученик");
    expect(csvContent).toContain("feat_student@test.ru");
  });

  it("2. Client modules: reference materials and draft recovery functions are exported and resilient", async () => {
    const refModule = await import("../../js/modules/reference-materials.js");
    expect(typeof refModule.openReferenceMaterials).toBe("function");
    expect(typeof refModule.switchRefTab).toBe("function");
    expect(typeof refModule.initReferenceMaterialsEvents).toBe("function");

    const quizModule = await import("../../js/modules/quiz.js");
    expect(typeof quizModule.saveQuizDraft).toBe("function");
    expect(typeof quizModule.clearQuizDraft).toBe("function");
    expect(typeof quizModule.hasQuizDraft).toBe("function");
    expect(typeof quizModule.resumeQuizFromDraft).toBe("function");

    const mockModule = await import("../../js/modules/mock-exam.js");
    expect(typeof mockModule.saveMockDraft).toBe("function");
    expect(typeof mockModule.clearMockDraft).toBe("function");
  });
});
