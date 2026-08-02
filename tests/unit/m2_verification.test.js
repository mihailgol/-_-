import { describe, it, expect } from "vitest";
import "../../js/data.js";

describe("Milestone 2 Content Verification (Math, Informatics, Russian, Social Studies, History)", () => {
  const data = window.EXAM_DATA;
  const m2Subjects = ["russian", "math", "social", "history", "informatics"];

  it("exposes EXAM_DATA and contains all 5 Milestone 2 subjects", () => {
    expect(data).toBeDefined();
    expect(data.subjects).toBeDefined();
    for (const sKey of m2Subjects) {
      expect(data.subjects[sKey], `Subject ${sKey} must exist`).toBeDefined();
      expect(data.subjects[sKey].topics.length, `Subject ${sKey} topics`).toBeGreaterThanOrEqual(4);
    }
  });

  it("verifies topic and question structure and content quality for all M2 subjects", () => {
    const topicIdsSeen = new Set();
    const questionIdsSeen = new Set();

    for (const sKey of m2Subjects) {
      const subject = data.subjects[sKey];
      expect(subject.title).toBeTruthy();
      expect(subject.icon).toBeTruthy();

      for (const topic of subject.topics) {
        expect(topicIdsSeen.has(topic.id), `Duplicate topic ID ${topic.id}`).toBe(false);
        topicIdsSeen.add(topic.id);

        expect(topic.title, `Empty topic title in ${topic.id}`).toBeTruthy();
        expect(topic.theory, `Empty theory in ${topic.id}`).toBeTruthy();
        expect(topic.theory.length, `Theory too short in ${topic.id}`).toBeGreaterThanOrEqual(500);

        expect(topic.video, `Missing video object in ${topic.id}`).toBeDefined();
        expect(topic.video.title, `Missing video title in ${topic.id}`).toBeTruthy();
        expect(topic.video.instructor, `Missing video instructor in ${topic.id}`).toBeTruthy();
        expect(topic.video.duration, `Missing video duration in ${topic.id}`).toBeTruthy();
        expect(topic.video.youtubeId, `Missing video youtubeId in ${topic.id}`).toBeTruthy();

        const questions = topic.questions ?? [];
        expect(questions.length, `Topic ${topic.id} should have at least 4 questions`).toBeGreaterThanOrEqual(4);

        for (const q of questions) {
          expect(questionIdsSeen.has(q.id), `Duplicate question ID ${q.id}`).toBe(false);
          questionIdsSeen.add(q.id);

          expect(q.question, `Question text missing in ${q.id}`).toBeTruthy();
          expect(Array.isArray(q.options), `Options not an array in ${q.id}`).toBe(true);
          expect(q.options.length, `Options count in ${q.id}`).toBeGreaterThanOrEqual(4);

          for (const opt of q.options) {
            expect(typeof opt === "string" && opt.trim().length > 0, `Empty option in ${q.id}`).toBe(true);
          }

          expect(typeof q.correctIndex, `correctIndex not number in ${q.id}`).toBe("number");
          expect(q.correctIndex >= 0 && q.correctIndex < q.options.length, `correctIndex out of bounds in ${q.id}`).toBe(true);
          expect(q.explanation, `Explanation missing in ${q.id}`).toBeTruthy();
          expect(q.explanation.length, `Explanation too short in ${q.id}`).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it("checks for prohibited placeholders or stubbed content in M2 subjects", () => {
    for (const sKey of m2Subjects) {
      const subject = data.subjects[sKey];
      const json = JSON.stringify(subject);
      expect(json).not.toContain("TODO");
      expect(json).not.toContain("FIXME");
      expect(json).not.toContain("Lorem ipsum");
      expect(json).not.toContain("placeholder");
    }
  });
});
