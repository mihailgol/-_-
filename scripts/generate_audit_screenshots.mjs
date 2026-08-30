import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

import { spawn } from "child_process";

const artifactDir = "C:\\Users\\мишка\\.gemini\\antigravity\\brain\\412fd7e6-4f07-49ed-97be-b6653b289b3a";
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

console.log("Запуск генерации скриншотов аудита в директорию:", artifactDir);

let serverProcess = null;
try {
  const health = await fetch("http://localhost:8000/api/health").catch(() => null);
  if (!health || health.status !== 200) {
    console.log("Запуск локального сервера...");
    serverProcess = spawn("node", ["server/index.js"], {
      stdio: "inherit",
      env: { ...process.env, PORT: "8000" },
    });
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch("http://localhost:8000/api/health").catch(() => null);
      if (res && res.status === 200) break;
    }
  }
} catch (e) {
  console.log("Серверная проверка:", e.message);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();
const timestamp = Date.now();
const createdIds = [];

try {
  // 1. Вход админа и Редактор тестов ЕГЭ
  console.log("1. Создание скриншота: Конструктор тестов ЕГЭ...");
  await page.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
  await page.locator("#loginBtn").click();
  await page.locator("#manualEmail").fill("admin@examhub.ru");
  await page.locator("#manualPass").fill("admin123");
  await page.locator("#authSubmitManual").click();
  await page.waitForTimeout(1000);

  await page.evaluate(async () => {
    const { switchView } = await import("/js/modules/navigation.js");
    const { initTestEditor } = await import("/js/modules/test-editor.js");
    switchView("test-editor");
    initTestEditor();
  });
  await page.waitForTimeout(500);

  // Заполняем задание ЕГЭ №24
  await page.locator('#qExamTypeToggle .q-exam-btn[data-exam="EGE"]').click();
  await page.locator("#qSubjectSelect").selectOption("social");
  await page.locator("#qTaskNumberInput").fill("24");
  const ege2Text = `[АУДИТ-ЕГЭ-2-${timestamp}] Составьте сложный план по теме «Инфляция и ее влияние на экономику».`;
  await page.locator("#qTextarea").fill(ege2Text);
  await page.locator("#fillDefaultCriteriaBtn").click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(artifactDir, "01_admin_test_editor_ege.png") });

  await page.locator("#saveQuestionBtn").click();
  await page.waitForTimeout(800);

  // Заполняем задание ОГЭ №21
  console.log("2. Создание скриншота: Конструктор тестов ОГЭ...");
  await page.locator('#qExamTypeToggle .q-exam-btn[data-exam="OGE"]').click();
  await page.locator("#qSubjectSelect").selectOption("math");
  await page.locator("#qTaskNumberInput").fill("21");
  const oge2Text = `[АУДИТ-ОГЭ-2-${timestamp}] Решите систему уравнений: x + y = 7, x^2 - y^2 = 21.`;
  await page.locator("#qTextarea").fill(oge2Text);
  await page.locator("#fillDefaultCriteriaBtn").click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(artifactDir, "02_admin_test_editor_oge.png") });

  await page.locator("#saveQuestionBtn").click();
  await page.waitForTimeout(800);

  // Получаем ID созданных вопросов
  const qList = await page.request.get("http://localhost:8000/api/catalog/questions");
  const qData = await qList.json();
  (qData.questions || []).forEach((q) => {
    if (q.question.includes(String(timestamp))) {
      createdIds.push(q.id);
    }
  });

  // 3. Проверка раздела «Тесты» без входа (Гость) — ЕГЭ
  console.log("3. Создание скриншота: Раздел Тесты ЕГЭ (Гость)...");
  await page.evaluate(() => {
    localStorage.clear();
    location.reload();
  });
  await page.waitForTimeout(1500);

  await page.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
  await page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="EGE"]').click();
  await page.locator("#tasksSubjectFilter").selectOption("social");
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(artifactDir, "03_guest_tests_grid_ege.png") });

  // 4. Проверка раздела «Тесты» без входа (Гость) — ОГЭ
  console.log("4. Создание скриншота: Раздел Тесты ОГЭ (Гость)...");
  await page.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]').click();
  await page.locator("#tasksSubjectFilter").selectOption("math");
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(artifactDir, "04_guest_tests_grid_oge.png") });

  // 5. Решение задания Части 2 учеником со сверкой по критериям ФИПИ
  console.log("5. Создание скриншота: Решение задания Части 2 учеником...");
  await page.locator('.task-number-card[data-task-num="21"]').click();
  await page.waitForTimeout(1000);

  const extTextarea = page.locator("#quizExtendedTextarea");
  await extTextarea.fill("Складываем уравнения: x=5, y=2. Ответ: (5; 2).");
  await page.locator("#quizNextBtn").click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(artifactDir, "05_student_quiz_part2_solving.png") });

  // 6. Учитель: регистрация, создание группы и привязка ученика
  console.log("6. Создание скриншота: Кабинет учителя и привязка группы...");
  const teacherContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  const teacherPage = await teacherContext.newPage();
  const teacherEmail = `teacher_${timestamp}@examhub.ru`;
  const studentEmail = `student_${timestamp}@examhub.ru`;

  // Регистрация учителя
  await teacherPage.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
  await teacherPage.locator("#loginBtn").click();
  await teacherPage.locator("#authToggleLink").click();
  await teacherPage.locator("#manualEmail").fill(teacherEmail);
  await teacherPage.locator("#manualPass").fill("teacher123");
  await teacherPage.locator("#authSubmitManual").click();
  await teacherPage.waitForTimeout(1000);

  await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
  await teacherPage.locator("#createGroupBtn").click();
  await teacherPage.locator("#newGroupNameInput").fill("11-А Обществознание и Математика");
  await teacherPage.locator("#confirmCreateGroup").click();
  await teacherPage.waitForTimeout(1000);

  const inviteCode = (await teacherPage.locator(".group-card .invite-badge").first().textContent()).trim();

  // Регистрация ученика и вступление в группу
  const studentContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  const studentPage = await studentContext.newPage();
  await studentPage.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
  await studentPage.locator("#loginBtn").click();
  await studentPage.locator("#authToggleLink").click();
  await studentPage.locator("#manualEmail").fill(studentEmail);
  await studentPage.locator("#manualPass").fill("student123");
  await studentPage.locator("#authSubmitManual").click();
  await studentPage.waitForTimeout(1000);

  await studentPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
  await studentPage.locator("#joinGroupBtn").click();
  await studentPage.locator("#joinInviteCodeInput").fill(inviteCode);
  await studentPage.locator("#confirmJoinGroup").click();
  await studentPage.waitForTimeout(1000);

  // Ученик сдает работу через пробник
  await studentPage.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
  await studentPage.locator('.exam-type-btn[data-exam-type="OGE"]').click();
  await studentPage.locator('#mockExamList .start-mock-btn:not([data-locked="true"])').first().click();
  await studentPage.waitForTimeout(800);

  const mockNavs = studentPage.locator(".mock-nav-item");
  const mockCount = await mockNavs.count();
  for (let i = 0; i < mockCount; i++) {
    await mockNavs.nth(i).click();
    const mockExt = studentPage.locator("#mockExtendedInput");
    if (await mockExt.isVisible()) {
      await mockExt.fill("Развернутый ответ ученика по критериям ФИПИ для проверки учителем.");
    }
  }
  studentPage.on("dialog", (d) => d.accept());
  await studentPage.locator("#mockSubmitBtn").click();
  await studentPage.waitForTimeout(800);

  await studentPage.locator("#openSelfAssessBtn").click();
  const selfRadios = studentPage.locator('input[name^="self_score_"][value="2"]');
  const rCount = await selfRadios.count();
  for (let i = 0; i < rCount; i++) {
    await selfRadios.nth(i).check();
  }
  await studentPage.locator("#saveSelfAssessmentBtn").click();
  await studentPage.waitForTimeout(1000);

  // Скриншот кабинета учителя со списком группы
  await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
  await teacherPage.waitForTimeout(1000);
  await teacherPage.screenshot({ path: path.join(artifactDir, "06_teacher_cabinet_groups_students.png") });

  // 7. Проверка работы учителем
  console.log("7. Создание скриншота: Модальное окно проверки учителем...");
  await teacherPage.locator("#teacherSubmissionsList .review-sub-btn").first().click();
  await teacherPage.waitForTimeout(800);
  await teacherPage.locator("#teacherScoreInput").fill("3");
  await teacherPage.locator("#teacherCommentInput").fill("Отличная работа! Все критерии ФИПИ выполнены безупречно.");

  await teacherPage.screenshot({ path: path.join(artifactDir, "07_teacher_review_modal.png") });

  await teacherPage.locator('#teacherReviewForm button[type="submit"]').click();
  await teacherPage.waitForTimeout(1000);

  // 8. Уведомление у ученика
  console.log("8. Создание скриншота: Уведомление у ученика...");
  await studentPage.locator("#notificationBtn").click();
  await studentPage.waitForTimeout(800);
  await studentPage.screenshot({ path: path.join(artifactDir, "08_student_notification_received.png") });

  // 9. Удаление созданных вопросов и скриншот чистоты БД
  console.log("9. Очистка тестовых данных...");
  for (const qId of createdIds) {
    await page.request.delete(`http://localhost:8000/api/admin/tests/questions/${qId}`);
    console.log(`Удален вопрос ${qId}`);
  }

  await teacherContext.close();
  await studentContext.close();
  console.log("✅ Все 8 скриншотов успешно созданы и сохранены в директорию артефактов!");
} catch (err) {
  console.error("Ошибка при генерации скриншотов:", err);
} finally {
  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
}
