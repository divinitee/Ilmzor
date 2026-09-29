// VT-6 Meaningful Progress V1 — the ONE place mastery is defined.
//
// Deterministic and explainable: a skill's current_mastery is
//   (items correct) / (items presented) across its most recent
//   EVIDENCE_WINDOW_N rounds.
// Item-weighted, so a 20-item round counts more than a 4-item one. No EMA,
// no hidden weights, no time decay — freshness is a label, never a penalty.
// Every value here is recomputable from the ledgers (RewardEvent, and
// GrammarAttempt which is what grammar rounds' counts are derived from).

export const SKILL_KEYS = ["vocabulary", "grammar", "spelling", "comprehension", "creativity"];

// Server mirror of src/lib/gameSkills.js GAME_SKILL_MAP (the backend cannot
// import src/). Keep the two in sync.
export const GAME_SKILL_MAP: Record<string, string> = {
  quiz: "vocabulary", crossword: "vocabulary", usage: "vocabulary", odd_one_out: "vocabulary",
  definition_match: "vocabulary", picture_match: "vocabulary", context_guess: "vocabulary",
  memory_flip: "vocabulary", synonym_sprint: "vocabulary", related_words: "vocabulary",
  connection_challenge: "vocabulary",
  grammar: "grammar", wordforms: "grammar",
  spelling: "spelling",
  definition: "comprehension",
  sentence: "creativity",
};

export const EVIDENCE_WINDOW_N = 10;
export const CONFIDENCE_MEDIUM_MIN = 3;   // low < 3
export const CONFIDENCE_HIGH_MIN = 10;    // medium 3-9, high 10+
export const FRESH_MAX_DAYS = 7;          // fresh <= 7d
export const STALE_MAX_DAYS = 30;         // stale <= 30d, cold beyond
const DAY_MS = 24 * 60 * 60 * 1000;

export const gamesForSkill = (skill: string) =>
  Object.keys(GAME_SKILL_MAP).filter((g) => GAME_SKILL_MAP[g] === skill);

export function confidenceFor(count: number) {
  if (count >= CONFIDENCE_HIGH_MIN) return "high";
  if (count >= CONFIDENCE_MEDIUM_MIN) return "medium";
  return "low";
}

export function freshnessFor(lastAt: string | null | undefined, now = Date.now()) {
  if (!lastAt) return "cold";
  const days = (now - new Date(lastAt).getTime()) / DAY_MS;
  if (days <= FRESH_MAX_DAYS) return "fresh";
  if (days <= STALE_MAX_DAYS) return "stale";
  return "cold";
}

const isRound = (r: any) => Number(r?.items_total) > 0;

/** Item-weighted mastery over a window of rounds. */
export function masteryOf(rounds: any[]) {
  let c = 0, t = 0;
  for (const r of rounds) { c += Number(r.items_correct) || 0; t += Number(r.items_total) || 0; }
  return t > 0 ? Math.round((100 * c) / t) : 0;
}

/** Derived, not persisted: newest 3 rounds vs the rest of the window. */
export function trendOf(roundsNewestFirst: any[]) {
  if (roundsNewestFirst.length < 6) return "unknown";
  const d = masteryOf(roundsNewestFirst.slice(0, 3)) - masteryOf(roundsNewestFirst.slice(3));
  return d >= 5 ? "improving" : d <= -5 ? "declining" : "steady";
}

/** Replay a full history (oldest first) to get the lifetime peak of the rolling mastery. */
export function replayPeak(roundsOldestFirst: any[]) {
  let peak = 0;
  for (let i = 0; i < roundsOldestFirst.length; i++) {
    const win = roundsOldestFirst.slice(Math.max(0, i - EVIDENCE_WINDOW_N + 1), i + 1);
    peak = Math.max(peak, masteryOf(win));
  }
  return peak;
}

export function zeroState(email: string, skill: string) {
  return {
    user_email: email, skill, current_mastery: 0, confidence: "low", freshness: "cold",
    evidence_count: 0, last_evidence_at: null, historical_peak: 0, computed_at: null,
  };
}

/** Freshness is always re-derived at read time; a stored label is never trusted. */
export function presentState(row: any, now = Date.now()) {
  return { ...row, freshness: freshnessFor(row.last_evidence_at, now), confidence: confidenceFor(row.evidence_count || 0) };
}

/** Overall demonstrated ability averages EVIDENCED skills only; coverage is separate. */
export function summarize(states: any[]) {
  const ev = states.filter((s) => (s.evidence_count || 0) > 0);
  const avg = ev.length ? Math.round(ev.reduce((a, s) => a + s.current_mastery, 0) / ev.length) : 0;
  return {
    avgMastery: avg,
    skillsEvidenced: ev.length,
    skillsTotal: SKILL_KEYS.length,
    plays: states.reduce((a, s) => a + (s.evidence_count || 0), 0),
  };
}

async function legacyPeak(svc: any, email: string, skill: string) {
  const rows = await svc.SkillHubProgress.filter({ user_email: email, skill }, '-updated_date', 1);
  return Number(rows?.[0]?.best) || 0;
}

async function upsertState(svc: any, email: string, skill: string, fields: any) {
  const existing = await svc.SkillState.filter({ user_email: email, skill }, '-updated_date', 1);
  if (existing?.[0]) return await svc.SkillState.update(existing[0].id, fields);
  return await svc.SkillState.create({ user_email: email, skill, ...fields });
}

/** Normal-operation recompute after a round. Bounded: one window + one count. */
export async function recomputeSkill(svc: any, email: string, skill: string, now = Date.now()) {
  const games = gamesForSkill(skill);
  const q = { user_email: email, game: { $in: games }, items_total: { $gt: 0 } };
  const recent = ((await svc.RewardEvent.filter(q, '-created_date', EVIDENCE_WINDOW_N)) || []).filter(isRound);
  const count = await svc.RewardEvent.count(q);
  const mastery = masteryOf(recent);
  const existing = await svc.SkillState.filter({ user_email: email, skill }, '-updated_date', 1);
  const prevPeak = existing?.[0] ? Number(existing[0].historical_peak) || 0 : await legacyPeak(svc, email, skill);
  const last = recent[0]?.created_date || null;
  return await upsertState(svc, email, skill, {
    current_mastery: mastery,
    confidence: confidenceFor(count),
    freshness: freshnessFor(last, now),
    evidence_count: count,
    last_evidence_at: last,
    historical_peak: Math.max(prevPeak, mastery),
    computed_at: new Date(now).toISOString(),
  });
}

/** Full rebuild from the ledger (admin/backfill). Must equal normal operation. */
export async function rebuildSkill(svc: any, email: string, skill: string, now = Date.now()) {
  const games = gamesForSkill(skill);
  const q = { user_email: email, game: { $in: games }, items_total: { $gt: 0 } };
  const all: any[] = [];
  let skip = 0;
  while (true) {
    const page = (await svc.RewardEvent.filter(q, 'created_date', 500, skip)) || [];
    all.push(...page.filter(isRound));
    if (page.length < 500) break;
    skip += 500;
  }
  const recent = all.slice(-EVIDENCE_WINDOW_N).reverse();
  const mastery = masteryOf(recent);
  const last = recent[0]?.created_date || null;
  return await upsertState(svc, email, skill, {
    current_mastery: mastery,
    confidence: confidenceFor(all.length),
    freshness: freshnessFor(last, now),
    evidence_count: all.length,
    last_evidence_at: last,
    historical_peak: Math.max(await legacyPeak(svc, email, skill), replayPeak(all)),
    computed_at: new Date(now).toISOString(),
  });
}

/** Five rows for one learner, zero-filled, freshness re-derived. */
export async function readSkillStates(svc: any, email: string, now = Date.now()) {
  const rows = (await svc.SkillState.filter({ user_email: email }, '-updated_date', 20)) || [];
  const bySkill: Record<string, any> = {};
  for (const r of rows) if (!bySkill[r.skill]) bySkill[r.skill] = r;
  const skills = SKILL_KEYS.map((k) => presentState(bySkill[k] || zeroState(email, k), now));
  return { skills, overall: summarize(skills) };
}