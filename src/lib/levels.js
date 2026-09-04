import { GATES, STARTER_LEVEL } from "@/lib/placementContent";

// ---------------------------------------------------------------------------
// The single source of truth for the CEFR level system.
//
// GATES is the placement test's own ordered list of CEFR gates and
// STARTER_LEVEL sits below the first one, for a student who can't clear A1.
// Both are re-exported from placementContent rather than redeclared here — a
// second level vocabulary is exactly the kind of drift that breaks silently.
// ---------------------------------------------------------------------------

export { STARTER_LEVEL };

// Starter, A1, A2, B1, B2, C1
export const LEVELS = [STARTER_LEVEL, ...GATES];

// Where accounts that predate the level system land. B1 is the app's
// historical implicit default: every game already falls back to
// difficulty "intermediate", so B1 is effectively what existing students have
// been playing at all along. Defaulting them to Starter would lock working
// students out of games they used yesterday.
export const DEFAULT_LEVEL = "B1";

export const levelIndex = (level) => {
  const i = LEVELS.indexOf(level);
  return i === -1 ? LEVELS.indexOf(DEFAULT_LEVEL) : i;
};

// Read a level off a User record, tolerating the pre-level-system state (no
// field at all) without ever returning undefined.
export const levelOf = (user) =>
  LEVELS.includes(user?.cefr_level) ? user.cefr_level : DEFAULT_LEVEL;

export const isKnownLevel = (level) => LEVELS.includes(level);

// ---------------------------------------------------------------------------
// Word-pool banding
// ---------------------------------------------------------------------------

// Skill Hub is consolidation — it's where a student gets fluent with what they
// already half-know. New, harder material is the Learning Path's job, and
// keeping that line sharp is part of what makes the two tiers worth different
// money. These two numbers are the entire policy: set BANDS_ABOVE to 1 for a
// comprehensible-input "i+1" pool instead.
export const BANDS_BELOW = 1;
export const BANDS_ABOVE = 0;

// A game needs a pool big enough to build rounds from (4 MCQ options,
// ~10 crossword entries, 8 memory pairs). Below this we top up rather than
// hand a game an unplayable pool.
export const MIN_POOL = 40;

// The CEFR bands a student at `level` should draw words from.
// VocabularyWord.cefr is only ever A1..C1 — there is no "Starter" band — so a
// Starter student reads as A1 here.
export function bandForLevel(level) {
  const anchor = level === STARTER_LEVEL ? 0 : Math.max(0, GATES.indexOf(level));
  const lo = Math.max(0, anchor - BANDS_BELOW);
  const hi = Math.min(GATES.length - 1, anchor + BANDS_ABOVE);
  return GATES.slice(lo, hi + 1);
}

// Filter a word list to a student's band.
//
// Words with no `cefr` yet are kept as a top-up rather than dropped: the
// enrichment batch runs over ~2,400 rows, and a half-finished or abandoned
// pass has to degrade to today's behaviour, never to an empty game.
export function wordsForLevel(words = [], level) {
  const band = bandForLevel(level);
  const inBand = [];
  const unbanded = [];
  words.forEach((w) => {
    if (!w) return;
    if (w.cefr && band.includes(w.cefr)) inBand.push(w);
    else if (!w.cefr) unbanded.push(w);
  });
  return inBand.length >= MIN_POOL ? inBand : [...inBand, ...unbanded];
}

// ---------------------------------------------------------------------------
// Game-mode unlocking
// ---------------------------------------------------------------------------

// Which level each game becomes playable at. Recognition games are open from
// the start; the AI-graded production games sit at B1+, which also stops
// beginners spending AI credits on rounds they were always going to fail.
export const GAME_MIN_LEVEL = {
  memory_flip: STARTER_LEVEL,
  picture_match: STARTER_LEVEL,
  spelling: STARTER_LEVEL,
  quiz: STARTER_LEVEL,
  definition_match: "A1",
  odd_one_out: "A2",
  context_guess: "A2",
  wordforms: "B1",
  crossword: "B1",
  definition: "B1",
  sentence: "B1",
  // GrammarQuizGame is one component over eight banks at very different
  // levels, so it bands per bank below rather than per game.
  grammar: STARTER_LEVEL,
};

export const GRAMMAR_BANK_MIN_LEVEL = {
  verb_tenses: "A1",
  articles: "A1",
  prepositions: "A2",
  punctuation: "A2",
  question_formation: "A2",
  active_passive: "B1",
  conditionals: "B1",
  reported_speech: "B2",
};

export function minLevelFor(game, bank) {
  if (game === "grammar" && bank) return GRAMMAR_BANK_MIN_LEVEL[bank] || STARTER_LEVEL;
  return GAME_MIN_LEVEL[game] || STARTER_LEVEL;
}

export function isGameUnlocked(game, bank, level) {
  return levelIndex(level) >= levelIndex(minLevelFor(game, bank));
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

const DIFF_ORDER = ["beginner", "intermediate", "advanced"];

// The baseline intensity a student plays at. This is the knob every game
// already reads through its own DIFF_CONFIG (word counts, timers).
export function difficultyForLevel(level) {
  const i = levelIndex(level);
  if (i <= 1) return "beginner";      // Starter, A1
  if (i <= 3) return "intermediate";  // A2, B1
  return "advanced";                  // B2, C1
}

// A challenge's own Easy/Medium/Hard label now nudges one step either side of
// that baseline, so a category still offers a gentler and a stretchier node
// instead of three identical ones — and "Hard" finally means hard *for this
// student*, rather than "third in the array", which is what [i % 3] meant.
export function difficultyFor(level, challengeDifficulty) {
  const base = DIFF_ORDER.indexOf(difficultyForLevel(level));
  const nudge = challengeDifficulty === "Easy" ? -1 : challengeDifficulty === "Hard" ? 1 : 0;
  return DIFF_ORDER[Math.min(DIFF_ORDER.length - 1, Math.max(0, base + nudge))];
}

// ---------------------------------------------------------------------------
// Hint pricing
// ---------------------------------------------------------------------------

// The support-language translation is always one tap away and never blocked.
// What changes is XP: full for solving from the English definition, reduced
// for revealing the translation — free at Starter/A1 so new students aren't
// taxed for needing support, phasing in from A2 up.
//
// Presented in the UI as a bonus for going English-only, never as a penalty.
// Same principle that killed the guilt-trip version of the Lesson Runner's
// Help nudge: support is offered, not charged for shamefully.
export const HINT_XP_MULTIPLIER = {
  [STARTER_LEVEL]: 1,
  A1: 1,
  A2: 0.8,
  B1: 0.6,
  B2: 0.5,
  C1: 0.4,
};

export const hintXpMultiplier = (level) =>
  HINT_XP_MULTIPLIER[isKnownLevel(level) ? level : DEFAULT_LEVEL];

// ---------------------------------------------------------------------------
// Silent calibration (counters live on User.cal_up / User.cal_down)
// ---------------------------------------------------------------------------

// A round at or above CAL_UP_SCORE moves cal_up; at or below CAL_DOWN_SCORE
// moves cal_down; anything between decays both toward zero. Hitting a
// threshold *proposes* a level change — the measurement is silent, the result
// is announced with an undo. Because locked game modes are visible, a level
// that silently rearranged the stage would read as a bug, not a reward.
export const CAL_UP_SCORE = 90;
export const CAL_DOWN_SCORE = 40;
export const CAL_PROMOTE_AT = 5;
export const CAL_DEMOTE_AT = 5;

export const nextLevelUp = (level) =>
  LEVELS[Math.min(LEVELS.length - 1, levelIndex(level) + 1)];

export const nextLevelDown = (level) =>
  LEVELS[Math.max(0, levelIndex(level) - 1)];
