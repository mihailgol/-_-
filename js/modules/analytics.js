import { getSubjectProgress, appState } from "./state.js";

export function updateAnalyticsUI() {
  const subjects = window.EXAM_DATA ? window.EXAM_DATA.subjects : {};
  const bioPercentVal = getSubjectProgress(subjects.biology);
  const chemPercentVal = getSubjectProgress(subjects.chemistry);

  const bioPercentText = document.getElementById("analyticsBioPercent");
  const bioBar = document.getElementById("analyticsBioBar");
  const chemPercentText = document.getElementById("analyticsChemPercent");
  const chemBar = document.getElementById("analyticsChemBar");

  if (bioPercentText) bioPercentText.textContent = `${bioPercentVal}%`;
  if (bioBar) bioBar.style.width = `${bioPercentVal}%`;

  if (chemPercentText) chemPercentText.textContent = `${chemPercentVal}%`;
  if (chemBar) chemBar.style.width = `${chemPercentVal}%`;

  const streakText = document.getElementById("analyticsStreakText");
  const attempts = appState.userHistory || [];
  const streak = attempts.length > 0 ? (appState.streakDays || 1) : 0;
  if (streakText) streakText.textContent = `${streak} дней подряд`;
}
