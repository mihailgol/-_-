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

function buildCatalog(user) {
  const rows = db.prepare("SELECT * FROM subjects WHERE is_active = 1 ORDER BY sort_order").all();

  const subjects = rows.map((sub) => {
    const topics = db.prepare("SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order").all(sub.id);

    return {
      id: sub.id,
      title: sub.title,
      icon: sub.icon,
      color: sub.color,
      colorHex: sub.color_hex,
      bgGradient: sub.bg_gradient,
      topics: topics.map((t) => {
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
            : questionRows.map((q) => ({
                id: q.id,
                type: q.type,
                question: q.question,
                options: JSON.parse(q.options_json),
                correctIndex: q.correct_index,
                explanation: q.explanation,
              })),
        };
      }),
    };
  });

  return { subjects, otherSubjects: OTHER_SUBJECTS };
}

router.get("/subjects", optionalAuth, (req, res) => {
  res.json(buildCatalog(req.user));
});

export default router;
