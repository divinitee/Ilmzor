// Skill model + progress tracking for the games section. Local (localStorage)
// for instant UI (completion chips on the mind-map, no loading state) plus a
// server-synced copy (SkillHubProgress entity) that's the real source of
// truth for anything that needs to survive a device change or be read back
// on the dashboard — see syncGameResultToServer / getRemoteOverallStats.

// VIRORA skill hues (2026-09-06). Same hue families as the originals
// (#6366f1 / #14b8a6 / #f59e0b / #f43f5e / #8b5cf6) so nothing becomes
// unrecognisable — deepened and desaturated to sit on the Midnight Purple
// ground instead of glowing against it. Two real fixes ride along:
// Comprehension was the SAME rose as --destructive, so a skill colour and
// "you got it wrong" were indistinguishable; and Creativity read as a second
// Vocabulary. Every game reads its accent from here — no engine invents a hex.
export const SKILLS = [
  { key: "vocabulary", emoji: "📚", color: "#7C6BE8" },
  { key: "grammar", emoji: "🧩", color: "#3E9E92" },
  { key: "spelling", emoji: "🔤", color: "#B08D57" },
  { key: "comprehension", emoji: "📖", color: "#CE6A86" },
  { key: "creativity", emoji: "💬", color: "#B678C9" },
];

// Each game trains one primary skill (quiz + crossword both train vocabulary).
export const GAME_SKILL_MAP = {
  quiz: "vocabulary",
  crossword: "vocabulary",
  wordforms: "grammar",
  spelling: "spelling",
  definition: "comprehension",
  sentence: "creativity",
  // Vocabulary > Usage + Phrases & Chunks (2026-09-07). New key, not "sentence"
  // — these four modes are word-selection tasks (pick the word that fills a
  // blank, fits a context, fixes a wrong word, or completes a collocation),
  // not free-text sentence creation. Mapped to "vocabulary" (not
  // "creativity" like sentence) because the student selects, not writes.
  usage: "vocabulary",
  odd_one_out: "vocabulary",
  // "grammar" (GrammarQuizGame) and these 4 "Meaning" games were all
  // missing from this map entirely — recordGameResult() early-returns
  // when GAME_SKILL_MAP[gameId] is undefined, so every completion of any
  // of these silently recorded nothing. That's 8 dedicated grammar
  // categories (16 challenge nodes) plus Definition Match / Picture Match /
  // Context Guess / Memory Flip under Vocabulary > Meaning — none of them
  // ever showed a completion % or counted toward any stat, local or
  // server-synced, since Skill Hub shipped.
  grammar: "grammar",
  definition_match: "vocabulary",
  picture_match: "vocabulary",
  context_guess: "vocabulary",
  memory_flip: "vocabulary",
  // Vocabulary > Relationships, first game (2026-09-07). Its own key rather
  // than the shared "quiz" the node used to point at, so its stats are its own.
  synonym_sprint: "vocabulary",
  // Vocabulary > Relationships, last two games (2026-09-07). Both moved off
  // the generic "quiz" engine onto RelatedWordsGame.jsx with a bank/mode
  // split. Related Words = category recognition; Connection Challenge =
  // category inference from 3 examples. Both map to "vocabulary".
  related_words: "vocabulary",
  connection_challenge: "vocabulary",
};

// --- VT-6: progress is server-owned ------------------------------------
// The canonical value is SkillState (base44/functions/progressApi, mastery
// defined in base44/shared/progressEngine.ts). The helpers below are pure
// VIEW adapters over a SkillState response — they calculate nothing. The
// old peak store (localStorage vm_skill_stats_v1 + SkillHubProgress.best)
// is no longer read or written.

const ZERO = { current_mastery: 0, confidence: "low", freshness: "cold", evidence_count: 0, historical_peak: 0, last_evidence_at: null };

/** All 5 SKILLS merged with their SkillState row (zero-filled). */
export function skillRows(state) {
  const by = {};
  (state?.skills || []).forEach((r) => { by[r.skill] = r; });
  return SKILLS.map((s) => ({ ...s, ...ZERO, ...(by[s.key] || {}) }));
}

export function radarRows(state) {
  return skillRows(state).map((r) => ({ key: r.key, value: r.current_mastery, color: r.color, emoji: r.emoji, confidence: r.confidence, freshness: r.freshness }));
}

/** Current mastery of the skill a game trains (Skill Hub node chips). */
export function masteryForGame(state, gameId) {
  const skill = GAME_SKILL_MAP[gameId];
  const row = (state?.skills || []).find((r) => r.skill === skill);
  return row?.evidence_count ? row.current_mastery : 0;
}