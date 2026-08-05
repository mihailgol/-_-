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
    testsSolved: 0,
    avgPercent: 0,
    streak: 0,
    achievements: 0,
    questionsToday: 0,
    lessonsWatched: 0,
    readTopics: [],
    lastActiveDate: null,
    planTasks: {},
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
  pendingAssignmentId: null,
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

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function registerActivity() {
  const today = toDateKey(new Date());
  const last = appState.stats.lastActiveDate;
  if (last === today) {
    return;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  appState.stats.streak = last === toDateKey(yesterday) ? appState.stats.streak + 1 : 1;
  appState.stats.lastActiveDate = today;
  saveStateToStorage();
}

export function markTopicRead(subjectId, topicId) {
  const key = `${subjectId}:${topicId}`;
  if (!appState.stats.readTopics.includes(key)) {
    appState.stats.readTopics.push(key);
  }
  registerActivity();
  saveStateToStorage();
}

export function isTopicRead(subjectId, topicId) {
  return appState.stats.readTopics.includes(`${subjectId}:${topicId}`);
}

export function getSubjectProgress(subject) {
  if (!subject || !Array.isArray(subject.topics) || subject.topics.length === 0) {
    return 0;
  }
  const read = subject.topics.filter((topic) => isTopicRead(subject.id, topic.id)).length;
  return Math.round((read / subject.topics.length) * 100);
}

export function setPlanTaskDone(taskId, done) {
  if (done) {
    appState.stats.planTasks[taskId] = true;
  } else {
    delete appState.stats.planTasks[taskId];
  }
  saveStateToStorage();
}
