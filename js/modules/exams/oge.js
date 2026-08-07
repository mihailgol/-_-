export const ogeProvider = {
  id: "OGE",
  title: "ОГЭ 2026",
  shortTitle: "ОГЭ",
  subtitle: "Основной Государственный Экзамен",
  badgeColor: "#0ea5e9",
  badgeBg: "rgba(14, 165, 233, 0.15)",
  themeClass: "exam-mode-oge",
  primaryColor: "#0ea5e9",
  accentGradient: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
  sections: [
    { id: "subjects", title: "Предметы ОГЭ", icon: "book-open" },
    { id: "notes", title: "Теория ОГЭ", icon: "file-text" },
    { id: "videos", title: "Видеоуроки", icon: "video" },
    { id: "tests", title: "Практика ОГЭ", icon: "check-square" },
    { id: "plan", title: "План ОГЭ", icon: "calendar" },
    { id: "analytics", title: "Аналитика", icon: "bar-chart-2" },
    { id: "cart", title: "Подписка", icon: "shopping-bag" },
    { id: "support", title: "Поддержка", icon: "help-circle" },
  ],
  filterSubject: (subject) => {
    if (!subject) return false;
    const title = (subject.title || "").toLowerCase();
    if (subject.examType) return subject.examType === "OGE";
    return title.includes("огэ") || title.includes("9") || subject.id?.includes("oge");
  },
  recommendations: [
    "🎯 Освойте базовые модули 'Алгебра' и 'Геометрия' для 9 класса",
    "📝 Изучите структуру изложения и сочинения ОГЭ по русскому языку",
    "🧪 Решите лабораторный блок заданий ОГЭ по физике и химии",
  ],
};
