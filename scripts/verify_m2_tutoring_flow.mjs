import { app } from "../server/index.js";
import { db, resetDb, initDb } from "../server/db.js";
import assert from "node:assert/strict";

console.log("================================================================");
console.log("🚀 WORKER M2: PART 2 & TUTORING FLOW COMPREHENSIVE VERIFICATION");
console.log("================================================================\n");

let server;
let baseUrl;

function getCookieValue(res, cookieName) {
  const prefix = `${cookieName}=`;
  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,\s*/);
  for (const c of cookies) {
    const pair = c.split(";")[0].trim();
    if (pair.startsWith(prefix)) {
      return pair;
    }
  }
  return "";
}

async function runVerification() {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[Setup] In-process test server running on ${baseUrl}`);
      resolve();
    });
  });

  resetDb();
  initDb();
  console.log("[Setup] Database initialized & seeded with fresh schema & mock exams.\n");

  async function registerUser(name, email, role = "Ученик") {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "StrongPassword123!", name }),
    });
    assert.equal(res.status, 201, `Failed to register ${email}`);
    const cookie = getCookieValue(res, "examhub_session");
    assert.ok(cookie, `Session cookie missing for ${email}`);
    const data = await res.json();
    assert.ok(data.user && data.user.id, "User record missing in auth response");

    if (role !== "Ученик") {
      const roleRes = await fetch(`${baseUrl}/api/teacher/switch-role`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ role }),
      });
      assert.equal(roleRes.status, 200, `Failed to switch role for ${email}`);
    }

    return { cookie, user: data.user };
  }

  // STEP 1: Student Flow — Solving Mock Exam Variant with Part 2
  console.log("----------------------------------------------------------------");
  console.log("📌 STEP 1: Testing Student Flow (Mock Exam with Part 2)");
  console.log("----------------------------------------------------------------");

  const teacher = await registerUser("Анна Сергеевна Учитель", `teacher_${Date.now()}@test.ru`, "Учитель");
  console.log(`[Step 1.1] Teacher registered: ID=${teacher.user.id}, Name=${teacher.user.name}`);

  const createGroupRes = await fetch(`${baseUrl}/api/teacher/groups`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: teacher.cookie },
    body: JSON.stringify({ name: "11-Б Биология и Химия" }),
  });
  assert.equal(createGroupRes.status, 200);
  const groupData = await createGroupRes.json();
  const inviteCode = groupData.group.inviteCode;
  const groupId = groupData.group.id;
  assert.ok(inviteCode && inviteCode.startsWith("HUB-"), `Invalid invite code: ${inviteCode}`);
  console.log(`[Step 1.2] Teacher group created: ID=${groupId}, InviteCode=${inviteCode}`);

  const student = await registerUser("Михаил Ученик", `student_${Date.now()}@test.ru`, "Ученик");
  console.log(`[Step 1.3] Student registered: ID=${student.user.id}, Name=${student.user.name}`);

  const joinRes = await fetch(`${baseUrl}/api/teacher/join`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: student.cookie },
    body: JSON.stringify({ inviteCode }),
  });
  assert.equal(joinRes.status, 200, "Student failed to join group");
  console.log(`[Step 1.4] Student joined group ${groupId} using code ${inviteCode}`);

  const examId = "mock_bio_oge_1";
  const getExamRes = await fetch(`${baseUrl}/api/mock-exams/${examId}`, {
    headers: { cookie: student.cookie },
  });
  assert.equal(getExamRes.status, 200, `Failed to fetch mock exam ${examId}`);
  const examInfo = await getExamRes.json();
  assert.equal(examInfo.id, examId);
  const extQuestion = examInfo.questions.find((q) => q.type === "extended");
  assert.ok(extQuestion, "Mock exam does not contain extended question");
  console.log(`[Step 1.5] Mock exam fetched: "${examInfo.title}", Questions count: ${examInfo.questions.length}`);
  console.log(`          Found Part 2 Question: ID=${extQuestion.id}, MaxPoints=${extQuestion.maxPoints}`);

  const studentAnswerText = "Устьица на листьях растений осуществляют транспирацию и регуляцию газообмена. Замыкающие клетки изменяют тургор и контролируют устьичную щель.";
  const submitExamRes = await fetch(`${baseUrl}/api/mock-exams/${examId}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: student.cookie },
    body: JSON.stringify({
      answers: {
        bq1: 1,
        bq2: 1,
        bq3: 2,
        bq4: 0,
        bq5: 1,
        [extQuestion.id]: studentAnswerText,
      },
      timeSpentSeconds: 420,
    }),
  });

  assert.equal(submitExamRes.status, 200, "Failed to submit mock exam");
  const submitResult = await submitExamRes.json();
  assert.equal(submitResult.ok, true);
  assert.ok(submitResult.attemptId, "AttemptId missing in submit response");
  assert.equal(submitResult.hasExtendedQuestions, true);
  assert.equal(submitResult.extendedQuestions.length, 1);
  assert.equal(submitResult.extendedQuestions[0].studentAnswer, studentAnswerText);
  assert.equal(submitResult.primaryScore, 4, "Initial primary score should only include Part 1 (4 correct)");
  const attemptId = submitResult.attemptId;
  console.log(`[Step 1.6] Exam submitted: AttemptID=${attemptId}, Part 1 Score=${submitResult.primaryScore}/${submitResult.maxPrimaryScore}`);
  console.log("✅ STEP 1 PASSED: Student flow with Part 2 submission verified.\n");

  // STEP 2: Self-Assessment Modal & Scoring per FIPI Criteria
  console.log("----------------------------------------------------------------");
  console.log("📌 STEP 2: Testing Self-Assessment Modal & FIPI Criteria Evaluation");
  console.log("----------------------------------------------------------------");

  assert.ok(extQuestion.criteria && extQuestion.criteria.length > 0, "FIPI Criteria missing on extended question");
  console.log(`[Step 2.1] Verified FIPI Criteria definition: ${JSON.stringify(extQuestion.criteria)}`);
  assert.ok(extQuestion.solutionKey, "Solution key missing on extended question");
  console.log(`[Step 2.2] Verified Official Solution Key (ФИПИ): "${extQuestion.solutionKey.slice(0, 80)}..."`);

  const selfScore = 2;
  const selfAssessRes = await fetch(`${baseUrl}/api/mock-exams/${examId}/self-assess`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: student.cookie },
    body: JSON.stringify({
      attemptId,
      selfScores: {
        [extQuestion.id]: {
          score: selfScore,
          breakdown: { K1: 2, K2: 0 },
        },
      },
    }),
  });

  assert.equal(selfAssessRes.status, 200, "Self-assessment submission failed");
  const selfAssessData = await selfAssessRes.json();
  assert.equal(selfAssessData.ok, true);
  assert.equal(selfAssessData.primaryScore, 6, "Total primary score should be Part 1 (4) + Self-score (2) = 6");
  assert.equal(selfAssessData.extendedPrimaryEarned, 2);
  console.log(`[Step 2.3] Self-assessment recorded: New Primary Score=${selfAssessData.primaryScore}, Secondary Score=${selfAssessData.secondaryScore}`);

  const initialExtSub = db.prepare("SELECT * FROM extended_submissions WHERE user_id = ? AND context_id = ?").get(student.user.id, String(attemptId));
  assert.ok(initialExtSub, "extended_submissions record not found in SQLite");
  assert.equal(initialExtSub.status, "self_assessed");
  assert.equal(initialExtSub.self_score, 2);
  assert.equal(initialExtSub.student_answer, studentAnswerText);
  assert.equal(initialExtSub.group_id, groupId);
  console.log(`[Step 2.4] SQLite verification: extended_submissions ID=${initialExtSub.id}, status="${initialExtSub.status}", self_score=${initialExtSub.self_score}`);
  console.log("✅ STEP 2 PASSED: Self-assessment per FIPI criteria verified.\n");

  // STEP 3: Teacher Cabinet — Reviewing Submissions & Providing Feedback
  console.log("----------------------------------------------------------------");
  console.log("📌 STEP 3: Testing Teacher Cabinet Review & Evaluation");
  console.log("----------------------------------------------------------------");

  const teacherSubmissionsRes = await fetch(`${baseUrl}/api/teacher/submissions`, {
    headers: { cookie: teacher.cookie },
  });
  assert.equal(teacherSubmissionsRes.status, 200, "Teacher failed to fetch submissions");
  const teacherSubsData = await teacherSubmissionsRes.json();
  assert.ok(Array.isArray(teacherSubsData.submissions), "Submissions response is not an array");
  assert.equal(teacherSubsData.submissions.length, 1, "Expected exactly 1 pending submission");

  const pendingSub = teacherSubsData.submissions[0];
  assert.equal(pendingSub.id, initialExtSub.id);
  assert.equal(pendingSub.studentName, student.user.name);
  assert.equal(pendingSub.selfScore, 2);
  assert.equal(pendingSub.studentAnswer, studentAnswerText);
  assert.ok(pendingSub.questionInfo, "questionInfo missing in teacher submission payload");
  assert.equal(pendingSub.questionInfo.maxPoints, 3);
  console.log(`[Step 3.1] Teacher saw submission: ID=${pendingSub.id}, Student="${pendingSub.studentName}", SelfScore=${pendingSub.selfScore}`);

  const teacherFinalScore = 3;
  const teacherFeedbackComment = "Превосходный ответ! Указаны обе функции устьиц (транспирация и газообмен), четко описана регуляция замыкающими клетками.";
  const reviewRes = await fetch(`${baseUrl}/api/teacher/submissions/${pendingSub.id}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: teacher.cookie },
    body: JSON.stringify({
      teacherScore: teacherFinalScore,
      teacherComment: teacherFeedbackComment,
      teacherBreakdown: { K1: 2, K2: 1 },
    }),
  });

  assert.equal(reviewRes.status, 200, "Teacher review submission failed");
  const reviewData = await reviewRes.json();
  assert.equal(reviewData.success, true);
  assert.equal(reviewData.teacherScore, 3);
  console.log(`[Step 3.2] Teacher review submitted: FinalScore=${reviewData.teacherScore}`);

  const updatedTeacherSubsRes = await fetch(`${baseUrl}/api/teacher/submissions`, {
    headers: { cookie: teacher.cookie },
  });
  const updatedSubsData = await updatedTeacherSubsRes.json();
  const reviewedSub = updatedSubsData.submissions.find((s) => s.id === pendingSub.id);
  assert.equal(reviewedSub.status, "reviewed_by_teacher");
  assert.equal(reviewedSub.teacherScore, 3);
  assert.equal(reviewedSub.teacherComment, teacherFeedbackComment);
  console.log(`[Step 3.3] Teacher submissions list refreshed: Status="${reviewedSub.status}", TeacherScore=${reviewedSub.teacherScore}`);
  console.log("✅ STEP 3 PASSED: Teacher review and grading workflow verified.\n");

  // STEP 4: Notifications & Alerts for Student
  console.log("----------------------------------------------------------------");
  console.log("📌 STEP 4: Testing Notifications & Toast Alerts for Student");
  console.log("----------------------------------------------------------------");

  const notifRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { cookie: student.cookie },
  });
  assert.equal(notifRes.status, 200, "Failed to fetch student notifications");
  const notifData = await notifRes.json();
  assert.equal(notifData.unreadCount, 1, "Expected 1 unread notification for student");
  assert.ok(Array.isArray(notifData.notifications) && notifData.notifications.length >= 1);

  const notif = notifData.notifications[0];
  assert.equal(notif.type, "teacher_review");
  assert.ok(notif.title.includes("Учитель проверил"), `Unexpected notification title: ${notif.title}`);
  assert.ok(notif.message.includes("Оценка: 3 б."), `Notification message does not contain score: ${notif.message}`);
  assert.ok(notif.message.includes(teacherFeedbackComment), "Notification message does not contain teacher comment");
  assert.equal(notif.isRead, false);
  console.log(`[Step 4.1] Student received notification: ID=${notif.id}, Title="${notif.title}"`);
  console.log(`          Message: "${notif.message}"`);

  const markReadRes = await fetch(`${baseUrl}/api/notifications/${notif.id}/read`, {
    method: "POST",
    headers: { cookie: student.cookie },
  });
  assert.equal(markReadRes.status, 200, "Failed to mark notification as read");

  const afterReadRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { cookie: student.cookie },
  });
  const afterReadData = await afterReadRes.json();
  assert.equal(afterReadData.unreadCount, 0, "Unread count should be 0 after marking read");
  assert.equal(afterReadData.notifications[0].isRead, true);
  console.log(`[Step 4.2] Notification marked as read. Unread count is now ${afterReadData.unreadCount}`);
  console.log("✅ STEP 4 PASSED: Notification and alert generation verified.\n");

  // STEP 5: Comprehensive SQLite Database Validation
  console.log("----------------------------------------------------------------");
  console.log("📌 STEP 5: Direct SQLite Database Inspection & Integrity Assertions");
  console.log("----------------------------------------------------------------");

  const subRecord = db.prepare("SELECT * FROM extended_submissions WHERE id = ?").get(pendingSub.id);
  assert.ok(subRecord, "SQLite: extended_submissions row not found");
  assert.equal(subRecord.user_id, student.user.id, "SQLite: user_id mismatch");
  assert.equal(subRecord.group_id, groupId, "SQLite: group_id mismatch");
  assert.equal(subRecord.context_type, "mock_exam", "SQLite: context_type mismatch");
  assert.equal(subRecord.context_id, String(attemptId), "SQLite: context_id mismatch");
  assert.equal(subRecord.question_id, extQuestion.id, "SQLite: question_id mismatch");
  assert.equal(subRecord.student_answer, studentAnswerText, "SQLite: student_answer mismatch");
  assert.equal(subRecord.self_score, 2, "SQLite: self_score mismatch");
  assert.equal(subRecord.teacher_id, teacher.user.id, "SQLite: teacher_id mismatch");
  assert.equal(subRecord.teacher_score, 3, "SQLite: teacher_score mismatch");
  assert.equal(subRecord.teacher_comment, teacherFeedbackComment, "SQLite: teacher_comment mismatch");
  assert.equal(subRecord.status, "reviewed_by_teacher", "SQLite: status mismatch");
  assert.ok(subRecord.created_at, "SQLite: created_at timestamp missing");
  assert.ok(subRecord.updated_at, "SQLite: updated_at timestamp missing");
  console.log("[Step 5.1] extended_submissions row directly verified in SQLite:");
  console.log(`          ID: ${subRecord.id}, Status: ${subRecord.status}, SelfScore: ${subRecord.self_score}, TeacherScore: ${subRecord.teacher_score}`);

  const notifRecord = db.prepare("SELECT * FROM notifications WHERE id = ?").get(notif.id);
  assert.ok(notifRecord, "SQLite: notifications row not found");
  assert.equal(notifRecord.user_id, student.user.id);
  assert.equal(notifRecord.type, "teacher_review");
  assert.equal(notifRecord.is_read, 1);
  console.log("[Step 5.2] notifications row directly verified in SQLite:");
  console.log(`          ID: ${notifRecord.id}, IsRead: ${notifRecord.is_read}`);

  const attemptRecord = db.prepare("SELECT * FROM mock_exam_attempts WHERE id = ?").get(attemptId);
  assert.ok(attemptRecord, "SQLite: mock_exam_attempts row not found");
  assert.equal(attemptRecord.user_id, student.user.id);
  assert.equal(attemptRecord.mock_exam_id, examId);
  assert.equal(attemptRecord.primary_score, 7, "Attempt primary score should be updated to 7 by teacher review");
  assert.equal(attemptRecord.self_assessed, 1);
  console.log(`[Step 5.3] mock_exam_attempts recalculated score directly verified in SQLite: ${attemptRecord.primary_score}/${attemptRecord.max_primary_score}`);

  console.log("[Step 5.4] Testing Security & Permission checks (IDOR protection):");
  const unauthorizedTeacher = await registerUser("Посторонний Учитель", `intruder_${Date.now()}@test.ru`, "Учитель");
  const unauthorizedReviewRes = await fetch(`${baseUrl}/api/teacher/submissions/${pendingSub.id}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: unauthorizedTeacher.cookie },
    body: JSON.stringify({ teacherScore: 1, teacherComment: "Хакерская попытка" }),
  });
  assert.equal(unauthorizedReviewRes.status, 403, "Unauthorized teacher should receive 403 Forbidden");
  console.log("          ✓ Unauthorized teacher review correctly blocked with 403 Forbidden.");

  console.log("✅ STEP 5 PASSED: Direct SQLite database validation passed completely.\n");

  console.log("================================================================");
  console.log("🎉 ALL 5 WORKER M2 VERIFICATION STEPS COMPLETED WITH 100% SUCCESS");
  console.log("================================================================\n");

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

runVerification().catch((err) => {
  console.error("\n❌ VERIFICATION FAILED:", err);
  if (server) server.close();
  process.exit(1);
});
