import { BookOpen, SpellCheck, FileText, Headphones, PenLine, Mic } from "lucide-react";

export const TOP_SKILLS = [
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen, hue: "from-blue-500 to-indigo-600", ring: "ring-blue-400/50", glow: "rgba(59,130,246,0.55)", color: "#3b82f6" },
  { id: "grammar", label: "Grammar", icon: SpellCheck, hue: "from-rose-500 to-red-600", ring: "ring-rose-400/50", glow: "rgba(239,68,68,0.55)", color: "#ef4444" },
  { id: "reading", label: "Reading", icon: FileText, hue: "from-amber-400 to-yellow-500", ring: "ring-amber-400/50", glow: "rgba(250,204,21,0.5)", comingSoon: true, color: "#facc15" },
  { id: "listening", label: "Listening", icon: Headphones, hue: "from-slate-200 to-white", ring: "ring-slate-200/50", glow: "rgba(248,250,252,0.55)", comingSoon: true, color: "#f8fafc" },
  { id: "writing", label: "Writing", icon: PenLine, hue: "from-blue-700 to-indigo-800", ring: "ring-blue-500/50", glow: "rgba(37,99,235,0.5)", comingSoon: true, color: "#1d4ed8" },
  { id: "speaking", label: "Speaking", icon: Mic, hue: "from-emerald-500 to-green-600", ring: "ring-emerald-400/50", glow: "rgba(34,197,94,0.55)", comingSoon: true, color: "#22c55e" },
];

const gen = (names, game) => names.map((name, i) => ({
  name,
  game,
  difficulty: ["Easy", "Medium", "Hard"][i % 3],
  time: ["3 min", "5 min", "8 min"][i % 3],
  xp: [40, 65, 100][i % 3],
}));

const C = (label, subs, challenges, comingSoon = false) => ({ label, subs, challenges, comingSoon });
const grammarCh = (names, bank) => names.map((name, i) => ({
  name, game: "grammar", bank,
  difficulty: ["Easy", "Medium", "Hard"][i % 3],
  time: ["3 min", "5 min", "8 min"][i % 3],
  xp: [40, 65, 100][i % 3],
}));

export const SKILL_CHILDREN = {
  vocabulary: [
    C("Meaning", ["Definitions", "Context", "Multiple meanings"], [
      // Honest label, 2026-09-06: the rebuilt engine reads definitions from the
      // database (no AI wait) and runs 8-14 words in sets, with an attempt
      // budget instead of a clock — measured around 2-4 min. XP is the floor
      // (8 first-try matches × 10 base at the beginner tier), not the ceiling.
      { name: "Definition Match", game: "definition_match", difficulty: "Easy", time: "2-4 min", xp: 80 },
      // Honest label, 2026-09-07: the expanded engine runs 8-14 picture pairs
      // in sets with an attempt budget, no clock — measured around 2-3 min.
      // XP is the floor (8 first-try matches × 10 base at the beginner tier);
      // a band thin on concrete nouns can shrink the round, so this is the
      // full-round floor, not a guarantee.
      { name: "Picture Match", game: "picture_match", difficulty: "Medium", time: "2-3 min", xp: 80 },
      // Honest label, 2026-09-07: the rebuilt engine runs 8-12 words, one
      // sentence each, with an attempt budget and no clock — measured around
      // 3-4 min. XP is the floor (8 first-try picks × 10 base at the beginner
      // tier); the clue escalates by the student's own level, so the same node
      // is a translation choice at A1 and a near-synonym discrimination at C1.
      { name: "Context Guess", game: "context_guess", difficulty: "Hard", time: "3-4 min", xp: 80 },
      // Honest label, 2026-09-06: the rebuilt engine runs 12–21 pairs by tier
      // with a study reveal and no clock, which measured out around 3–5 min
      // rather than the 3 min this node used to advertise. XP is the floor
      // (12 pairs × 10 base at the beginner tier) rather than the ceiling —
      // under-promise, since the real award scales with tier and streak via
      // gameScoring.js.
      { name: "Memory Flip", game: "memory_flip", difficulty: "Easy", time: "3-5 min", xp: 120 },
      // Was fully built but only ever referenced under Reading, which is
      // comingSoon — unreachable in the live UI despite working. Wired in
      // here per the founder's confirmed placement (2026-09-04).
      // Honest label, 2026-09-07: the refined engine reads the shown definition
      // from the database (no AI wait) and grades each written answer with one
      // AI call. This node is "Hard" and the game unlocks at B1, so the lowest
      // tier it can ever run at is advanced (7 answers) — floor XP is
      // 7 cleared × 10 base = 70, before any streak bonus. Seven written
      // answers plus grading measured around 6–9 min.
      { name: "Definition", game: "definition", difficulty: "Hard", time: "6-9 min", xp: 70 },
    ]),
    C("Pronunciation", ["Word stress", "IPA"], gen(["Hear & Choose", "Stress Battle", "Minimal Pairs", "Shadow Me"], "spelling"), true),
    C("Spelling", ["Typing", "Letter order", "Missing letters"], [
      // Honest label, 2026-09-07: rebuilt to three genuinely distinct mechanics
      // (was three labels over one component). Each entry now carries a `bank`
      // field the engine branches on, same shape as GrammarQuizGame.
      // missing_letters: word shown with 1-2 gaps, fill just the blanks.
      // 6 words at beginner tier, one check each, attempt budget of 9 —
      // measured around 2-3 min. Floor XP is 6 first-try × 10 base = 60.
      { name: "Missing Letters", game: "spelling", bank: "missing_letters", difficulty: "Easy", time: "2-3 min", xp: 60 },
      // letter_order: hear the word, unscramble letter tiles into slots.
      // 6 words at beginner tier, one check each, attempt budget of 9 —
      // measured around 3-4 min. Floor XP is 6 first-try × 10 base = 60.
      { name: "Letter Order", game: "spelling", bank: "letter_order", difficulty: "Medium", time: "3-4 min", xp: 60 },
      // typing: hear the word, type the whole thing from memory. No letters
      // shown. 6 words at beginner tier, one check each, attempt budget of 9
      // — measured around 3-5 min (typing is slower than tapping tiles).
      // Floor XP is 6 first-try × 10 base = 60.
      { name: "Typing", game: "spelling", bank: "typing", difficulty: "Hard", time: "3-5 min", xp: 60 },
      // Same as Definition above — fully built, was orphaned under the
      // comingSoon Reading skill. Founder's confirmed placement.
      { name: "Crossword", game: "crossword", difficulty: "Hard", time: "8 min", xp: 100 },
    ]),
    C("Word Forms", ["Noun", "Verb", "Adjective", "Adverb", "Prefixes", "Suffixes", "Root words"], [
      // Honest label, 2026-09-07: rebuilt to four genuinely distinct mechanics
      // (was four labels over one "type the requested form" mechanic). Each
      // entry carries a `bank` field the engine branches on, same shape as
      // Spelling/Grammar. Hand-authored banks in wordFormsBank.js — no
      // InvokeLLM call (the old engine's per-round AI cost bug is gone).
      // word_family: 4 words at intermediate tier, 4 form-picks each (16 picks),
      // attempt budget of 24 — measured around 3-5 min. Floor XP is 4 first-try
      // words × 10 base = 40.
      { name: "Word Family Builder", game: "wordforms", bank: "word_family", difficulty: "Easy", time: "3-5 min", xp: 40 },
      // prefix_match: 6 words at intermediate tier, 1 pick each, 6 prefix
      // options, attempt budget of 9 — measured around 2-3 min. Floor XP is
      // 6 first-try picks × 10 base = 60.
      { name: "Prefix Match", game: "wordforms", bank: "prefix_match", difficulty: "Medium", time: "2-3 min", xp: 60 },
      // suffix_builder: 6 words at intermediate tier, 1 pick each, 6 suffix
      // options, attempt budget of 9 — measured around 2-3 min. Floor XP is
      // 6 first-try picks × 10 base = 60.
      { name: "Suffix Builder", game: "wordforms", bank: "suffix_builder", difficulty: "Hard", time: "2-3 min", xp: 60 },
      // root_hunt: 5 groups at intermediate tier, 4 word-taps each (20 taps),
      // attempt budget of 15 — measured around 3-4 min. Floor XP is 5 first-try
      // groups × 10 base = 50. Recognition task, not production.
      { name: "Root Hunt", game: "wordforms", bank: "root_hunt", difficulty: "Medium", time: "3-4 min", xp: 50 },
    ]),
    C("Usage", ["Example sentences", "Fill in the blank", "Common mistakes"], gen(["Fill the Blank", "Choose the Best Word", "Sentence Repair"], "sentence")),
    C("Phrases & Chunks", ["Collocations", "Fixed expressions"], gen(["Collocation Match"], "sentence")),
    C("Relationships", ["Synonyms", "Antonyms", "Related words"], [
      // Honest label, 2026-09-07: its own engine now (was pointing at the
      // generic translation drill). 8 words at the beginner tier, one pick each,
      // two-column options and no clock — measured around 1-2 min. XP is the
      // floor (8 first-try picks × 10 base at the beginner tier), before any
      // streak bonus.
      { name: "Synonym Sprint", game: "synonym_sprint", difficulty: "Easy", time: "1-2 min", xp: 80 },
      // Honest label, 2026-09-07: refined to the five-layer standard. 8 words
      // per round (from a 20-entry fixed bank), 5 options each (4 synonyms + 1
      // antonym), attempt budget of 12, snappy feedback — measured around 2-3
      // min. XP is the floor (8 first-try picks × 10 base), before any streak
      // bonus. The bank is thin for repeat play (flagged as a content-authoring
      // followup), but the mechanic is unchanged.
      { name: "Antonym Hunt", game: "odd_one_out", difficulty: "Medium", time: "2-3 min", xp: 80 },
      { name: "Related Words", game: "quiz", difficulty: "Medium", time: "5 min", xp: 65 },
      { name: "Connection Challenge", game: "quiz", difficulty: "Hard", time: "8 min", xp: 100 },
    ]),
  ],
  grammar: [
    C("Sentence Structure", ["Word Order"], gen(["Word Order", "Build It"], "sentence")),
    C("Verb Tenses", [], grammarCh(["Present vs Past", "Perfect Tenses"], "verb_tenses")),
    C("Articles", [], grammarCh(["A or An", "The or Zero"], "articles")),
    C("Prepositions", [], grammarCh(["Time Prepositions", "Place Prepositions"], "prepositions")),
    C("Punctuation", [], grammarCh(["End Marks", "Apostrophes & Commas"], "punctuation")),
    C("Question Formation", [], grammarCh(["Yes/No Questions", "Wh-Questions"], "question_formation")),
    C("Active vs Passive", [], grammarCh(["Form the Passive", "Spot the Voice"], "active_passive")),
    C("Conditionals", [], grammarCh(["Zero & First", "Second & Third"], "conditionals")),
    C("Reported Speech", [], grammarCh(["Statements", "Questions & Commands"], "reported_speech")),
  ],
  speaking: [
    C("Pronunciation", [], gen(["Hear & Choose", "Repeat"], "spelling")),
    C("Fluency", [], gen(["Speak Up", "Quick Talk"], "sentence")),
    C("Intonation", [], gen(["Rise / Fall", "Intone"], "spelling")),
    C("Shadowing", [], gen(["Shadow Me", "Echo"], "spelling")),
    C("Conversation", [], gen(["Roleplay", "Dialog"], "sentence")),
    C("Roleplay", [], gen(["Scene", "Improvise"], "sentence")),
  ],
  reading: [
    C("Comprehension", [], gen(["Read & Answer", "Deep Read"], "definition")),
    C("Skimming", [], gen(["Fast Scan", "Gist"], "quiz")),
    C("Scanning", [], gen(["Find It", "Hunt"], "crossword")),
    C("Inference", [], gen(["Guess", "Read Between"], "definition")),
    C("Vocabulary in Context", [], gen(["Context Words", "Clue"], "definition")),
  ],
  listening: [
    C("Understanding", [], gen(["Listen In", "Catch"], "spelling")),
    C("Key Information", [], gen(["Key Hunt", "Main Point"], "quiz")),
    C("Different Accents", [], gen(["Accent Match", "Voices"], "spelling")),
    C("Speed Training", [], gen(["Speed Run", "Rapid"], "quiz")),
    C("Vocabulary Recognition", [], gen(["Hear & Pick", "Spot"], "spelling")),
  ],
  writing: [
    C("Sentence Building", [], gen(["Build", "Arrange"], "sentence")),
    C("Paragraph Writing", [], gen(["Paragraph", "Flow"], "sentence")),
    C("Essay Writing", [], gen(["Essay", "Draft"], "sentence")),
    C("Grammar Accuracy", [], gen(["Accuracy", "Proofread"], "wordforms")),
    C("Vocabulary Usage", [], gen(["Use It", "Choose Word"], "definition")),
  ],
};

// Every challenge under a top skill that isn't itself marked comingSoon
// (top-level TOP_SKILLS.comingSoon, or a category's own comingSoon) — i.e.
// everything actually playable right now. Used by the dashboard's Random
// Challenge action to pull a real random game from Skill Hub instead of
// just navigating to the tab.
export function getAllPlayableChallenges() {
  const out = [];
  TOP_SKILLS.forEach((skill) => {
    if (skill.comingSoon) return;
    (SKILL_CHILDREN[skill.id] || []).forEach((category) => {
      if (category.comingSoon) return;
      (category.challenges || []).forEach((ch) => {
        out.push({ game: ch.game, difficulty: ch.difficulty, bank: ch.bank, skillLabel: category.label });
      });
    });
  });
  return out;
}

export function getRandomChallenge() {
  const all = getAllPlayableChallenges();
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}

export const DIFF_STYLE = {
  Easy: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  Medium: "text-amber-300 bg-amber-500/10 border-amber-400/30",
  Hard: "text-rose-300 bg-rose-500/10 border-rose-400/30",
};
export const DIFF_TO_GAME = { Easy: "beginner", Medium: "intermediate", Hard: "advanced" };

export const pos = (i, n, rx, ry) => {
  const a = (-90 + (i / n) * 360) * (Math.PI / 180);
  return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) };
};

export const PULSE_PHASES = [
  { begin: 0, r: 3.0, fo: 0.95 },
  { begin: 0.55, r: 2.2, fo: 0.55 },
  { begin: 1.1, r: 1.5, fo: 0.3 },
];