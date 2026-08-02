import { describe, it, expect } from "vitest";
import "../../js/data.js";

describe("EXAM_DATA", () => {
  const data = window.EXAM_DATA;

  it("exposes EXAM_DATA on window", () => {
    expect(data).toBeDefined();
    expect(data.subjects).toBeDefined();
  });

  it("contains the expected subjects", () => {
    expect(Object.keys(data.subjects).sort()).toEqual([
      "biology",
      "chemistry",
      "english",
      "history",
      "informatics",
      "literature",
      "math",
      "physics",
      "russian",
      "social",
    ]);
  });

  it("validates subject structure", () => {
    for (const [id, subject] of Object.entries(data.subjects)) {
      expect(subject.id).toBe(id);
      expect(subject.title).toBeTruthy();
      expect(Array.isArray(subject.topics)).toBe(true);
      expect(subject.topics.length).toBeGreaterThan(0);
    }
  });

  it("validates topics structure", () => {
    for (const subject of Object.values(data.subjects)) {
      for (const topic of subject.topics) {
        expect(topic.id).toBeTruthy();
        expect(topic.title).toBeTruthy();
        if (topic.isPremium !== undefined) {
          expect(typeof topic.isPremium).toBe("boolean");
        }
      }
    }
  });

  it("validates quizzes and question integrity", () => {
    let questionCount = 0;
    let quizCount = 0;
    for (const subject of Object.values(data.subjects)) {
      for (const topic of subject.topics) {
        const questions = topic.questions ?? [];
        if (questions.length === 0) continue;
        quizCount++;
        for (const q of questions) {
          questionCount++;
          expect(q.id).toBeTruthy();
          expect(q.question).toBeTruthy();
          expect(Array.isArray(q.options)).toBe(true);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(q.options.length);
          expect(q.explanation).toBeTruthy();
        }
      }
    }
    expect(quizCount).toBeGreaterThan(0);
    expect(questionCount).toBeGreaterThan(0);
  });

  it("validates videos structure", () => {
    for (const subject of Object.values(data.subjects)) {
      for (const topic of subject.topics) {
        if (topic.video) {
          expect(topic.video.title).toBeTruthy();
          expect(topic.video.duration).toBeTruthy();
          expect(topic.video.youtubeId).toBeTruthy();
        }
      }
    }
  });
});
