import { egeProvider } from "./exams/ege.js";
import { ogeProvider } from "./exams/oge.js";
import { appState } from "./state.js";
import { api } from "./utils.js";

class ExamEngineRegistry {
  constructor() {
    this.providers = new Map();
    this.activeExamId = "EGE";

    this.registerProvider(egeProvider);
    this.registerProvider(ogeProvider);
  }

  registerProvider(provider) {
    if (!provider || !provider.id) return;
    this.providers.set(provider.id, provider);
  }

  getProvider(examId) {
    return this.providers.get(examId) || this.providers.get("EGE");
  }

  getActiveProvider() {
    return this.getProvider(this.activeExamId);
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }

  setActiveExam(examId, syncServer = true) {
    const validId = this.providers.has(examId) ? examId : "EGE";
    this.activeExamId = validId;
    appState.selectedExamType = validId;
    localStorage.setItem("examhub_exam_type", validId);

    if (syncServer && appState.user && appState.user.isLoggedIn) {
      api("/api/auth/exam-type", {
        method: "PATCH",
        body: JSON.stringify({ examType: validId }),
      }).catch((err) => console.error("Failed to sync exam type with server:", err));
    }

    this.applyExamTheme();
    this.updateExamUI();

    window.dispatchEvent(new CustomEvent("examTypeChanged", { detail: { examType: validId } }));
  }

  applyExamTheme() {
    const provider = this.getActiveProvider();
    document.body.classList.remove("exam-mode-ege", "exam-mode-oge");
    document.body.classList.add(provider.themeClass || "exam-mode-ege");

    document.documentElement.style.setProperty("--exam-primary-color", provider.primaryColor);
    document.documentElement.style.setProperty("--exam-badge-color", provider.badgeColor);
    document.documentElement.style.setProperty("--exam-badge-bg", provider.badgeBg);
  }

  updateExamUI() {
    const provider = this.getActiveProvider();

    const modeBadges = document.querySelectorAll(".exam-mode-badge");
    modeBadges.forEach((el) => {
      el.textContent = provider.title;
      el.style.backgroundColor = provider.badgeBg;
      el.style.color = provider.badgeColor;
    });

    const recommendationsList = document.getElementById("recommendationsList");
    if (recommendationsList && provider.recommendations) {
      recommendationsList.innerHTML = provider.recommendations
        .map(
          (rec) => `
        <div class="recommendation-item" style="padding: 12px 16px; background: var(--color-card-bg); border-radius: 12px; border: 1px solid var(--color-border); margin-bottom: 8px;">
          ${rec}
        </div>
      `
        )
        .join("");
    }
  }

  filterSubjects(subjects) {
    if (!subjects) return [];
    const provider = this.getActiveProvider();
    return subjects.filter((s) => provider.filterSubject(s));
  }
}

export const examEngine = new ExamEngineRegistry();
