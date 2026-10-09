import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { app } from "../../server/index.js";
import { db, initDb, resetDb } from "../../server/db.js";

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

describe("Final Production Audit - Security, Progress & Admin Persistence", () => {
  it("1. Student flow: register, solve test, progress persists on login and re-login", async () => {
    // Регистрация студента
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "audit_student@test.ru",
        password: "Password123!",
        name: "Аудит Студент",
        exam_type: "EGE",
      }),
    });
    expect(regRes.status).toBe(201);
    const _regData = await regRes.json();
    const cookie = getCookie(regRes);
    expect(cookie).toBeTruthy();

    // Решение обычного теста
    const attemptRes = await fetch(`${baseUrl}/api/progress/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ title: "Тригонометрия Часть 1", score: 8, total: 10 }),
    });
    expect(attemptRes.status).toBe(201);
    const attemptData = await attemptRes.json();
    expect(attemptData.testsSolved).toBe(1);
    expect(attemptData.avgPercent).toBe(80);

    // Проверка статистики
    const statsRes = await fetch(`${baseUrl}/api/progress/stats`, {
      headers: { Cookie: cookie },
    });
    expect(statsRes.status).toBe(200);
    const statsData = await statsRes.json();
    expect(statsData.testsSolved).toBe(1);
    expect(statsData.avgPercent).toBe(80);

    // Проверка истории попыток
    const historyRes = await fetch(`${baseUrl}/api/progress/attempts`, {
      headers: { Cookie: cookie },
    });
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.attempts.length).toBe(1);
    expect(historyData.attempts[0].title).toBe("Тригонометрия Часть 1");

    // Обновление профиля через PATCH /profile
    const updateProfileRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Аудит Студент Обновленный", avatar: "https://example.com/avatar.png" }),
    });
    expect(updateProfileRes.status).toBe(200);
    const updateProfileData = await updateProfileRes.json();
    expect(updateProfileData.user.name).toBe("Аудит Студент Обновленный");

    // Выход из системы
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(200);

    // Повторный вход нового клиента под этой же учетной записью
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "audit_student@test.ru", password: "Password123!" }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    const newCookie = getCookie(loginRes);
    expect(loginData.user.name).toBe("Аудит Студент Обновленный");

    // Прогресс полностью сохранился после повторного входа
    const reloadedStatsRes = await fetch(`${baseUrl}/api/progress/stats`, {
      headers: { Cookie: newCookie },
    });
    const reloadedStats = await reloadedStatsRes.json();
    expect(reloadedStats.testsSolved).toBe(1);
    expect(reloadedStats.avgPercent).toBe(80);

    const reloadedAttemptsRes = await fetch(`${baseUrl}/api/progress/attempts`, {
      headers: { Cookie: newCookie },
    });
    const reloadedAttempts = await reloadedAttemptsRes.json();
    expect(reloadedAttempts.attempts.length).toBe(1);
    expect(reloadedAttempts.attempts[0].title).toBe("Тригонометрия Часть 1");
  });

  it("2. Security: non-admin cannot access admin routes or manipulate questions", async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "audit_student2@test.ru", password: "Password123!", name: "Студент" }),
    });
    const studentCookie = getCookie(regRes);

    // Попытка зайти в дашборд админа
    const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Cookie: studentCookie },
    });
    expect(dashRes.status).toBe(403);

    // Попытка добавить вопрос админа
    const addQRes = await fetch(`${baseUrl}/api/admin/tests/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({
        examType: "EGE",
        subjectId: "math",
        taskNumber: 1,
        type: "single",
        question: "Неавторизованный вопрос",
        options: ["1", "2"],
        correctIndex: 0,
      }),
    });
    expect(addQRes.status).toBe(403);

    // Гость без авторизации получает 401
    const guestRes = await fetch(`${baseUrl}/api/admin/dashboard`);
    expect(guestRes.status).toBe(401);
  });

  it("3. Admin flow: admin creates question, stored in SQLite and visible in catalog", async () => {
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@examhub.ru", password: "admin" }),
    });
    expect(adminLogin.status).toBe(200);
    const adminCookie = getCookie(adminLogin);

    // Создание вопроса в БД
    const uniqueTitle = `Тестовая тема аудита ${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/api/admin/tests/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        examType: "EGE",
        subjectId: "math",
        topicTitle: uniqueTitle,
        taskNumber: 5,
        type: "single",
        question: "Сколько будет 7 * 8?",
        options: ["54", "56", "58", "60"],
        correctIndex: 1,
        explanation: "7 * 8 = 56",
        points: 1,
      }),
    });
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    const createdId = createData.question.id;

    // Вопрос найден в SQLite базе
    const dbQuestion = db.prepare("SELECT * FROM questions WHERE id = ?").get(createdId);
    expect(dbQuestion).toBeDefined();
    expect(dbQuestion.question).toBe("Сколько будет 7 * 8?");

    // Каталог предметов отдает тему с вопросом гостям и пользователям
    const catalogRes = await fetch(`${baseUrl}/api/catalog/subjects`);
    expect(catalogRes.status).toBe(200);
    const catalogData = await catalogRes.json();
    const mathSubj = catalogData.subjects.find((s) => s.id === "math");
    expect(mathSubj).toBeDefined();
    const createdTopic = mathSubj.topics.find((t) => t.title === uniqueTitle);
    expect(createdTopic).toBeDefined();
    expect(createdTopic.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("4. Upload security: whitelisted extensions only, path protection", async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "audit_student3@test.ru", password: "Password123!", name: "Студент 3" }),
    });
    const studentCookie = getCookie(regRes);

    // Загрузка обычного data:image/png
    const validPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const uploadRes = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({ image: validPng }),
    });
    expect(uploadRes.status).toBe(200);
    const uploadData = await uploadRes.json();
    expect(uploadData.success).toBe(true);
    expect(uploadData.url).toMatch(/^\/uploads\/work_\d+_\d+\.png$/);

    // Загрузка с неподдерживаемым/опасным расширением нормализуется в jpg
    const svgMimic = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    const uploadSvg = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({ image: svgMimic }),
    });
    expect(uploadSvg.status).toBe(200);
    const svgData = await uploadSvg.json();
    expect(svgData.url).toMatch(/^\/uploads\/work_\d+_\d+\.jpg$/);

    // Запрос к файлам бэкенда или БД защищен от LFI
    const dbFileRes = await fetch(`${baseUrl}/data/examhub.db`);
    expect(dbFileRes.status).toBe(404);

    const envRes = await fetch(`${baseUrl}/.env`);
    expect(envRes.status).toBe(404);
  });
});
