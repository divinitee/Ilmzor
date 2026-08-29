// Shared placement-test content — single source of truth for both the
// Assessor Lab (dev harness) and the real PlacementTest flow, so the two
// never drift out of sync with each other.

// ---- Tier 2 (B1-B2) — articulated, AI-graded ----
// Same 10 words / 10 grammar structures already validated in the Assessor
// Lab. Only the reference definitions/instructions live here — the
// pre-written "good"/"flaw" sample answers used for testing the rubric
// stay local to AssessorLab.jsx, since a real student types their own.

export const TIER2_VOCAB = [
  { english: "postpone", definition: "to delay an event to a later time" },
  { english: "reluctant", definition: "unwilling and hesitant; disinclined" },
  { english: "negotiate", definition: "to try to reach an agreement through discussion" },
  { english: "sustainable", definition: "able to continue over time without depleting resources or causing lasting damage" },
  { english: "diligent", definition: "showing careful and persistent effort in one's work" },
  { english: "compensate", definition: "to give something, usually money, to make up for loss, damage, or an insufficiency" },
  { english: "ambiguous", definition: "open to more than one interpretation; not having one obvious meaning" },
  { english: "persuade", definition: "to cause someone to believe or do something through reasoning or argument" },
  { english: "fragile", definition: "easily broken or damaged; delicate" },
  { english: "genuine", definition: "real and authentic; not fake or pretended" },
];

export const TIER2_GRAMMAR = [
  { topic: "Articles", instruction: "Write one sentence using 'the' correctly for something specific already mentioned.", requiredElement: "correct use of the definite article 'the' for a known/specific noun" },
  { topic: "Present Perfect", instruction: "Write one sentence using the present perfect to describe a past experience with no specific time.", requiredElement: "present perfect (have/has + past participle), no specific past time marker" },
  { topic: "Second Conditional", instruction: "Write one sentence using the second conditional for an imaginary present situation.", requiredElement: "if + past simple, ... would + base verb" },
  { topic: "Passive Voice", instruction: "Write one sentence in the passive voice describing an action done to something.", requiredElement: "be + past participle, correct subject-object inversion" },
  { topic: "Comparatives", instruction: "Write one sentence comparing two things using a comparative adjective.", requiredElement: "correct comparative form (-er or more + adjective), not both" },
  { topic: "Prepositions of Time", instruction: "Write one sentence using the correct preposition of time with a specific clock time.", requiredElement: "'at' used correctly with a clock time" },
  { topic: "Modal Verbs", instruction: "Write one sentence using the modal verb 'must' to express obligation.", requiredElement: "must + base form of the verb, no 'to'" },
  { topic: "Reported Speech", instruction: "Write one sentence reporting what someone said, using correct backshifted reported speech, for the original statement \"I am tired.\"", requiredElement: "tense backshift from present to past (am -> was)" },
  { topic: "Countable/Uncountable", instruction: "Write one sentence using 'much' or 'many' correctly with the right kind of noun.", requiredElement: "correct pairing of much (uncountable) or many (countable) with the noun used" },
  { topic: "Third Conditional", instruction: "Write one sentence using the third conditional for an imaginary past situation and its unreal past result.", requiredElement: "if + past perfect, ... would have + past participle" },
];

// ---- Tier 1 (A1-A2) — multiple choice, plain answer-key scoring ----

export const TIER1_MCQ = [
  { type: "vocab", concept: "Antonyms", question: "Choose the word that means the opposite of \u201chappy.\u201d", options: ["sad", "hungry", "tall", "fast"], answer: 0 },
  { type: "grammar", concept: "Present Simple", question: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1 },
  { type: "vocab", concept: "Everyday Nouns", question: "Which word means a place where you buy food?", options: ["hospital", "supermarket", "library", "airport"], answer: 1 },
  { type: "grammar", concept: "There is/are", question: "There ___ two cats in the garden.", options: ["is", "are", "am", "be"], answer: 1 },
  { type: "vocab", concept: "Meals", question: "What do you call the meal you eat in the morning?", options: ["dinner", "lunch", "breakfast", "snack"], answer: 2 },
  { type: "grammar", concept: "Simple Past", question: "I ___ my homework yesterday.", options: ["do", "does", "did", "doing"], answer: 2 },
  { type: "vocab", concept: "Weather", question: "\u201cIt is very ___ today, take an umbrella.\u201d", options: ["sunny", "rainy", "hot", "dry"], answer: 1 },
  { type: "grammar", concept: "Comparatives", question: "This bag is ___ than that one.", options: ["big", "bigger", "biggest", "more big"], answer: 1 },
  { type: "vocab", concept: "Value/Price", question: "Which word means \u201cnot expensive\u201d?", options: ["cheap", "heavy", "new", "fast"], answer: 0 },
  { type: "grammar", concept: "Do-Questions", question: "___ you like coffee?", options: ["Do", "Does", "Are", "Is"], answer: 0 },
];

// ---- Tier 3 (C1+) — articulated, harder ----
// Sketch only — not yet validated against the assessor the way Tier 2 was.

export const TIER3_ITEMS = [
  { type: "vocab", english: "mitigate", definition: "to make something less severe, serious, or painful", instruction: "Explain what 'mitigate' means, in your own words, and give an example of something that can be mitigated." },
  { type: "grammar", topic: "Inversion for Emphasis", instruction: "Rewrite this sentence using inversion for emphasis: \"I have never seen such a beautiful sunset.\"", requiredElement: "inverted word order beginning with 'Never have I...'" },
  { type: "vocab", english: "ostensibly", definition: "apparently or as it seems, but perhaps not actually true", instruction: "Explain what 'ostensibly' means, and why a writer might choose it instead of just saying something 'is.'" },
  { type: "grammar", topic: "Formal Subjunctive", instruction: "Write one formal sentence using the subjunctive after a verb like 'recommend', 'insist', or 'require' (e.g. 'It is essential that...').", requiredElement: "subjunctive base form after the trigger verb/expression, without 's' or tense marking" },
  { type: "grammar", topic: "Nominalization", instruction: "Rewrite this informally-worded sentence in a more academic register using nominalization: \"Because prices increased quickly, people became worried.\"", requiredElement: "verb turned into a noun phrase, e.g. 'the rapid increase in prices'" },
];

// ---- Thresholds (from the reviewed test design doc) ----
export const TIER1_PASS_THRESHOLD = 0.4; // 40%+
export const TIER2_ADVANCE_AVG = 4;      // 4/5+ average unlocks Tier 3
export const TIER2_SETTLE_B1_AVG = 3;    // below this settles at B1
