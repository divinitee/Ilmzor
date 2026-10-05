// Deep Mode preview: three hand-checked sample words (Tee approved the
// prototype 5 Oct 2026). The real word maps will come from the gated
// generation pipeline (VT-38); until then students can explore these three.
// Content is English on purpose (it is what they are learning); the Meaning
// branch carries the uz/ru translation for the headword.
//
// Every form carries its own synonyms (syn) and antonyms (ant), matched to
// that form's part of speech, because any form can become the centre of the
// map (Tee, 5 Oct 2026: Deep Mode is a lab that breaks a word down from
// every angle). Strength scale: 0.95 / 0.8 / 0.6 / 0.4; 0.6 and below are
// "related", not synonyms. Each form tries to include one easy word.

export const SAMPLE_ORDER = ["unify", "decide", "careful"];

export const SAMPLE_WORDS = {
  unify: {
    word: "unify", level: "B2", pos: "verb",
    meaning: "to join things or people together so they become one",
    tr: { uz: "birlashtirmoq", ru: "объединять" },
    forms: {
      noun: {
        w: "unification", def: "the act of joining things or people into one", ex: "The unification of the two companies took almost a year.",
        syn: [
          { w: "union", s: 0.8, note: "Union is common for countries and organisations: “the union of two states”." },
          { w: "joining", s: 0.8, note: "The everyday word for the same action." },
          { w: "merger", s: 0.6, note: "Related: used only for companies joining together." },
          { w: "integration", s: 0.6, note: "Related: making different parts work well together, not always becoming one." },
        ],
        ant: [
          { w: "division", note: "Separating something into parts." },
          { w: "separation", note: "Keeping or moving things apart." },
        ],
      },
      verb: {
        w: "unify", def: "to bring separate parts together into one whole", ex: "A good leader can unify a divided team.",
        syn: [
          { w: "unite", s: 0.95, note: "The closest match. Both work for people, groups and countries." },
          { w: "bring together", s: 0.95, note: "Easy, everyday English with the same meaning." },
          { w: "join", s: 0.8, note: "Simple and common, but join can also mean become a member: “join a club”." },
          { w: "merge", s: 0.8, note: "Usually for companies, roads or files rather than people." },
          { w: "combine", s: 0.6, note: "Related, not a true synonym: it is about mixing things, not making them one." },
        ],
        ant: [
          { w: "divide", note: "The direct opposite: to separate something into parts." },
          { w: "separate", note: "To keep or move things apart." },
          { w: "split", note: "Less formal, often sudden: “The class split into two groups.”" },
        ],
      },
      adjective: {
        w: "unified", def: "joined together and working as one", ex: "The teachers presented a unified plan to the director.",
        syn: [
          { w: "united", s: 0.95, note: "The closest match: “a united team”." },
          { w: "joint", s: 0.6, note: "Related: shared by two or more people, like “a joint decision”." },
          { w: "single", s: 0.6, note: "Related: one instead of many, like “a single system”." },
        ],
        ant: [
          { w: "divided", note: "Split into groups that disagree." },
          { w: "separate", note: "Not joined; existing apart." },
        ],
      },
      adverb: null,
    },
    affixes: [
      { a: "uni-", kind: "prefix", m: "one", also: ["uniform", "unique", "universe"] },
      { a: "-fy", kind: "suffix", m: "make, become", also: ["simplify", "clarify", "purify"] },
    ],
    context: "After years of conflict, the new president tried to unify the country. The unification was slow, but by the end of her first term the regions had a unified government.",
    hl: ["unify", "unification", "unified"],
  },
  decide: {
    word: "decide", level: "A2", pos: "verb",
    meaning: "to choose something after thinking about it",
    tr: { uz: "qaror qilmoq", ru: "решать" },
    forms: {
      noun: {
        w: "decision", def: "a choice you make after thinking", ex: "It was a difficult decision, but I took the job in Tashkent.",
        syn: [
          { w: "choice", s: 0.8, note: "Easy and common. A choice can be quick; a decision usually takes thought." },
          { w: "conclusion", s: 0.6, note: "Related: what you decide after thinking about facts: “We came to the conclusion that…”" },
          { w: "judgment", s: 0.6, note: "Related: a decision or opinion after careful thought, often by an expert." },
          { w: "resolution", s: 0.6, note: "Related and formal: a firm decision to do something, like a New Year’s resolution." },
        ],
        ant: [
          { w: "indecision", note: "Not being able to decide." },
        ],
      },
      verb: {
        w: "decide", def: "to make a choice about something", ex: "We decided to stay at home because of the rain.",
        syn: [
          { w: "make up your mind", s: 0.95, note: "Everyday spoken English: “I can’t make up my mind.”" },
          { w: "choose", s: 0.8, note: "Easy. Choose picks between options; decide can be about any question." },
          { w: "settle on", s: 0.8, note: "Decide after a long time: “We settled on a name for the baby.”" },
          { w: "determine", s: 0.6, note: "Related and formal. Often means “find out” or “control”: “Your score determines your level.”" },
        ],
        ant: [
          { w: "hesitate", note: "Not an exact opposite. It is what you do when you can’t decide yet." },
        ],
      },
      adjective: {
        w: "decisive", def: "able to make choices quickly and confidently", ex: "She is a decisive manager who never wastes time.",
        syn: [
          { w: "firm", s: 0.8, note: "Firm means you don’t change your mind easily: “a firm answer”." },
          { w: "determined", s: 0.6, note: "Related: you won’t stop until you reach your goal." },
          { w: "resolute", s: 0.8, note: "Formal and strong: firm and brave about a decision." },
        ],
        ant: [
          { w: "indecisive", note: "Made with the prefix in-: not able to make choices." },
          { w: "hesitant", note: "Slow to act because you are unsure." },
        ],
      },
      adverb: {
        w: "decisively", def: "quickly and with confidence", ex: "He acted decisively when the problem started.",
        syn: [
          { w: "firmly", s: 0.8, note: "With no doubt or weakness: “She said no firmly.”" },
          { w: "confidently", s: 0.6, note: "Related: feeling sure of yourself." },
          { w: "clearly", s: 0.6, note: "Related, in sport and elections: “They won decisively” means they clearly won." },
        ],
        ant: [
          { w: "hesitantly", note: "Slowly and unsure, as if you can’t decide." },
        ],
      },
    },
    // decide has no affix of its own, so this shows the suffixes that build its family.
    affixes: [
      { a: "-sion", kind: "suffixIn", inWord: "decision", m: "makes a noun", also: ["divide → division", "conclude → conclusion", "revise → revision"] },
      { a: "-ive", kind: "suffixIn", inWord: "decisive", m: "makes an adjective", also: ["active", "creative", "expensive"] },
      { a: "-ly", kind: "suffixIn", inWord: "decisively", m: "makes an adverb", also: ["quickly", "clearly", "carefully"] },
    ],
    context: "I couldn’t decide between two universities. In the end, my father helped me make a decision, and now I feel much more decisive about my future.",
    hl: ["decide", "decision", "decisive"],
  },
  careful: {
    word: "careful", level: "A2", pos: "adjective",
    meaning: "paying attention so that you don’t make a mistake or get hurt",
    tr: { uz: "ehtiyotkor", ru: "осторожный" },
    forms: {
      noun: {
        w: "care", def: "attention you give so that nothing is harmed or damaged", ex: "Please handle these glasses with care.",
        syn: [
          { w: "attention", s: 0.8, note: "Easy and close: “Pay attention to the details.”" },
          { w: "caution", s: 0.8, note: "Care to avoid danger: “Drive with caution.”" },
        ],
        ant: [
          { w: "carelessness", note: "The noun from careless: not paying attention." },
          { w: "neglect", note: "Formal: not giving something the care it needs." },
        ],
      },
      verb: {
        w: "care", def: "to feel that someone or something is important to you", ex: "I really care about my exam results.",
        syn: [
          { w: "mind", s: 0.6, note: "Related, mostly in questions and negatives: “I don’t mind.”" },
          { w: "be interested in", s: 0.6, note: "Related: easy, but weaker than care." },
        ],
        ant: [
          { w: "ignore", note: "To pay no attention to something on purpose." },
        ],
      },
      adjective: {
        w: "careful", def: "giving attention to avoid mistakes or danger", ex: "Be careful when you cross this road.",
        syn: [
          { w: "cautious", s: 0.8, note: "Cautious is about avoiding danger or risk. Careful also covers avoiding mistakes." },
          { w: "watchful", s: 0.8, note: "Looking carefully so you notice problems early." },
          { w: "thorough", s: 0.6, note: "Related: careful and complete, checking every part." },
          { w: "attentive", s: 0.6, note: "Related: about listening and noticing, often to people." },
        ],
        ant: [
          { w: "careless", note: "Same base, opposite suffix: -ful means “full of”, -less means “without”." },
          { w: "reckless", note: "Stronger: not caring about danger at all." },
        ],
      },
      adverb: {
        w: "carefully", def: "in a way that avoids mistakes or danger", ex: "Read the instructions carefully before you start.",
        syn: [
          { w: "cautiously", s: 0.8, note: "With care to avoid danger: “He walked cautiously on the ice.”" },
          { w: "closely", s: 0.6, note: "Related: looking or listening with a lot of attention: “Watch closely.”" },
        ],
        ant: [
          { w: "carelessly", note: "Without paying attention." },
        ],
      },
    },
    affixes: [
      { a: "-ful", kind: "suffix", m: "full of", also: ["helpful", "useful", "beautiful"] },
    ],
    context: "My grandmother always told me to take care of my things. She was a careful person, and she folded every shirt carefully before putting it away.",
    hl: ["care", "careful", "carefully"],
  },
};
