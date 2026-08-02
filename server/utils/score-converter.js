export function convertScore({ examType, primaryScore, maxPrimaryScore, conversionTable }) {
  const pScore = typeof primaryScore === "number" && !isNaN(primaryScore) ? primaryScore : 0;
  const maxPScore = typeof maxPrimaryScore === "number" && maxPrimaryScore > 0 ? maxPrimaryScore : 1;

  const clampedPrimary = Math.max(0, Math.min(pScore, maxPScore));

  let table = conversionTable;
  if (typeof table === "string") {
    try {
      table = JSON.parse(table);
    } catch {
      table = null;
    }
  }

  if (table && typeof table === "object" && table[String(clampedPrimary)] !== undefined) {
    return Number(table[String(clampedPrimary)]);
  }

  const normalizedExamType = String(examType || "").toUpperCase();

  if (normalizedExamType === "OGE") {
    const ratio = clampedPrimary / maxPScore;
    if (ratio < 0.3) return 2;
    if (ratio < 0.5) return 3;
    if (ratio < 0.8) return 4;
    return 5;
  }

  return Math.min(100, Math.max(0, Math.round((clampedPrimary / maxPScore) * 100)));
}
