import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("prep-phrasal");
const A1 = leg("A1_MCQ"), A2 = leg("A2_MCQ");

export default [
  // ---------------- A1 ----------------
  d.mcq({ b: "place", t: "on-surface", L: "A1", diff: 1, focus: "on for a surface", pre: ["prepositions-place"],
    prompt: "The keys are ______ the table.", options: ["in", "on", "at", "to"], key: 1, why: "Surface → on.", legacy: A1("The keys are ______ the table.") }),
  d.mcq({ b: "place", t: "in-container", L: "A1", diff: 1, focus: "in for an enclosed space", pre: ["prepositions-place"],
    prompt: "The cat is ______ the box.", options: ["in", "on", "at", "from"], key: 0, why: "Inside → in.", legacy: A1("The cat is ______ the box.") }),
  d.mcq({ b: "place", t: "between", L: "A1", diff: 2, focus: "between for a position with two reference points", pre: ["prepositions-place"],
    prompt: "The bank is ______ the supermarket and the café.", options: ["under", "between", "in", "on"], key: 1, why: "Two reference points → between.", legacy: A1("The bank is ______ the supermarket and the café.") }),
  d.mcq({ b: "time", t: "at-clock-time", L: "A1", diff: 1, focus: "at with clock times", pre: ["prepositions-time"],
    prompt: "I get up ______ 7 o'clock.", options: ["on", "in", "at", "by"], key: 2, why: "Clock time → at.", legacy: A1("I get up ______ 7 o'clock.") }),
  d.mcq({ b: "time", t: "on-days", L: "A1", diff: 1, focus: "on with days", pre: ["prepositions-time"],
    prompt: "We have English ______ Monday.", options: ["at", "on", "in", "from"], key: 1, why: "Day → on.", legacy: A1("We have English ______ Monday.") }),
  d.mcq({ b: "time", t: "in-months", L: "A1", diff: 1, focus: "in with months", pre: ["prepositions-time"],
    prompt: "My birthday is ______ July.", options: ["on", "at", "in", "by"], key: 2, why: "Month → in.", legacy: A1("My birthday is ______ July.") }),
  d.mcq({ b: "time", t: "at-night", L: "A1", diff: 2, focus: "at night as a fixed expression", pre: ["prepositions-time"],
    prompt: "I usually sleep ______ night.", options: ["on", "at", "in", "to"], key: 1, why: "Fixed: at night.", legacy: A1("I usually sleep ______ night.") }),
  d.gap({ b: "place", t: "under-behind", L: "A1", diff: 2, focus: "Producing prepositions of position", pre: ["prepositions-place"],
    instr: "Complete each gap with ONE preposition.", source: "The shoes are ______ the bed, and the coat is ______ the door.", key: ["under", "behind"], why: "Position words." }),

  // ---------------- A2 ----------------
  d.mcq({ b: "place", t: "in-city", L: "A2", diff: 1, focus: "in with an enclosed area (garden)", pre: ["prepositions-place"],
    prompt: "The children are playing ______ the garden.", options: ["at", "on", "in", "to"], key: 2, why: "Area → in.", legacy: A2("The children are playing ______ the garden.") }),
  d.mcq({ b: "place", t: "arrive-at", L: "A2", diff: 2, focus: "arrive at a place (never 'arrive to')", pre: ["dependent-prepositions"],
    prompt: "We arrived ______ the airport at 6 a.m.", options: ["at", "on", "to", "by"], key: 0, why: "arrive at + specific place.", legacy: A2("We arrived ______ the airport at 6 a.m.") }),
  d.mcq({ b: "time", t: "since-start-point", L: "A2", diff: 2, focus: "since with a start point", pre: ["prepositions-time", "present-perfect"],
    prompt: "I have lived here ______ 2020.", options: ["for", "since", "during", "from"], key: 1, why: "Start point → since.", legacy: A2("I have lived here ______ 2020."), overlaps: ["tenses"] }),
  d.mcq({ b: "dependent-prepositions", t: "interested-in", L: "A2", diff: 1, focus: "interested in (fixed dependent preposition)", pre: ["dependent-prepositions"],
    prompt: "She is interested ______ photography.", options: ["on", "at", "in", "for"], key: 2, why: "Fixed: interested in.", legacy: A2("She is interested ______ photography.") }),
  d.gap({ b: "movement", t: "to-into", L: "A2", diff: 2, focus: "to (destination) vs into (entering)", pre: ["prepositions-movement"],
    instr: "Complete each gap with ONE preposition.", source: "We walked ______ the museum entrance and then went ______ the main hall.", key: ["to", "into"], why: "Destination → to; entering an enclosed space → into." }),
  d.mcq({ b: "phrasal-verbs", t: "literal-phrasal", L: "A2", diff: 2, focus: "Particle choice in a common phrasal verb (turn on)", pre: ["phrasal-verb-separability"],
    prompt: "It's dark in here. Could you turn ______ the light?", options: ["on", "in", "at", "of"], key: 0, why: "turn on = switch on." }),
  d.correct({ b: "dependent-prepositions", t: "listen-to", L: "A2", diff: 2, focus: "listen requires 'to' before an object", pre: ["dependent-prepositions", "prepositional-verbs"],
    source: "Every evening I listen the radio for an hour.", key: "Every evening I listen to the radio for an hour.", why: "listen to + object." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "phrasal-verbs", t: "separability-pronoun", L: "B1", diff: 3, focus: "A pronoun object must go between verb and particle", pre: ["phrasal-verb-separability"],
    prompt: "I've written the names down. Shall I read ______ to you?", options: ["out them", "them out", "out of them", "them of out"], key: 1, why: "Pronoun object goes before the particle." }),
  d.mcq({ b: "dependent-prepositions", t: "depend-on", L: "B1", diff: 1, focus: "depend on (fixed)", pre: ["dependent-prepositions"],
    prompt: "Whether we travel by train ______ the price of the tickets.", options: ["depends of", "depends on", "depends to", "depends in"], key: 1, why: "Fixed: depend on." }),
  d.gap({ b: "dependent-prepositions", t: "adjective-prepositions", L: "B1", diff: 2, focus: "Adjective + fixed preposition", pre: ["dependent-prepositions"],
    instr: "Complete each gap with ONE preposition.", source: "She's very good ______ maths, but she's afraid ______ speaking in public.", key: ["at", "of"], why: "good at; afraid of." }),
  d.mcq({ b: "time", t: "by-until", L: "B1", diff: 2, focus: "by (deadline) vs until (duration)", pre: ["prepositions-time"],
    prompt: "Please send the file ______ Friday — after that it will be too late.", options: ["until", "by", "since", "during"], key: 1, why: "Deadline → by." }),
  d.mcq({ b: "time", t: "during-while", L: "B1", diff: 2, focus: "during + noun vs while + clause", pre: ["prepositions-time", "subordinating-conjunctions"],
    prompt: "I fell asleep ______ the film.", options: ["while", "during", "when", "meanwhile"], key: 1, why: "Noun phrase → during.", overlaps: ["sentence-structure"] }),
  d.mcq({ b: "phrasal-verbs", t: "idiomatic-phrasal", L: "B1", diff: 2, focus: "Idiomatic phrasal verb meaning (put off = postpone)", pre: ["phrasal-verb-separability"],
    prompt: "The meeting has been put ______ until next week.", options: ["off", "out", "away", "up"], key: 0, why: "put off = postpone." }),
  d.correct({ b: "dependent-prepositions", t: "preposition-gerund", L: "B1", diff: 2, focus: "Preposition takes -ing, not an infinitive", pre: ["preposition-gerund"],
    source: "She apologised for arrive late.", key: "She apologised for arriving late.", why: "Preposition + -ing.", overlaps: ["verb-patterns"] }),

  // ---------------- B2 ----------------
  d.mcq({ b: "phrasal-verbs", t: "three-part-phrasal", L: "B2", diff: 3, focus: "Three-part phrasal verb: object cannot split verb + two particles", pre: ["three-part-phrasal"],
    prompt: "I can't ______ his constant complaining any longer.", options: ["put up with", "put with up", "put up it with", "put with"], key: 0, why: "Fixed three-part sequence; the object follows all particles." }),
  d.mcq({ b: "phrasal-verbs", t: "separability-inseparable", L: "B2", diff: 2, focus: "Prepositional (inseparable) phrasal verbs keep the object after the particle", pre: ["phrasal-verb-separability", "prepositional-verbs"],
    prompt: "We ran ______ an old friend at the station.", options: ["into", "in it", "into it", "in"], key: 0, why: "run into = meet by chance; inseparable." }),
  d.gap({ b: "dependent-prepositions", t: "noun-prepositions", L: "B2", diff: 2, focus: "Noun + fixed preposition in formal writing", pre: ["dependent-prepositions"],
    instr: "Complete each gap with ONE preposition.", source: "There has been a sharp increase ______ energy prices and a corresponding fall ______ demand.", key: ["in", "in"], why: "an increase in; a fall in." }),
  d.mcq({ b: "stranding", t: "relative-preposition", L: "B2", diff: 2, focus: "Preposition + which fronted in a relative clause (formal)", pre: ["preposition-stranding", "relative-pronouns"],
    prompt: "The company for ______ I work is expanding.", options: ["who", "which", "where", "what"], key: 1, why: "Preposition + which for a thing.", legacy: leg("B2_MCQ")("The company for ______ I work is expanding."), overlaps: ["sentence-structure"] }),
  d.rewrite({ b: "stranding", t: "formal-fronting", L: "B2", diff: 3, focus: "Converting a stranded preposition into fronted preposition + whom", pre: ["preposition-stranding"],
    instr: "Rewrite the sentence more formally, starting with the words given.", source: "This is the colleague I was telling you about.", hint: "This is the colleague ______", key: "about whom I was telling you", why: "Formal register fronts the preposition before 'whom'.", overlaps: ["sentence-structure"] }),
  d.mcq({ b: "movement", t: "onto-into-contrast", L: "B2", diff: 2, focus: "Movement (onto) vs position (on) after a verb of motion", pre: ["prepositions-movement", "prepositions-place"],
    prompt: "The cat jumped ______ the roof and sat there for an hour.", options: ["on to the roof and sat on it", "onto the roof and sat on it", "into the roof and sat in it", "at the roof and sat at it"], key: 1, why: "Motion to a surface → onto; resting position → on.",
    flags: ["'on to' (two words) is an accepted British spelling of 'onto'; option 1 is therefore not clearly wrong. Rewrite this stem before mass use."] }),

  // ---------------- C1 ----------------
  d.mcq({ b: "dependent-prepositions", t: "verb-preposition-contrast", L: "C1", diff: 3, focus: "Different prepositions change the grammatical relation (result in vs result from)", pre: ["dependent-prepositions"],
    prompt: "The shortage ______ a series of poor harvests, and it resulted ______ sharply higher prices.", options: ["resulted from / in", "resulted in / from", "resulted of / to", "resulted from / from"], key: 0, why: "result from = has as its cause; result in = produces." }),
  d.mcq({ b: "stranding", t: "preposition-gerund-formal", L: "C1", diff: 2, focus: "Preposition + gerund in a formal complex noun phrase", pre: ["preposition-gerund"],
    prompt: "There is little prospect ______ the deadline at this stage.", options: ["to meet", "of meeting", "for meet", "of to meet"], key: 1, why: "prospect of + -ing.", overlaps: ["verb-patterns"] }),
  d.mcq({ b: "phrasal-verbs", t: "nominalised-phrasal", L: "C1", diff: 3, focus: "Phrasal verb vs its noun form (break down / breakdown)", pre: ["phrasal-verb-separability"],
    prompt: "The complete ______ of communication between the two departments delayed the project.", options: ["break down", "breakdown", "breaking of down", "broken down"], key: 1, why: "After 'the complete ... of' a noun is required." }),
  d.gap({ b: "time", t: "throughout-within", L: "C1", diff: 2, focus: "Precise time prepositions in formal register (throughout / within)", pre: ["prepositions-time"],
    instr: "Complete each gap with ONE preposition.", source: "Demand remained stable ______ the year, and the report is due ______ the next two weeks.", key: ["throughout", "within"], why: "throughout = across the whole period; within = before the end of." }),

  // ---------------- C2 ----------------
  d.mcq({ b: "stranding", t: "stranding-in-passive", L: "C2", diff: 3, focus: "Prepositional passive: the object of a preposition becomes the passive subject, leaving the preposition stranded", pre: ["preposition-stranding", "prepositional-passive"],
    prompt: "Her repeated warnings were simply ______.", options: ["taken no notice of", "taken no notice", "no notice taken", "taken of no notice"], key: 0, why: "Prepositional passive keeps the whole 'take notice of' sequence, with 'of' stranded at the end.", overlaps: ["passive-causative"],
    flags: ["c2-check: prepositional passive with a fixed idiomatic object is a genuine syntactic operation, not lexical difficulty. C2 provisional."] }),
];