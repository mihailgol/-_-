import { describe, it, expect } from "vitest";
import { getDefaultFIPITemplate } from "../../js/modules/test-editor.js";
import { getRecommendedTaskType } from "../../js/modules/utils.js";

describe("100% FIPI Demo Questions Coverage Across All 10 Subjects (OGE & EGE)", () => {
  const allSubjects = [
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

  const part2TaskNumbers = {
    math: { OGE: [20, 21, 22, 23, 24, 25], EGE: [13, 14, 15, 16, 17, 18, 19] },
    russian: { OGE: [1, 13], EGE: [27] },
    social: { OGE: [1, 5, 12, 21, 22, 23, 24], EGE: [17, 18, 19, 20, 21, 22, 23, 24, 25] },
    biology: { OGE: [22, 23, 24, 25, 26], EGE: [22, 23, 24, 25, 26, 27, 28] },
    chemistry: { OGE: [20, 21, 22, 23, 24], EGE: [29, 30, 31, 32, 33, 34] },
    physics: { OGE: [20, 21, 22, 23, 24, 25], EGE: [21, 22, 23, 24, 25, 26] },
    informatics: { OGE: [11, 12, 13, 14, 15], EGE: [27] },
    history: { OGE: [18, 19, 20, 21, 22, 23, 24], EGE: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
    literature: { OGE: [1, 2, 3, 4, 5], EGE: [4, 5, 9, 10, 11] },
    geography: { OGE: [28, 29, 30], EGE: [22, 23, 24, 25, 26, 27, 28, 29] },
  };

  it("verifies getRecommendedTaskType classifies all Part 2 tasks as 'extended'", () => {
    for (const sub of allSubjects) {
      const ogeTasks = part2TaskNumbers[sub].OGE;
      for (const tNum of ogeTasks) {
        expect(getRecommendedTaskType(sub, tNum, "OGE")).toBe("extended");
      }

      const egeTasks = part2TaskNumbers[sub].EGE;
      for (const tNum of egeTasks) {
        expect(getRecommendedTaskType(sub, tNum, "EGE")).toBe("extended");
      }
    }
  });

  it("provides complete FIPI demo templates with solution keys & criteria for every Part 2 task in OGE", () => {
    for (const sub of allSubjects) {
      const ogeTasks = part2TaskNumbers[sub].OGE;
      for (const tNum of ogeTasks) {
        const tpl = getDefaultFIPITemplate(sub, tNum, "OGE");
        expect(tpl, `Missing template for ${sub} OGE task ${tNum}`).toBeDefined();
        expect(tpl.solutionKey).toContain("Элементы ответа");
        expect(tpl.maxPoints).toBeGreaterThanOrEqual(2);
        expect(tpl.criteriaText).toContain("K1:");
        expect(tpl.topicTitle).toContain(`Задание №${tNum}`);
      }
    }
  });

  it("provides complete FIPI demo templates with solution keys & criteria for every Part 2 task in EGE", () => {
    for (const sub of allSubjects) {
      const egeTasks = part2TaskNumbers[sub].EGE;
      for (const tNum of egeTasks) {
        const tpl = getDefaultFIPITemplate(sub, tNum, "EGE");
        expect(tpl, `Missing template for ${sub} EGE task ${tNum}`).toBeDefined();
        expect(tpl.solutionKey).toContain("Элементы ответа");
        expect(tpl.maxPoints).toBeGreaterThanOrEqual(2);
        expect(tpl.criteriaText).toContain("K1:");
        expect(tpl.topicTitle).toContain(`Задание №${tNum}`);
      }
    }
  });
});
