import { describe, it, expect, beforeEach } from "vitest";
import { db, initDb } from "../../server/db.js";

describe("Admin CRUD & Database Operations", () => {
  beforeEach(() => {
    initDb();
  });

  it("creates, queries, and deletes theory topics in database", () => {
    const topicId = `top_test_${Date.now()}`;
    const subjectId = "math";
    const title = "QA Test Topic: Integration";
    const theoryText = "<h3>QA Theory Content</h3><p>Testing DB insertion</p>";

    db.prepare(
      `INSERT INTO topics (id, subject_id, title, theory) VALUES (?, ?, ?, ?)`
    ).run(topicId, subjectId, title, theoryText);

    const inserted = db.prepare("SELECT * FROM topics WHERE id = ?").get(topicId);
    expect(inserted).toBeDefined();
    expect(inserted.title).toBe(title);
    expect(inserted.subject_id).toBe(subjectId);
    expect(inserted.theory).toBe(theoryText);

    db.prepare("DELETE FROM topics WHERE id = ?").run(topicId);
    const deleted = db.prepare("SELECT * FROM topics WHERE id = ?").get(topicId);
    expect(deleted).toBeUndefined();
  });

  it("creates, queries, and deletes test questions in database", () => {
    const qId = `q_test_${Date.now()}`;
    const existingTopic = db.prepare("SELECT id FROM topics LIMIT 1").get();
    let topicId = existingTopic ? existingTopic.id : null;
    if (!topicId) {
      topicId = `top_q_${Date.now()}`;
      db.prepare("INSERT INTO topics (id, subject_id, title, theory) VALUES (?, ?, ?, ?)").run(topicId, "math", "Temp Topic", "Theory");
    }
    const questionText = "QA Test Question: What is 2 + 2?";
    const optionsJson = JSON.stringify(["2", "3", "4", "5"]);
    const correctIndex = 2;

    db.prepare(
      `INSERT INTO questions (id, topic_id, type, question, options_json, correct_index, explanation, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(qId, topicId, "single", questionText, optionsJson, correctIndex, "QA Explanation", 1);



    const inserted = db.prepare("SELECT * FROM questions WHERE id = ?").get(qId);
    expect(inserted).toBeDefined();
    expect(inserted.question).toBe(questionText);
    expect(inserted.correct_index).toBe(2);

    db.prepare("DELETE FROM questions WHERE id = ?").run(qId);
    const deleted = db.prepare("SELECT * FROM questions WHERE id = ?").get(qId);
    expect(deleted).toBeUndefined();
  });

  it("handles boundary checks and non-existent IDs gracefully", () => {
    const nonExistentId = "non_existent_id_99999";
    const topic = db.prepare("SELECT * FROM topics WHERE id = ?").get(nonExistentId);
    expect(topic).toBeUndefined();

    const deleteRes = db.prepare("DELETE FROM questions WHERE id = ?").run(nonExistentId);
    expect(deleteRes.changes).toBe(0);
  });
});
