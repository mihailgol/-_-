import { describe, it, expect } from "vitest";
import "../../js/data.js";

describe("Science Content Dataset Challenge (Biology, Chemistry, Physics)", () => {
  const data = window.EXAM_DATA;
  const scienceSubjects = ["biology", "chemistry", "physics"];

  it("exposes EXAM_DATA and contains all three science subjects", () => {
    expect(data).toBeDefined();
    expect(data.subjects).toBeDefined();
    for (const subjKey of scienceSubjects) {
      expect(data.subjects[subjKey]).toBeDefined();
      expect(data.subjects[subjKey].topics.length).toBeGreaterThan(0);
    }
  });

  describe("Rule 1: Topic ID & Question ID Uniqueness", () => {
    it("ensures no duplicate topic IDs exist across science subjects and globally", () => {
      const topicIdsSeen = new Map();
      const duplicateTopicIds = [];

      for (const [subjKey, subject] of Object.entries(data.subjects)) {
        for (const topic of subject.topics) {
          if (topicIdsSeen.has(topic.id)) {
            duplicateTopicIds.push({
              id: topic.id,
              firstSubject: topicIdsSeen.get(topic.id),
              secondSubject: subjKey,
            });
          } else {
            topicIdsSeen.set(topic.id, subjKey);
          }
        }
      }

      expect(duplicateTopicIds).toEqual([]);
    });

    it("ensures no duplicate question IDs exist across science subjects and globally", () => {
      const questionIdsSeen = new Map();
      const duplicateQuestionIds = [];

      for (const [subjKey, subject] of Object.entries(data.subjects)) {
        for (const topic of subject.topics) {
          const questions = topic.questions ?? [];
          for (const q of questions) {
            if (questionIdsSeen.has(q.id)) {
              duplicateQuestionIds.push({
                questionId: q.id,
                topicId: topic.id,
                subject: subjKey,
                previousTopic: questionIdsSeen.get(q.id),
              });
            } else {
              questionIdsSeen.set(q.id, topic.id);
            }
          }
        }
      }

      expect(duplicateQuestionIds).toEqual([]);
    });
  });

  describe("Rule 2: correctIndex Range & Options Bounds", () => {
    it("ensures all correctIndex values in Science subjects are strictly within 0 to options.length - 1", () => {
      const invalidIndexQuestions = [];

      for (const subjKey of scienceSubjects) {
        const subject = data.subjects[subjKey];
        for (const topic of subject.topics) {
          const questions = topic.questions ?? [];
          for (const q of questions) {
            const isArray = Array.isArray(q.options);
            const isInteger = Number.isInteger(q.correctIndex);
            const isValidRange =
              isArray &&
              isInteger &&
              q.correctIndex >= 0 &&
              q.correctIndex < q.options.length;

            if (!isValidRange) {
              invalidIndexQuestions.push({
                subject: subjKey,
                topicId: topic.id,
                questionId: q.id,
                correctIndex: q.correctIndex,
                optionsLength: isArray ? q.options.length : null,
              });
            }
          }
        }
      }

      expect(invalidIndexQuestions).toEqual([]);
    });

    it("ensures all correctIndex values across ALL subjects are strictly within bounds", () => {
      const invalidIndexQuestions = [];

      for (const [subjKey, subject] of Object.entries(data.subjects)) {
        for (const topic of subject.topics) {
          const questions = topic.questions ?? [];
          for (const q of questions) {
            const isArray = Array.isArray(q.options);
            const isInteger = Number.isInteger(q.correctIndex);
            const isValidRange =
              isArray &&
              isInteger &&
              q.correctIndex >= 0 &&
              q.correctIndex < q.options.length;

            if (!isValidRange) {
              invalidIndexQuestions.push({
                subject: subjKey,
                topicId: topic.id,
                questionId: q.id,
                correctIndex: q.correctIndex,
                optionsLength: isArray ? q.options.length : null,
              });
            }
          }
        }
      }

      expect(invalidIndexQuestions).toEqual([]);
    });
  });

  describe("Rule 3: Theory HTML Non-Empty & Well-Formedness", () => {
    // Helper to check HTML tag balance
    function validateHtmlTags(htmlString) {
      const tagRegex = /<\/?([a-zA-Z0-9]+)(\s+[^>]*)?>/g;
      const voidTags = new Set(["br", "hr", "img", "input", "link", "meta"]);
      const stack = [];
      const errors = [];

      let match;
      while ((match = tagRegex.exec(htmlString)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        const isClosing = fullTag.startsWith("</");
        const isSelfClosing = fullTag.endsWith("/>") || voidTags.has(tagName);

        if (isSelfClosing) continue;

        if (!isClosing) {
          stack.push({ tagName, index: match.index });
        } else {
          if (stack.length === 0) {
            errors.push(`Unmatched closing tag </${tagName}>`);
          } else {
            const top = stack.pop();
            if (top.tagName !== tagName) {
              errors.push(
                `Mismatched HTML tag: expected </${top.tagName}>, found </${tagName}>`
              );
            }
          }
        }
      }

      while (stack.length > 0) {
        const unclosed = stack.pop();
        errors.push(`Unclosed HTML tag <${unclosed.tagName}>`);
      }

      return errors;
    }

    it("ensures all theory HTML strings in Science subjects are non-empty and well-formed", () => {
      const htmlErrors = [];

      for (const subjKey of scienceSubjects) {
        const subject = data.subjects[subjKey];
        for (const topic of subject.topics) {
          if (typeof topic.theory !== "string" || topic.theory.trim().length === 0) {
            htmlErrors.push({
              subject: subjKey,
              topicId: topic.id,
              error: "Theory HTML is empty or not a string",
            });
            continue;
          }

          const tagErrors = validateHtmlTags(topic.theory);
          if (tagErrors.length > 0) {
            htmlErrors.push({
              subject: subjKey,
              topicId: topic.id,
              errors: tagErrors,
            });
          }
        }
      }

      expect(htmlErrors).toEqual([]);
    });

    it("ensures all theory HTML strings across ALL subjects are non-empty and well-formed", () => {
      const htmlErrors = [];

      for (const [subjKey, subject] of Object.entries(data.subjects)) {
        for (const topic of subject.topics) {
          if (typeof topic.theory !== "string" || topic.theory.trim().length === 0) {
            htmlErrors.push({
              subject: subjKey,
              topicId: topic.id,
              error: "Theory HTML is empty or not a string",
            });
            continue;
          }

          const tagErrors = validateHtmlTags(topic.theory);
          if (tagErrors.length > 0) {
            htmlErrors.push({
              subject: subjKey,
              topicId: topic.id,
              errors: tagErrors,
            });
          }
        }
      }

      expect(htmlErrors).toEqual([]);
    });
  });

  describe("Rule 4: Video Metadata Completeness", () => {
    it("ensures all video metadata objects in Science subjects contain non-empty title, duration, instructor, and youtubeId", () => {
      const videoErrors = [];

      for (const subjKey of scienceSubjects) {
        const subject = data.subjects[subjKey];
        for (const topic of subject.topics) {
          const v = topic.video;
          if (!v || typeof v !== "object") {
            videoErrors.push({
              subject: subjKey,
              topicId: topic.id,
              error: "Missing video object",
            });
            continue;
          }

          const missingFields = [];
          if (!v.title || typeof v.title !== "string" || v.title.trim().length === 0) {
            missingFields.push("title");
          }
          if (
            !v.duration ||
            typeof v.duration !== "string" ||
            v.duration.trim().length === 0
          ) {
            missingFields.push("duration");
          }
          if (
            !v.instructor ||
            typeof v.instructor !== "string" ||
            v.instructor.trim().length === 0
          ) {
            missingFields.push("instructor");
          }
          if (
            !v.youtubeId ||
            typeof v.youtubeId !== "string" ||
            v.youtubeId.trim().length === 0
          ) {
            missingFields.push("youtubeId");
          }

          if (missingFields.length > 0) {
            videoErrors.push({
              subject: subjKey,
              topicId: topic.id,
              missingFields,
            });
          }
        }
      }

      expect(videoErrors).toEqual([]);
    });
  });

  describe("Adversarial Edge Case & Anomaly Mining", () => {
    it("checks options uniqueness and non-emptiness in questions", () => {
      const optionAnomalies = [];

      for (const [subjKey, subject] of Object.entries(data.subjects)) {
        for (const topic of subject.topics) {
          const questions = topic.questions ?? [];
          for (const q of questions) {
            if (!Array.isArray(q.options) || q.options.length < 2) {
              optionAnomalies.push({
                subject: subjKey,
                questionId: q.id,
                error: "Question has fewer than 2 options",
              });
              continue;
            }

            const trimmedOptions = q.options.map((opt) => opt.trim());
            const emptyOptIndex = trimmedOptions.findIndex((opt) => opt.length === 0);
            if (emptyOptIndex !== -1) {
              optionAnomalies.push({
                subject: subjKey,
                questionId: q.id,
                error: `Option index ${emptyOptIndex} is empty`,
              });
            }

            const uniqueOpts = new Set(trimmedOptions);
            if (uniqueOpts.size !== trimmedOptions.length) {
              optionAnomalies.push({
                subject: subjKey,
                questionId: q.id,
                error: "Duplicate option strings found in question",
                options: q.options,
              });
            }
          }
        }
      }

      expect(optionAnomalies).toEqual([]);
    });

    it("checks question texts and explanations for non-emptiness", () => {
      const contentAnomalies = [];

      for (const [subjKey, subject] of Object.entries(data.subjects)) {
        for (const topic of subject.topics) {
          const questions = topic.questions ?? [];
          for (const q of questions) {
            if (!q.question || typeof q.question !== "string" || q.question.trim().length === 0) {
              contentAnomalies.push({
                subject: subjKey,
                questionId: q.id,
                error: "Empty question text",
              });
            }
            if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim().length === 0) {
              contentAnomalies.push({
                subject: subjKey,
                questionId: q.id,
                error: "Empty explanation text",
              });
            }
          }
        }
      }

      expect(contentAnomalies).toEqual([]);
    });
  });
});
