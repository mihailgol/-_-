import { readFileSync } from "node:fs";
import vm from "node:vm";
import { db, transaction } from "./db.js";

export function seedContent() {
  const src = readFileSync(new URL("../js/data.js", import.meta.url), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: "data.js" });

  const data = sandbox.window.EXAM_DATA;
  if (!data?.subjects) return;

  const insSubject = db.prepare(
    `INSERT OR IGNORE INTO subjects (id, title, icon, color, color_hex, bg_gradient, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  );
  const insTopic = db.prepare(
    `INSERT OR IGNORE INTO topics (id, subject_id, title, is_premium, duration, theory, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insVideo = db.prepare(
    `INSERT OR IGNORE INTO videos (id, topic_id, title, instructor, duration, youtube_id, views, thumbnail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insQuestion = db.prepare(
    `INSERT OR IGNORE INTO questions (id, topic_id, type, question, options_json, correct_index, explanation, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  transaction(() => {
    Object.values(data.subjects).forEach((subject, si) => {
      insSubject.run(subject.id, subject.title, subject.icon, subject.color, subject.colorHex, subject.bgGradient, si);

      subject.topics.forEach((topic, ti) => {
        insTopic.run(
          topic.id,
          subject.id,
          topic.title,
          topic.isPremium ? 1 : 0,
          topic.duration,
          topic.theory,
          ti
        );

        if (topic.video) {
          const v = topic.video;
          insVideo.run(
            v.youtubeId || `${topic.id}_video`,
            topic.id,
            v.title,
            v.instructor,
            v.duration,
            v.youtubeId,
            String(v.views ?? "0"),
            v.thumbnail
          );
        }

        (topic.questions || []).forEach((q, qi) => {
          insQuestion.run(q.id, topic.id, q.type || "single", q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, qi);
        });
      });
    });
  });
}
