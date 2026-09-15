import { normalizeLemma } from "@/lib/vocab/lemma";
import { MASTERY_STATE, indexStates } from "@/lib/vocab/learnerState";
import { THEME_STATUS, isThemeUnlocked, poolForTheme, composeThemedSelection } from "@/lib/vocab/curriculum";
import { shuffle } from "@/lib/vocabGameUtils";

// The adaptive layer: what should this learner practise next.
//
// Pure functions over structures the other modules produce, so the selection
// policy is testable in node and can be tuned without touching a game.
//
// It does NOT replace roundComposition.js. That module's recipe (~40%
// previously-wrong, ~20% saved, ~40% fresh) is what every migrated game runs
// today and keeps running. This is the layer above it: it decides WHICH THEME
// and WHICH WORDS are in scope, then hands a pool down. With no published
// themes it returns a band-pool plan, which is exactly today's behaviour.

// Priority order for a themed round. Weakness first, because a word missed
// twice must come back soon; then unseen core words, which is how a theme
// actually advances; then anything already mastered, for spaced reinforcement.
export const PRIORITY = { WEAK: "weak", NEW: "new", REVIEW: "review" };

const WEAK_SHARE = 0.4;
const NEW_SHARE = 0.4;

// Rank the words of a pool into the three priority buckets using learner state.
export function bucketByPriority({ words = [], states } = {}) {
  const index = states instanceof Map ? states : indexStates(states || []);
  const weak = [];
  const fresh = [];
  const review = [];
  for (const w of words) {
    const state = index.get(normalizeLemma(w?.english));
    if (!state || state.mastery === MASTERY_STATE.NOT_STARTED) fresh.push(w);
    else if (state.mastery === MASTERY_STATE.MASTERED) review.push(w);
    else weak.push({ w, score: state.weakness_score || 0 });
  }
  weak.sort((a, b) => b.score - a.score);
  return { weak: weak.map((x) => x.w), fresh, review };
}

// Compose one round's words from those buckets. Never short: if a bucket runs
// thin the remainder is topped up from whatever is left, the same degradation
// contract composeRound() and composeThemedSelection() both follow.
export function selectPractice({ words = [], states, count = 8 } = {}) {
  const { weak, fresh, review } = bucketByPriority({ words, states });
  const picked = [];
  const seen = new Set();
  const take = (list, n) => {
    for (const w of list) {
      if (picked.length >= count || n <= 0) break;
      const lemma = normalizeLemma(w?.english);
      if (!lemma || seen.has(lemma)) continue;
      seen.add(lemma);
      picked.push(w);
      n -= 1;
    }
  };
  take(weak, Math.round(count * WEAK_SHARE));
  take(shuffle(fresh), Math.round(count * NEW_SHARE));
  take(shuffle(review), count - picked.length);
  take(shuffle([...weak, ...fresh, ...review]), count - picked.length);
  return picked;
}

// The theme a learner should be working in: the first unlocked, unmastered
// theme in progression order, preferring one already started so the app resumes
// rather than restarts. Returns null when there is no published curriculum —
// the current state, and the signal to fall back to the CEFR band pool.
export function nextTheme({ curriculum, progressRows = [] } = {}) {
  if (!curriculum?.themes?.length) return null;
  const byKey = new Map(progressRows.filter((p) => p?.theme_key).map((p) => [p.theme_key, p]));
  const open = curriculum.themes.filter(
    (t) => isThemeUnlocked(t, byKey) && byKey.get(t.key)?.status !== THEME_STATUS.MASTERED
  );
  return open.find((t) => byKey.get(t.key)?.status === THEME_STATUS.IN_PROGRESS) || open[0] || null;
}

// The whole decision in one call: which theme, which words, and why.
//
// `bandWords` is the pool the caller already has (SkillHub's wordsForLevel
// output today). When no curriculum is published, or the chosen theme's pool
// degrades below the playable floor, that pool is what comes back — so this
// function can be adopted by a game before a single theme exists without
// changing what the game receives.
export function planPractice({ curriculum, progressRows = [], states, index, level, bandWords = [], count = 8 } = {}) {
  const theme = nextTheme({ curriculum, progressRows });
  if (!theme) {
    return { theme: null, reason: "no_curriculum", words: selectPractice({ words: bandWords, states, count }), pool: bandWords };
  }

  const pool = poolForTheme({ curriculum, themeKey: theme.key, index, level });
  if (!pool.words.length) {
    return { theme, reason: "empty_theme_pool", words: selectPractice({ words: bandWords, states, count }), pool: bandWords };
  }

  // Theme scope first, learner state second: compose the themed selection
  // (which honours the recycle share), then order it by what needs work.
  const themed = composeThemedSelection({ pool, count: Math.max(count * 2, count) });
  const words = selectPractice({ words: themed.length ? themed : pool.words, states, count });
  return { theme, reason: pool.degraded ? "theme_pool_degraded" : "theme", words, pool: pool.words, sources: pool.sources };
}