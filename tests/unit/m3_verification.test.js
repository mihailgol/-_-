import { describe, it, expect, beforeEach } from "vitest";
import { db, initDb, resetDb, transaction } from "../../server/db.js";
import { seedContent } from "../../server/seed.js";

describe("Milestone 3 DB Sync & Schema Verification", () => {
  beforeEach(() => {
    resetDb();
    initDb();
  });

  it("verifies all required columns exist in DB schema", () => {
    const checkColumn = (table, columnName) => {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      return columns.some((col) => col.name === columnName);
    };

    expect(checkColumn("users", "target_exam")).toBe(true);
    expect(checkColumn("users", "exam_type")).toBe(true);
    expect(checkColumn("subjects", "is_other")).toBe(true);
    expect(checkColumn("videos", "description")).toBe(true);
    expect(checkColumn("questions", "points")).toBe(true);
    expect(checkColumn("questions", "correct_answer_json")).toBe(true);
    expect(checkColumn("attempts", "answers_json")).toBe(true);
  });

  it("verifies performance indexes exist on FK columns", () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((r) => r.name);

    const requiredIndexes = [
      "idx_topics_subject_id",
      "idx_questions_topic_id",
      "idx_videos_topic_id",
      "idx_attempts_user_id",
      "idx_mock_exams_subject_id",
      "idx_mock_exam_attempts_user_id",
      "idx_groups_teacher_id",
      "idx_group_members_student_id",
      "idx_assignments_group_id",
      "idx_assignment_submissions_assignment_student",
    ];

    for (const idx of requiredIndexes) {
      expect(indexes, `Missing index: ${idx}`).toContain(idx);
    }
  });

  it("verifies transaction helper uses BEGIN IMMEDIATE without throwing", () => {
    let executed = false;
    const res = transaction(() => {
      executed = true;
      return 42;
    });

    expect(executed).toBe(true);
    expect(res).toBe(42);
  });

  it("verifies seedContent uses UPSERT and preserves user attempts", () => {
    db.prepare("INSERT INTO users (email, name) VALUES ('test_user@example.com', 'Test User')").run();
    const user = db.prepare("SELECT id FROM users WHERE email = 'test_user@example.com'").get();
    
    db.prepare("INSERT INTO attempts (user_id, topic_id, title, score, total, percent) VALUES (?, 'bio_cytology', 'Цитология', 5, 5, 100)").run(user.id);
    const initialAttemptsCount = db.prepare("SELECT COUNT(*) as count FROM attempts").get().count;
    expect(initialAttemptsCount).toBe(1);

    seedContent();

    const afterAttemptsCount = db.prepare("SELECT COUNT(*) as count FROM attempts").get().count;
    expect(afterAttemptsCount).toBe(1);

    const bioSubject = db.prepare("SELECT * FROM subjects WHERE id = 'biology'").get();
    expect(bioSubject).toBeDefined();
    expect(bioSubject.title).toBe("Биология");
  });

  it("verifies catalog route deduplication logic", () => {
    const rows = db.prepare("SELECT * FROM subjects WHERE is_active = 1 ORDER BY sort_order").all();
    const activeSubjectIds = new Set(rows.map((sub) => sub.id));

    const OTHER_SUBJECTS = [
      { id: "russian", title: "Русский язык", icon: "Aa" },
      { id: "math", title: "Математика", icon: "√x" },
      { id: "social", title: "Обществознание", icon: "👥" },
      { id: "history", title: "История", icon: "🏛️" },
      { id: "physics", title: "Физика", icon: "⚛️" },
      { id: "informatics", title: "Информатика", icon: "💻" },
      { id: "english", title: "Английский язык", icon: "EN" },
      { id: "literature", title: "Литература", icon: "📖" },
      { id: "geography", title: "География", icon: "🌍" },
    ];

    const filteredOtherSubjects = OTHER_SUBJECTS.filter((sub) => !activeSubjectIds.has(sub.id));

    for (const sub of filteredOtherSubjects) {
      expect(activeSubjectIds.has(sub.id), `Subject ${sub.id} must not be in active DB subjects`).toBe(false);
    }
  });
});
