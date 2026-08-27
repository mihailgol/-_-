import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";

describe("Extended Part 2 Quiz Rendering & Interaction Safety", () => {
  beforeEach(() => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="quizPlayerTitle"></div>
          <div id="quizProgressText"></div>
          <div id="quizProgressBar" style="width: 0%"></div>
          <div id="quizQuestionText"></div>
          <div id="quizMinimapGrid"></div>
          <div id="quizOptionsGrid"></div>
          <div id="quizExplanationBox" style="display: none;">
            <span id="quizExplanationText"></span>
          </div>
          <button id="quizNextBtn" disabled></button>
          <button id="quizQuitBtn"></button>
        </body>
      </html>
    `, { url: "http://localhost:8000" });

    global.window = dom.window;
    global.document = dom.window.document;
  });

  it("renders extended question without error when options array is undefined", async () => {
    const { startQuiz, checkQuizAnswer } = await import("../../js/modules/quiz.js");

    const sampleExtendedQuestion = {
      id: "extended_task_22",
      type: "extended",
      question: "[ЕГЭ • Задание №22] Объясните биологический эксперимент...",
      options: undefined,
      solutionKey: "Элементы ответа:\n1) Точно описаны переменные.\n2) Сформулирован биологический вывод.",
      maxPoints: 3,
      criteria: [
        { code: "K1", title: "Описаны переменные", maxPoints: 2 },
        { code: "K2", title: "Сформулирован вывод", maxPoints: 1 }
      ],
      explanation: "Разбор эксперимента...",
      taskNumber: 22
    };

    expect(() => {
      startQuiz([sampleExtendedQuestion], "Тест Биология №22", "tests");
    }).not.toThrow();

    expect(document.getElementById("quizQuestionText").textContent).toContain("Задание №22");

    const textarea = document.getElementById("quizExtendedTextarea");
    expect(textarea).not.toBeNull();
    expect(textarea.placeholder).toContain("Введите ваше решение");

    textarea.value = "Мой развернутый ответ на задание 22";
    textarea.dispatchEvent(new window.Event("input"));

    expect(() => {
      checkQuizAnswer();
    }).not.toThrow();

    const explanationText = document.getElementById("quizExplanationText").textContent;
    expect(explanationText).toContain("Элементы ответа:");
    expect(explanationText).toContain("Критерии оценивания ФИПИ");
  });
});
