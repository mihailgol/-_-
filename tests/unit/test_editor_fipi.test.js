import { describe, it, expect, beforeEach } from "vitest";
import {
  getDefaultFIPITemplate,
  handleFillDefaultCriteria,
  initTestEditor,
} from "../../js/modules/test-editor.js";

describe("Test Editor FIPI Criteria Autofill & Templates", () => {
  const subjects = [
    "math",
    "russian",
    "biology",
    "chemistry",
    "physics",
    "informatics",
    "social",
    "history",
    "literature",
    "geography",
  ];

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="testEditorContainer"></div>
      <div id="adminModal" class="modal">
        <div id="adminModalBody"></div>
        <button class="modal-close-btn"></button>
      </div>
    `;
    window.EXAM_DATA = {
      subjects: {
        math: { id: "math", title: "Математика", colorHex: "#3b82f6" },
        russian: { id: "russian", title: "Русский язык", colorHex: "#ef4444" },
        biology: { id: "biology", title: "Биология", colorHex: "#10b981" },
        chemistry: { id: "chemistry", title: "Химия", colorHex: "#8b5cf6" },
        physics: { id: "physics", title: "Физика", colorHex: "#06b6d4" },
        informatics: { id: "informatics", title: "Информатика", colorHex: "#f59e0b" },
        social: { id: "social", title: "Обществознание", colorHex: "#ec4899" },
        history: { id: "history", title: "История", colorHex: "#eab308" },
        literature: { id: "literature", title: "Литература", colorHex: "#6366f1" },
        geography: { id: "geography", title: "География", colorHex: "#14b8a6" },
      },
    };
  });

  describe("getDefaultFIPITemplate() — 100% Subject and Exam Coverage", () => {
    it("provides valid templates for all 10 subjects for EGE", () => {
      for (const sub of subjects) {
        const tpl = getDefaultFIPITemplate(sub, 20, "EGE");
        expect(tpl).toBeDefined();
        expect(typeof tpl.solutionKey).toBe("string");
        expect(tpl.solutionKey.length).toBeGreaterThan(20);
        expect(tpl.solutionKey).toContain("Элементы ответа");

        expect(typeof tpl.maxPoints).toBe("number");
        expect(tpl.maxPoints).toBeGreaterThanOrEqual(2);

        expect(typeof tpl.criteriaText).toBe("string");
        expect(tpl.criteriaText).toContain("K1:");
        expect(tpl.criteriaText).toMatch(/\(\d+\s*б/);

        expect(typeof tpl.topicTitle).toBe("string");
        expect(tpl.topicTitle.length).toBeGreaterThan(5);
      }
    });

    it("provides valid templates for all 10 subjects for OGE", () => {
      for (const sub of subjects) {
        const tpl = getDefaultFIPITemplate(sub, 20, "OGE");
        expect(tpl).toBeDefined();
        expect(tpl.solutionKey).toContain("Элементы ответа");
        expect(tpl.maxPoints).toBeGreaterThanOrEqual(2);
        expect(tpl.criteriaText).toContain("K1:");
        expect(tpl.criteriaText).toMatch(/\(\d+\s*б/);
        expect(tpl.topicTitle).toBeTruthy();
      }
    });

    it("returns correct specific criteria for Math tasks in EGE and OGE", () => {
      // Math EGE task 13 (equations)
      const mathEge13 = getDefaultFIPITemplate("math", 13, "EGE");
      expect(mathEge13.maxPoints).toBe(2);
      expect(mathEge13.criteriaText).toContain("K1: Обоснованно получен верный ответ (2 б.)");
      expect(mathEge13.criteriaText).toContain("K2: Ход решения верен, но допущена вычислительная ошибка (1 б.)");

      // Math EGE task 14 (geometry)
      const mathEge14 = getDefaultFIPITemplate("math", 14, "EGE");
      expect(mathEge14.maxPoints).toBe(3);
      expect(mathEge14.criteriaText).toContain("Доказательство и вычисления выполнены верно (2 б.)");

      // Math EGE task 18 (parameter)
      const mathEge18 = getDefaultFIPITemplate("math", 18, "EGE");
      expect(mathEge18.maxPoints).toBe(4);
      expect(mathEge18.criteriaText).toContain("Полное и обоснованное решение всех пунктов (2 б.)");

      // Math OGE task 23 (geometry)
      const mathOge23 = getDefaultFIPITemplate("math", 23, "OGE");
      expect(mathOge23.maxPoints).toBe(2);
      expect(mathOge23.topicTitle).toContain("Геометрическая задача Части 2");
    });

    it("returns correct criteria for Russian essay tasks", () => {
      // Russian EGE task 27 (Essay)
      const rusEge27 = getDefaultFIPITemplate("russian", 27, "EGE");
      expect(rusEge27.maxPoints).toBe(10);
      expect(rusEge27.criteriaText).toContain("K1: Формулировка проблемы");
      expect(rusEge27.criteriaText).toContain("K2: Комментарий к проблеме");
      expect(rusEge27.criteriaText).toContain("K5: Соблюдение орфографических и пунктуационных норм (2 б.)");

      // Russian OGE task 1 (Summary)
      const rusOge1 = getDefaultFIPITemplate("russian", 1, "OGE");
      expect(rusOge1.maxPoints).toBe(7);
      expect(rusOge1.criteriaText).toContain("K1: Содержание изложения (3 б.)");
      expect(rusOge1.criteriaText).toContain("K2: Сжатие исходного текста (3 б.)");

      // Russian OGE task 13 (Essay)
      const rusOge13 = getDefaultFIPITemplate("russian", 13, "OGE");
      expect(rusOge13.maxPoints).toBe(7);
      expect(rusOge13.criteriaText).toContain("K1: Толкование значения слова / тезис (2 б.)");
    });

    it("returns correct criteria for Social studies plan (task 24 EGE)", () => {
      const social24 = getDefaultFIPITemplate("social", 24, "EGE");
      expect(social24.maxPoints).toBe(4);
      expect(social24.criteriaText).toContain("K1: Раскрытие темы по существу в подпунктах (3 б.)");
      expect(social24.criteriaText).toContain("K2: Корректность формулировок пунктов и подпунктов (1 б.)");
    });

    it("returns correct criteria for Literature essay (task 11 EGE)", () => {
      const lit11 = getDefaultFIPITemplate("literature", 11, "EGE");
      expect(lit11.maxPoints).toBe(5);
      expect(lit11.criteriaText).toContain("K1: Соответствие теме и глубина раскрытия (2 б.)");
      expect(lit11.criteriaText).toContain("K2: Привлечение текста для аргументации (2 б.)");
    });

    it("returns correct criteria for Informatics programming (task 27 EGE)", () => {
      const inf27 = getDefaultFIPITemplate("informatics", 27, "EGE");
      expect(inf27.maxPoints).toBe(2);
      expect(inf27.criteriaText).toContain("K1: Реализован эффективный и корректный алгоритм (2 б.)");
    });

    it("returns robust fallback for unknown subjects", () => {
      const fallback = getDefaultFIPITemplate("astronomy", 5, "EGE");
      expect(fallback).toBeDefined();
      expect(fallback.maxPoints).toBe(3);
      expect(fallback.criteriaText).toContain("K1:");
      expect(fallback.criteriaText).toContain("K2:");
    });

    it("verifies criteria parser compatibility across all subjects", () => {
      for (const sub of subjects) {
        const tpl = getDefaultFIPITemplate(sub, 25, "EGE");
        const lines = tpl.criteriaText.split("\n").filter(Boolean);
        expect(lines.length).toBeGreaterThanOrEqual(2);

        const parsed = lines.map((line, idx) => {
          const matchPoints = line.match(/\((\d+)\s*б/i);
          const pts = matchPoints ? parseInt(matchPoints[1], 10) : 1;
          return {
            code: `K${idx + 1}`,
            title: line.replace(/^K\d+:\s*/i, "").trim(),
            maxPoints: pts,
          };
        });

        for (const item of parsed) {
          expect(item.code).toMatch(/^K\d+$/);
          expect(item.title).toBeTruthy();
          expect(item.maxPoints).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("UI Integration & DOM Behavior", () => {
    it("renders the fill default criteria button in the top toolbar", () => {
      initTestEditor();
      const btn = document.getElementById("fillDefaultCriteriaBtn");
      expect(btn).not.toBeNull();
      expect(btn.textContent).toContain("Заполнить критерии по умолчанию");
    });

    it("switches question type to 'extended' and populates all fields upon clicking #fillDefaultCriteriaBtn", () => {
      initTestEditor();

      const subSelect = document.getElementById("qSubjectSelect");
      const taskInput = document.getElementById("qTaskNumberInput");
      const typeSelect = document.getElementById("qTypeSelect");
      const fillBtn = document.getElementById("fillDefaultCriteriaBtn");

      // Setup Math Part 1 (single choice) initially
      subSelect.value = "math";
      taskInput.value = "1";
      typeSelect.value = "single";

      // Click fill default criteria button
      fillBtn.click();

      // Should automatically switch to extended
      expect(typeSelect.value).toBe("extended");

      const keyInput = document.getElementById("extSolutionKeyInput");
      const maxPtsInput = document.getElementById("extMaxPointsInput");
      const critInput = document.getElementById("extCriteriaInput");
      const topicInput = document.getElementById("qTopicTitleInput");

      expect(keyInput).not.toBeNull();
      expect(keyInput.value).toContain("Элементы ответа");
      expect(parseInt(maxPtsInput.value, 10)).toBe(2);
      expect(critInput.value).toContain("K1: Обоснованно получен верный ответ (2 б.)");
      expect(topicInput.value).toContain("Задание №1");
    });

    it("preserves an existing custom topic title while populating criteria", () => {
      initTestEditor();

      const subSelect = document.getElementById("qSubjectSelect");
      const taskInput = document.getElementById("qTaskNumberInput");
      const topicInput = document.getElementById("qTopicTitleInput");
      const fillBtn = document.getElementById("fillDefaultCriteriaBtn");

      subSelect.value = "biology";
      taskInput.value = "22";
      topicInput.value = "Моя собственная тема эксперимента";

      fillBtn.click();

      expect(topicInput.value).toBe("Моя собственная тема эксперимента");
      expect(document.getElementById("extSolutionKeyInput").value).toContain("биологические термины");
      expect(document.getElementById("extCriteriaInput").value).toContain("K1:");
    });

    it("renders fill criteria button inside extended options section and works properly", () => {
      initTestEditor();

      const typeSelect = document.getElementById("qTypeSelect");
      typeSelect.value = "extended";
      typeSelect.dispatchEvent(new Event("change"));

      const extFillBtn = document.getElementById("extFillDefaultCriteriaBtn");
      expect(extFillBtn).not.toBeNull();

      document.getElementById("qSubjectSelect").value = "physics";
      document.getElementById("qTaskNumberInput").value = "24";

      extFillBtn.click();

      expect(document.getElementById("extSolutionKeyInput").value).toContain("физические законы и формулы");
      expect(document.getElementById("extCriteriaInput").value).toContain("K1: Записаны формулы");
    });

    it("updates the live preview with key and criteria when criteria are filled", () => {
      initTestEditor();

      document.getElementById("qSubjectSelect").value = "chemistry";
      document.getElementById("qTaskNumberInput").value = "29";
      document.getElementById("qTextarea").value = "Окислительно-восстановительная реакция перманганата калия";

      const fillBtn = document.getElementById("fillDefaultCriteriaBtn");
      fillBtn.click();

      const previewArea = document.getElementById("qLivePreview");
      expect(previewArea.innerHTML).toContain("Химия • Задание №29");
      expect(previewArea.innerHTML).toContain("🔑 Эталонный ключ решения ФИПИ:");
      expect(previewArea.innerHTML).toContain("📋 Критерии оценивания:");
      expect(previewArea.innerHTML).toContain("K1: Составлены верные химические уравнения");
    });

    it("can be invoked directly via exported handleFillDefaultCriteria() function", () => {
      initTestEditor();

      document.getElementById("qSubjectSelect").value = "history";
      document.getElementById("qTaskNumberInput").value = "19";

      handleFillDefaultCriteria();

      expect(document.getElementById("qTypeSelect").value).toBe("extended");
      expect(document.getElementById("extSolutionKeyInput").value).toContain("исторические факты");
      expect(document.getElementById("extCriteriaInput").value).toContain("K1: Указаны ключевые исторические факты");
    });
  });
});
