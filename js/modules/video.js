import { appState, saveStateToStorage, registerActivity } from "./state.js";
import { parseDuration } from "./utils.js";
import { showToast, openModal } from "./ui.js";
import { updateUIFromState } from "./render.js";

export function initVideoPlayerEvents() {
  const timeline = document.getElementById("videoTimelineWrapper");
  if (timeline) {
    timeline.addEventListener("click", (e) => {
      const rect = timeline.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;

      appState.videoState.currentTime = Math.round(appState.videoState.duration * pct);
      updateVideoProgressUI();
    });
  }

  const playToggle = document.getElementById("videoPlayToggleBtn");
  if (playToggle) {
    playToggle.addEventListener("click", toggleMockVideoPlay);
  }

  const canvas = document.getElementById("mockVideoCanvas");
  if (canvas) {
    canvas.addEventListener("click", (e) => {
      if (e.target.closest(".video-mock-controls")) return;
      toggleMockVideoPlay();
    });
  }
}

export function openVideoPlayer(video) {
  document.getElementById("videoPlayerTitle").textContent = video.title;

  appState.videoState.duration = parseDuration(video.duration);
  appState.videoState.currentTime = 0;
  appState.videoState.isPlaying = false;
  appState.videoState.finished = false;
  appState.videoState.rewarded = false;

  if (appState.videoState.timer) {
    clearInterval(appState.videoState.timer);
  }

  updateVideoProgressUI();

  const playIcon = document.getElementById("videoPlayToggleBtn").querySelector("i");
  playIcon.setAttribute("data-lucide", "play");
  document.getElementById("videoCanvasPlayIcon").style.display = "block";
  document.getElementById("videoCanvasStatusText").textContent = "Нажмите для воспроизведения";
  if (window.lucide) window.lucide.createIcons();

  openModal("videoModal");
}

export function toggleMockVideoPlay() {
  const canvasPlayIcon = document.getElementById("videoCanvasPlayIcon");
  const playToggleIcon = document.getElementById("videoPlayToggleBtn").querySelector("i");
  const statusText = document.getElementById("videoCanvasStatusText");

  if (appState.videoState.finished) {
    appState.videoState.finished = false;
    appState.videoState.rewarded = false;
    appState.videoState.currentTime = 0;
    updateVideoProgressUI();
    statusText.textContent = "Перезапуск...";
  }

  if (appState.videoState.isPlaying) {
    appState.videoState.isPlaying = false;
    clearInterval(appState.videoState.timer);

    canvasPlayIcon.style.display = "block";
    statusText.textContent = "Воспроизведение приостановлено";
    playToggleIcon.setAttribute("data-lucide", "play");
  } else {
    appState.videoState.isPlaying = true;
    canvasPlayIcon.style.display = "none";
    statusText.textContent = "Идет воспроизведение лекции...";
    playToggleIcon.setAttribute("data-lucide", "pause");

    appState.videoState.timer = setInterval(() => {
      appState.videoState.currentTime++;
      if (appState.videoState.currentTime >= appState.videoState.duration) {
        clearInterval(appState.videoState.timer);
        appState.videoState.isPlaying = false;
        appState.videoState.currentTime = appState.videoState.duration;
        appState.videoState.finished = true;
        canvasPlayIcon.style.display = "block";
        statusText.textContent = "Просмотр завершен";
        playToggleIcon.setAttribute("data-lucide", "rotate-ccw");

        if (!appState.videoState.rewarded) {
          appState.videoState.rewarded = true;
          appState.stats.lessonsWatched = (appState.stats.lessonsWatched || 0) + 1;
          registerActivity();
          saveStateToStorage();
          updateUIFromState();
          showToast("🎓 Лекция изучена", "Вы прослушали лекцию до конца. Прогресс сохранен!");
        }
      }
      updateVideoProgressUI();
    }, 1000);
  }

  if (window.lucide) window.lucide.createIcons();
}

export function updateVideoProgressUI() {
  const current = appState.videoState.currentTime;
  const duration = appState.videoState.duration;

  const pct = (current / duration) * 100;
  document.getElementById("videoTimelineProgress").style.width = `${pct}%`;
  document.getElementById("videoTimelineHandle").style.left = `${pct}%`;

  const format = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  document.getElementById("videoTimeText").textContent = `${format(current)} / ${format(duration)}`;
}
