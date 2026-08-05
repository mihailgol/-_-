import { getSubjectProgress } from "./state.js";

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
}
