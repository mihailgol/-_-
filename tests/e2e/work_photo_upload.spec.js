import { test, expect } from "@playwright/test";

test.describe("Student Work Photo Upload & Teacher Review E2E", () => {
  test("student uploads handwritten work photo during self-assessment and teacher reviews attached photo", async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    const timestamp = Date.now();
    const teacherEmail = `t_photo_${timestamp}@examhub.ru`;
    const studentEmail = `s_photo_${timestamp}@examhub.ru`;
    const password = "password123";

    // 1. Teacher registers & creates group
    await teacherPage.goto("/", { waitUntil: "domcontentloaded" });
    await teacherPage.locator("#loginBtn").click();
    await teacherPage.locator("#authToggleLink").click();
    await teacherPage.locator("#manualEmail").fill(teacherEmail);
    await teacherPage.locator("#manualPass").fill(password);
    await teacherPage.locator("#authSubmitManual").click();
    await expect(teacherPage.locator("#authModal")).not.toHaveClass(/active/);

    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await teacherPage.locator("#createGroupBtn").click();
    await teacherPage.locator("#newGroupNameInput").fill("11-Б Физика с фото");
    await teacherPage.locator("#confirmCreateGroup").click();

    const inviteBadge = teacherPage.locator(".group-card .invite-badge").first();
    await expect(inviteBadge).toBeVisible();
    const inviteCode = (await inviteBadge.textContent()).trim();

    // 2. Student registers and joins group
    await studentPage.goto("/", { waitUntil: "domcontentloaded" });
    await studentPage.locator("#loginBtn").click();
    await studentPage.locator("#authToggleLink").click();
    await studentPage.locator("#manualEmail").fill(studentEmail);
    await studentPage.locator("#manualPass").fill(password);
    await studentPage.locator("#authSubmitManual").click();
    await expect(studentPage.locator("#authModal")).not.toHaveClass(/active/);

    await studentPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await studentPage.locator("#joinGroupBtn").click();
    await studentPage.locator("#joinInviteCodeInput").fill(inviteCode);
    await studentPage.locator("#confirmJoinGroup").click();

    // 3. Student goes to mock exams and launches OGE/EGE test with Part 2
    await studentPage.locator('.sidebar-nav .nav-item[data-view="mock-exam"]').click();
    await expect(studentPage.locator("#view-mock-exam")).toBeVisible();
    await studentPage.locator('.exam-type-btn[data-exam-type="OGE"]').click();
    await expect(studentPage.locator("#mockExamList .mock-exam-card").first()).toBeVisible();

    const startBtn = studentPage.locator('#mockExamList .start-mock-btn:not([data-locked="true"])').first();
    await startBtn.click();
    await expect(studentPage.locator("#mockPlayerScreen")).toBeVisible();

    // Fill answers and finish test to open self-assessment modal
    const navItems = studentPage.locator(".mock-nav-item");
    const navCount = await navItems.count();
    for (let i = 0; i < navCount; i++) {
      await navItems.nth(i).click();
      const optionBtn = studentPage.locator(".mock-option-item").first();
      if (await optionBtn.isVisible()) {
        await optionBtn.click();
      }
      const extTextarea = studentPage.locator("#mockExtendedInput");
      if (await extTextarea.isVisible()) {
        await extTextarea.fill("Мое подробное решение Части 2 с графиком на бланке 2");
      }
    }

    studentPage.on("dialog", (dialog) => dialog.accept());
    await studentPage.locator("#mockSubmitBtn").click();

    await expect(studentPage.locator("#mockResultsScreen")).toBeVisible();
    await studentPage.locator("#openSelfAssessBtn").click();
    await expect(studentPage.locator("#selfAssessmentModal")).toHaveClass(/active/);

    // 4. Student attaches work photo
    const fileInput = studentPage.locator(".work-photo-input").first();
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    await fileInput.setInputFiles({
      name: "blank_answer_page1.png",
      mimeType: "image/png",
      buffer,
    });

    // Check preview thumbnail appeared
    const previewImg = studentPage.locator(".photo-previews-container img.preview-work-img").first();
    await expect(previewImg).toBeVisible();

    // Click preview to test lightbox modal
    await previewImg.click();
    await expect(studentPage.locator("#imageLightboxModal")).toHaveClass(/active/);
    await studentPage.locator("#imageLightboxModal .modal-close-btn").click();
    await expect(studentPage.locator("#imageLightboxModal")).not.toHaveClass(/active/);

    // Save self-assessment
    await studentPage.locator("#saveSelfAssessmentBtn").click();
    await expect(studentPage.locator("#selfAssessmentModal")).not.toHaveClass(/active/);

    // 5. Teacher opens cabinet and reviews submission with attached photo
    await teacherPage.reload();
    await teacherPage.locator('.sidebar-nav .nav-item[data-view="teacher"]').click();
    await teacherPage.waitForSelector(".review-sub-btn");
    await teacherPage.locator(".review-sub-btn").first().click();

    await expect(teacherPage.locator("#teacherReviewModal")).toHaveClass(/active/);
    const teacherAttachedPhoto = teacherPage.locator(".attached-work-photo").first();
    await expect(teacherAttachedPhoto).toBeVisible();

    // Teacher opens lightbox
    await teacherAttachedPhoto.click();
    await expect(teacherPage.locator("#imageLightboxModal")).toHaveClass(/active/);
    await teacherPage.locator("#imageLightboxModal .modal-close-btn").click();
    await expect(teacherPage.locator("#imageLightboxModal")).not.toHaveClass(/active/);

    // Teacher completes review
    await teacherPage.locator("#teacherScoreInput").fill("3");
    await teacherPage.locator("#teacherCommentInput").fill("Замечательно выполнено! Все 3 балла.");
    const submitReviewBtn = teacherPage.locator('#teacherReviewForm button[type="submit"]');
    await submitReviewBtn.scrollIntoViewIfNeeded();
    await submitReviewBtn.click();
    await expect(teacherPage.locator("#teacherReviewModal")).not.toHaveClass(/active/);

    await teacherContext.close();
    await studentContext.close();
  });
});
