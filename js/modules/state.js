export const HASH_VIEWS = ["subjects", "notes", "videos", "tests", "mock-exam", "teacher", "plan", "analytics", "admin", "cart", "support"];

export const GUEST_USER = {
  isLoggedIn: false,
  name: "Гость",
  role: "Ученик",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
  isPremium: false,
};

export let appState = {
  currentView: "subjects",
  selectedExamType: "all",
  user: {
    isLoggedIn: false,
    name: "Артём Иванов",
    role: "Ученик",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
    isPremium: false,
  },
  stats: {
    testsSolved: 1248,
    avgPercent: 87,
    streak: 23,
    achievements: 15,
    questionsToday: 125,
    lessonsWatched: 0,
  },
  currentSubject: null,
  activeNoteId: null,
  activeQuizQuestions: [],
  activeQuizTitle: "",
  activeQuizOrigin: null,
  activeQuizIndex: 0,
  activeQuizScore: 0,
  activeQuizAnswers: [],
  activeSelectedOptionIndex: null,
  customTopics: {},
  videoState: {
    isPlaying: false,
    finished: false,
    rewarded: false,
    timer: null,
    currentTime: 495,
    duration: 1300,
  },
};

export function loadStateFromStorage() {
  const saved = localStorage.getItem("examhub_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState.user = { ...appState.user, ...parsed.user };
      appState.stats = { ...appState.stats, ...parsed.stats };

      if (parsed.customTopics) {
        appState.customTopics = parsed.customTopics;
        Object.entries(appState.customTopics).forEach(([subjectId, topics]) => {
          const subj = window.EXAM_DATA.subjects[subjectId];
          if (subj && Array.isArray(topics)) {
            subj.topics.push(...topics);
          }
        });
      }
    } catch (e) {
      console.error("Failed to load local storage state:", e);
    }
  }
}

export function saveStateToStorage() {
  localStorage.setItem(
    "examhub_state",
    JSON.stringify({
      user: appState.user,
      stats: appState.stats,
      customTopics: appState.customTopics,
    })
  );
}
