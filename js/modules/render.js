import { appState } from "./state.js";
import { formatNumber } from "./utils.js";
import { renderAuthHeader } from "./auth.js";
import { updatePlanUI } from "./plan.js";
import { updateAnalyticsUI } from "./analytics.js";

export function updateUIFromState() {
  const nameEl = document.getElementById("sidebarName");
  const roleEl = document.getElementById("sidebarRole");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl) nameEl.textContent = appState.user.name;
  if (roleEl) roleEl.textContent = appState.user.isPremium ? "Premium Ученик" : "Ученик";
  if (avatarEl) avatarEl.src = appState.user.avatar;

  const premiumCard = document.getElementById("sidebarPremiumCard");
  if (premiumCard) {
    if (appState.user.isPremium) {
      premiumCard.className = "premium-promo-card";
      premiumCard.style.background = "linear-gradient(145deg, #FFF9E6 0%, #FFFFFF 100%)";
      premiumCard.style.borderColor = "rgba(250, 140, 22, 0.4)";
      premiumCard.querySelector(".premium-promo-icon").textContent = "👑";
      premiumCard.querySelector(".premium-promo-title").innerHTML =
        "ExamHub <span style='color: var(--color-orange)'>Premium</span>";
      premiumCard.querySelector(".premium-promo-text").textContent =
        "У вас активен полный доступ к теории, практике и ИИ без ограничений.";
      premiumCard.querySelector(".premium-promo-btn").style.display = "none";
    } else {
      premiumCard.removeAttribute("style");
      premiumCard.querySelector(".premium-promo-icon").textContent = "👑";
      premiumCard.querySelector(".premium-promo-title").textContent = "Стань Premium";
      premiumCard.querySelector(".premium-promo-text").textContent =
        "Открой полный доступ ко всем материалам и возможностям ИИ без ограничений.";
      premiumCard.querySelector(".premium-promo-btn").style.display = "block";
    }
  }

  renderAuthHeader();

  const solvedEl = document.getElementById("statTestsSolved");
  const percentEl = document.getElementById("statAvgPercent");
  const streakEl = document.getElementById("statStreak");
  const achievementEl = document.getElementById("statAchievements");
  const todayEl = document.getElementById("statQuestionsToday");

  if (solvedEl) solvedEl.textContent = formatNumber(appState.stats.testsSolved);
  if (percentEl) percentEl.textContent = `${appState.stats.avgPercent}%`;
  if (streakEl) streakEl.textContent = appState.stats.streak;
  if (achievementEl) achievementEl.textContent = appState.stats.achievements;
  if (todayEl) todayEl.textContent = appState.stats.questionsToday;

  updatePlanUI();
  updateAnalyticsUI();
}
