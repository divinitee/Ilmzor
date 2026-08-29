// Shared placement-test content — single source of truth for both the
// Assessor Lab (dev harness) and the real PlacementTest flow, so the two
// never drift out of sync with each other.

// ---- Tier 2 (B1-B2) — articulated, AI-graded ----

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

// Expanded to properly cover the systematic A2-B2 grammar range from the
// reviewed grammar document (tenses, subject-verb agreement, infinitives vs
// gerunds, relative clauses) \u2014 the original 10-topic set was missing whole
// categories outright. Tier 2 still only pulls 5 grammar items per session,
// randomly, from this larger pool \u2014 broader source, same session length.
export const TIER2_GRAMMAR = [
  { topic: "Articles", instruction: "Write one sentence using 'the' correctly for something specific already mentioned.", requiredElement: "correct use of the definite article 'the' for a known/specific noun" },
  { topic: "Present Simple vs Continuous", instruction: "Write one sentence using the present simple to describe a habit or routine, not something happening right now.", requiredElement: "present simple form for a habitual/repeated action, not present continuous" },
  { topic: "Past Simple", instruction: "Write one sentence using the simple past to describe a completed action at a specific point in the past.", requiredElement: "correct simple past form (regular -ed or irregular), no auxiliary needed" },
  { topic: "Past Perfect", instruction: "Write one sentence using the past perfect to show that one past action happened before another past action.", requiredElement: "past perfect (had + past participle) marking the earlier of two past events" },
  { topic: "Present Perfect", instruction: "Write one sentence using the present perfect to describe a past experience with no specific time.", requiredElement: "present perfect (have/has + past participle), no specific past time marker" },
  { topic: "Future with Will", instruction: "Write one sentence making a prediction or promise about the future using 'will'.", requiredElement: "will + base verb for a future prediction or promise" },
  { topic: "Second Conditional", instruction: "Write one sentence using the second conditional for an imaginary present situation.", requiredElement: "if + past simple, ... would + base verb" },
  { topic: "Third Conditional", instruction: "Write one sentence using the third conditional for an imaginary past situation and its unreal past result.", requiredElement: "if + past perfect, ... would have + past participle" },
  { topic: "Passive Voice", instruction: "Write one sentence in the passive voice describing an action done to something.", requiredElement: "be + past participle, correct subject-object inversion" },
  { topic: "Comparatives", instruction: "Write one sentence comparing two things using a comparative adjective.", requiredElement: "correct comparative form (-er or more + adjective), not both" },
  { topic: "Prepositions", instruction: "Write one sentence using a preposition of time or place correctly (e.g. at, in, on).", requiredElement: "correct preposition choice for the time/place expression used" },
  { topic: "Modal Verbs", instruction: "Write one sentence using the modal verb 'must' to express obligation.", requiredElement: "must + base form of the verb, no 'to'" },
  { topic: "Subject-Verb Agreement", instruction: "Write one sentence using a tricky subject like 'each', 'neither...nor', or 'a number of', making sure the verb agrees correctly.", requiredElement: "correct singular/plural verb agreement with a non-obvious quantifying subject" },
  { topic: "Infinitives", instruction: "Write one sentence using a verb that must be followed by a to-infinitive (e.g. decide, hope, plan, agree, want).", requiredElement: "verb + to-infinitive construction, not a gerund" },
  { topic: "Gerunds", instruction: "Write one sentence using a verb that must be followed by a gerund (e.g. enjoy, avoid, suggest, admit, be interested in).", requiredElement: "verb + gerund (-ing) construction, not a to-infinitive" },
  { topic: "Relative Clauses", instruction: "Write one sentence using a relative clause with 'who', 'which', 'where', or 'whose' to describe a person, thing, or place.", requiredElement: "correct relative pronoun matching person/thing/place/possession" },
  { topic: "Reported Speech", instruction: "Write one sentence reporting what someone said, using correct backshifted reported speech, for the original statement \"I am tired.\"", requiredElement: "tense backshift from present to past (am -> was)" },
  { topic: "Countable/Uncountable", instruction: "Write one sentence using 'much' or 'many' correctly with the right kind of noun.", requiredElement: "correct pairing of much (uncountable) or many (countable) with the noun used" },
];

// ---- Tier 1 (A1-A2) — multiple choice, plain answer-key scoring ----
// Grammar items taken verbatim from the reviewed grammar document, not
// invented \u2014 same question, options, and answer key as the source.

export const TIER1_MCQ = [
  { type: "vocab", concept: "Antonyms", question: "Choose the word that means the opposite of \u201chappy.\u201d", options: ["sad", "hungry", "tall", "fast"], answer: 0 },
  { type: "grammar", concept: "Present Simple", question: "She usually ______ to the gym before work.", options: ["go", "goes", "going", "is go"], answer: 1 },
  { type: "vocab", concept: "Everyday Nouns", question: "Which word means a place where you buy food?", options: ["hospital", "supermarket", "library", "airport"], answer: 1 },
  { type: "grammar", concept: "Simple Past", question: "They ______ the project last week.", options: ["finish", "finished", "finishing", "have finish"], answer: 1 },
  { type: "vocab", concept: "Meals", question: "What do you call the meal you eat in the morning?", options: ["dinner", "lunch", "breakfast", "snack"], answer: 2 },
  { type: "grammar", concept: "Articles", question: "She bought ______ new phone yesterday.", options: ["a", "an", "the", "\u2013"], answer: 0 },
  { type: "vocab", concept: "Weather", question: "\u201cIt is very ___ today, take an umbrella.\u201d", options: ["sunny", "rainy", "hot", "dry"], answer: 1 },
  { type: "grammar", concept: "Prepositions", question: "We arrived ______ the airport two hours early.", options: ["at", "on", "to", "in"], answer: 0 },
  { type: "vocab", concept: "Value/Price", question: "Which word means \u201cnot expensive\u201d?", options: ["cheap", "heavy", "new", "fast"], answer: 0 },
  { type: "grammar", concept: "Modal Verbs", question: "You ______ wear a seatbelt while driving. It is the law.", options: ["must", "might", "could", "would"], answer: 0 },
];

// ---- Tier 3 (C1+) — articulated, harder ----
// Sketch only — not yet validated against the assessor the way Tier 2 was.
// Nominalization item rewritten: shows the transformation pattern via a
// worked example instead of naming the linguistic term, since the goal is
// testing the skill, not testing vocabulary about grammar.

export const TIER3_ITEMS = [
  { type: "vocab", english: "mitigate", definition: "to make something less severe, serious, or painful", instruction: "Explain what 'mitigate' means, in your own words, and give an example of something that can be mitigated." },
  { type: "grammar", topic: "Inversion for Emphasis", instruction: "Rewrite this sentence using inversion for emphasis: \"I have never seen such a beautiful sunset.\"", requiredElement: "inverted word order beginning with 'Never have I...'" },
  { type: "vocab", english: "ostensibly", definition: "apparently or as it seems, but perhaps not actually true", instruction: "Explain what 'ostensibly' means, and why a writer might choose it instead of just saying something 'is.'" },
  { type: "grammar", topic: "Formal Subjunctive", instruction: "Write one formal sentence using the subjunctive after a verb like 'recommend', 'insist', or 'require' (e.g. 'It is essential that...').", requiredElement: "subjunctive base form after the trigger verb/expression, without 's' or tense marking" },
  { type: "grammar", topic: "Verb-to-Noun Transformation", instruction: "Academic writing often turns a verb into a noun phrase. Example: \"Because prices increased quickly, people became worried\" becomes \"The rapid increase in prices caused widespread concern.\" Rewrite this sentence the same way: \"Because the government changed the policy suddenly, businesses struggled to adapt.\"", requiredElement: "the verb 'changed' turned into a noun phrase (e.g. 'the sudden change in policy'), matching the pattern shown in the example" },
];

// ---- Thresholds (from the reviewed test design doc) ----
export const TIER1_PASS_THRESHOLD = 0.4; // 40%+
export const TIER2_ADVANCE_AVG = 4;      // 4/5+ average unlocks Tier 3
export const TIER2_SETTLE_B1_AVG = 3;    // below this settles at B1
