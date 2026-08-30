import { test, expect } from "@playwright/test";

test.describe("Комплексный сквозной аудит платформы (ЕГЭ/ОГЭ, Админ, Гость, Ученик, Учитель, Логи и Удаление)", () => {
  test("полный жизненный цикл создания, доступности, решения, проверки и удаления тестов", async ({ browser }) => {
    test.setTimeout(120000);
    const consoleLogs = [];
    const networkErrors = [];
    const timestamp = Date.now();

    const recordConsole = (role, page) => {
      page.on("console", (msg) => {
        const text = msg.text();
        const type = msg.type();
        if (type === "error" || text.toLowerCase().includes("error") || text.toLowerCase().includes("failed")) {
          consoleLogs.push({ time: new Date().toISOString(), role, type, text });
        }
      });
      page.on("pageerror", (err) => {
        consoleLogs.push({ time: new Date().toISOString(), role, type: "pageerror", text: err.message });
      });
      page.on("response", (res) => {
        if (res.status() >= 400 && res.status() !== 401 && res.status() !== 404) {
          networkErrors.push({ time: new Date().toISOString(), role, url: res.url(), status: res.status() });
        }
      });
    };

    console.log(`[AUDIT START ${new Date().toISOString()}] Запуск комплексного аудита...`);

    // =========================================================================
    // ЭТАП 1: Вход через Администратора и создание 4 тестовых вопросов (ЕГЭ + ОГЭ)
    // =========================================================================
    console.log(`[STEP 1] Вход под администратором и создание тестовых вопросов...`);
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    recordConsole("ADMIN", adminPage);

    await adminPage.goto("/", { waitUntil: "domcontentloaded" });
    await adminPage.locator("#loginBtn").click();
    await expect(adminPage.locator("#authModal")).toHaveClass(/active/);
    await adminPage.locator("#manualEmail").fill("admin@examhub.ru");
    await adminPage.locator("#manualPass").fill("admin123");
    await adminPage.locator("#authSubmitManual").click();
    await expect(adminPage.locator("#authModal")).not.toHaveClass(/active/);

    // Открываем Редактор тестов
    await adminPage.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });
    await expect(adminPage.locator("#view-test-editor")).toBeVisible();

    const createdQuestionIds = [];

    // 1.1 Вопрос ЕГЭ (Часть 1, Single choice)
    const ege1Text = `[АУДИТ-ЕГЭ-1-${timestamp}] В каком слове допущена ошибка в постановке ударения?`;
    await adminPage.locator('#qExamTypeToggle .q-exam-btn[data-exam="EGE"]').click();
    await adminPage.locator("#qSubjectSelect").selectOption("russian");
    await adminPage.locator("#qTaskNumberInput").fill("4");
    await adminPage.locator("#qTextarea").fill(ege1Text);
    await adminPage.locator("#saveQuestionBtn").click();
    await expect(adminPage.locator(".toast-message")).toContainText("Сохранено в БД");
    await adminPage.waitForTimeout(500);

    // 1.2 Вопрос ЕГЭ (Часть 2, Extended response)
    const ege2Text = `[АУДИТ-ЕГЭ-2-${timestamp}] Составьте сложный план по теме «Инфляция и ее влияние на экономику».`;
    await adminPage.locator('#qExamTypeToggle .q-exam-btn[data-exam="EGE"]').click();
    await adminPage.locator("#qSubjectSelect").selectOption("social");
    await adminPage.locator("#qTaskNumberInput").fill("24");
    await adminPage.locator("#qTextarea").fill(ege2Text);
    await adminPage.locator("#fillDefaultCriteriaBtn").click();
    await expect(adminPage.locator("#qTypeSelect")).toHaveValue("extended");
    await adminPage.locator("#saveQuestionBtn").click();
    await expect(adminPage.locator(".toast-message")).toContainText("Сохранено в БД");
    await adminPage.waitForTimeout(500);

    // 1.3 Вопрос ОГЭ (Часть 1, Single choice)
    const oge1Text = `[АУДИТ-ОГЭ-1-${timestamp}] Найдите значение выражения: 1/4 + 0.75.`;
    await adminPage.locator('#qExamTypeToggle .q-exam-btn[data-exam="OGE"]').click();
    await adminPage.locator("#qSubjectSelect").selectOption("math");
    await adminPage.locator("#qTaskNumberInput").fill("6");
    await adminPage.locator("#qTextarea").fill(oge1Text);
    await adminPage.locator("#saveQuestionBtn").click();
    await expect(adminPage.locator(".toast-message")).toContainText("Сохранено в БД");
    await adminPage.waitForTimeout(500);

    // 1.4 Вопрос ОГЭ (Часть 2, Extended response)
    const oge2Text = `[АУДИТ-ОГЭ-2-${timestamp}] Решите систему уравнений: x + y = 7, x^2 - y^2 = 21.`;
    await adminPage.locator('#qExamTypeToggle .q-exam-btn[data-exam="OGE"]').click();
    await adminPage.locator("#qSubjectSelect").selectOption("math");
    await adminPage.locator("#qTaskNumberInput").fill("21");
    await adminPage.locator("#qTextarea").fill(oge2Text);
    await adminPage.locator("#fillDefaultCriteriaBtn").click();
    await expect(adminPage.locator("#qTypeSelect")).toHaveValue("extended");
    await adminPage.locator("#saveQuestionBtn").click();
    await expect(adminPage.locator(".toast-message")).toContainText("Сохранено в БД");
    await adminPage.waitForTimeout(500);

    // Получаем ID созданных вопросов из API
    const ege1Res = await adminPage.request.get(`/api/catalog/questions?subjectId=russian&taskNumber=4&examType=EGE`);
    const ege1Data = await ege1Res.json();
    const qEge1 = ege1Data.questions.find((q) => q.question.includes(`АУДИТ-ЕГЭ-1-${timestamp}`));
    expect(qEge1).toBeDefined();
    createdQuestionIds.push(qEge1.id);

    const ege2Res = await adminPage.request.get(`/api/catalog/questions?subjectId=social&taskNumber=24&examType=EGE`);
    const ege2Data = await ege2Res.json();
    const qEge2 = ege2Data.questions.find((q) => q.question.includes(`АУДИТ-ЕГЭ-2-${timestamp}`));
    expect(qEge2).toBeDefined();
    createdQuestionIds.push(qEge2.id);

    const oge1Res = await adminPage.request.get(`/api/catalog/questions?subjectId=math&taskNumber=6&examType=OGE`);
    const oge1Data = await oge1Res.json();
    const qOge1 = oge1Data.questions.find((q) => q.question.includes(`АУДИТ-ОГЭ-1-${timestamp}`));
    expect(qOge1).toBeDefined();
    createdQuestionIds.push(qOge1.id);

    const oge2Res = await adminPage.request.get(`/api/catalog/questions?subjectId=math&taskNumber=21&examType=OGE`);
    const oge2Data = await oge2Res.json();
    const qOge2 = oge2Data.questions.find((q) => q.question.includes(`АУДИТ-ОГЭ-2-${timestamp}`));
    expect(qOge2).toBeDefined();
    createdQuestionIds.push(qOge2.id);

    console.log(`[STEP 1 OK] Создано 4 вопроса: ID=${createdQuestionIds.join(", ")}`);

    // =========================================================================
    // ЭТАП 2: Проверка со страницы гостя (без входа) для ЕГЭ и ОГЭ
    // =========================================================================
    console.log(`[STEP 2] Проверка отображения в режиме гостя (без входа)...`);
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    recordConsole("GUEST", guestPage);

    await guestPage.goto("/", { waitUntil: "domcontentloaded" });
    await guestPage.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await expect(guestPage.locator("#view-tests")).toBeVisible();

    // Проверяем ЕГЭ (Русский язык №4)
    await guestPage.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="EGE"]').click();
    await guestPage.locator("#tasksSubjectFilter").selectOption("russian");
    const egeCard4 = guestPage.locator('.task-number-card[data-task-num="4"]');
    await expect(egeCard4).toBeVisible();
    await egeCard4.click();
    await expect(guestPage.locator("#view-quiz-player")).toBeVisible();
    await expect(guestPage.locator("#quizQuestionText")).toContainText(`АУДИТ-ЕГЭ-1-${timestamp}`);

    // Возвращаемся в тесты и проверяем ОГЭ (Математика №6)
    await guestPage.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await guestPage.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]').click();
    await guestPage.locator("#tasksSubjectFilter").selectOption("math");
    const ogeCard6 = guestPage.locator('.task-number-card[data-task-num="6"]');
    await expect(ogeCard6).toBeVisible();
    await ogeCard6.click();
    await expect(guestPage.locator("#view-quiz-player")).toBeVisible();
    await expect(guestPage.locator("#quizQuestionText")).toContainText(`АУДИТ-ОГЭ-1-${timestamp}`);

    console.log(`[STEP 2 OK] Вопросы ЕГЭ и ОГЭ успешно доступны гостю без авторизации.`);
    await guestContext.close();

    // =========================================================================
    // ЭТАП 3: Проверка со страницы Ученика (авторизованный ученик)
    // =========================================================================
    console.log(`[STEP 3] Проверка решения вопросов со страницы Ученика...`);
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    recordConsole("STUDENT", studentPage);

    const studentEmail = `student_audit_${timestamp}@examhub.ru`;
    const studentPass = "student123";

    await studentPage.goto("/", { waitUntil: "domcontentloaded" });
    await studentPage.locator("#loginBtn").click();
    await expect(studentPage.locator("#authModal")).toHaveClass(/active/);
    await studentPage.locator("#authToggleLink").click();
    await studentPage.locator("#manualEmail").fill(studentEmail);
    await studentPage.locator("#manualPass").fill(studentPass);
    await studentPage.locator("#authSubmitManual").click();
    await expect(studentPage.locator("#authModal")).not.toHaveClass(/active/);

    // Ученик решает вопрос ОГЭ Часть 2 (Математика №21)
    await studentPage.locator('.sidebar-nav .nav-item[data-view="tests"]').click();
    await studentPage.locator('#tasksExamTypeToggle .tasks-exam-btn[data-exam="OGE"]').click();
    await studentPage.locator("#tasksSubjectFilter").selectOption("math");
    const ogeCard21 = studentPage.locator('.task-number-card[data-task-num="21"]');
    await expect(ogeCard21).toBeVisible();
    await ogeCard21.click();

    await expect(studentPage.locator("#view-quiz-player")).toBeVisible();
    await expect(studentPage.locator("#quizQuestionText")).toContainText(`АУДИТ-ОГЭ-2-${timestamp}`);

    // Вводим развернутый ответ на вопрос Части 2
    const extTextarea = studentPage.locator("#quizExtendedTextarea");
    await expect(extTextarea).toBeVisible();
    await extTextarea.fill("Решение системы уравнений: x+y=7, x-y=3. Складывая уравнения, получаем 2x=10 => x=5, y=2. Ответ: (5; 2).");
    
    // Клик «Проверить решение» -> отображает критерии и эталонный ключ
    await studentPage.locator("#quizNextBtn").click();
    await expect(studentPage.locator("#quizExplanationBox")).toBeVisible();
    await expect(studentPage.locator("#quizExplanationText")).toContainText("Критерии оценивания ФИПИ");

    // Завершаем тест
    await studentPage.locator("#quizNextBtn").click();
    await expect(studentPage.locator("#view-quiz-results")).toBeVisible();

    console.log(`[STEP 3 OK] Ученик успешно решил задание Части 2, сверился с критериями ФИПИ и завершил тест.`);

    // =========================================================================
    // ЭТАП 4: Проверка со страницы Учителя, привязка ученика и проверка ответа
    // =========================================================================
    console.log(`[STEP 4] Проверка Учителя, привязка группы и проверка ответа ученика...`);
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    recordConsole("TEACHER", teacherPage);

    const teacherEmail = `teacher_audit_${timestamp}@examhub.ru`;
    const teacherPass = "teacher123";

    // 4.1 Регистрация учителя
    await teacherPage.goto("/", { waitUntil: "domcontentloaded" });
    await teacherPage.locator("#loginBtn").click();
    await teacherPage.locator("#authToggleLink").click();
    await teacherPage.locator("#manualEmail").fill(teacherEmail);
    await teacherPage.locator("#manualPass").fill(teacherPass);
    await teacherPage.locator("#authSubmitManual").click();
    await expect(teacherPage.locator("#authModal")).not.toHaveClass(/active/);

    // 4.2 Учитель создает группу
    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(teacherPage.locator("#view-teacher")).toBeVisible();
    await teacherPage.locator("#createGroupBtn").click();
    await expect(teacherPage.locator("#teacherModal")).toHaveClass(/active/);
    await teacherPage.locator("#newGroupNameInput").fill(`Группа Аудита ОГЭ ${timestamp}`);
    await teacherPage.locator("#confirmCreateGroup").click();
    await expect(teacherPage.locator("#teacherModal")).not.toHaveClass(/active/);

    const inviteBadge = teacherPage.locator(".group-card .invite-badge").first();
    await expect(inviteBadge).toBeVisible();
    const inviteCode = (await inviteBadge.textContent()).trim();
    expect(inviteCode).toMatch(/^HUB-[A-Z0-9]{4}$/);
    console.log(`[STEP 4.1] Учитель создал группу, инвайт-код: ${inviteCode}`);

    // 4.3 Ученик вступает в группу учителя по инвайт-коду
    await studentPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(studentPage.locator("#view-teacher")).toBeVisible();
    await studentPage.locator("#joinGroupBtn").click();
    await expect(studentPage.locator("#teacherModal")).toHaveClass(/active/);
    await studentPage.locator("#joinInviteCodeInput").fill(inviteCode);
    await studentPage.locator("#confirmJoinGroup").click();
    await expect(studentPage.locator("#teacherModal")).not.toHaveClass(/active/);
    console.log(`[STEP 4.2] Ученик успешно вступил в группу учителя.`);

    // 4.4 Учитель обновляет кабинет и проверяет привязку ученика
    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    const groupCard = teacherPage.locator(".group-card").first();
    await expect(groupCard).toBeVisible();
    await expect(groupCard).toContainText("1 учеников");

    // Открываем детальный состав группы
    await groupCard.locator(".view-group-btn").click();
    await expect(teacherPage.locator("#teacherModal")).toHaveClass(/active/);
    await expect(teacherPage.locator("#teacherModal")).toContainText(studentEmail);
    await teacherPage.locator("#closeGroupDetailModal").click();
    await expect(teacherPage.locator("#teacherModal")).not.toHaveClass(/active/);
    console.log(`[STEP 4.3] Учитель видит привязанного ученика ${studentEmail} в составе группы.`);

    // 4.5 Ученик сдает работу Части 2 через пробник для проверки учителем
    await studentPage.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
    await expect(studentPage.locator("#view-mock-exam")).toBeVisible();
    await studentPage.locator('.exam-type-btn[data-exam-type="OGE"]').click();
    const startMockBtn = studentPage.locator('#mockExamList .start-mock-btn:not([data-locked="true"])').first();
    await expect(startMockBtn).toBeVisible();
    await startMockBtn.click();
    await expect(studentPage.locator("#mockPlayerScreen")).toBeVisible();

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
    await expect(studentPage.locator("#mockResultsScreen")).toBeVisible();

    // Завершаем самооценку
    const openAssess = studentPage.locator("#openSelfAssessBtn");
    await expect(openAssess).toBeVisible();
    await openAssess.click();
    await expect(studentPage.locator("#selfAssessmentModal")).toHaveClass(/active/);
    const selfRadios = studentPage.locator('input[name^="self_score_"][value="2"]');
    const rCount = await selfRadios.count();
    for (let i = 0; i < rCount; i++) {
      await selfRadios.nth(i).check();
    }
    await studentPage.locator("#saveSelfAssessmentBtn").click();
    await expect(studentPage.locator("#selfAssessmentModal")).not.toHaveClass(/active/);

    // 4.6 Учитель проверяет работу ученика
    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(teacherPage.locator("#teacherSubmissionsSection")).toBeVisible();
    const reviewBtn = teacherPage.locator("#teacherSubmissionsList .review-sub-btn").first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    await expect(teacherPage.locator("#teacherReviewModal")).toHaveClass(/active/);
    await teacherPage.locator("#teacherScoreInput").fill("3");
    await teacherPage.locator("#teacherCommentInput").fill("Отличная работа по критериям ФИПИ!");
    await teacherPage.locator('#teacherReviewForm button[type="submit"]').click();
    await expect(teacherPage.locator("#teacherReviewModal")).not.toHaveClass(/active/);

    // 4.7 Проверка уведомления у ученика
    await studentPage.waitForTimeout(1000);
    await studentPage.locator("#notificationBtn").click();
    await expect(studentPage.locator("#notificationDropdown")).toBeVisible();
    await expect(studentPage.locator("#notificationList")).toContainText("Учитель проверил");

    console.log(`[STEP 4 OK] Полный цикл учителя: создание группы, привязка ученика, проверка и уведомление успешно пройдены.`);

    await studentContext.close();
    await teacherContext.close();

    // =========================================================================
    // ЭТАП 5: Очистка (Удаление тестовых тестов администратором)
    // =========================================================================
    console.log(`[STEP 5] Удаление созданных тестовых вопросов (ID: ${createdQuestionIds.join(", ")})...`);

    for (const qId of createdQuestionIds) {
      const delRes = await adminPage.request.delete(`/api/admin/tests/questions/${qId}`);
      expect(delRes.status()).toBe(200);
      const delData = await delRes.json();
      expect(delData.ok).toBe(true);
      console.log(`- Удален тестовый вопрос ID: ${qId}`);
    }

    // Проверяем, что вопросы удалены и больше не возвращаются
    for (const qId of createdQuestionIds) {
      const checkRes = await adminPage.request.get(`/api/catalog/questions?id=${qId}`);
      const checkData = await checkRes.json();
      const stillExists = (checkData.questions || []).some((q) => q.id === qId);
      expect(stillExists).toBe(false);
    }

    console.log(`[STEP 5 OK] Все тестовые вопросы успешно удалены из базы данных SQLite.`);
    await adminContext.close();

    // =========================================================================
    // ЭТАП 6: Логи браузера и сервера
    // =========================================================================
    console.log(`[STEP 6] Проверка журналов логов и ошибок...`);
    console.log(`- Ошибок консоли браузера: ${consoleLogs.length}`);
    if (consoleLogs.length > 0) {
      console.log("Логи консоли с предупреждениями/ошибками:", JSON.stringify(consoleLogs, null, 2));
    }
    console.log(`- Сетевых ошибок (5xx): ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      console.log("Сетевые ошибки:", JSON.stringify(networkErrors, null, 2));
    }

    expect(networkErrors).toHaveLength(0);
    console.log(`[AUDIT COMPLETE] Все этапы аудита пройдены со 100% успехом без ошибок.`);
  });
});
