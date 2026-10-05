// Deep Mode preview: three hand-checked sample words (Tee approved the
// prototype 5 Oct 2026). The real word maps will come from the gated
// generation pipeline (VT-38); until then students can explore these three.
// Content is English on purpose (it is what they are learning); the Meaning
// branch carries the uz/ru translation.

export const SAMPLE_ORDER = ["unify", "decide", "careful"];

export const SAMPLE_WORDS = {
  unify: {
    word: "unify", level: "B2", pos: "verb",
    meaning: "to join things or people together so they become one",
    tr: { uz: "birlashtirmoq", ru: "объединять" },
    forms: {
      noun: { w: "unification", def: "the act of joining things or people into one", ex: "The unification of the two companies took almost a year." },
      verb: { w: "unify", def: "to bring separate parts together into one whole", ex: "A good leader can unify a divided team." },
      adjective: { w: "unified", def: "joined together and working as one", ex: "The teachers presented a unified plan to the director." },
      adverb: null,
    },
    affixes: [
      { a: "uni-", kind: "prefix", m: "one", also: ["uniform", "unique", "universe"] },
      { a: "-fy", kind: "suffix", m: "make, become", also: ["simplify", "clarify", "purify"] },
    ],
    syn: [
      { w: "unite", s: 0.95, note: "The closest match. Both work for people, groups and countries." },
      { w: "merge", s: 0.8, note: "Usually for companies, roads or files rather than people." },
      { w: "combine", s: 0.6, note: "Related, not a true synonym: it is about mixing things, not making them one." },
    ],
    ant: [
      { w: "divide", note: "The direct opposite: to separate something into parts." },
      { w: "separate", note: "To keep or move things apart." },
      { w: "split", note: "Less formal, often sudden: “The class split into two groups.”" },
    ],
    context: "After years of conflict, the new president tried to unify the country. The unification was slow, but by the end of her first term the regions had a unified government.",
    hl: ["unify", "unification", "unified"],
  },
  decide: {
    word: "decide", level: "A2", pos: "verb",
    meaning: "to choose something after thinking about it",
    tr: { uz: "qaror qilmoq", ru: "решать" },
    forms: {
      noun: { w: "decision", def: "a choice you make after thinking", ex: "It was a difficult decision, but I took the job in Tashkent." },
      verb: { w: "decide", def: "to make a choice about something", ex: "We decided to stay at home because of the rain." },
      adjective: { w: "decisive", def: "able to make choices quickly and confidently", ex: "She is a decisive manager who never wastes time." },
      adverb: { w: "decisively", def: "quickly and with confidence", ex: "He acted decisively when the problem started." },
    },
    // decide has no affix of its own, so this shows the suffixes that build its family.
    affixes: [
      { a: "-sion", kind: "suffixIn", inWord: "decision", m: "makes a noun", also: ["divide → division", "conclude → conclusion", "revise → revision"] },
      { a: "-ive", kind: "suffixIn", inWord: "decisive", m: "makes an adjective", also: ["active", "creative", "expensive"] },
      { a: "-ly", kind: "suffixIn", inWord: "decisively", m: "makes an adverb", also: ["quickly", "clearly", "carefully"] },
    ],
    syn: [
      { w: "make up your mind", s: 0.95, note: "Everyday spoken English: “I can’t make up my mind.”" },
      { w: "choose", s: 0.8, note: "Choose picks between options. Decide can be about any question." },
      { w: "determine", s: 0.6, note: "Related and formal. Often means “find out” or “control”: “Your score determines your level.”" },
    ],
    ant: [
      { w: "hesitate", note: "Not an exact opposite. It is what you do when you can’t decide yet." },
    ],
    context: "I couldn’t decide between two universities. In the end, my father helped me make a decision, and now I feel much more decisive about my future.",
    hl: ["decide", "decision", "decisive"],
  },
  careful: {
    word: "careful", level: "A2", pos: "adjective",
    meaning: "paying attention so that you don’t make a mistake or get hurt",
    tr: { uz: "ehtiyotkor", ru: "осторожный" },
    forms: {
      noun: { w: "care", def: "attention you give so that nothing is harmed or damaged", ex: "Please handle these glasses with care." },
      verb: { w: "care", def: "to feel that someone or something is important to you", ex: "I really care about my exam results." },
      adjective: { w: "careful", def: "giving attention to avoid mistakes or danger", ex: "Be careful when you cross this road." },
      adverb: { w: "carefully", def: "in a way that avoids mistakes or danger", ex: "Read the instructions carefully before you start." },
    },
    affixes: [
      { a: "-ful", kind: "suffix", m: "full of", also: ["helpful", "useful", "beautiful"] },
    ],
    syn: [
      { w: "cautious", s: 0.8, note: "Cautious is about avoiding danger or risk. Careful also covers avoiding mistakes." },
      { w: "thorough", s: 0.6, note: "Related: careful and complete, checking every part." },
      { w: "attentive", s: 0.6, note: "Related: about listening and noticing, often to people." },
    ],
    ant: [
      { w: "careless", note: "Same root, opposite suffix: -ful means “full of”, -less means “without”." },
      { w: "reckless", note: "Stronger: not caring about danger at all." },
    ],
    context: "My grandmother always told me to take care of my things. She was a careful person, and she folded every shirt carefully before putting it away.",
    hl: ["care", "careful", "carefully"],
  },
};
