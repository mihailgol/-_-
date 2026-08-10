import { getSubjectProgress, appState } from "./state.js";
import { api } from "./utils.js";
import { getTimeOnSiteSeconds } from "./analytics-engine.js";

export async function updateAnalyticsUI() {
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

  let attempts;
  try {
    const res = await api("/api/progress/attempts");
    attempts = res.attempts || [];
  } catch {
    attempts = appState.userHistory || [];
  }

  const streakText = document.getElementById("analyticsStreakText");
  const streak = attempts.length > 0 ? (appState.streakDays || 1) : 0;
  if (streakText) streakText.textContent = `${streak} дней подряд`;

  updateTimeSpentChart(attempts);
  updateScoreProgressionChart(attempts);
}

function updateTimeSpentChart(attempts) {
  const container = document.getElementById("analyticsTimeSpentChart");
  if (!container) return;

  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];

  const now = new Date();
  const nowTime = now.getTime();
  const sevenDaysAgo = nowTime - 7 * 24 * 60 * 60 * 1000;

  attempts.forEach((item) => {
    const itemDate = item.created_at ? new Date(item.created_at) : new Date();
    if (itemDate.getTime() >= sevenDaysAgo) {
      const dayIdx = (itemDate.getDay() + 6) % 7;
      const mins = item.timer_seconds ? Math.round(item.timer_seconds / 60) : Math.max(3, Math.round((item.total || 5) * 1.5));
      dayMinutes[dayIdx] += mins;
    }
  });

  const activeMins = Math.round(getTimeOnSiteSeconds() / 60);
  const todayIdx = (now.getDay() + 6) % 7;
  dayMinutes[todayIdx] += activeMins;

  const maxMins = Math.max(30, ...dayMinutes);

  const svgBars = dayMinutes.map((mins, i) => {
    const x = 45 + i * 35;
    const barHeight = mins > 0 ? Math.max(8, Math.round((mins / maxMins) * 120)) : 2;
    const yPos = 150 - barHeight;
    const fill = mins > 0 ? "var(--color-green)" : "var(--color-bg-hover)";
    const label = mins > 0 ? `<text x="${x + 10}" y="${yPos - 6}" font-size="8" font-weight="700" text-anchor="middle" fill="var(--color-green)">${mins}м</text>` : "";
    return `
      <rect x="${x}" y="${yPos}" width="20" height="${barHeight}" rx="3" fill="${fill}" />
      ${label}
      <text x="${x + 10}" y="165" font-size="9" text-anchor="middle" fill="var(--color-text-secondary)">${dayNames[i]}</text>
    `;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 320 180" class="svg-chart">
      <line x1="30" y1="20" x2="300" y2="20" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="60" x2="300" y2="60" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="100" x2="300" y2="100" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="140" x2="300" y2="140" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="150" x2="300" y2="150" stroke="var(--color-border)" stroke-width="1.5" />
      ${svgBars}
    </svg>
  `;
}

function updateScoreProgressionChart(attempts) {
  const container = document.getElementById("analyticsScoreProgressionChart");
  if (!container) return;

  if (!attempts || attempts.length === 0) {
    container.innerHTML = `
      <svg viewBox="0 0 320 180" class="svg-chart">
        <line x1="30" y1="20" x2="300" y2="20" stroke="var(--color-border)" stroke-width="1" />
        <line x1="30" y1="60" x2="300" y2="60" stroke="var(--color-border)" stroke-width="1" />
        <line x1="30" y1="100" x2="300" y2="100" stroke="var(--color-border)" stroke-width="1" />
        <line x1="30" y1="140" x2="300" y2="140" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="4" />
        <line x1="30" y1="150" x2="300" y2="150" stroke="var(--color-border)" stroke-width="1.5" />
        <text x="165" y="85" font-size="11" font-weight="600" text-anchor="middle" fill="var(--color-text-secondary)">
          Пройдите первый тест для расчета динамики балла
        </text>
      </svg>
    `;
    return;
  }

  const pointsData = [...attempts]
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .slice(-6);

  const totalPoints = pointsData.length;
  const coords = pointsData.map((item, idx) => {
    const x = totalPoints === 1 ? 165 : Math.round(40 + (idx / (totalPoints - 1)) * 250);
    const percent = Math.min(100, Math.max(0, item.percent || 0));
    const y = Math.round(140 - (percent / 100) * 110);
    
    let dateLabel = "Тест";
    if (item.created_at) {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) {
        const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
        dateLabel = `${d.getDate()} ${months[d.getMonth()]}`;
      }
    }
    return { x, y, percent, title: item.title || "Тест", dateLabel };
  });

  let pathD;
  if (coords.length === 1) {
    pathD = `M 40 ${coords[0].y} L 290 ${coords[0].y}`;
  } else {
    pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  }

  const pointElements = coords.map((c) => `
    <circle cx="${c.x}" cy="${c.y}" r="5" fill="var(--color-surface)" stroke="var(--color-blue)" stroke-width="2" />
    <text x="${c.x}" y="${c.y - 8}" font-size="10" font-weight="700" text-anchor="middle" fill="var(--color-blue)">${c.percent}%</text>
    <text x="${c.x}" y="165" font-size="9" text-anchor="middle" fill="var(--color-text-secondary)">${c.dateLabel}</text>
  `).join("");

  container.innerHTML = `
    <svg viewBox="0 0 320 180" class="svg-chart">
      <line x1="30" y1="20" x2="300" y2="20" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="60" x2="300" y2="60" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="100" x2="300" y2="100" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="140" x2="300" y2="140" stroke="var(--color-border)" stroke-width="1" />
      <line x1="30" y1="150" x2="300" y2="150" stroke="var(--color-border)" stroke-width="1.5" />

      <path
        d="${pathD}"
        fill="none"
        stroke="var(--color-blue)"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        ${coords.length === 1 ? 'stroke-dasharray="4"' : ''}
      />

      ${pointElements}
    </svg>
  `;
}
