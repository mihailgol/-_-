export async function api(url, options = {}) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("examhub_token") : null;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data;
}

export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function parseDuration(durStr) {
  const parts = durStr.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 1200;
}

export function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

export function getRecommendedTaskType(subjectId, taskNumber, examType = "EGE") {
  const num = parseInt(taskNumber, 10) || 1;
  const isOge = String(examType).toUpperCase() === "OGE";

  if (isOge) {
    if (subjectId === "russian" && (num === 1 || num === 13)) return "extended";
    if (subjectId === "math" && num >= 20) return "extended";
    if (subjectId === "biology" && num >= 22) return "extended";
    if (subjectId === "chemistry" && num >= 20) return "extended";
    if (subjectId === "physics" && num >= 20) return "extended";
    if (subjectId === "informatics" && num >= 11) return "extended";
    if (subjectId === "social" && (num === 1 || num === 5 || num === 12 || num >= 21)) return "extended";
    if (subjectId === "history" && num >= 18) return "extended";
    if (subjectId === "literature") return "extended";
    if (subjectId === "geography" && num >= 28) return "extended";
  } else {
    // EGE
    if (subjectId === "russian" && num >= 27) return "extended";
    if (subjectId === "math" && num >= 13) return "extended";
    if (subjectId === "biology" && num >= 22) return "extended";
    if (subjectId === "chemistry" && num >= 29) return "extended";
    if (subjectId === "physics" && num >= 21) return "extended";
    if (subjectId === "informatics" && num >= 27) return "extended";
    if (subjectId === "social" && num >= 17) return "extended";
    if (subjectId === "history" && num >= 13) return "extended";
    if (subjectId === "literature" && (num === 4 || num === 5 || num >= 9)) return "extended";
    if (subjectId === "geography" && num >= 22) return "extended";
  }

  return "single";
}
