// VIRORA Skill Intelligence — activity map. PURE (no SDK, no I/O).
// Source of truth: docs/skill-intelligence-architecture.md.
//
//   activity (game + bank [+ item_id])  ->  ONE primary leaf
//                                            canonical response mode
//                                            declared co-measured dimensions
//
// Deterministic from fields already on the immutable ledgers. Never guesses:
// when a row lacks the discriminator (historic `usage` rows have no bank) the
// answer stays at AREA level. There are no weights and nothing sums to 1 —
// the ActivitySkill "weights sum to 1" model is NOT used here.

import {
  TAXONOMY_VERSION, STAGE_LETTER_MODE, GRAMMAR_BRANCHES, grammarLeafId, areaOf, isLeaf,
} from "./skillTaxonomy.js";

export const ACTIVITY_MAP_VERSION = 1;

// Completion-only games. Never evidence.
export const XP_ONLY_GAMES = ["crossword"];

/*
 * Row fields:
 *   leaf          the ONE primary leaf that owns every item of this activity
 *   mode          canonical response mode (by response demand)
 *   verification  how progressApi verifies it today — informational only;
 *                 classifyEvidence reads the row's own `verification`.
 *   dimensions    what the grader actually scores ("correct" = right/wrong key)
 *   coMeasured    DECLARED co-measurement: [{ dimension, leaf|null, basis }].
 *                 Only when the grader scores that dimension itself. leaf=null
 *                 means "scored, but not attributable to one leaf" — kept as a
 *                 sub-score, never evidence. A non-null leaf yields INCIDENTAL
 *                 evidence, which never becomes progress/mastery evidence.
 *   retired       activity no longer offered (kept so history stays classified)
 */
const A = (game, bank, leaf, mode, verification, extra = {}) => ({
  key: bank ? `${game}:${bank}` : game, game, bank: bank || null, leaf, mode, verification,
  dimensions: ["correct"], coMeasured: [], retired: false, ...extra,
});

const ROWS = [
  // Vocabulary › Form & Meaning
  A("quiz", null, "vocabulary.form_and_meaning", "recognise", "mixed"),
  A("picture_match", null, "vocabulary.form_and_meaning", "recognise", "client_attested"),
  A("definition_match", null, "vocabulary.form_and_meaning", "recognise", "client_attested"),
  A("memory_flip", null, "vocabulary.form_and_meaning", "recognise", "client_attested"),
  A("definition", null, "vocabulary.form_and_meaning", "produce", "server_ai", { dimensions: ["accuracy", "completeness", "own_words"] }),

  // Vocabulary › Meaning in Context
  A("context_guess", null, "vocabulary.meaning_in_context", "recognise", "client_attested"),
  A("usage", "fill_blank", "vocabulary.meaning_in_context", "recognise", "client_attested"),
  A("usage", "best_word", "vocabulary.meaning_in_context", "recognise", "client_attested"),
  A("usage", "sentence_repair", "vocabulary.meaning_in_context", "recognise", "client_attested"),

  // Vocabulary › Sense Relations
  A("synonym_sprint", null, "vocabulary.sense_relations", "recognise", "client_attested"),
  A("odd_one_out", null, "vocabulary.sense_relations", "recognise", "client_attested"),
  A("related_words", null, "vocabulary.sense_relations", "recognise", "client_attested"),
  A("connection_challenge", null, "vocabulary.sense_relations", "recognise", "client_attested"),

  // Vocabulary › Collocations & Chunks
  A("usage", "collocation_match", "vocabulary.collocations_chunks", "recognise", "client_attested"),

  // Vocabulary › Word Formation — all four mechanics are selection tasks
  A("wordforms", "word_family", "vocabulary.word_formation", "recognise", "client_attested"),
  A("wordforms", "prefix_match", "vocabulary.word_formation", "recognise", "client_attested"),
  A("wordforms", "suffix_builder", "vocabulary.word_formation", "recognise", "client_attested"),
  A("wordforms", "root_hunt", "vocabulary.word_formation", "recognise", "client_attested"),

  // Orthography › Spelling — server-graded (gradeSpelling) from 2026-09-30
  A("spelling", "missing_letters", "orthography.spelling", "construct", "server_graded"),
  A("spelling", "letter_order", "orthography.spelling", "construct", "server_graded"),
  A("spelling", "typing", "orthography.spelling", "construct", "server_graded"),

  // Production › Writing: Sentence. The grader also scores general grammar,
  // which is not attributable to one of the 13 domains -> declared, leaf null.
  A("sentence", null, "production.writing_sentence", "produce", "server_ai", {
    dimensions: ["grammar", "relevance", "creativity"],
    coMeasured: [{ dimension: "grammar", leaf: null, basis: "grader sub-score 'grammar' is general accuracy, not one grammar domain" }],
  }),

  // Retired GrammarQuizGame banks (item_id "<bank>:<i>", MCQ). Still launchable
  // through homework assigned before 2026-09-21.
  A("grammar", "articles", grammarLeafId("nouns-articles"), "recognise", "server_graded", { retired: true }),
  A("grammar", "prepositions", grammarLeafId("prep-phrasal"), "recognise", "server_graded", { retired: true }),
  A("grammar", "verb_tenses", grammarLeafId("tenses"), "recognise", "server_graded", { retired: true }),
  A("grammar", "conditionals", grammarLeafId("conditionals-wishes"), "recognise", "server_graded", { retired: true }),
  A("grammar", "question_formation", grammarLeafId("questions-negation"), "recognise", "server_graded", { retired: true }),
  A("grammar", "active_passive", grammarLeafId("passive-causative"), "recognise", "server_graded", { retired: true }),
  A("grammar", "reported_speech", grammarLeafId("reported-speech"), "recognise", "server_graded", { retired: true }),
  // Punctuation is COMING_SOON: this history is retained, not shown.
  A("grammar", "punctuation", "orthography.punctuation", "recognise", "server_graded", { retired: true }),
];

const freezeRow = (r) => Object.freeze({ ...r, dimensions: Object.freeze([...r.dimensions]), coMeasured: Object.freeze(r.coMeasured.map((c) => Object.freeze({ ...c }))) });
export const ACTIVITIES = Object.freeze(ROWS.map(freezeRow));

// Grammar curriculum practice resolves its leaf from the item id.
export const PRACTICE_GAME = "grammar_practice";

/** Every game key that is evidence. */
export const EVIDENCE_GAMES = [...new Set([...ACTIVITIES.map((a) => a.game), PRACTICE_GAME])];

/** Parse gpr.<domain>.<branch>.<topic>.<stage letter>.<nnn>. null if malformed. */
export function parsePracticeItemId(itemId) {
  const p = String(itemId || "").split(".");
  if (p.length !== 6 || p[0] !== "gpr" || !p[4]) return null;
  return { domain: p[1], branch: p[2], topic: p[3], stageLetter: p[4][0], number: p[5] };
}

const same = (xs) => (xs.length && xs.every((x) => x === xs[0]) ? xs[0] : null);

/**
 * { game, bank?, item_id? } -> resolution. `activities` is injectable so the
 * co-measurement mechanism can be tested with fixture maps.
 *   null                                   unknown game
 *   { evidence:false, reason:"xp_only" }   completion-only game
 *   { evidence:true, resolution:"leaf"|"area"|"unknown", leaf, area, mode,
 *     activity, retired, coMeasured[], facets{} }
 */
export function resolveActivity({ game, bank, item_id } = {}, activities) {
  if (!activities) activities = ACTIVITIES;
  if (XP_ONLY_GAMES.includes(game)) return { evidence: false, reason: "xp_only" };

  if (game === PRACTICE_GAME) {
    const id = parsePracticeItemId(item_id);
    const leaf = id && grammarLeafId(id.domain);
    if (!id || !isLeaf(leaf)) return out("area", null, "grammar", null, null, { game });
    const branch = GRAMMAR_BRANCHES[id.domain].includes(id.branch) ? id.branch : null;
    return out("leaf", leaf, areaOf(leaf), STAGE_LETTER_MODE[id.stageLetter] || null, null, {
      game, grammar_branch: branch, grammar_topic: `${id.domain}.${id.branch}.${id.topic}`,
    });
  }

  const rows = activities.filter((a) => a.game === game);
  if (!rows.length) return null;
  // The retired quiz carries its bank in item_id "<bank>:<index>".
  const b = bank || (game === "grammar" ? String(item_id || "").split(":")[0] : null) || null;
  const exact = rows.find((a) => a.bank === b) || (b ? null : rows.find((a) => a.bank === null));
  if (exact) return out("leaf", exact.leaf, areaOf(exact.leaf), exact.mode, exact, { game, bank: exact.bank });
  // No/unknown bank: resolve only what every bank of this game agrees on.
  const leaf = same(rows.map((r) => r.leaf));
  const mode = same(rows.map((r) => r.mode));
  if (leaf) return out("leaf", leaf, areaOf(leaf), mode, null, { game, bank: null });
  const area = same(rows.map((r) => areaOf(r.leaf)));
  return area ? out("area", null, area, mode, null, { game, bank: null }) : out("unknown", null, null, mode, null, { game, bank: null });
}

function out(resolution, leaf, area, mode, row, facets) {
  return {
    evidence: true, resolution, leaf, area, mode,
    activity: row ? row.key : null,
    retired: !!row?.retired,
    coMeasured: row ? row.coMeasured : [],
    facets,
  };
}

/**
 * Write-time enrichment (progressApi). Mode comes from the map, never from the
 * client. `support` is client-reported (it can only lower a claim) and is
 * normalised to none | hint | unknown.
 */
export const SUPPORT_VALUES = ["none", "hint", "unknown"];
export function enrichmentFor({ game, bank, item_id, support } = {}) {
  const r = resolveActivity({ game, bank, item_id });
  return {
    bank: bank ? String(bank).slice(0, 40) : undefined,
    mode: r?.evidence ? r.mode || undefined : undefined,
    support: SUPPORT_VALUES.includes(support) ? support : "unknown",
    taxonomy_version: TAXONOMY_VERSION,
    activity_map_version: ACTIVITY_MAP_VERSION,
  };
}

/* ---------------- legacy mappings (migration only) ---------------- */

// The 5 hard-coded SkillState skills -> the node their history now belongs to.
// "comprehension" is the Definition game -> Vocabulary › Form & Meaning. It is
// NOT the Comprehension area (Reading/Listening, COMING_SOON).
export const LEGACY_SKILL_NODE = Object.freeze({
  vocabulary: "vocabulary",
  grammar: "grammar",
  spelling: "orthography.spelling",
  comprehension: "vocabulary.form_and_meaning",
  creativity: "production.writing_sentence",
});

/** Pre-VT-6 RewardEvent (no ledger_version) -> AREA only, never a leaf. */
export function legacyRewardArea(game) {
  if (XP_ONLY_GAMES.includes(game)) return null;
  if (game === PRACTICE_GAME || game === "grammar") return "grammar"; // no bank on RewardEvent
  return same([...new Set(ACTIVITIES.filter((a) => a.game === game).map((a) => areaOf(a.leaf)))]);
}

/** Activity keys feeding a leaf. */
export function activitiesForLeaf(leaf) {
  const keys = ACTIVITIES.filter((a) => a.leaf === leaf).map((a) => a.key);
  return leaf.startsWith("grammar.") ? [PRACTICE_GAME, ...keys] : keys;
}

/** LIVE leaves whose every live activity is still client-attested. */
export function leavesAwaitingServerGrading() {
  const leaves = [...new Set(ACTIVITIES.filter((a) => !a.retired).map((a) => a.leaf))];
  return leaves.filter((l) => ACTIVITIES.filter((a) => a.leaf === l && !a.retired).every((a) => a.verification === "client_attested"));
}
