import { Router } from "express";
import { db } from "../db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

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

function formatTopic(t, user) {
  const isPremium = !!t.is_premium;
  const locked = isPremium && !user?.isPremium;

  const videoRow = db.prepare("SELECT * FROM videos WHERE topic_id = ?").get(t.id);
  const questionRows = db.prepare("SELECT * FROM questions WHERE topic_id = ? ORDER BY sort_order").all(t.id);

  return {
    id: t.id,
    title: t.title,
    isPremium,
    duration: t.duration,
    theory: locked ? null : t.theory,
    video: videoRow
      ? {
          title: videoRow.title,
          instructor: videoRow.instructor,
          duration: videoRow.duration,
          youtubeId: videoRow.youtube_id,
          views: videoRow.views,
          thumbnail: videoRow.thumbnail,
        }
      : undefined,
    questions: locked
      ? undefined
      : questionRows.map((q) => {
          let options;
          try {
            options = JSON.parse(q.options_json);
          } catch {
            options = [];
          }

          let correctAnswer;
          if (q.correct_answer_json) {
            try {
              correctAnswer = JSON.parse(q.correct_answer_json);
            } catch {
              correctAnswer = undefined;
            }
          }

          return {
            id: q.id,
            type: q.type,
            question: q.question,
            options,
            correctIndex: q.correct_index,
            explanation: q.explanation,
            points: q.points || 1,
            ...(correctAnswer !== undefined ? { correctAnswer } : {}),
          };
        }),
  };
}

function formatSubject(sub, user) {
  const topics = db.prepare("SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order").all(sub.id);

  return {
    id: sub.id,
    title: sub.title,
    icon: sub.icon,
    color: sub.color,
    colorHex: sub.color_hex,
    bgGradient: sub.bg_gradient,
    topics: topics.map((t) => formatTopic(t, user)),
  };
}

function buildCatalog(user) {
  const rows = db.prepare("SELECT * FROM subjects WHERE is_active = 1 ORDER BY sort_order").all();
  const activeSubjectIds = new Set(rows.map((sub) => sub.id));
  const otherSubjects = OTHER_SUBJECTS.filter((sub) => !activeSubjectIds.has(sub.id));

  const subjects = rows.map((sub) => formatSubject(sub, user));

  return { subjects, otherSubjects };
}

router.get("/subjects", optionalAuth, (req, res) => {
  res.json(buildCatalog(req.user));
});

router.get("/subjects/:id", optionalAuth, (req, res) => {
  const sub = db.prepare("SELECT * FROM subjects WHERE id = ? AND is_active = 1").get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: "Предмет не найден" });
  }
  res.json({ subject: formatSubject(sub, req.user) });
});

export default router;
