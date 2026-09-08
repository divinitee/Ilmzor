// Adaptive Grammar Placement Test — taxonomy layer (CONTENT ONLY).
//
// The 13 VIRORA Grammar Domains (authoritative, fixed), their branches, and
// the stable concept ids items use for `prerequisites`. Nothing here selects
// items, scores answers or decides levels.
//
// Locked ownership rulings (2026-09-08):
//   relative clauses → sentence-structure     passive reporting → passive-causative
//   "be": predication → sentence-structure · progressive aux → tenses · passive aux → passive-causative
// Provisional rulings: there is/are → sentence-structure · imperatives → sentence-structure ·
//   have got → verb-patterns · used to → tenses · negative inversion → sentence-structure
//
// Do NOT rename, merge, or add domains. Branches may grow; never rename existing ones.

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const DOMAINS = [
  { id: "tenses", name: "Tenses & Time", branches: ["present", "past", "future", "perfect", "used-to"] },
  { id: "nouns-articles", name: "Nouns & Articles", branches: ["articles", "plurals-agreement", "quantifiers", "countability", "possession"] },
  { id: "pronouns", name: "Pronouns", branches: ["personal", "possessive", "reflexive", "indefinite", "demonstrative", "substitution"] },
  { id: "verb-patterns", name: "Verb Patterns", branches: ["gerund-infinitive", "meaning-change-verbs", "object-infinitive", "have-got", "perfect-forms"] },
  { id: "adj-adv", name: "Adjectives & Adverbs", branches: ["adjective-form", "adverb-form", "frequency", "order-position", "intensifiers", "gradability"] },
  { id: "comparison", name: "Comparison", branches: ["comparative", "superlative", "equality", "parallel-comparison", "modified-comparison", "like-as"] },
  { id: "questions-negation", name: "Questions & Negation", branches: ["yes-no", "wh-questions", "indirect-questions", "tag-questions", "negation", "subject-questions", "short-responses"] },
  { id: "modals", name: "Modals & Attitude", branches: ["ability-permission", "obligation", "deduction", "past-modals", "hedging", "advice", "semi-modals"] },
  { id: "prep-phrasal", name: "Prepositions & Phrasal Verbs", branches: ["time", "place", "movement", "dependent-prepositions", "phrasal-verbs", "stranding"] },
  { id: "sentence-structure", name: "Sentence Structure", branches: ["word-order", "conjunctions", "relative-clauses", "participle-clauses", "emphasis-inversion", "cleft", "existential", "imperatives", "predication", "subjunctive", "clause-linkers"] },
  { id: "conditionals-wishes", name: "Conditionals & Wishes", branches: ["zero-first", "second", "third", "mixed", "inverted", "wishes-preference", "linkers"] },
  { id: "passive-causative", name: "Passive & Causative", branches: ["simple-passive", "perfect-progressive-passive", "modal-passive", "reporting-passive", "causative", "get-passive", "passive-infinitive"] },
  { id: "reported-speech", name: "Reported Speech", branches: ["statements", "questions", "commands-requests", "reporting-verbs", "backshift-exceptions", "modals-reported"] },
];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);

// Stable concept registry. `owner` = the domain that TEACHES the concept; any
// domain's item may list it as a prerequisite. Extend, never rename.
const C = (owner, ...ids) => ids.map((id) => ({ id, owner }));
export const CONCEPTS = [
  ...C("tenses", "be-auxiliary", "present-simple", "third-person-s", "present-continuous", "stative-verbs", "past-simple", "past-continuous",
    "past-participle", "present-perfect", "present-perfect-continuous", "past-perfect", "past-perfect-continuous", "future-will", "future-going-to",
    "future-continuous", "future-perfect", "future-perfect-continuous", "future-in-the-past", "time-adverbials", "used-to", "be-to"),
  ...C("nouns-articles", "indefinite-article", "definite-article", "zero-article", "countable-uncountable", "some-any", "much-many", "few-little",
    "plural-formation", "possessive-s", "subject-verb-agreement", "collective-nouns", "both-either-neither", "each-every"),
  ...C("pronouns", "subject-pronouns", "object-pronouns", "possessive-determiners", "possessive-pronouns", "demonstratives", "reflexive-pronouns",
    "one-ones-another", "indefinite-pronouns", "reciprocal-pronouns", "generic-pronouns", "dummy-it"),
  ...C("verb-patterns", "gerund", "to-infinitive", "bare-infinitive", "verb-object-infinitive", "meaning-change-verbs", "have-got",
    "perfect-infinitive", "perfect-gerund", "verb-that-clause"),
  ...C("adj-adv", "adjective-adverb-distinction", "ed-ing-adjectives", "frequency-adverbs", "adjective-order", "irregular-adverbs",
    "gradable-ungradable", "adverb-position", "so-such", "too-enough", "compound-adjectives"),
  ...C("comparison", "comparative-form", "superlative-form", "as-as", "less-fewer", "comparative-modifiers", "double-comparative",
    "superlative-modifiers", "like-vs-as", "progressive-comparative"),
  ...C("questions-negation", "auxiliary-do", "subject-auxiliary-inversion", "wh-words", "indirect-question-order", "negative-subjects",
    "tag-questions", "subject-questions", "question-prepositions", "negative-questions", "no-not-none", "so-neither-responses"),
  ...C("modals", "modal-base-form", "modal-perfect", "deduction-modals", "obligation-modals", "ability-modals", "permission-modals",
    "advice-modals", "hedging-modals", "semi-modals", "need-modal"),
  ...C("prep-phrasal", "prepositions-time", "prepositions-place", "prepositions-movement", "dependent-prepositions", "phrasal-verb-separability",
    "prepositional-verbs", "preposition-gerund", "three-part-phrasal", "preposition-stranding"),
  ...C("sentence-structure", "svo-order", "coordinating-conjunctions", "subordinating-conjunctions", "relative-pronouns", "defining-relative",
    "non-defining-relative", "reduced-relative", "participle-clauses", "negative-adverbial-inversion", "cleft-what", "cleft-it",
    "there-existential", "imperatives", "be-copula", "mandative-subjunctive", "result-clauses", "concession-linkers", "purpose-clauses",
    "fronting", "ellipsis-substitution"),
  ...C("conditionals-wishes", "zero-conditional", "first-conditional", "second-conditional", "third-conditional", "mixed-conditional",
    "unless", "conditional-linkers", "inverted-conditional", "wish-unreal-present", "wish-unreal-past", "wish-would", "would-rather",
    "if-only", "as-if", "implied-conditional"),
  ...C("passive-causative", "passive-be-participle", "agent-by", "perfect-passive", "progressive-passive", "modal-passive", "passive-reporting",
    "causative-have-get", "get-passive", "two-object-passive", "passive-infinitive-gerund", "causative-get-to", "prepositional-passive"),
  ...C("reported-speech", "tense-backshift", "pronoun-time-shift", "reported-question-order", "reporting-verb-patterns", "reported-commands",
    "reported-modals", "backshift-exceptions", "say-tell"),
];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id);