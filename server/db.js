import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";
import { seedContent } from "./seed.js";

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Ученик',
      avatar TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      vk_id TEXT UNIQUE,
      yandex_id TEXT UNIQUE,
      is_premium INTEGER NOT NULL DEFAULT 0,
      premium_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec("ALTER TABLE users ADD COLUMN vk_id TEXT UNIQUE;");
  } catch (err) {
    void err;
  }
  try {
    db.exec("ALTER TABLE users ADD COLUMN yandex_id TEXT UNIQUE;");
  } catch (err) {
    void err;
  }
  try {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';");
  } catch (err) {
    void err;
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      bg_gradient TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_premium INTEGER NOT NULL DEFAULT 0,
      duration TEXT NOT NULL DEFAULT '45 мин',
      theory TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL UNIQUE REFERENCES topics(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      instructor TEXT NOT NULL,
      duration TEXT NOT NULL,
      youtube_id TEXT NOT NULL,
      views TEXT NOT NULL DEFAULT '0',
      thumbnail TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'single',
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id TEXT,
      title TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      percent INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      provider TEXT NOT NULL DEFAULT 'mock',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ai_generations_user_date ON ai_generations(user_id, created_at);

    CREATE TABLE IF NOT EXISTS mock_exams (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      is_premium INTEGER NOT NULL DEFAULT 0,
      questions_json TEXT NOT NULL,
      conversion_table_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mock_exam_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mock_exam_id TEXT NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
      answers_json TEXT NOT NULL,
      primary_score INTEGER NOT NULL,
      max_primary_score INTEGER NOT NULL,
      secondary_score INTEGER NOT NULL,
      time_spent_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      topic_id TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      percent INTEGER NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function transaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function resetDb() {
  db.exec(`
    DROP TABLE IF EXISTS assignment_submissions;
    DROP TABLE IF EXISTS assignments;
    DROP TABLE IF EXISTS group_members;
    DROP TABLE IF EXISTS groups;
    DROP TABLE IF EXISTS mock_exam_attempts;
    DROP TABLE IF EXISTS mock_exams;
    DROP TABLE IF EXISTS ai_generations;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS attempts;
    DROP TABLE IF EXISTS questions;
    DROP TABLE IF EXISTS videos;
    DROP TABLE IF EXISTS topics;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
  `);
}

export function initDb() {
  initSchema();
  seedContent();
}
