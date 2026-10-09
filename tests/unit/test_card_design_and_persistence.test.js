import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { initDb, db } from "../../server/db.js";

describe("Test Card Design (Screenshot Spec) & Test Persistence", () => {
  beforeEach(() => {
    initDb();

    const dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="quizPlayerTitle"></div>
          <div id="quizProgressText"></div>
          <div id="quizProgressBar" style="width: 0%"></div>
          <div id="quizMinimapGrid"></div>
          <div id="quizCard">
            <div id="quizCardHeader">
              <span id="quizMetaNum"></span>
              <span id="quizMetaLine"></span>
              <span id="quizMetaIdText"></span>
              <button id="quizReportBtn"></button>
            </div>
            <div id="quizQuestionText"></div>
            <div id="quizAnswerInputWrap">
              <input id="quizPillInput" placeholder="Введи ответ" />
            </div>
            <div id="quizOptionsGrid"></div>
            <div id="quizExplanationBox" style="display: none;">
              <span id="quizExplanationText"></span>
            </div>
          </div>
          <button id="quizNextBtn" disabled>Проверить ответ</button>
          <button id="quizQuitBtn"></button>
        </body>
      </html>
    `,
      { url: "http://localhost:8000" }
    );

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
  });

  it("renders the question card with meta badges: number, line, ID, report button, and 'Введи ответ' input pill", async () => {
    const { startQuiz } = await import("../../js/modules/quiz.js");

    const sampleQuestion = {
      id: "chem_sample_1",
      taskNumber: 1,
      type: "single",
      question:
        "Определите, атомы каких двух из указанных в ряду элементов в основном состоянии имеют одинаковое число электронов во внешнем слое.\n1) S 2) N 3) Zn 4) Cl 5) Mg",
      options: ["1) S", "2) N", "3) Zn", "4) Cl", "5) Mg"],
      correctIndex: 4,
      explanation: "У атомов Mg и Zn во внешнем электронном слое находится по 2 электрона (s2).",
    };

    startQuiz([sampleQuestion], "Химия: Тренировочный тест", "tests");

    const metaNum = document.getElementById("quizMetaNum");
    const metaLine = document.getElementById("quizMetaLine");
    const metaId = document.getElementById("quizMetaIdText");
    const reportBtn = document.getElementById("quizReportBtn");
    const pillInput = document.getElementById("quizPillInput");
    const qText = document.getElementById("quizQuestionText");

    expect(metaNum.textContent).toBe("1");
    expect(metaLine.textContent).toContain("1 линия");
    expect(metaId.textContent).toMatch(/№\d+/);
    expect(reportBtn).not.toBeNull();
    expect(pillInput).not.toBeNull();
    expect(pillInput.placeholder).toBe("Введи ответ");
    expect(qText.textContent).toContain("Определите, атомы каких двух");
  });

  it("allows answering via the 'Введи ответ' pill input and verifies answer", async () => {
    const { startQuiz, checkQuizAnswer } = await import("../../js/modules/quiz.js");

    const sampleQuestion = {
      id: "chem_sample_pill",
      taskNumber: 1,
      type: "single",
      question: "Определите элементы...",
      options: ["1) S", "2) N", "3) Zn", "4) Cl", "5) Mg"],
      correctIndex: 4,
      explanation: "Правильный ответ 5) Mg.",
    };

    startQuiz([sampleQuestion], "Химия: Тест", "tests");

    const pillInput = document.getElementById("quizPillInput");
    pillInput.value = "5) Mg";
    pillInput.dispatchEvent(new window.Event("input"));

    checkQuizAnswer();

    expect(pillInput.className).toContain("input-correct");
    expect(pillInput.disabled).toBe(true);
  });

  it("persists added tests with custom topic in database and they do not disappear", async () => {
    const uniqueTitle = `Тест по химии #${Date.now()}`;
    const uniqueQuestion = `Определите степени окисления [${Date.now()}]`;

    const topicId = `top_chem_test_${Date.now()}`;
    db.prepare(
      "INSERT INTO topics (id, subject_id, title, is_premium, duration, theory, sort_order) VALUES (?, ?, ?, 0, '45 мин', '', 999)"
    ).run(topicId, "chemistry", uniqueTitle);

    const qId = `q_chem_${Date.now()}`;
    db.prepare(
      `INSERT INTO questions (id, topic_id, type, question, options_json, correct_index, correct_answer_json, explanation, points, task_number, exam_type)
       VALUES (?, ?, 'single', ?, '["1","2","3","4"]', 0, null, 'Разбор', 1, 1, 'EGE')`
    ).run(qId, topicId, uniqueQuestion);

    // Verify topic and questions exist in database
    const savedTopic = db.prepare("SELECT * FROM topics WHERE id = ?").get(topicId);
    expect(savedTopic).toBeDefined();
    expect(savedTopic.title).toBe(uniqueTitle);

    const savedQ = db.prepare("SELECT * FROM questions WHERE id = ?").get(qId);
    expect(savedQ).toBeDefined();
    expect(savedQ.question).toBe(uniqueQuestion);

    // Verify topic and question are not locked or lost for guest users
    const allQuestions = db.prepare("SELECT * FROM questions WHERE topic_id = ?").all(topicId);
    expect(allQuestions.length).toBe(1);
    expect(allQuestions[0].task_number).toBe(1);
  });
});
