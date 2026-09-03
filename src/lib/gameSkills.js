// Skill model + progress tracking for the games section. Local (localStorage)
// for instant UI (completion chips on the mind-map, no loading state) plus a
// server-synced copy (SkillHubProgress entity) that's the real source of
// truth for anything that needs to survive a device change or be read back
// on the dashboard — see syncGameResultToServer / getRemoteOverallStats.
import { base44 } from "@/api/base44Client";

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
  odd_one_out: "vocabulary",
  // GrammarQuizGame's id — was missing entirely, which meant every one of
  // the 8 dedicated grammar categories (Verb Tenses, Articles, Prepositions,
  // Punctuation, Question Formation, Active vs Passive, Conditionals,
  // Reported Speech — 16 challenge nodes total) silently recorded nothing:
  // recordGameResult() early-returns when GAME_SKILL_MAP[gameId] is
  // undefined. That's why grammar nodes never showed a completion % and
  // grammar progress never appeared anywhere. definition_match,
  // picture_match, context_guess, memory_flip intentionally still fall
  // through to vocabulary below, same as before.
  grammar: "grammar",
  definition_match: "vocabulary",
  picture_match: "vocabulary",
  context_guess: "vocabulary",
  memory_flip: "vocabulary",
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

// --- Server-synced progress (SkillHubProgress entity: one row per
// (user_email, skill)) ---------------------------------------------------

// Fire-and-forget upsert, called right after the local write in
// SkillHub.jsx's handleGameComplete. Never throws into the UI — a failed
// sync just means this one round doesn't count toward the dashboard stat
// yet; the local completion chip (which doesn't depend on this) still works.
export async function syncGameResultToServer(userEmail, gameId, scorePct) {
  const skill = GAME_SKILL_MAP[gameId];
  if (!skill || !userEmail) return;
  try {
    const existing = await base44.entities.SkillHubProgress.filter({ user_email: userEmail, skill });
    if (existing.length > 0) {
      const row = existing[0];
      await base44.entities.SkillHubProgress.update(row.id, {
        plays: (row.plays || 0) + 1,
        best: Math.max(row.best || 0, scorePct),
        last: scorePct,
      });
    } else {
      await base44.entities.SkillHubProgress.create({ user_email: userEmail, skill, plays: 1, best: scorePct, last: scorePct });
    }
  } catch (e) {
    console.error(e);
  }
}

// Real, cross-device Skill Hub progress for the given user — what the
// dashboard hero card reads, as opposed to getOverallStats() above which is
// this browser's localStorage only.
export async function getRemoteOverallStats(userEmail) {
  if (!userEmail) return { plays: 0, avgMastery: 0, skillsTrained: 0 };
  try {
    const rows = await base44.entities.SkillHubProgress.filter({ user_email: userEmail });
    let plays = 0, bestSum = 0, trained = 0;
    rows.forEach(r => {
      plays += r.plays || 0;
      if ((r.best || 0) > 0) { bestSum += r.best; trained += 1; }
    });
    return { plays, avgMastery: trained ? Math.round(bestSum / trained) : 0, skillsTrained: trained };
  } catch (e) {
    console.error(e);
    return { plays: 0, avgMastery: 0, skillsTrained: 0 };
  }
}