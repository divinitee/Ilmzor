// VT-6 Meaningful Progress — PURE core (no SDK, no I/O). Imported by the
// Deno backend (progressEngine.ts) and by the Node test suite
// (tools/progress/core-tests.mjs), which is why it is plain JS.
//
// Evidence model (corrected 2026-09-29):
//   vocabulary / spelling / comprehension  <- WordAttempt   (server-written)
//   grammar                                <- GrammarAttempt (server-graded)
//   creativity                             <- AiGradedItem  (server AI grade)
//   pre-VT-6 history                       <- RewardEvent without ledger_version
//                                              (LEGACY tier, flagged, fill-only)
// RewardEvent written after the fix (ledger_version 2) is XP only and is
// never read here.

import { PRACTICE_KEYS, QUIZ_KEYS } from "./grammarKeys.js";

export const SKILL_KEYS = ["vocabulary", "grammar", "spelling", "comprehension", "creativity"];

// Server mirror of src/lib/gameSkills.js GAME_SKILL_MAP. wordforms moved to
// vocabulary: it tests word families / prefixes / suffixes (word formation),
// not the grammar curriculum. crossword is deliberately absent: it only
// reports completion, which is not performance evidence.
export const GAME_SKILL_MAP = {
  quiz: "vocabulary", usage: "vocabulary", odd_one_out: "vocabulary",
  definition_match: "vocabulary", picture_match: "vocabulary", context_guess: "vocabulary",
  memory_flip: "vocabulary", synonym_sprint: "vocabulary", related_words: "vocabulary",
  connection_challenge: "vocabulary", wordforms: "vocabulary",
  grammar: "grammar", grammar_practice: "grammar",
  spelling: "spelling",
  definition: "comprehension",
  sentence: "creativity",
};
export const XP_ONLY_GAMES = ["crossword"];

export const EVIDENCE_WINDOW_N = 10;
export const MAX_ITEMS = 50;
export const CONFIDENCE_MEDIUM_MIN = 3;
export const CONFIDENCE_HIGH_MIN = 10;
export const FRESH_MAX_DAYS = 7;
export const STALE_MAX_DAYS = 30;
export const DEFINITION_CLEAR = 55; // mirrors CLEAR_AVG in definitionGrader.js
const DAY_MS = 86400000;

export const gamesForSkill = (skill) => Object.keys(GAME_SKILL_MAP).filter((g) => GAME_SKILL_MAP[g] === skill);
export const ledgerForSkill = (skill) =>
  skill === "grammar" ? "GrammarAttempt" : skill === "creativity" ? "AiGradedItem" : "WordAttempt";

export function confidenceFor(verifiedRounds) {
  if (verifiedRounds >= CONFIDENCE_HIGH_MIN) return "high";
  if (verifiedRounds >= CONFIDENCE_MEDIUM_MIN) return "medium";
  return "low";
}

export function freshnessFor(lastAt, now = Date.now()) {
  if (!lastAt) return "cold";
  const days = (now - new Date(lastAt).getTime()) / DAY_MS;
  if (days <= FRESH_MAX_DAYS) return "fresh";
  if (days <= STALE_MAX_DAYS) return "stale";
  return "cold";
}

/* ---------------- grading (server truth where it exists) ---------------- */

/** Same normalisation as src/lib/grammarPractice/grading.js. */
export function normalise(s) {
  return String(s ?? "")
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
    .toLowerCase().replace(/\s+/g, " ")
    .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, "").trim();
}

/** Grammar curriculum practice. item_id = gpr.<domain>.<branch>.<topic>.<stage>.<nnn>. null = not gradable. */
export function gradePractice(itemId, given) {
  const p = String(itemId || "").split(".");
  if (p.length !== 6 || p[0] !== "gpr") return null;
  const key = PRACTICE_KEYS[`${p[1]}.${p[2]}.${p[3]}`]?.[`${p[4][0]}${p[5]}`];
  if (!key) return null;
  if (key.startsWith("§")) {
    const want = key.slice(1).split("+");
    const got = Array.isArray(given) ? given : [];
    return got.length === want.length && want.every((w, i) => normalise(got[i]) === normalise(w));
  }
  if (typeof given !== "string") return false;
  return key.split("|").some((k) => normalise(k) === normalise(given));
}

/** GrammarQuizGame. item_id = "<bank>:<index>", given = chosen option index. */
export function gradeQuiz(itemId, given) {
  const [bank, idx] = String(itemId || "").split(":");
  const keys = QUIZ_KEYS[bank];
  const i = Number(idx);
  if (!keys || !Number.isInteger(i) || i < 0 || i >= keys.length) return null;
  return Number.isInteger(given) && given === Number(keys[i]);
}

const letters = (s) => String(s || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
/** Spelling: the first attempt must spell the canonical headword. */
export const gradeSpelling = (canonicalEnglish, answer) =>
  letters(canonicalEnglish).length > 0 && letters(answer) === letters(canonicalEnglish);

/** Translation Drill option questions. null = not server-gradable (typed "define"). */
export function gradeTranslation(word, type, given) {
  if (typeof given !== "string" || !word) return null;
  if (type === "translation") return given === word.english;
  if (type === "multiple_choice") return [word.uzbek, word.russian].filter(Boolean).includes(given);
  return null;
}

/* ---------------- rounds, window, peak ---------------- */

/** Group item-ledger rows into rounds. creditOf(row) in [0,1]. */
export function groupRounds(rows, creditOf) {
  const by = new Map();
  for (const r of rows) {
    if (!r.round_id) continue;
    const g = by.get(r.round_id) || { round_id: r.round_id, at: r.round_at || r.created_date, total: 0, credit: 0, verified: true };
    g.total += 1;
    g.credit += creditOf(r);
    by.set(r.round_id, g);
  }
  return [...by.values()];
}

const byAtDesc = (a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.round_id < b.round_id ? 1 : -1);

/**
 * The window: newest N VERIFIED rounds; legacy rounds only fill it while
 * fewer than N verified rounds exist, so legacy can never dominate once a
 * learner has played N real rounds.
 */
export function windowOf(verifiedNewestFirst, legacyNewestFirst) {
  const v = verifiedNewestFirst.slice(0, EVIDENCE_WINDOW_N);
  const l = legacyNewestFirst.slice(0, Math.max(0, EVIDENCE_WINDOW_N - v.length));
  return { rounds: [...v, ...l], legacyInWindow: l.length };
}

export function masteryOf(rounds) {
  let c = 0, t = 0;
  for (const r of rounds) { c += Number(r.credit) || 0; t += Number(r.total) || 0; }
  return t > 0 ? Math.round((100 * c) / t) : 0;
}

/** Everything but historical_peak / legacy_best, from the two tiers. */
export function stateFrom({ verified, legacy, verifiedCount, legacyCount }, now = Date.now()) {
  const vs = [...verified].sort(byAtDesc);
  const ls = [...legacy].sort(byAtDesc);
  const { rounds, legacyInWindow } = windowOf(vs, ls);
  const last = [vs[0]?.at, ls[0]?.at].filter(Boolean).sort().pop() || null;
  const round_count = verifiedCount + legacyCount;
  return {
    current_mastery: masteryOf(rounds),
    verified_rounds: verifiedCount,
    round_count,
    evidence_count: round_count,
    legacy_rounds_in_window: legacyInWindow,
    items_in_window: rounds.reduce((a, r) => a + (Number(r.total) || 0), 0),
    confidence: confidenceFor(verifiedCount),
    freshness: freshnessFor(last, now),
    last_evidence_at: last,
  };
}

/** Lifetime max of current_mastery, replayed round by round (oldest first). */
export function replayPeak(verified, legacy) {
  const all = [...verified, ...legacy].sort((a, b) => -byAtDesc(a, b));
  let peak = 0;
  const v = [], l = [];
  for (const r of all) {
    (r.verified ? v : l).unshift(r);
    peak = Math.max(peak, masteryOf(windowOf(v, l).rounds));
  }
  return peak;
}

export function zeroState(email, skill) {
  return {
    user_email: email, skill, current_mastery: 0, confidence: "low", freshness: "cold",
    round_count: 0, verified_rounds: 0, evidence_count: 0, legacy_rounds_in_window: 0, items_in_window: 0,
    last_evidence_at: null, historical_peak: 0, legacy_best: 0, computed_at: null,
  };
}

/** Freshness and confidence are re-derived on every read. */
export function presentState(row, now = Date.now()) {
  const round_count = row.round_count ?? row.evidence_count ?? 0;
  return {
    ...row, round_count, evidence_count: round_count,
    freshness: freshnessFor(row.last_evidence_at, now),
    confidence: confidenceFor(row.verified_rounds || 0),
  };
}

export function summarize(states) {
  const ev = states.filter((s) => (s.round_count || 0) > 0);
  const avg = ev.length ? Math.round(ev.reduce((a, s) => a + s.current_mastery, 0) / ev.length) : 0;
  return {
    avgMastery: avg, skillsEvidenced: ev.length, skillsTotal: SKILL_KEYS.length,
    plays: states.reduce((a, s) => a + (s.round_count || 0), 0),
  };
}

/** Fields compared by the rebuild-equivalence check. */
export const COMPARABLE = ["current_mastery", "round_count", "verified_rounds", "legacy_rounds_in_window", "items_in_window", "confidence", "last_evidence_at", "historical_peak"];