// Shared placement-test content — single source of truth for both the
// Assessor Lab (dev harness) and the real PlacementTest flow, so the two
// never drift out of sync with each other.

// ---- Tier 2 (B1-B2) — articulated, AI-graded ----
// 18 -> 30 words. Wider pool, same 5 sampled per session.

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
  { english: "reject", definition: "to refuse to accept, believe, or consider something" },
  { english: "assume", definition: "to accept something as true without proof" },
  { english: "acquire", definition: "to get or obtain something, often gradually" },
  { english: "reveal", definition: "to make known something that was previously secret or hidden" },
  { english: "flexible", definition: "able to change or adapt easily to different conditions" },
  { english: "reliable", definition: "able to be trusted to do what is expected; consistent" },
  { english: "considerable", definition: "large or important enough to be worth considering" },
  { english: "essential", definition: "absolutely necessary; extremely important" },
  { english: "advocate", definition: "to publicly support or recommend a particular cause or policy" },
  { english: "coincide", definition: "to happen at the same time as something else" },
  { english: "deteriorate", definition: "to become progressively worse" },
  { english: "enhance", definition: "to improve the quality, value, or extent of something" },
  { english: "hinder", definition: "to create difficulty for someone or something, delaying or preventing progress" },
  { english: "inevitable", definition: "certain to happen; unavoidable" },
  { english: "justify", definition: "to show or prove that something is right or reasonable" },
  { english: "notify", definition: "to formally inform someone of something" },
  { english: "obstacle", definition: "something that blocks progress or achievement" },
  { english: "prioritize", definition: "to treat something as more important than other things" },
  { english: "resolve", definition: "to find a solution to a problem or disagreement" },
  { english: "thorough", definition: "complete and careful, with attention to every detail" },
];

// 18 -> 24 topics. Six more genuinely distinct B1-B2 structures, not
// duplicates of what's already covered.
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
  { topic: "Zero Conditional", instruction: "Write one sentence using the zero conditional to describe a general truth or scientific fact.", requiredElement: "if/when + present simple, ... present simple (a general truth, not a one-time prediction)" },
  { topic: "Used to", instruction: "Write one sentence using 'used to' to describe a past habit that is no longer true.", requiredElement: "used to + base verb, describing a discontinued past habit" },
  { topic: "Question Tags", instruction: "Write one sentence with a question tag at the end (e.g. '..., isn't it?').", requiredElement: "question tag whose auxiliary and polarity correctly match the main clause" },
  { topic: "Time Clauses", instruction: "Write one sentence using a time clause with 'before', 'after', or 'while' to connect two actions.", requiredElement: "correct time-clause connector linking two actions with correct tense sequencing" },
  { topic: "Causative", instruction: "Write one sentence using the causative form 'have something done' to describe arranging for someone else to do something.", requiredElement: "have/get + object + past participle (causative structure)" },
  { topic: "Phrasal Verbs", instruction: "Write one sentence using a common phrasal verb (e.g. give up, look after, find out, put off).", requiredElement: "correctly used phrasal verb with the right particle and its idiomatic meaning" },
];

// ---- Tier 1 (A1-A2) — multiple choice, plain answer-key scoring ----
// 20 -> 30 items (15 vocab + 15 grammar), 10 sampled + shuffled per session.

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
  { type: "vocab", concept: "Animals", question: "Which word means a baby dog?", options: ["puppy", "kitten", "cub", "chick"], answer: 0 },
  { type: "grammar", concept: "Present Simple", question: "Water ______ at 100\u00b0C.", options: ["boil", "boiling", "boils", "is boiling"], answer: 2 },
  { type: "vocab", concept: "Antonyms", question: "Choose the word that means the opposite of \u201cbig.\u201d", options: ["small", "new", "fast", "loud"], answer: 0 },
  { type: "grammar", concept: "Present Continuous", question: "I ______ this book right now, so I cannot lend it to you.", options: ["read", "am reading", "reads", "reading"], answer: 1 },
  { type: "vocab", concept: "Occupations", question: "What do you call a person who teaches students?", options: ["doctor", "teacher", "driver", "farmer"], answer: 1 },
  { type: "grammar", concept: "Simple Past", question: "I ______ my keys yesterday and could not enter the house.", options: ["lose", "lost", "losing", "have lose"], answer: 1 },
  { type: "vocab", concept: "Colors", question: "Which word describes the color of a clear sky?", options: ["red", "blue", "green", "black"], answer: 1 },
  { type: "grammar", concept: "Articles", question: "I saw ______ interesting documentary last night.", options: ["a", "an", "the", "\u2013"], answer: 1 },
  { type: "vocab", concept: "House/Rooms", question: "Which word means a place where you sleep?", options: ["kitchen", "bedroom", "garden", "office"], answer: 1 },
  { type: "grammar", concept: "Modal Verbs", question: "You ______ see a doctor if the pain continues.", options: ["should", "may", "would", "might"], answer: 0 },
  { type: "vocab", concept: "Family", question: "Which word means your father's brother?", options: ["uncle", "cousin", "nephew", "grandfather"], answer: 0 },
  { type: "grammar", concept: "Plural Nouns", question: "I have two ______.", options: ["child", "childs", "children", "childes"], answer: 2 },
  { type: "vocab", concept: "Days/Time", question: "What do we call the day after Monday?", options: ["Sunday", "Tuesday", "Wednesday", "Saturday"], answer: 1 },
  { type: "grammar", concept: "Possessive 's", question: "This is ______ book.", options: ["Sarah", "Sarah's", "Sarahs'", "of Sarah"], answer: 1 },
  { type: "vocab", concept: "Clothes", question: "Which word means something you wear on your feet?", options: ["hat", "shoes", "gloves", "scarf"], answer: 1 },
  { type: "grammar", concept: "There is/are", question: "There ______ two cats in the garden.", options: ["is", "are", "am", "be"], answer: 1 },
  { type: "vocab", concept: "Antonyms", question: "Choose the word that means the opposite of \u201copen.\u201d", options: ["closed", "empty", "dark", "wet"], answer: 0 },
  { type: "grammar", concept: "Wh-Questions", question: "______ do you live?", options: ["What", "Who", "Where", "When"], answer: 2 },
  { type: "vocab", concept: "Body Parts", question: "Which word means the part of your body you see with?", options: ["ear", "eye", "nose", "hand"], answer: 1 },
  { type: "grammar", concept: "Imperatives", question: "______ the door, please.", options: ["Close", "Closing", "To close", "Closes"], answer: 0 },
];

// ---- Tier 3 (C1+) — articulated, harder ----
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
