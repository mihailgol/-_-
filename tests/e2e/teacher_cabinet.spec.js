import { test, expect } from "@playwright/test";

test.describe("Teacher Cabinet — Groups & Assignments", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("переход в раздел Кабинет учителя из сайдбара", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(page.locator("#view-teacher")).toBeVisible();
    await expect(page.locator("#view-teacher h2")).toContainText("Кабинет Учителя и Репетитора");
  });

  test("открывает модальное окно создания группы", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await page.locator("#createGroupBtn").click();
    await expect(page.locator("#newGroupNameInput")).toBeVisible();
  });

  test("открывает модальное окно входа в группу по коду", async ({ page }) => {
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await page.locator("#joinGroupBtn").click();
    await expect(page.locator("#joinInviteCodeInput")).toBeVisible();
  });

  test("сквозной цикл: создание группы, вступление ученика, сдача Части 2, самооценка, проверка учителем и уведомление", async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    const teacherEmail = `teacher_${Date.now()}@examhub.ru`;
    const studentEmail = `student_${Date.now()}@examhub.ru`;
    const password = "password123";

    // 1. Учитель регистрируется и переключает роль
    await teacherPage.goto("/", { waitUntil: "domcontentloaded" });
    await teacherPage.locator("#loginBtn").click();
    await expect(teacherPage.locator("#authModal")).toHaveClass(/active/);
    await teacherPage.locator("#authToggleLink").click();
    await teacherPage.locator("#manualEmail").fill(teacherEmail);
    await teacherPage.locator("#manualPass").fill(password);
    await teacherPage.locator("#authSubmitManual").click();
    await expect(teacherPage.locator("#authModal")).not.toHaveClass(/active/);

    // Учитель создает группу
    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(teacherPage.locator("#view-teacher")).toBeVisible();
    await teacherPage.locator("#createGroupBtn").click();
    await expect(teacherPage.locator("#teacherModal")).toHaveClass(/active/);
    await teacherPage.locator("#newGroupNameInput").fill("11-А Профильная биология");
    await teacherPage.locator("#confirmCreateGroup").click();
    await expect(teacherPage.locator("#teacherModal")).not.toHaveClass(/active/);

    // Получаем сгенерированный инвайт-код группы
    const inviteBadge = teacherPage.locator(".group-card .invite-badge").first();
    await expect(inviteBadge).toBeVisible();
    const inviteCode = (await inviteBadge.textContent()).trim();
    expect(inviteCode).toMatch(/^HUB-[A-Z0-9]{4}$/);

    // 2. Ученик регистрируется и вступает в группу учителя
    await studentPage.goto("/", { waitUntil: "domcontentloaded" });
    await studentPage.locator("#loginBtn").click();
    await expect(studentPage.locator("#authModal")).toHaveClass(/active/);
    await studentPage.locator("#authToggleLink").click();
    await studentPage.locator("#manualEmail").fill(studentEmail);
    await studentPage.locator("#manualPass").fill(password);
    await studentPage.locator("#authSubmitManual").click();
    await expect(studentPage.locator("#authModal")).not.toHaveClass(/active/);

    await studentPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(studentPage.locator("#view-teacher")).toBeVisible();
    await studentPage.locator("#joinGroupBtn").click();
    await expect(studentPage.locator("#teacherModal")).toHaveClass(/active/);
    await studentPage.locator("#joinInviteCodeInput").fill(inviteCode);
    await studentPage.locator("#confirmJoinGroup").click();
    await expect(studentPage.locator("#teacherModal")).not.toHaveClass(/active/);

    // 3. Ученик проходит пробник с Частью 2
    await studentPage.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
    await expect(studentPage.locator("#view-mock-exam")).toBeVisible();
    await studentPage.locator('.exam-type-btn[data-exam-type="OGE"]').click();
    await expect(studentPage.locator("#mockExamList .mock-exam-card").first()).toBeVisible();

    const startBtn = studentPage.locator('#mockExamList .start-mock-btn:not([data-locked="true"])').first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await expect(studentPage.locator("#mockPlayerScreen")).toBeVisible();

    // Заполняем развернутые ответы на вопросы Части 2
    const navItems = studentPage.locator(".mock-nav-item");
    const totalQuestions = await navItems.count();
    for (let i = 0; i < totalQuestions; i++) {
      await navItems.nth(i).click();
      const textarea = studentPage.locator("#mockExtendedInput");
      if (await textarea.isVisible()) {
        await textarea.fill("Устьица обеспечивают газообмен и транспирацию. Замыкающие клетки регулируют открытие щели.");
      }
    }

    // Завершаем экзамен
    studentPage.on("dialog", (d) => d.accept());
    await studentPage.locator("#mockSubmitBtn").click();
    await expect(studentPage.locator("#mockResultsScreen")).toBeVisible();

    // 4. Самооценка по критериям ФИПИ
    const openSelfAssessBtn = studentPage.locator("#openSelfAssessBtn");
    await expect(openSelfAssessBtn).toBeVisible();
    await openSelfAssessBtn.click();
    await expect(studentPage.locator("#selfAssessmentModal")).toHaveClass(/active/);
    await expect(studentPage.locator("#selfAssessmentBody")).toContainText("Задание №");

    // Выбираем балл самооценки 2 б. для вопросов Части 2
    const radios = studentPage.locator('input[name^="self_score_"][value="2"]');
    const radioCount = await radios.count();
    for (let i = 0; i < radioCount; i++) {
      await radios.nth(i).check();
    }
    await studentPage.locator("#saveSelfAssessmentBtn").click();
    await expect(studentPage.locator("#selfAssessmentModal")).not.toHaveClass(/active/);

    // 5. Учитель заходит в кабинет и видит работу ученика на проверку
    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(teacherPage.locator("#teacherSubmissionsSection")).toBeVisible();

    const reviewBtn = teacherPage.locator("#teacherSubmissionsList .review-sub-btn").first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Открывается модалка проверки
    await expect(teacherPage.locator("#teacherReviewModal")).toHaveClass(/active/);
    await expect(teacherPage.locator("#teacherReviewBody")).toContainText("Условие задания:");
    await expect(teacherPage.locator("#teacherReviewBody")).toContainText("Устьица обеспечивают газообмен");

    // Учитель ставит оценку 3 и пишет комментарий
    await teacherPage.locator("#teacherScoreInput").fill("3");
    await teacherPage.locator("#teacherCommentInput").fill("Отличный полный ответ, все критерии ФИПИ учтены!");
    await teacherPage.locator('#teacherReviewForm button[type="submit"]').click();
    await expect(teacherPage.locator("#teacherReviewModal")).not.toHaveClass(/active/);

    // 6. Ученик получает уведомление
    await studentPage.waitForTimeout(1000);
    await studentPage.locator("#notificationBtn").click();
    await expect(studentPage.locator("#notificationDropdown")).toBeVisible();
    await expect(studentPage.locator("#notificationList")).toContainText("Учитель проверил");
    await expect(studentPage.locator("#notificationList")).toContainText("Оценка: 3 б.");

    await teacherContext.close();
    await studentContext.close();
  });
});
