// Skill model + localStorage-backed progress tracking for the games section.

export const SKILLS = [
  { key: "vocabulary", emoji: "📚", color: "#6366f1" },
  { key: "grammar", emoji: "🧩", color: "#14b8a6" },
  { key: "spelling", emoji: "🔤", color: "#f59e0b" },
  { key: "comprehension", emoji: "📖", color: "#f43f5e" },
  { key: "creativity", emoji: "💬", color: "#8b5cf6" },
];

// Each game trains one primary skill (quiz + crossword both train vocabulary).
export const GAME_SKILL_MAP = {
  quiz: "vocabulary",
  crossword: "vocabulary",
  wordforms: "grammar",
  spelling: "spelling",
  definition: "comprehension",
  sentence: "creativity",
};

const KEY = "vm_skill_stats_v1";

export function getSkillStats() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}

export function recordGameResult(gameId, scorePct) {
  const skill = GAME_SKILL_MAP[gameId];
  if (!skill) return;
  const all = getSkillStats();
  const cur = all[skill] || { plays: 0, best: 0, last: 0 };
  cur.plays = (cur.plays || 0) + 1;
  cur.last = scorePct;
  cur.best = Math.max(cur.best || 0, scorePct);
  all[skill] = cur;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export function getGameStats(gameId) {
  const skill = GAME_SKILL_MAP[gameId];
  if (!skill) return { plays: 0, best: 0, last: 0 };
  return getSkillStats()[skill] || { plays: 0, best: 0, last: 0 };
}

export function getOverallStats() {
  const all = getSkillStats();
  let plays = 0, bestSum = 0, trained = 0;
  SKILLS.forEach(s => {
    const v = all[s.key];
    if (v) {
      plays += v.plays || 0;
      if ((v.best || 0) > 0) { bestSum += v.best; trained += 1; }
    }
  });
  return { plays, avgMastery: trained ? Math.round(bestSum / trained) : 0, skillsTrained: trained };
}

export function getRadarData() {
  const all = getSkillStats();
  return SKILLS.map(s => ({ key: s.key, value: all[s.key]?.best || 0, color: s.color, emoji: s.emoji }));
}