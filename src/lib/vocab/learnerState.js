import { base44 } from "@/api/base44Client";
import { normalizeLemma } from "@/lib/vocab/lemma";

// Per-learner, per-word state: exposure, recognition, recall, usage, mistakes,
// weakness, mastery. Learner state never touches VocabularyWord — mastery is
// personal, and a field on the shared record would be wrong for everyone but
// one person.
//
// WordAttempt stays the immutable ledger and is not migrated. LearnerWordState
// is its rolling summary, which exists because WordAttempt is read on the hot
// path with a hard 150-row limit and cannot answer "is this word mastered" for
// a learner with thousands of attempts. Every field here is recomputable from
// WordAttempt, so the mastery rule below can be retuned without a migration.

// Which kind of evidence a game produces. Recognition (the answer is on
// screen) is strictly weaker than recall (produce from memory), which is weaker
// than usage (use it in context) — so they are counted separately and mastery
// requires more than one of them.
export const MODE = { RECOGNITION: "recognition", RECALL: "recall", USAGE: "usage" };

export const GAME_MODE = {
  memory_flip: MODE.RECOGNITION,
  picture_match: MODE.RECOGNITION,
  definition_match: MODE.RECOGNITION,
  context_guess: MODE.RECOGNITION,
  synonym_sprint: MODE.RECOGNITION,
  odd_one_out: MODE.RECOGNITION,
  related_words: MODE.RECOGNITION,
  connection_challenge: MODE.RECOGNITION,
  wordforms: MODE.RECOGNITION,
  quiz: MODE.RECALL,
  spelling: MODE.RECALL,
  crossword: MODE.RECALL,
  usage: MODE.USAGE,
  definition: MODE.USAGE,
  sentence: MODE.USAGE,
};

export const modeForGame = (game) => GAME_MODE[game] || MODE.RECOGNITION;

// Mastery thresholds. Deliberately conservative: recognising a word three times
// is not command of it, so mastery needs sustained accuracy AND at least one
// non-recognition success once the learner has had the chance to produce it.
export const MASTERY = {
  MIN_CORRECT: 3,
  MIN_STREAK: 2,
  MIN_ACCURACY: 0.75,
};

export const MASTERY_STATE = { NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", MASTERED: "mastered" };

const totals = (s) => {
  const attempts = (s.recognition_attempts || 0) + (s.recall_attempts || 0) + (s.usage_attempts || 0);
  const correct = (s.recognition_correct || 0) + (s.recall_correct || 0) + (s.usage_correct || 0);
  return { attempts, correct };
};

// The three-state model, computed — never set by hand.
export function masteryFor(state = {}) {
  const { attempts, correct } = totals(state);
  if (attempts === 0 && !(state.exposures > 0)) return MASTERY_STATE.NOT_STARTED;
  if (attempts === 0) return MASTERY_STATE.IN_PROGRESS;
  const accuracy = correct / attempts;
  const producedIt = (state.recall_correct || 0) + (state.usage_correct || 0) > 0;
  const everProduced = (state.recall_attempts || 0) + (state.usage_attempts || 0) > 0;
  const mastered =
    correct >= MASTERY.MIN_CORRECT &&
    (state.correct_streak || 0) >= MASTERY.MIN_STREAK &&
    accuracy >= MASTERY.MIN_ACCURACY &&
    (producedIt || !everProduced);
  return mastered ? MASTERY_STATE.MASTERED : MASTERY_STATE.IN_PROGRESS;
}

// 0-1 how much this word needs work. A number, not a flag, because a
// 10,000-word backlog has to be ordered rather than merely filtered.
export function weaknessFor(state = {}, now = Date.now()) {
  const { attempts, correct } = totals(state);
  if (attempts === 0) return state.exposures > 0 ? 0.5 : 0;
  const errorRate = 1 - correct / attempts;
  const streakPenalty = Math.min(1, (state.wrong_streak || 0) / 3);
  const wrongAt = Date.parse(state.last_wrong_at || "");
  const recency = Number.isNaN(wrongAt) ? 0 : Math.max(0, 1 - (now - wrongAt) / (14 * 24 * 3600 * 1000));
  const modeGap = (state.recall_attempts || 0) + (state.usage_attempts || 0) === 0 ? 0.15 : 0;
  return Math.max(0, Math.min(1, errorRate * 0.5 + streakPenalty * 0.25 + recency * 0.2 + modeGap));
}

// Fold one attempt into a state object. Pure, so the same function derives a
// live update and a full rebuild from WordAttempt history.
export function applyAttempt(state, { correct, game, level, at } = {}) {
  const next = { ...state };
  const mode = modeForGame(game);
  const stamp = at || new Date().toISOString();
  next.exposures = (next.exposures || 0) + 1;
  next[`${mode}_attempts`] = (next[`${mode}_attempts`] || 0) + 1;
  if (correct) {
    next[`${mode}_correct`] = (next[`${mode}_correct`] || 0) + 1;
    next.correct_streak = (next.correct_streak || 0) + 1;
    next.wrong_streak = 0;
    next.last_correct_at = stamp;
  } else {
    next.wrong_streak = (next.wrong_streak || 0) + 1;
    next.correct_streak = 0;
    next.last_wrong_at = stamp;
  }
  next.last_seen_at = stamp;
  if (game) next.last_game = game;
  if (level) next.level_at_last_attempt = level;
  next.mastery = masteryFor(next);
  next.weakness_score = Number(weaknessFor(next).toFixed(3));
  return next;
}

// Rebuild states from raw WordAttempt rows — the compatibility path for a
// learner with months of existing history and no LearnerWordState rows. Rows
// must be passed oldest-first for streaks to be meaningful.
export function rebuildFromAttempts(attempts = [], { userEmail } = {}) {
  const byLemma = new Map();
  for (const a of attempts) {
    const lemma = normalizeLemma(a?.word);
    if (!lemma) continue;
    const base = byLemma.get(lemma) || { user_email: userEmail, lemma_key: lemma, word_id: a.word_id || undefined };
    byLemma.set(lemma, applyAttempt(base, { correct: a.correct, game: a.game, level: a.level, at: a.created_date }));
  }
  return [...byLemma.values()];
}

export const indexStates = (rows = []) =>
  new Map(rows.filter((r) => r?.lemma_key).map((r) => [normalizeLemma(r.lemma_key), r]));

// Read this learner's states. Bounded by the words they have actually met, not
// by the corpus — so it costs the same at 2,282 and 10,000+ words.
export async function loadStates(userEmail) {
  if (!userEmail) return [];
  return base44.entities.LearnerWordState.filter({ user_email: userEmail }, "-weakness_score").catch((e) => {
    console.error("LearnerWordState read failed", e);
    return [];
  });
}

// Fold a finished round's items into LearnerWordState. Fire-and-forget, exactly
// like logWordAttempts() in roundComposition.js: a failed write costs a
// statistic, never the round. WordAttempt logging is unchanged and remains the
// ledger this can always be rebuilt from.
export async function recordRound({ userEmail, game, level, items = [] } = {}) {
  if (!userEmail || items.length === 0) return;
  const lemmas = [...new Set(items.map((i) => normalizeLemma(i.word)).filter(Boolean))];
  const existing = await base44.entities.LearnerWordState
    .filter({ user_email: userEmail })
    .catch(() => []);
  const byLemma = indexStates(existing);

  await Promise.all(
    lemmas.map(async (lemma) => {
      const own = items.filter((i) => normalizeLemma(i.word) === lemma);
      let state = byLemma.get(lemma) || { user_email: userEmail, lemma_key: lemma, word_id: own[0]?.wordId || undefined };
      for (const item of own) state = applyAttempt(state, { correct: item.correct, game, level });
      const { id, created_date, updated_date, created_by_id, ...payload } = state;
      try {
        if (id) await base44.entities.LearnerWordState.update(id, payload);
        else await base44.entities.LearnerWordState.create(payload);
      } catch (e) {
        console.error("LearnerWordState write failed", e);
      }
    })
  );
}