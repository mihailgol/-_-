import { appState } from "./state.js";

export function updateAnalyticsUI() {
  const solved = appState.stats.testsSolved;
  const avgPercent = appState.stats.avgPercent || 0;

  const baseBio = 50 + Math.round(avgPercent * 0.3);
  const baseChem = 42 + Math.round(avgPercent * 0.28);
  const bioPercentVal = Math.min(100, Math.round(baseBio + solved * 0.015));
  const chemPercentVal = Math.min(100, Math.round(baseChem + solved * 0.015));

  const bioPercentText = document.getElementById("analyticsBioPercent");
  const bioBar = document.getElementById("analyticsBioBar");
  const chemPercentText = document.getElementById("analyticsChemPercent");
  const chemBar = document.getElementById("analyticsChemBar");

  if (bioPercentText) bioPercentText.textContent = `${bioPercentVal}%`;
  if (bioBar) bioBar.style.width = `${bioPercentVal}%`;

  if (chemPercentText) chemPercentText.textContent = `${chemPercentVal}%`;
  if (chemBar) chemBar.style.width = `${chemPercentVal}%`;
}
