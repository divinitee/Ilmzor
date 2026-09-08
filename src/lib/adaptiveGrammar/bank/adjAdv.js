import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("adj-adv");
const A1 = leg("A1_MCQ"), A2 = leg("A2_MCQ"), B2 = leg("B2_MCQ");

export default [
  // ---------------- A1 ----------------
  d.mcq({ b: "frequency", t: "always-never", L: "A1", diff: 1, focus: "always for a 100% routine", pre: ["frequency-adverbs"],
    prompt: "I ______ drink coffee in the morning. It is part of my routine.", options: ["never", "always", "rarely", "sometimes"], key: 1, why: "Part of a routine → always.", legacy: A1("I ______ drink coffee in the morning. It is part of my routine.") }),
  d.mcq({ b: "frequency", t: "rarely", L: "A1", diff: 2, focus: "rarely for a low frequency", pre: ["frequency-adverbs"],
    prompt: "She ______ goes to the gym, about once a week.", options: ["always", "never", "sometimes", "rarely"], key: 3, why: "Once a week → rarely.", legacy: A1("She ______ goes to the gym, about once a week.") }),
  d.mcq({ b: "frequency", t: "always-never", L: "A1", diff: 1, focus: "never for zero frequency", pre: ["frequency-adverbs"],
    prompt: "We ______ eat pizza. We don't like it.", options: ["always", "usually", "never", "often"], key: 2, why: "Don't like it → never.", legacy: A1("We ______ eat pizza. We don't like it.") }),
  d.mcq({ b: "adjective-form", t: "adjective-before-noun", L: "A1", diff: 1, focus: "Adjectives are invariable before a plural noun", pre: [],
    prompt: "They live in a house with two ______.", options: ["bigs rooms", "big rooms", "rooms big", "big roomes"], key: 1, why: "Adjective takes no plural and comes before the noun." }),
  d.order({ b: "order-position", t: "frequency-position", L: "A1", diff: 2, focus: "Frequency adverb goes between subject and main verb", pre: ["frequency-adverbs", "adverb-position"],
    tokens: ["late", "she", "usually", "works"], key: ["she", "usually", "works", "late"], why: "Subject + frequency adverb + verb." }),

  // ---------------- A2 ----------------
  d.mcq({ b: "adverb-form", t: "irregular-adverb", L: "A2", diff: 1, focus: "well as the adverb of good", pre: ["adjective-adverb-distinction", "irregular-adverbs"],
    prompt: "He speaks English very ______.", options: ["good", "well", "better", "best"], key: 1, why: "Modifies the verb 'speaks' → well.", legacy: A2("He speaks English very ______.") }),
  d.mcq({ b: "adverb-form", t: "ly-adverb", L: "A2", diff: 1, focus: "-ly adverb modifying a verb (not the adjective form)", pre: ["adjective-adverb-distinction"],
    prompt: "He drove ______ because the road was icy.", options: ["careful", "carefully", "care", "more careful"], key: 1, why: "Modifies 'drove' → carefully.", legacy: A2("He drove ______ because the road was icy.") }),
  d.mcq({ b: "frequency", t: "never", L: "A2", diff: 1, focus: "never matching a stated fact", pre: ["frequency-adverbs"],
    prompt: "She is ______ late for work. She is always on time.", options: ["never", "usually", "often", "always"], key: 0, why: "Always on time → never late.", legacy: A2("She is ______ late for work. She is always on time.") }),
  d.gap({ b: "adverb-form", t: "ly-adverb", L: "A2", diff: 2, focus: "Choosing between adjective and adverb form by what is modified", pre: ["adjective-adverb-distinction"],
    instr: "Complete each gap with the correct form of the word in brackets.", source: "She is a ______ (quiet) person and she always speaks very ______ (quiet).", key: ["quiet", "quietly"], why: "Noun → adjective; verb → adverb." }),
  d.correct({ b: "adverb-form", t: "irregular-adverb", L: "A2", diff: 2, focus: "hard vs hardly are different words", pre: ["irregular-adverbs"],
    source: "He studied hardly for the exam and passed with a good mark.", key: "He studied hard for the exam and passed with a good mark.", why: "'hardly' means 'almost not'." }),
  d.mcq({ b: "adjective-form", t: "ed-ing-adjectives", L: "A2", diff: 2, focus: "-ed adjective for how a person feels", pre: ["ed-ing-adjectives"],
    prompt: "The lesson was long and I felt very ______.", options: ["boring", "bored", "bore", "boredly"], key: 1, why: "The person feels → -ed." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "adjective-form", t: "ed-ing-adjectives", L: "B1", diff: 2, focus: "-ing adjective for the cause of a feeling", pre: ["ed-ing-adjectives"],
    prompt: "The results were ______: nobody expected such a big change.", options: ["surprised", "surprising", "surprise", "surprisingly"], key: 1, why: "The thing causes the feeling → -ing." }),
  d.mcq({ b: "intensifiers", t: "too-enough", L: "B1", diff: 2, focus: "too + adjective (excess) vs enough", pre: ["too-enough"],
    prompt: "This coffee is ______ hot to drink right now.", options: ["too", "enough", "so", "very much"], key: 0, why: "Excess preventing an action → too + adjective + to." }),
  d.gap({ b: "intensifiers", t: "too-enough", L: "B1", diff: 2, focus: "enough follows an adjective but precedes a noun", pre: ["too-enough"],
    instr: "Complete both gaps with 'enough' in the correct position, writing the whole phrase.", source: "He isn't ______ (old) to drive, and we don't have ______ (time / money) for lessons anyway.",
    key: ["old enough", "enough time"], alt: [["old enough", "enough money"]], why: "adjective + enough; enough + noun." }),
  d.mcq({ b: "order-position", t: "adverb-position-mid", L: "B1", diff: 2, focus: "Mid-position adverb comes after the auxiliary, before the main verb", pre: ["adverb-position", "frequency-adverbs"],
    prompt: "I ______ been to that part of the city.", options: ["have never", "never have", "have not never", "never"], key: 0, why: "Auxiliary + adverb + main verb." }),
  d.mcq({ b: "adjective-form", t: "adjective-order", L: "B1", diff: 3, focus: "Adjective order: opinion before size before colour", pre: ["adjective-order"],
    prompt: "She bought ______ jacket.", options: ["a leather nice black", "a nice black leather", "a black nice leather", "a leather black nice"], key: 1, why: "Opinion → colour → material." }),
  d.order({ b: "order-position", t: "adverb-position-end", L: "B1", diff: 2, focus: "Manner before place before time in end position", pre: ["adverb-position"],
    tokens: ["yesterday", "at", "she", "the", "sang", "beautifully", "concert"], key: ["she", "sang", "beautifully", "at", "the", "concert", "yesterday"], why: "Manner + place + time." }),

  // ---------------- B2 ----------------
  d.mcq({ b: "intensifiers", t: "so-such", L: "B2", diff: 2, focus: "so + adjective vs such + noun phrase", pre: ["so-such", "result-clauses"],
    prompt: "The instructions were ______ complicated that nobody understood them.", options: ["such", "so", "too", "enough"], key: 1, why: "so + adjective + that.", legacy: B2("The instructions were ______ complicated that nobody understood them."), overlaps: ["sentence-structure"] }),
  d.mcq({ b: "gradability", t: "ungradable-adjectives", L: "B2", diff: 2, focus: "Absolute adjectives take absolutely/completely, not very", pre: ["gradable-ungradable"],
    prompt: "The film was ______ terrifying — I couldn't watch the end.", options: ["very", "absolutely", "a bit very", "much"], key: 1, why: "Extreme adjective → absolutely." }),
  d.mcq({ b: "gradability", t: "gradable-adjectives", L: "B2", diff: 2, focus: "Gradable adjective takes very, not absolutely", pre: ["gradable-ungradable"],
    prompt: "The exam was ______ difficult, but most students passed.", options: ["absolutely", "utterly", "fairly", "completely"], key: 2, why: "Gradable adjective + moderating adverb." }),
  d.rewrite({ b: "intensifiers", t: "so-such", L: "B2", diff: 2, focus: "Converting so + adjective into such + noun phrase", pre: ["so-such"],
    source: "The weather was so bad that we cancelled the trip.", hint: "It was ______ that we cancelled the trip.", key: "such bad weather", why: "such + (a) + adjective + noun.", overlaps: ["sentence-structure"] }),
  d.correct({ b: "adverb-position", t: "adverb-split-object", L: "B2", diff: 3, focus: "An adverb must not separate a verb from its direct object", pre: ["adverb-position"],
    source: "She speaks fluently three languages.", key: "She speaks three languages fluently.", why: "Manner adverb follows the object." }),
  d.mcq({ b: "adjective-form", t: "compound-adjectives", L: "B2", diff: 2, focus: "Compound adjective before a noun stays singular and hyphenated", pre: ["compound-adjectives"],
    prompt: "They went on a ______ journey across the desert.", options: ["three-days", "three-day", "three days", "three day's"], key: 1, why: "Compound adjective → singular noun: three-day." }),

  // ---------------- C1 ----------------
  d.mcq({ b: "order-position", t: "fronted-adverbial", L: "C1", diff: 2, focus: "Focus adverb 'only' placed to modify the intended element", pre: ["adverb-position"],
    prompt: "Which sentence means that she read nothing except the first chapter?", options: ["She only read the first chapter.", "Only she read the first chapter.", "She read the first chapter only once.", "She read only she the first chapter."], key: 0, why: "'only' before the verb+object scopes over the object read." }),
  d.mcq({ b: "adjective-form", t: "postpositive-adjective", L: "C1", diff: 3, focus: "Adjective placed after the noun in fixed/postpositive patterns", pre: ["adjective-order"],
    prompt: "There were no ______ at the conference.", options: ["available seats", "seats available", "availables seats", "seats availables"], key: 1, why: "Both are possible, but with 'no ... at the conference' the postpositive 'seats available' is the natural form.",
    flags: ["'available seats' is not ungrammatical; the item tests preference for postpositive placement. Consider replacing with 'the people present' style stem if reviewers find it soft."] }),
  d.gap({ b: "gradability", t: "ungradable-adjectives", L: "C1", diff: 2, focus: "Selecting an intensifier that collocates grammatically with a non-gradable adjective", pre: ["gradable-ungradable"],
    instr: "Complete the gap with ONE word so that the intensifier matches the adjective.", source: "The two accounts of the event are ______ impossible to reconcile.", key: "absolutely", alt: ["completely", "utterly", "quite"], why: "Non-gradable 'impossible' takes an absolute intensifier." }),
  d.rewrite({ b: "order-position", t: "fronted-adverbial", L: "C1", diff: 2, focus: "Fronting an adverbial for emphasis without inversion", pre: ["adverb-position", "fronting"],
    instr: "Rewrite the sentence beginning with the underlined adverbial phrase. Do not change the word order of the subject and verb.", source: "The children ran into the garden with great excitement.", hint: "With great excitement, ______", key: "the children ran into the garden", why: "Non-negative fronted adverbial → no inversion.", overlaps: ["sentence-structure"] }),

  // ---------------- C2 ----------------
  d.mcq({ b: "adverb-form", t: "adverb-scope-ambiguity", L: "C2", diff: 3, focus: "Sentence adverb (commenting on the whole clause) vs manner adverb", pre: ["adverb-position"],
    prompt: "Which sentence means that it is fortunate that she answered the questions?", options: ["She answered the questions happily.", "Happily, she answered the questions.", "She happily answered the questions.", "She answered the happy questions."], key: 1, why: "Comma-fronted 'Happily' is a sentence adverb commenting on the whole clause; mid/end position reads as manner.",
    flags: ["c2-check: sentence-adverb vs manner-adverb scope is structural (position determines scope), not lexical. C2 provisional."] }),
];