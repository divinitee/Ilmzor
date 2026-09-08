// Adaptive Grammar Placement Test — taxonomy layer (CONTENT ONLY).
//
// The 13 VIRORA Grammar Domains, their branches, and the stable concept IDs
// that items use for `prerequisites`. These are the only identifiers Claude's
// adaptive engine needs to consume this dataset; nothing here selects items,
// scores answers, or decides levels.
//
// ID conventions (see README.md in this folder):
//   domain id   kebab-case, short          e.g. "tenses"
//   branch id   kebab-case, per domain     e.g. "past"
//   topic id    kebab-case, per branch     e.g. "past-perfect-sequence"
//   concept id  kebab-case, global         e.g. "past-participle"
//
// Do NOT rename, merge, or add domains here — the 13 are fixed by curriculum.

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const DOMAINS = [
  { id: "tenses", name: "Tenses & Time", branches: ["present", "past", "future", "perfect"] },
  { id: "nouns-articles", name: "Nouns & Articles", branches: ["articles", "plurals-agreement", "quantifiers", "countability"] },
  { id: "pronouns", name: "Pronouns", branches: ["personal", "possessive", "reflexive", "indefinite", "demonstrative"] },
  { id: "verb-patterns", name: "Verb Patterns", branches: ["gerund-infinitive", "meaning-change-verbs", "object-infinitive", "used-to"] },
  { id: "adj-adv", name: "Adjectives & Adverbs", branches: ["adjective-form", "adverb-form", "frequency", "order-position"] },
  { id: "comparison", name: "Comparison", branches: ["comparative", "superlative", "equality", "parallel-comparison", "modified-comparison"] },
  { id: "questions-negation", name: "Questions & Negation", branches: ["yes-no", "wh-questions", "indirect-questions", "tag-questions", "negation"] },
  { id: "modals", name: "Modals & Attitude", branches: ["ability-permission", "obligation", "deduction", "past-modals", "hedging"] },
  { id: "prep-phrasal", name: "Prepositions & Phrasal Verbs", branches: ["time", "place", "dependent-prepositions", "phrasal-verbs"] },
  { id: "sentence-structure", name: "Sentence Structure", branches: ["word-order", "conjunctions", "relative-clauses", "participle-clauses", "emphasis-inversion", "cleft"] },
  { id: "conditionals-wishes", name: "Conditionals & Wishes", branches: ["zero-first", "second", "third", "mixed", "inverted", "wishes-preference"] },
  { id: "passive-causative", name: "Passive & Causative", branches: ["simple-passive", "perfect-progressive-passive", "reporting-passive", "causative"] },
  { id: "reported-speech", name: "Reported Speech", branches: ["statements", "questions", "reporting-verbs", "backshift-exceptions"] },
];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);

// Stable concept registry. `owner` is the domain that TEACHES the concept;
// any domain's item may list it as a prerequisite. Only concepts referenced
// by the sample set are registered — extend as the bank grows, never rename.
export const CONCEPTS = [
  // tenses
  { id: "be-forms", owner: "tenses" },
  { id: "present-simple", owner: "tenses" },
  { id: "present-continuous", owner: "tenses" },
  { id: "past-simple", owner: "tenses" },
  { id: "past-continuous", owner: "tenses" },
  { id: "past-participle", owner: "tenses" },
  { id: "present-perfect", owner: "tenses" },
  { id: "present-perfect-continuous", owner: "tenses" },
  { id: "past-perfect", owner: "tenses" },
  { id: "future-will", owner: "tenses" },
  { id: "future-perfect", owner: "tenses" },
  { id: "time-adverbials", owner: "tenses" },
  // nouns-articles
  { id: "indefinite-article", owner: "nouns-articles" },
  { id: "definite-article", owner: "nouns-articles" },
  { id: "zero-article", owner: "nouns-articles" },
  { id: "countable-uncountable", owner: "nouns-articles" },
  { id: "some-any", owner: "nouns-articles" },
  { id: "subject-verb-agreement", owner: "nouns-articles" },
  { id: "collective-nouns", owner: "nouns-articles" },
  // pronouns
  { id: "subject-pronouns", owner: "pronouns" },
  { id: "object-pronouns", owner: "pronouns" },
  { id: "reflexive-pronouns", owner: "pronouns" },
  { id: "one-ones-another", owner: "pronouns" },
  // verb-patterns
  { id: "gerund", owner: "verb-patterns" },
  { id: "to-infinitive", owner: "verb-patterns" },
  { id: "bare-infinitive", owner: "verb-patterns" },
  { id: "verb-object-infinitive", owner: "verb-patterns" },
  // adj-adv
  { id: "adjective-adverb-distinction", owner: "adj-adv" },
  { id: "ed-ing-adjectives", owner: "adj-adv" },
  { id: "frequency-adverbs", owner: "adj-adv" },
  { id: "adjective-order", owner: "adj-adv" },
  // comparison
  { id: "comparative-form", owner: "comparison" },
  { id: "superlative-form", owner: "comparison" },
  { id: "as-as", owner: "comparison" },
  // questions-negation
  { id: "auxiliary-do", owner: "questions-negation" },
  { id: "subject-auxiliary-inversion", owner: "questions-negation" },
  { id: "wh-words", owner: "questions-negation" },
  { id: "indirect-question-order", owner: "questions-negation" },
  { id: "negative-subjects", owner: "questions-negation" },
  // modals
  { id: "modal-base-form", owner: "modals" },
  { id: "modal-perfect", owner: "modals" },
  { id: "deduction-modals", owner: "modals" },
  // prep-phrasal
  { id: "prepositions-time", owner: "prep-phrasal" },
  { id: "prepositions-place", owner: "prep-phrasal" },
  { id: "dependent-prepositions", owner: "prep-phrasal" },
  { id: "phrasal-verb-separability", owner: "prep-phrasal" },
  // sentence-structure
  { id: "svo-order", owner: "sentence-structure" },
  { id: "coordinating-conjunctions", owner: "sentence-structure" },
  { id: "relative-pronouns", owner: "sentence-structure" },
  { id: "negative-adverbial-inversion", owner: "sentence-structure" },
  { id: "cleft-what", owner: "sentence-structure" },
  // conditionals-wishes
  { id: "first-conditional", owner: "conditionals-wishes" },
  { id: "second-conditional", owner: "conditionals-wishes" },
  { id: "third-conditional", owner: "conditionals-wishes" },
  { id: "wish-unreal-past", owner: "conditionals-wishes" },
  // passive-causative
  { id: "passive-be-participle", owner: "passive-causative" },
  { id: "perfect-passive", owner: "passive-causative" },
  { id: "causative-have-get", owner: "passive-causative" },
  { id: "passive-reporting", owner: "passive-causative" },
  // reported-speech
  { id: "tense-backshift", owner: "reported-speech" },
  { id: "pronoun-time-shift", owner: "reported-speech" },
  { id: "reported-question-order", owner: "reported-speech" },
  { id: "reporting-verb-patterns", owner: "reported-speech" },
];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id);