import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("adj-adv");
const A1 = leg("A1_MCQ"), A2 = leg("A2_MCQ"), B2 = leg("B2_MCQ"), B2O = leg("B2_OPEN_GRAMMAR");

export default [
  // ---------------- A1 ----------------
  d.mcq({ b: "frequency", t: "always", L: "A1", diff: 1, focus: "always for a fixed routine", pre: ["frequency-adverbs"],
    prompt: "I ______ drink coffee in the morning. It is part of my routine.", options: ["never", "always", "rarely", "sometimes"], key: 1, why: "Routine → always.", legacy: A1("I ______ drink coffee in the morning. It is part of my routine.") }),
  d.mcq({ b: "frequency", t: "rarely", L: "A1", diff: 2, focus: "rarely ≈ once a week", pre: ["frequency-adverbs"],
    prompt: "She ______ goes to the gym, about once a week.", options: ["always", "never", "sometimes", "rarely"], key: 3, why: "Low frequency → rarely.", legacy: A1("She ______ goes to the gym, about once a week."),
    flags: ["'sometimes' is arguably also defensible for once a week; legacy key kept. Consider re-anchoring to 'about once a year' before mass use."] }),
  d.mcq({ b: "frequency", t: "never", L: "A1", diff: 1, focus: "never for zero frequency", pre: ["frequency-adverbs"],
    prompt: "We ______ eat pizza. We don't like it.", options: ["always", "usually", "never", "often"], key: 2, why: "Don't like it → never.", legacy: A1("We ______ eat pizza. We don't like it.") }),
  d.order({ b: "frequency", t: "adverb-position", L: "A1", diff: 2, focus: "Frequency adverb before the main verb", pre: ["frequency-adverbs", "adverb-position"],
    tokens: ["late", "usually", "gets up", "he"], key: ["he", "usually", "gets up", "late"], why: "Subject + frequency adverb + verb." }),
  d.mcq({ b: "adjective-form", t: "adjective-before-noun", L: "A1", diff: 1, focus: "Adjective + noun order (adjective does not take plural -s)", pre: ["adjective-order"],
    prompt: "They live in a ______.", options: ["house big", "big house", "bigs house", "big houses house"], key: 1, why: "Adjective before noun; no plural on adjectives." }),

  // ---------------- A2 ----------------
  d.mcq({ b: "adverb-form", t: "ly-adverb", L: "A2", diff: 1, focus: "-ly adverb modifies a verb", pre: ["adjective-adverb-distinction"],
    prompt: "He drove ______ because the road was icy.", options: ["careful", "carefully", "care", "more careful"], key: 1, why: "Modifies 'drove' → adverb.", legacy: A2("He drove ______ because the road was icy.") }),
  d.mcq({ b: "adverb-form", t: "irregular-adverb", L: "A2", diff: 2, focus: "well is the adverb of good", pre: ["irregular-adverbs", "adjective-adverb-distinction"],
    prompt: "He speaks English very ______.", options: ["good", "well", "better", "best"], key: 1, why: "Modifies 'speaks' → well.", legacy: A2("He speaks English very ______.") }),
  d.mcq({ b: "frequency", t: "never", L: "A2", diff: 1, focus: "never with a positive verb (no double negative)", pre: ["frequency-adverbs"],
    prompt: "She is ______ late for work. She is always on time.", options: ["never", "usually", "often", "always"], key: 0, why: "Always on time → never late.", legacy: A2("She is ______ late for work. She is always on time.") }),
  d.order({ b: "frequency", t: "adverb-position", L: "A2", diff: 2, focus: "Frequency adverb AFTER be", pre: ["frequency-adverbs", "adverb-position", "be-copula"],
    tokens: ["is", "tired", "she", "often", "after work"], key: ["she", "is", "often", "tired", "after work"], why: "With 'be', the adverb follows the verb." }),
  d.gap({ b: "adverb-form", t: "ly-adverb", L: "A2", diff: 2, focus: "Forming -ly adverb from an adjective ending in -y", pre: ["adjective-adverb-distinction"],
    source: "The children were playing ______ (happy) in the garden.", key: "happily", why: "happy → happily." }),
  d.mcq({ b: "adjective-form", t: "adjective-after-be", L: "A2", diff: 1, focus: "Adjective (not adverb) after be/feel/look", pre: ["adjective-adverb-distinction", "be-copula"],
    prompt: "You look ______ today. Are you OK?", options: ["tiredly", "tired", "tire", "tiring"], key: 1, why: "After 'look' (state) → adjective." }),
  d.correct({ b: "adverb-form", t: "irregular-adverb", L: "A2", diff: 2, focus: "hard is both adjective and adverb; 'hardly' means 'almost not'", pre: ["irregular-adverbs"],
    source: "She works very hardly every day.", key: "She works very hard every day.", why: "The adverb of 'hard' is 'hard'." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "adjective-form", t: "ed-vs-ing", L: "B1", diff: 1, focus: "-ing adjective describes the cause, -ed the feeling", pre: ["ed-ing-adjectives"],
    prompt: "The lecture was so ______ that half the class fell asleep.", options: ["bored", "boring", "bore", "boredom"], key: 1, why: "The lecture causes the feeling → boring." }),
  d.gap({ b: "adjective-form", t: "ed-vs-ing", L: "B1", diff: 2, focus: "Both -ed and -ing forms of the same participle adjective in one context", pre: ["ed-ing-adjectives"],
    instr: "Complete each gap with the correct adjective form of the word in brackets.", source: "I was really ______ (surprise) by the ending — it was the most ______ (surprise) film I've seen this year.", key: ["surprised", "surprising"], why: "Feeling → -ed; cause → -ing." }),
  d.mcq({ b: "intensifiers", t: "too-enough", L: "B1", diff: 2, focus: "too + adjective vs adjective + enough", pre: ["too-enough"],
    prompt: "This coffee is ______ to drink. Let it cool down.", options: ["too hot", "hot enough", "enough hot", "very hot"], key: 0, why: "Excess preventing action → too + adj." }),
  d.mcq({ b: "intensifiers", t: "too-enough", L: "B1", diff: 2, focus: "enough follows an adjective but precedes a noun", pre: ["too-enough"],
    prompt: "He isn't ______ to drive yet.", options: ["enough old", "old enough", "too old", "so old"], key: 1, why: "adj + enough." }),
  d.mcq({ b: "adverb-form", t: "adverb-vs-adjective-sense", L: "B1", diff: 3, focus: "late (adverb of time) vs lately (recently)", pre: ["irregular-adverbs"],
    prompt: "I haven't seen him much ______ — is everything OK?", options: ["late", "lately", "later", "latest"], key: 1, why: "'recently' → lately." }),
  d.order({ b: "order-position", t: "adverb-of-manner-position", L: "B1", diff: 2, focus: "Manner adverb after the object, not between verb and object", pre: ["adverb-position"],
    tokens: ["she", "the letter", "read", "carefully"], key: ["she", "read", "the letter", "carefully"], why: "Verb + object + manner adverb." }),
  d.correct({ b: "adjective-form", t: "ed-vs-ing", L: "B1", diff: 2, focus: "People feel -ed; things are -ing", pre: ["ed-ing-adjectives"],
    source: "I am very exciting about my trip to Istanbul.", key: "I am very excited about my trip to Istanbul.", why: "The person feels the emotion → excited." }),

  // ---------------- B2 ----------------
  d.order({ b: "order-position", t: "adjective-order", L: "B2", diff: 2, focus: "Opinion → age → origin adjective order", pre: ["adjective-order"],
    instr: "Put the words in the correct order to make a noun phrase.", tokens: ["Italian", "a", "old", "beautiful", "car"], key: ["a", "beautiful", "old", "Italian", "car"], why: "Determiner, opinion, age, origin, noun." }),
  d.mcq({ b: "order-position", t: "adjective-order", L: "B2", diff: 2, focus: "Size → colour → material order", pre: ["adjective-order"],
    prompt: "She was wearing a ______ scarf.", options: ["long red silk", "red long silk", "silk long red", "long silk red"], key: 0, why: "size → colour → material." }),
  d.mcq({ b: "gradability", t: "absolutely-ungradable", L: "B2", diff: 2, focus: "Non-gradable (extreme) adjectives take absolutely/completely, not very", pre: ["gradable-ungradable"],
    prompt: "The view from the top was ______ breathtaking.", options: ["very", "absolutely", "a bit", "quite a lot"], key: 1, why: "'breathtaking' is extreme → absolutely." }),
  d.mcq({ b: "intensifiers", t: "so-such", L: "B2", diff: 1, focus: "so + adjective vs such + (adj) noun", pre: ["so-such"],
    prompt: "The instructions were ______ complicated that nobody understood them.", options: ["such", "so", "too", "enough"], key: 1, why: "Before an adjective alone → so.", legacy: B2("The instructions were ______ complicated that nobody understood them.") }),
  d.rewrite({ b: "intensifiers", t: "so-such", L: "B2", diff: 2, focus: "Transforming so + adj into such + adj + noun", pre: ["so-such"],
    source: "The film was so long that we left before the end.", hint: "It was ______ that we left before the end.", key: "such a long film", why: "such + a + adj + noun." }),
  d.mcq({ b: "adjective-form", t: "compound-adjective", L: "B2", diff: 2, focus: "Compound adjective with singular noun (a five-year-old child, not years)", pre: ["compound-adjectives"],
    prompt: "They have a ______ daughter.", options: ["five-years-old", "five-year-old", "five years", "five-year-olds"], key: 1, why: "Number + singular noun in a compound adjective." }),
  d.gap({ b: "adverb-form", t: "adverb-vs-adjective-sense", L: "B2", diff: 3, focus: "hard (with effort) vs hardly (almost not) in one context", pre: ["irregular-adverbs"],
    instr: "Complete each gap with hard or hardly.", source: "He studied ______ all term, but he ______ slept the night before the exam.", key: ["hard", "hardly"], why: "Effort → hard; almost not → hardly." }),
  d.guided({ b: "intensifiers", t: "so-such", L: "B2", diff: 2, focus: "Productive so...that / such...that result clause", pre: ["so-such", "result-clauses"],
    prompt: "Write one sentence using so...that or such...that to express a result.", required: "so...that or such...that correctly forming a result clause",
    legacy: B2O("Write one sentence using so...that or such...that to express a result."), overlaps: ["sentence-structure"] }),

  // ---------------- C1 ----------------
  d.mcq({ b: "order-position", t: "adverb-scope", L: "C1", diff: 2, focus: "Position of 'only' changes meaning (focusing adverb scope)", pre: ["adverb-position"],
    prompt: "Which sentence means that nobody else was invited?", options: ["I only invited Sara to the meeting.", "Only I invited Sara to the meeting.", "I invited only Sara to the meeting.", "I invited Sara only to the meeting."], key: 2, why: "'only Sara' restricts the invitee." }),
  d.mcq({ b: "gradability", t: "fairly-rather-quite", L: "C1", diff: 3, focus: "'quite' with a non-gradable adjective means 'completely'", pre: ["gradable-ungradable"],
    prompt: "In 'The two proposals are quite different', 'quite' most closely means:", options: ["completely", "slightly", "fairly", "not very"], key: 0, why: "With ungradable 'different', quite = completely." }),
  d.mcq({ b: "adjective-form", t: "postpositive-adjective", L: "C1", diff: 2, focus: "Adjectives that follow the noun (present, responsible, available) with meaning change", pre: ["adjective-order"],
    prompt: "Which phrase refers to people who were THERE (not a gift)?", options: ["the present people", "the people present", "the presented people", "present the people"], key: 1, why: "'present' after the noun = attending." }),
  d.correct({ b: "adverb-form", t: "sentence-adverb", L: "C1", diff: 2, focus: "'Hopefully' as a sentence adverb vs manner adverb — misplacement changes meaning", pre: ["adverb-position"],
    instr: "The sentence is ambiguous. Rewrite it so that it clearly means 'I hope she will arrive on time'.", source: "She will hopefully arrive on time.", key: "Hopefully, she will arrive on time.", alt: ["Hopefully she will arrive on time.", "I hope she will arrive on time."], why: "Fronted sentence adverb marks speaker stance." }),

  // ---------------- C2 ----------------
  d.mcq({ b: "adjective-form", t: "attributive-only", L: "C2", diff: 3, focus: "Attributive-only vs predicative-only adjectives (a mere / the child was afraid)", pre: ["adjective-order", "be-copula"],
    prompt: "Which sentence is grammatical?", options: ["The child was afraid of the dark.", "The afraid child hid under the bed.", "It was a mere.", "The problem is main."], key: 0, why: "'afraid' is predicative-only; 'mere' and 'main' are attributive-only.",
    flags: ["c2-check: attributive/predicative restriction is a lexico-grammatical constraint; the distinction is grammatical (position), but relies on knowing which adjectives carry it. C2 provisional."] }),
];