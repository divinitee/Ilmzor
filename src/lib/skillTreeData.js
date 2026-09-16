import { BookOpen, SpellCheck, FileText, Headphones, PenLine, Mic } from "lucide-react";

// VIRORA skill colours — `color` matches the shared SKILLS system in
// gameSkills.js so the hub node and the game screen use the same accent.
// comingSoon skills (reading/listening/writing/speaking) have no SKILLS entry;
// their colours are chosen from the VIRORA palette to sit on the Midnight
// Purple ground: reading → comprehension rose, writing → creativity lavender,
// listening/speaking → muted palette-consistent teal/blue/green.
// Skill Hub v2 (2026-09-16): vocabulary/grammar are the dominant root nodes
// (larger, foundation skills); reading/listening/writing/speaking are leaf
// nodes that apply them (visually secondary, still comingSoon). `role`
// drives node sizing in SkillStage. Positions are no longer polar — each
// skill sits on a branch tip of the literal tree below (TREE_POINTS), which
// is the same table the tree art is drawn from, so a node can never drift
// off the branch that feeds it.
export const TOP_SKILLS = [
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen, hue: "from-violet-500 to-purple-600", ring: "ring-violet-400/50", glow: "rgba(124,107,232,0.55)", color: "#7C6BE8", role: "root" },
  { id: "grammar", label: "Grammar", icon: SpellCheck, hue: "from-teal-500 to-emerald-600", ring: "ring-teal-400/50", glow: "rgba(62,158,146,0.55)", color: "#3E9E92", role: "root" },
  { id: "reading", label: "Reading", icon: FileText, hue: "from-rose-400 to-pink-500", ring: "ring-rose-400/50", glow: "rgba(206,106,134,0.5)", comingSoon: true, color: "#CE6A86", role: "leaf" },
  { id: "listening", label: "Listening", icon: Headphones, hue: "from-sky-400 to-blue-500", ring: "ring-sky-400/50", glow: "rgba(107,158,196,0.5)", comingSoon: true, color: "#6B9EC4", role: "leaf" },
  { id: "writing", label: "Writing", icon: PenLine, hue: "from-purple-400 to-fuchsia-500", ring: "ring-purple-400/50", glow: "rgba(182,120,201,0.5)", comingSoon: true, color: "#B678C9", role: "leaf" },
  { id: "speaking", label: "Speaking", icon: Mic, hue: "from-emerald-400 to-green-500", ring: "ring-emerald-400/50", glow: "rgba(91,155,126,0.5)", comingSoon: true, color: "#5B9B7E", role: "leaf" },
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
    C("Usage", ["Example sentences", "Fill in the blank", "Common mistakes"], [
      // Honest label, 2026-09-07: rebuilt onto a new "usage" game key (was
      // "sentence" — SentenceBuilderGame's "write a sentence from theme
      // words" mechanic, which none of these four labels actually do).
      // fill_blank: 8 words at intermediate tier, sentence from example_en
      // with the word blanked, 4 MCQ options — measured around 2-3 min.
      // Floor XP is 8 first-try picks × 10 base = 80.
      { name: "Fill the Blank", game: "usage", bank: "fill_blank", difficulty: "Easy", time: "2-3 min", xp: 80 },
      // best_word: 8 words at intermediate tier, same sentence but distractors
      // are synonyms from synonymTiers.js — a register/nuance test — measured
      // around 2-3 min. Floor XP is 8 first-try picks × 10 base = 80.
      { name: "Choose the Best Word", game: "usage", bank: "best_word", difficulty: "Medium", time: "2-3 min", xp: 80 },
      // sentence_repair: 8 entries at intermediate tier from a 20-entry
      // hand-authored bank, sentence with wrong word choice + 4 MCQ options
      // — measured around 2-3 min. Floor XP is 8 first-try picks × 10 base = 80.
      { name: "Sentence Repair", game: "usage", bank: "sentence_repair", difficulty: "Hard", time: "2-3 min", xp: 80 },
    ]),
    C("Phrases & Chunks", ["Collocations", "Fixed expressions"], [
      // collocation_match: 8 entries at intermediate tier from a 20-entry
      // hand-authored bank, "make a ___" → pick the word that forms a natural
      // fixed expression — measured around 2-3 min. Floor XP is 8 first-try
      // picks × 10 base = 80.
      { name: "Collocation Match", game: "usage", bank: "collocation_match", difficulty: "Medium", time: "2-3 min", xp: 80 },
    ]),
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
      // Honest label, 2026-09-07: rebuilt onto a new "related_words" game key
      // (was "quiz" — the generic translation drill). 8 items per round, each
      // a target word + 4 options where one belongs to the same semantic
      // category. Attempt budget of 12. Measured around 2-3 min. Floor XP is
      // 8 first-try picks × 10 base = 80, before any streak bonus.
      { name: "Related Words", game: "related_words", difficulty: "Medium", time: "2-3 min", xp: 80 },
      // Honest label, 2026-09-07: rebuilt onto a new "connection_challenge"
      // game key (was "quiz"). 6 items per round (fewer than Related Words
      // because each requires an extra inference step: figure out the
      // category from 3 examples, then pick the 4th). Attempt budget of 9.
      // Measured around 3-5 min — the reasoning takes longer than recognition.
      // Floor XP is 6 first-try picks × 10 base = 60, but the streak bonus
      // scales higher because chaining 6 inference steps in a row is harder
      // than chaining 8 recognitions.
      { name: "Connection Challenge", game: "connection_challenge", difficulty: "Hard", time: "3-5 min", xp: 100 },
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

/* ---------- Skill Hub overview tree (2026-09-16) ----------------------

   The overview layer is a literal tree: the two root skills sit at the base,
   merge into one trunk, which forks into two boughs, each splitting again
   into two twigs that end at the four application skills.

   Every coordinate here is a percentage of the stage box in BOTH axes. The
   stage is square (see SkillHub.jsx) and the tree SVG uses
   viewBox="0 0 100 100", so an SVG coordinate and a CSS left/top percentage
   land on the same pixel. Node positions are read from this same table,
   which is what keeps a skill node sitting exactly on its branch tip
   instead of drifting off it. Change a number here and the art, the nodes
   and the glow pathways all move together. */
export const TREE_POINTS = {
  vocabulary: { x: 34, y: 84 },
  grammar:    { x: 66, y: 84 },
  merge:      { x: 50, y: 71 },
  fork:       { x: 50, y: 48 },
  boughL:     { x: 28, y: 38 },
  boughR:     { x: 72, y: 38 },
  listening:  { x: 23, y: 15 },
  reading:    { x: 16, y: 50 },
  writing:    { x: 77, y: 15 },
  speaking:   { x: 84, y: 50 },
};

// Branches are drawn as filled tapered quadrilaterals rather than strokes,
// so the trunk can be broad at the base and thin out to twigs. w0/w1 are
// the widths at each end, in the same percentage units as the points.
const T = TREE_POINTS;
export const TREE_SEGMENTS = [
  { a: T.vocabulary, b: T.merge,     w0: 7.5, w1: 11 },
  { a: T.grammar,    b: T.merge,     w0: 7.5, w1: 11 },
  { a: T.merge,      b: T.fork,      w0: 11,  w1: 8 },
  { a: T.fork,       b: T.boughL,    w0: 8,   w1: 5 },
  { a: T.fork,       b: T.boughR,    w0: 8,   w1: 5 },
  { a: T.boughL,     b: T.listening, w0: 5,   w1: 1.9 },
  { a: T.boughL,     b: T.reading,   w0: 5,   w1: 1.9 },
  { a: T.boughR,     b: T.writing,   w0: 5,   w1: 1.9 },
  { a: T.boughR,     b: T.speaking,  w0: 5,   w1: 1.9 },
];

// Circles that round off the width change where segments meet, so joints
// read as organic forks rather than butted-together quads.
export const TREE_JOINTS = [
  { p: T.merge,  r: 5.4 },
  { p: T.fork,   r: 3.9 },
  { p: T.boughL, r: 2.5 },
  { p: T.boughR, r: 2.5 },
];

// The tapered quad for one segment: offset both ends perpendicular to the
// segment by half their width and close the shape.
export function taperPath(seg) {
  const dx = seg.b.x - seg.a.x, dy = seg.b.y - seg.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const a1 = { x: seg.a.x + px * seg.w0 / 2, y: seg.a.y + py * seg.w0 / 2 };
  const b1 = { x: seg.b.x + px * seg.w1 / 2, y: seg.b.y + py * seg.w1 / 2 };
  const b2 = { x: seg.b.x - px * seg.w1 / 2, y: seg.b.y - py * seg.w1 / 2 };
  const a2 = { x: seg.a.x - px * seg.w0 / 2, y: seg.a.y - py * seg.w0 / 2 };
  return `M ${a1.x} ${a1.y} L ${b1.x} ${b1.y} L ${b2.x} ${b2.y} L ${a2.x} ${a2.y} Z`;
}

// One CONTINUOUS polyline per root->leaf pathway (root, merge, fork, bough,
// leaf), not a chain of per-branch segments. That is the whole point: the
// hover glow is revealed along a single path so it sweeps the full distance
// in one unbroken motion. Drawing it as separate segments with staggered
// start delays is what made an earlier pass read as blocky/stepped.
//
// `dur` is derived from each route's own measured length at one shared
// speed, so every route travels at the same visual pace and the longer
// branches simply arrive later — the sequencing is physical rather than a
// hand-authored stagger.
const TREE_SPEED = 70; // percentage-units per second
const BOUGH_OF = { listening: "boughL", reading: "boughL", writing: "boughR", speaking: "boughR" };

export const TREE_ROUTES = ["vocabulary", "grammar"].flatMap((root) =>
  ["listening", "reading", "writing", "speaking"].map((leaf) => {
    const pts = [T[root], T.merge, T.fork, T[BOUGH_OF[leaf]], T[leaf]];
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return { id: `${root}-${leaf}`, root, leaf, d, dur: +(len / TREE_SPEED).toFixed(3) };
  })
);

// Which routes light up for a given hovered/open skill. Hovering a root
// sends its glow out to all four leaves; hovering a leaf lights the one
// path back to it from BOTH roots. Either way every route is drawn from a
// root outward — a leaf never flows backward into the trunk.
export function routesFor(skillId) {
  if (!skillId) return [];
  return TREE_ROUTES.filter((r) => r.root === skillId || r.leaf === skillId);
}

export const PULSE_PHASES = [
  { begin: 0, r: 3.0, fo: 0.95 },
  { begin: 0.55, r: 2.2, fo: 0.55 },
  { begin: 1.1, r: 1.5, fo: 0.3 },
];