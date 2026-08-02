import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { resetDb, initDb } from "../../server/db.js";

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

describe("Teacher / Tutor Cabinet API", () => {
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

  it("creates a group and returns unique invite code", async () => {
    const teacher = await registerUser("Мария Ивановна", "teacher1@example.com");

    const res = await globalThis.fetch(`${baseUrl}/api/teacher/groups`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: teacher.cookie,
      },
      body: JSON.stringify({ name: "11-А Математика" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.group).toBeDefined();
    expect(data.group.name).toBe("11-А Математика");
    expect(data.group.inviteCode).toMatch(/^HUB-[A-Z0-9]{4}$/);

    const listRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups`, {
      headers: { cookie: teacher.cookie },
    });
    const listData = await listRes.json();
    expect(listData.groups.length).toBe(1);
    expect(listData.groups[0].name).toBe("11-А Математика");
  });

  it("allows student to join a group using invite code", async () => {
    const teacher = await registerUser("Пётр Алексеевич", "teacher2@example.com");
    const student = await registerUser("Алексей Студент", "student1@example.com");

    const groupRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: teacher.cookie,
      },
      body: JSON.stringify({ name: "10-Б Физика" }),
    });
    const { group } = await groupRes.json();

    const joinRes = await globalThis.fetch(`${baseUrl}/api/teacher/join`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: student.cookie,
      },
      body: JSON.stringify({ inviteCode: group.inviteCode }),
    });

    expect(joinRes.status).toBe(200);
    const joinData = await joinRes.json();
    expect(joinData.success).toBe(true);

    const detailRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups/${group.id}`, {
      headers: { cookie: teacher.cookie },
    });
    const detailData = await detailRes.json();
    expect(detailData.members.length).toBe(1);
    expect(detailData.members[0].name).toBe("Алексей Студент");
  });

  it("allows teacher to create assignments and view group details", async () => {
    const teacher = await registerUser("Ольга Сергеевна", "teacher3@example.com");

    const groupRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: teacher.cookie,
      },
      body: JSON.stringify({ name: "ЕГЭ Биология" }),
    });
    const { group } = await groupRes.json();

    const assignRes = await globalThis.fetch(`${baseUrl}/api/teacher/assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: teacher.cookie,
      },
      body: JSON.stringify({
        groupId: group.id,
        title: "Домашнее задание: Строение клетки",
        subjectId: "biology",
        dueDate: "2026-08-10",
      }),
    });

    expect(assignRes.status).toBe(200);
    const assignData = await assignRes.json();
    expect(assignData.assignment.title).toBe("Домашнее задание: Строение клетки");

    const detailRes = await globalThis.fetch(`${baseUrl}/api/teacher/groups/${group.id}`, {
      headers: { cookie: teacher.cookie },
    });
    const detailData = await detailRes.json();
    expect(detailData.assignments.length).toBe(1);
    expect(detailData.assignments[0].title).toBe("Домашнее задание: Строение клетки");
  });
});
