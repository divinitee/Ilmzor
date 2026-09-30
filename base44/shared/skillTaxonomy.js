// VIRORA Skill Intelligence — taxonomy registry. PURE (no SDK, no I/O).
// Source of truth: docs/skill-intelligence-architecture.md.
//
// Plain JS on purpose (same contract as progressCore.js): imported by the Deno
// backend and by the Node suites in tools/skill-intelligence/.
//
// This file defines WHAT EXISTS (the Tree). It does not decide which activity
// feeds which leaf (skillActivityMap.js), how a row is classified
// (skillClassify.js), or what connects (skillTransferGraph.js).
//
// Rules:
//   - Node ids are STABLE identifiers, never display strings. Never rename or
//     reuse one: add an ALIASES entry and bump TAXONOMY_VERSION.
//   - Evidence is owned by exactly one LEAF. Areas and groups only roll up.
//   - Qualities (accuracy, precision, …) are NOT nodes.
//   - Grammar leaves mirror the LOCKED 13 domains of
//     src/lib/adaptiveGrammar/domains.js. Branches are facets, not nodes.
//   - States are LIVE or COMING_SOON only. There is no PREMIUM state.

export const TAXONOMY_VERSION = 1;

export const STATE = Object.freeze({ LIVE: "LIVE", COMING_SOON: "COMING_SOON" });
export const STATES = Object.values(STATE);

export const NODE_KINDS = ["root", "group", "area", "leaf"];

/* ---------------- canonical response modes ---------------- */

// Defined by RESPONSE DEMAND (what the learner does), not the game's name:
//   recognise  the answer is on screen; the learner selects / matches / groups.
//   construct  the learner generates the form against a closed key
//              (type it, fill the gap, arrange it, transform it).
//   produce    open response judged against a rubric (AI or human).
export const MODES = ["recognise", "construct", "produce"];

export const GRAMMAR_STAGE_MODE = Object.freeze({
  choose: "recognise", build: "construct", transform: "construct", create: "produce", express: "produce",
});
// Stage letter as encoded in practice item ids: gpr.<d>.<b>.<topic>.<c|b|t>.<nnn>
export const STAGE_LETTER_MODE = Object.freeze({ c: "recognise", b: "construct", t: "construct" });
// Placement evidence classes (src/lib/adaptiveGrammar/schema.js).
export const EVIDENCE_CLASS_MODE = Object.freeze({
  recognition: "recognise", controlled_construction: "construct", free_production: "produce",
});
// Name-level crosswalk for LearnerWordState (src/lib/vocab/learnerState.js).
// LearnerWordState classifies per GAME and is not changed by this work.
export const WORD_STATE_MODE = Object.freeze({ recognition: "recognise", recall: "construct", usage: "produce" });

/* ---------------- qualities & facets (never nodes) ---------------- */

export const QUALITIES = ["accuracy", "range", "precision", "fluency", "coherence", "flexibility", "originality"];
export const FACETS = ["game", "bank", "activity", "grammar_branch", "grammar_topic", "comprehension_operation", "task_function"];

/* ---------------- grammar (LOCKED, mirrored) ---------------- */

const GRAMMAR_DOMAINS = [
  ["tenses", "Tenses & Time", ["present", "past", "future", "perfect", "used-to"]],
  ["nouns-articles", "Nouns & Articles", ["articles", "plurals-agreement", "quantifiers", "countability", "possession"]],
  ["pronouns", "Pronouns", ["personal", "possessive", "reflexive", "indefinite", "demonstrative", "substitution"]],
  ["verb-patterns", "Verb Patterns", ["gerund-infinitive", "meaning-change-verbs", "object-infinitive", "have-got", "perfect-forms"]],
  ["adj-adv", "Adjectives & Adverbs", ["adjective-form", "adverb-form", "frequency", "order-position", "intensifiers", "gradability"]],
  ["comparison", "Comparison", ["comparative", "superlative", "equality", "parallel-comparison", "modified-comparison", "like-as"]],
  ["questions-negation", "Questions & Negation", ["yes-no", "wh-questions", "indirect-questions", "tag-questions", "negation", "subject-questions", "emphasis-inversion"]],
  ["modals", "Modals & Attitude", ["ability-permission", "obligation", "deduction", "past-modals", "hedging", "advice", "semi-modals"]],
  ["prep-phrasal", "Prepositions & Phrasal Verbs", ["time", "place", "movement", "dependent-prepositions", "phrasal-verbs", "stranding"]],
  ["sentence-structure", "Sentence Structure", ["word-order", "conjunctions", "relative-clauses", "participle-clauses", "cleft", "existential", "imperatives", "predication", "subjunctive", "clause-linkers"]],
  ["conditionals-wishes", "Conditionals & Wishes", ["zero-first", "second", "third", "mixed", "inverted", "wishes-preference", "linkers"]],
  ["passive-causative", "Passive & Causative", ["simple-passive", "perfect-progressive-passive", "modal-passive", "reporting-passive", "causative", "get-passive", "passive-infinitive"]],
  ["reported-speech", "Reported Speech", ["statements", "questions", "commands-requests", "reporting-verbs", "backshift-exceptions", "modals-reported"]],
];
export const GRAMMAR_DOMAIN_IDS = GRAMMAR_DOMAINS.map(([id]) => id);
/** Locked branch ids per domain — used only to validate the grammar_branch FACET. */
export const GRAMMAR_BRANCHES = Object.freeze(Object.fromEntries(GRAMMAR_DOMAINS.map(([id, , b]) => [id, Object.freeze([...b])])));
export const grammarLeafId = (domainId) => `grammar.${domainId}`;

/* ---------------- the Tree ---------------- */

const { LIVE, COMING_SOON } = STATE;
const N = (id, kind, parent, label, state = LIVE, extra = {}) => ({ id, kind, parent, label, state, ...extra });

const NODE_LIST = [
  N("english", "root", null, "English"),

  N("systems", "group", "english", "Language Systems"),
  N("use", "group", "english", "Language Use"),

  N("vocabulary", "area", "systems", "Vocabulary"),
  N("grammar", "area", "systems", "Grammar"),
  N("orthography", "area", "systems", "Orthography"),
  N("pronunciation", "area", "systems", "Pronunciation", COMING_SOON),
  N("comprehension", "area", "use", "Comprehension", COMING_SOON),
  N("production", "area", "use", "Production"),

  N("vocabulary.form_and_meaning", "leaf", "vocabulary", "Form & Meaning"),
  N("vocabulary.meaning_in_context", "leaf", "vocabulary", "Meaning in Context"),
  N("vocabulary.sense_relations", "leaf", "vocabulary", "Sense Relations"),
  N("vocabulary.collocations_chunks", "leaf", "vocabulary", "Collocations & Chunks"),
  N("vocabulary.word_formation", "leaf", "vocabulary", "Word Formation"),
  N("vocabulary.register_connotation", "leaf", "vocabulary", "Register & Connotation", COMING_SOON),

  ...GRAMMAR_DOMAINS.map(([id, label]) => N(grammarLeafId(id), "leaf", "grammar", label, LIVE, { grammarDomain: id })),

  N("orthography.spelling", "leaf", "orthography", "Spelling"),
  N("orthography.punctuation", "leaf", "orthography", "Punctuation", COMING_SOON),
  N("orthography.capitalization", "leaf", "orthography", "Capitalization", COMING_SOON),

  N("comprehension.reading", "leaf", "comprehension", "Reading", COMING_SOON),
  N("comprehension.listening", "leaf", "comprehension", "Listening", COMING_SOON),

  N("production.writing_sentence", "leaf", "production", "Writing: Sentence"),
  N("production.writing_text", "leaf", "production", "Writing: Text", COMING_SOON),
  N("production.speaking", "leaf", "production", "Speaking", COMING_SOON),
];

const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === "object" && deepFreeze(v)); return Object.freeze(o); };
export const NODES = deepFreeze(NODE_LIST.map((n, order) => ({ ...n, order })));
const BY_ID = new Map(NODES.map((n) => [n.id, n]));

/** Old id -> current id. Empty in v1. */
export const ALIASES = Object.freeze({});

export function resolveNode(id) {
  const cur = Object.prototype.hasOwnProperty.call(ALIASES, id) ? ALIASES[id] : id;
  return BY_ID.get(cur) || null;
}
export const nodeById = (id) => BY_ID.get(id) || null;
export const childrenOf = (id) => NODES.filter((n) => n.parent === id);
export const isLeaf = (id) => BY_ID.get(id)?.kind === "leaf";
export const isLive = (id) => BY_ID.get(id)?.state === LIVE;
export const LEAF_IDS = NODES.filter((n) => n.kind === "leaf").map((n) => n.id);
export const LIVE_LEAF_IDS = LEAF_IDS.filter(isLive);
export const AREA_IDS = NODES.filter((n) => n.kind === "area").map((n) => n.id);

export function ancestorsOf(id) {
  const out = [];
  let n = BY_ID.get(id);
  while (n && n.parent) { out.push(n.parent); n = BY_ID.get(n.parent); }
  return out;
}
export function areaOf(id) {
  const n = BY_ID.get(id);
  if (!n) return null;
  if (n.kind === "area") return n.id;
  return ancestorsOf(id).find((a) => BY_ID.get(a)?.kind === "area") || null;
}
export function leavesUnder(id) {
  const n = BY_ID.get(id);
  if (!n) return [];
  if (n.kind === "leaf") return [id];
  return childrenOf(id).flatMap((c) => leavesUnder(c.id));
}

/**
 * Progressive reveal: what to show at one level of the Tree. Top level = the
 * six areas grouped by Systems / Use; opening an area reveals its leaves.
 * State is passed through untouched — a COMING_SOON node is never "0%".
 */
export function revealLevel(parentId = "english") {
  const kids = childrenOf(parentId);
  if (parentId === "english") return kids.map((g) => ({ id: g.id, label: g.label, children: childrenOf(g.id).map(({ id, label, state }) => ({ id, label, state })) }));
  return kids.map(({ id, label, state, kind }) => ({ id, label, state, kind }));
}
