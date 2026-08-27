import { test, expect } from "@playwright/test";

/**
 * Вспомогательная функция для строгого мониторинга консоли и сети (Zero-Error Guard).
 * Фиксирует все ошибки JS, console.error/warn и сетевые сбои 4xx/5xx.
 */
function setupZeroErrorGuard(page, errorsList) {
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    // Игнорируем стандартные подсказки браузера об автокомплите паролей
    if (text.includes("autocomplete") || text.includes("Password field")) return;
    if (type === "error") {
      errorsList.push(`[Console Error]: ${text}`);
    } else if (type === "warning" && !text.includes("DevTools")) {
      errorsList.push(`[Console Warning]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    errorsList.push(`[Unhandled Exception]: ${err.message}\n${err.stack || ""}`);
  });

  page.on("response", (res) => {
    const url = res.url();
    const status = res.status();
    // Отслеживаем неожиданные ошибки бэкенда (4xx и 5xx)
    if (status >= 400 && !url.includes("favicon.ico") && !url.includes("chrome-extension")) {
      errorsList.push(`[HTTP ${status}]: ${res.request().method()} ${url}`);
    }
  });
}

test.describe("🤖 Autonomous UX Bot — Full Platform Audit with Zero-Error Guard", () => {
  test("1. Гостевой сценарий: Каталог, Переключатель ОГЭ/ЕГЭ, Поиск, Конспекты и Корзина (Desktop + Mobile)", async ({ page }) => {
    const errorLogs = [];
    setupZeroErrorGuard(page, errorLogs);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#view-subjects")).toBeVisible();

    // 1.1 Проверка переключателя ОГЭ / ЕГЭ
    const ogeToggle = page.locator('#examTypeToggle .exam-type-btn[data-exam-type="OGE"]');
    await ogeToggle.click();
    await expect(ogeToggle).toHaveClass(/active/);

    const egeToggle = page.locator('#examTypeToggle .exam-type-btn[data-exam-type="EGE"]');
    await egeToggle.click();
    await expect(egeToggle).toHaveClass(/active/);

    // 1.2 Глобальный поиск с клавиатурным вводом
    const searchInput = page.locator("#globalSearch");
    await searchInput.click();
    await searchInput.fill("Цитология");
    const searchDropdown = page.locator("#searchDropdown");
    await expect(searchDropdown).toBeVisible();
    await expect(searchDropdown).toHaveClass(/active/);
    await searchInput.fill("");

    // 1.3 Переход в карточку предмета и чтение конспекта
    await page.locator("#heroStartBtn").click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();

    const noteCard = page.locator(".note-item-card").first();
    await noteCard.click();
    await expect(page.locator("#view-note-reader")).toBeVisible();
    await page.locator("#noteReaderBackBtn").click();
    await expect(page.locator("#view-subject-detail")).toBeVisible();

    // 1.4 Добавление курса в корзину и проверка промокода
    await page.locator('.sidebar-nav .nav-item[data-view="cart"]').click();
    await expect(page.locator("#view-cart")).toBeVisible();
    const promoInput = page.locator("#cartPromoInput");
    if (await promoInput.isVisible()) {
      await promoInput.fill("EXAM2026");
      await page.locator("#cartApplyPromoBtn").click();
    }

    // 1.5 Проверка мобильной адаптивности (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileBottomNav = page.locator(".mobile-bottom-nav");
    await expect(mobileBottomNav).toBeVisible();
    await page.locator('.mobile-bottom-nav .mobile-nav-item[data-view="videos"]').click();
    await expect(page.locator("#view-videos")).toBeVisible();

    // Возврат в Desktop разрешение
    await page.setViewportSize({ width: 1280, height: 800 });

    // Проверка отсутствия ошибок консоли и сети
    expect(errorLogs).toEqual([]);
  });

  test("2. Сценарий ученика: Авторизация, Решение тестов, Часть 2 с прикреплением фото решения и самооценка", async ({ page }) => {
    const errorLogs = [];
    setupZeroErrorGuard(page, errorLogs);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // 2.1 Регистрация нового тестового аккаунта
    await page.locator("#loginBtn").click();
    await expect(page.locator("#authModal")).toHaveClass(/active/);
    await page.locator("#authToggleLink").click();

    const randomSuffix = Date.now().toString().slice(-6);
    const studentEmail = `student_${randomSuffix}@examhub.ru`;

    await page.locator("#manualEmail").fill(studentEmail);
    await page.locator("#manualPass").fill("testpass123");
    await page.locator("#authSubmitManual").click();

    await expect(page.locator("#authModal")).not.toHaveClass(/active/);
    await expect(page.locator("#logoutBtn")).toBeVisible();

    // 2.2 Переход в раздел пробных экзаменов
    await page.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
    await expect(page.locator("#view-mock-exam")).toBeVisible();

    await page.locator('.exam-type-btn[data-exam-type="OGE"]').click();
    await expect(page.locator("#mockExamList .mock-exam-card").first()).toBeVisible();

    const startBtn = page.locator('#mockExamList .start-mock-btn:not([data-locked="true"])').first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page.locator("#mockPlayerScreen")).toBeVisible();

    // Переход к заданию Части 2
    const navItems = page.locator(".mock-nav-item");
    const count = await navItems.count();
    if (count > 0) {
      await navItems.nth(count - 1).click();
    }

    const textarea = page.locator("#mockExtendedInput");
    if (await textarea.isVisible()) {
      await textarea.fill("Развернутый ответ ученика по биологии для проверки по критериям ФИПИ");
    }

    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#mockSubmitBtn").click();
    await expect(page.locator("#mockResultsScreen")).toBeVisible();

    // 2.3 Открытие модалки самооценки
    const selfAssessBtn = page.locator("#openSelfAssessBtn");
    if (await selfAssessBtn.isVisible()) {
      await selfAssessBtn.click();
      await expect(page.locator("#selfAssessmentModal")).toHaveClass(/active/);

      // Прикрепление фотографии работы
      const photoInput = page.locator(".work-photo-input").first();
      if (await photoInput.isVisible()) {
        const buffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        );
        await photoInput.setInputFiles({
          name: "test_blank_part2.png",
          mimeType: "image/png",
          buffer,
        });

        const previewImg = page.locator(".photo-previews-container img.preview-work-img").first();
        await expect(previewImg).toBeVisible();

        // Проверка лайтбокса фото
        await previewImg.click();
        await expect(page.locator("#imageLightboxModal")).toHaveClass(/active/);
        await page.locator("#imageLightboxModal .modal-close-btn").click();
        await expect(page.locator("#imageLightboxModal")).not.toHaveClass(/active/);
      }

      // Сохранение результатов самооценки
      await page.locator("#saveSelfAssessmentBtn").click();
      await expect(page.locator("#selfAssessmentModal")).not.toHaveClass(/active/);
    }

    // 2.4 Проверка личного кабинета
    await page.locator("#sidebarUserBlock").click();
    await expect(page.locator("#view-profile")).toBeVisible();
    await expect(page.locator("#profileHeaderName")).toBeVisible();

    expect(errorLogs).toEqual([]);
  });

  test("3. Сценарий учителя: Создание группы, просмотр очереди работ и проверка Части 2 с фото", async ({ page }) => {
    const errorLogs = [];
    setupZeroErrorGuard(page, errorLogs);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // 3.1 Вход под аккаунтом учителя
    await page.locator("#loginBtn").click();
    await page.locator("#manualEmail").fill("teacher@examhub.ru");
    await page.locator("#manualPass").fill("teacher123");
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    // 3.2 Переход в кабинет учителя
    await page.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await expect(page.locator("#view-teacher")).toBeVisible();

    // 3.3 Создание учебной группы
    const createGroupBtn = page.locator("#createGroupBtn");
    if (await createGroupBtn.isVisible()) {
      await createGroupBtn.click();
      await expect(page.locator("#teacherModal")).toHaveClass(/active/);
      await page.locator("#newGroupNameInput").fill("Группа подготовки 11-А");
      await page.locator("#confirmCreateGroup").click();
      await expect(page.locator("#teacherModal")).not.toHaveClass(/active/);
    }

    // 3.4 Проверка очереди сданных работ
    const reviewBtn = page.locator(".review-sub-btn").first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await expect(page.locator("#teacherReviewModal")).toHaveClass(/active/);

      // Проверка фото бланка ученика
      const attachedPhoto = page.locator(".attached-work-photo").first();
      if (await attachedPhoto.isVisible()) {
        await attachedPhoto.click();
        await expect(page.locator("#imageLightboxModal")).toHaveClass(/active/);
        await page.locator("#imageLightboxModal .modal-close-btn").click();
        await expect(page.locator("#imageLightboxModal")).not.toHaveClass(/active/);
      }

      // Выставление оценки и комментария
      const commentInput = page.locator(".teacher-comment-input").first();
      if (await commentInput.isVisible()) {
        await commentInput.fill("Работа проверена. Ответ соответствует критериям ФИПИ.");
      }

      await page.locator("#saveTeacherReviewBtn").click();
      await expect(page.locator("#teacherReviewModal")).not.toHaveClass(/active/);
    }

    expect(errorLogs).toEqual([]);
  });

  test("4. Сценарий администратора: Сводка, Конструктор тестов Части 2, Редактор теории и Настройки", async ({ page }) => {
    const errorLogs = [];
    setupZeroErrorGuard(page, errorLogs);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // 4.1 Авторизация администратора
    await page.locator("#loginBtn").click();
    await page.locator("#manualEmail").fill("admin@examhub.ru");
    await page.locator("#manualPass").fill("admin123");
    await page.locator("#authSubmitManual").click();
    await expect(page.locator("#authModal")).not.toHaveClass(/active/);

    // 4.2 Переход в админ-панель
    await page.locator("#sidebarAdminBtn").click();
    await expect(page.locator("#view-admin")).toBeVisible();

    // 4.3 Переключение всех вкладок админки
    const tabs = ["users", "teachers", "subscriptions", "theory", "questions", "tests", "analytics", "support", "settings"];
    for (const tab of tabs) {
      const tabBtn = page.locator(`button[data-admin-tab="${tab}"]`);
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await expect(tabBtn).toHaveClass(/active/);
      }
    }

    // 4.4 Создание вопроса в Конструкторе тестов
    await page.evaluate(async () => {
      const { switchView } = await import("/js/modules/navigation.js");
      const { initTestEditor } = await import("/js/modules/test-editor.js");
      switchView("test-editor");
      initTestEditor();
    });

    await expect(page.locator("#view-test-editor")).toBeVisible();
    await page.locator("#qSubjectSelect").selectOption("chemistry");
    await page.locator("#qTaskNumberInput").fill("33");
    await page.locator("#fillDefaultCriteriaBtn").click();

    await expect(page.locator("#qTypeSelect")).toHaveValue("extended");
    await expect(page.locator("#extSolutionKeyInput")).toBeVisible();
    await expect(page.locator("#extCriteriaInput")).toBeVisible();

    await page.locator("#qTextarea").fill("Расчетная задача по химии на нахождение массовой доли веществ в растворе.");
    await page.locator("#saveQuestionBtn").click();

    expect(errorLogs).toEqual([]);
  });

  test("5. Chaos / Stress & Layout Sanity: Темы, История браузера, Esc модалок и Bounding Boxes", async ({ page }) => {
    const errorLogs = [];
    setupZeroErrorGuard(page, errorLogs);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // 5.1 Стресс-переключение тем (Dark / Light)
    const darkBtn = page.locator('.theme-toggle-btn[data-theme-val="dark"]');
    const lightBtn = page.locator('.theme-toggle-btn[data-theme-val="light"]');
    for (let i = 0; i < 3; i++) {
      if (await darkBtn.isVisible()) await darkBtn.click();
      if (await lightBtn.isVisible()) await lightBtn.click();
    }

    // 5.2 Закрытие модального окна по Escape и клику вне окна
    await page.locator("#sidebarPremiumBtn").click();
    await expect(page.locator("#premiumModal")).toHaveClass(/active/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#premiumModal")).not.toHaveClass(/active/);

    // 5.3 Быстрая навигация по истории браузера
    await page.locator('.sidebar-nav .nav-item[data-view="notes"]').click();
    await expect(page.locator("#view-notes")).toBeVisible();

    await page.locator('.sidebar-nav .nav-item[data-view="videos"]').click();
    await expect(page.locator("#view-videos")).toBeVisible();

    await page.goBack();
    await expect(page.locator("#view-notes")).toBeVisible();

    await page.goForward();
    await expect(page.locator("#view-videos")).toBeVisible();

    // 5.4 Проверка отсутствия перекрытий и нулевых размеров ключевых контейнеров
    const headerBox = await page.locator("header.top-bar").boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox.height).toBeGreaterThan(30);

    const sidebarBox = await page.locator("aside.sidebar").boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(sidebarBox.width).toBeGreaterThan(150);

    expect(errorLogs).toEqual([]);
  });
});
