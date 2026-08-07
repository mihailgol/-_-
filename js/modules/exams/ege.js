export const egeProvider = {
  id: "EGE",
  title: "ЕГЭ 2026",
  shortTitle: "ЕГЭ",
  subtitle: "Единый Государственный Экзамен",
  badgeColor: "#6366f1",
  badgeBg: "rgba(99, 102, 241, 0.15)",
  themeClass: "exam-mode-ege",
  primaryColor: "#6366f1",
  accentGradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  sections: [
    { id: "subjects", title: "Предметы ЕГЭ", icon: "book-open" },
    { id: "notes", title: "Теория ЕГЭ", icon: "file-text" },
    { id: "videos", title: "Видеоуроки", icon: "video" },
    { id: "tests", title: "Практика ЕГЭ", icon: "check-square" },
    { id: "plan", title: "План подготовки", icon: "calendar" },
    { id: "analytics", title: "Аналитика", icon: "bar-chart-2" },
    { id: "cart", title: "Подписка", icon: "shopping-bag" },
    { id: "support", title: "Поддержка", icon: "help-circle" },
  ],
  filterSubject: (subject) => {
    if (!subject) return false;
    const title = (subject.title || "").toLowerCase();
    if (subject.examType) return subject.examType === "EGE";
    return !title.includes("огэ");
  },
  recommendations: [
    "🚀 Рекомендуем начать с тренировки первой части ЕГЭ по Профильной математике",
    "📚 Разберите клише и критерии для сочинения ЕГЭ по русскому языку",
    "⚡ Пройдите полноценный пробный экзамен ЕГЭ с ограничением по времени",
  ],
};
