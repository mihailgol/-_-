import { appState, saveStateToStorage } from "./state.js";
import { showToast } from "./ui.js";
import { renderSubjects, renderGeneralNotes, renderGeneralVideos, loadSubjectDetail } from "./catalog.js";

export function initAdminEvents() {
  const publishBtn = document.getElementById("adminPublishBtn");
  if (!publishBtn) return;

  publishBtn.addEventListener("click", () => {
    const subjectSelect = document.getElementById("adminSubjectSelect");
    const topicTitle = document.getElementById("adminTopicTitle");
    const topicDuration = document.getElementById("adminTopicDuration");
    const theoryContent = document.getElementById("adminTheoryContent");

    const videoTitle = document.getElementById("adminVideoTitle");
    const videoDuration = document.getElementById("adminVideoDuration");
    const videoLecturer = document.getElementById("adminVideoLecturer");
    const videoCover = document.getElementById("adminVideoCover");

    const questionText = document.getElementById("adminQuestionText");
    const optA = document.getElementById("adminOptA");
    const optB = document.getElementById("adminOptB");
    const optC = document.getElementById("adminOptC");
    const optD = document.getElementById("adminOptD");
    const correctSelect = document.getElementById("adminCorrectSelect");
    const explanation = document.getElementById("adminExplanation");

    if (!topicTitle.value.trim() || !theoryContent.value.trim()) {
      showToast("❌ Ошибка ввода", "Пожалуйста, укажите название темы и заполните текст конспекта.");
      return;
    }

    const subjectId = subjectSelect.value;
    const subject = window.EXAM_DATA.subjects[subjectId];
    if (!subject) return;

    const topicId = "dyn_" + Date.now();
    const newTopic = {
      id: topicId,
      title: topicTitle.value.trim(),
      isPremium: false,
      duration: topicDuration.value.trim() || "40 мин",
      theory: theoryContent.value,
      video: {
        title: videoTitle.value.trim() || "Тематическая лекция",
        instructor: videoLecturer.value.trim() || "Преподаватель ExamHub",
        duration: videoDuration.value.trim() || "20:00",
        youtubeId: "dyn_vid_" + Date.now(),
        views: "1",
        thumbnail:
          videoCover.value.trim() ||
          "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&q=80&w=400",
      },
      questions: [
        {
          id: "q_dyn_" + Date.now(),
          type: "single",
          question: questionText.value.trim() || "Вопрос по теме?",
          options: [
            optA.value.trim() || "Вариант 1",
            optB.value.trim() || "Вариант 2",
            optC.value.trim() || "Вариант 3",
            optD.value.trim() || "Вариант 4",
          ],
          correctIndex: parseInt(correctSelect.value),
          explanation: explanation.value.trim() || "Разбор ответа.",
        },
      ],
    };

    subject.topics.push(newTopic);

    appState.customTopics[subjectId] = appState.customTopics[subjectId] || [];
    appState.customTopics[subjectId].push(newTopic);
    saveStateToStorage();

    renderSubjects();
    renderGeneralNotes();
    renderGeneralVideos();

    topicTitle.value = "";
    theoryContent.value = "";
    videoTitle.value = "";
    questionText.value = "";

    showToast("🚀 Тема добавлена", "Новый конспект, видеоурок и тест успешно опубликованы на платформе!");

    loadSubjectDetail(subjectId);
  });
}
