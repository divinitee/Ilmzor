import { base44 } from "@/api/base44Client";
import { shuffle } from "@/lib/vocabGameUtils";

// ---------------------------------------------------------------------------
// Layer 4.2 of claude/ilmzor-game-template.md — identical round-composition
// recipe for every migrated game, so "personalized" means the same thing
// everywhere instead of each engine inventing its own priorities:
//
//   ~40% words this student previously got wrong (WordAttempt, recent first)
//   ~20% words they saved (SavedWord — the My Words store, read by no game
//        before this)
//   ~40% fresh words from their band
//
// Degrades gracefully: a brand-new student has no attempts and no saves, so
// their round is 100% fresh — identical to pre-personalization behaviour.
// Never an empty or short round, following the same degradation principle
// wordsForLevel already uses for unbanded words.
//
// `words` is expected to already be this student's band — the same
// convention every engine follows today (SkillHub passes wordsForLevel's
// output as the `words` prop). This module does not re-filter by band.
// ---------------------------------------------------------------------------

const WRONG_SHARE = 0.4;
const SAVED_SHARE = 0.2;

// WordAttempt grows roughly one row per item per round — always query
// bounded, never list() unbounded (see the entity's own schema description
// and the existing unbounded-read failure mode elsewhere in this codebase).
const ATTEMPT_QUERY_LIMIT = 150;

export const PROVENANCE = { WRONG: "wrong", SAVED: "saved", FRESH: "fresh" };

export async function fetchPersonalizationSignals(userEmail) {
  if (!userEmail) return { previouslyWrong: [], saved: [] };
  const [previouslyWrong, saved] = await Promise.all([
    base44.entities.WordAttempt
      .filter({ user_email: userEmail, correct: false }, "-created_date", ATTEMPT_QUERY_LIMIT)
      .catch((e) => { console.error("WordAttempt read failed", e); return []; }),
    base44.entities.SavedWord
      .filter({ user_email: userEmail }, "-saved_at")
      .catch((e) => { console.error("SavedWord read failed", e); return []; }),
  ]);
  return { previouslyWrong, saved };
}

function tag(list, provenance) {
  return list.map((w) => ({ ...w, _provenance: provenance }));
}

function dedupeByEnglish(list) {
  const seen = new Set();
  const out = [];
  for (const w of list) {
    if (!w || !w.english || seen.has(w.english)) continue;
    seen.add(w.english);
    out.push(w);
  }
  return out;
}

// Pure — no network — so it's independently testable and reusable by
// anything that already has signals in hand.
export function composeRound({ words = [], signals = {}, count }) {
  const pool = words.filter((w) => w && w.english);
  const byEnglish = new Map(pool.map((w) => [w.english, w]));

  const wrongTarget = Math.round(count * WRONG_SHARE);
  const savedTarget = Math.round(count * SAVED_SHARE);

  const wrongWords = dedupeByEnglish(
    (signals.previouslyWrong || []).map((a) => byEnglish.get(a.word)).filter(Boolean)
  ).slice(0, wrongTarget);

  const used = new Set(wrongWords.map((w) => w.english));
  const savedWords = dedupeByEnglish(
    (signals.saved || []).map((s) => byEnglish.get(s.word)).filter((w) => w && !used.has(w.english))
  ).slice(0, savedTarget);
  savedWords.forEach((w) => used.add(w.english));

  const freshNeeded = Math.max(0, count - wrongWords.length - savedWords.length);
  const freshWords = shuffle(pool.filter((w) => !used.has(w.english))).slice(0, freshNeeded);

  let combined = [
    ...tag(wrongWords, PROVENANCE.WRONG),
    ...tag(savedWords, PROVENANCE.SAVED),
    ...tag(freshWords, PROVENANCE.FRESH),
  ];

  // Never a short round: top up from anything unused if one bucket ran thin
  // (e.g. a brand-new saver with 0 saved words).
  if (combined.length < count) {
    const usedAll = new Set(combined.map((w) => w.english));
    const topUp = shuffle(pool.filter((w) => !usedAll.has(w.english))).slice(0, count - combined.length);
    combined = [...combined, ...tag(topUp, PROVENANCE.FRESH)];
  }

  return shuffle(combined);
}

// Convenience wrapper: fetch signals + compose in one call.
export async function buildPersonalizedRound({ words, userEmail, count }) {
  const signals = await fetchPersonalizationSignals(userEmail);
  return composeRound({ words, signals, count });
}

// Fire-and-forget WordAttempt logging, matching syncGameResultToServer's
// pattern (a failed write costs history, never the round). Callers own the
// positive-signal-only rule for matching games (see WordAttempt's schema
// description and Layer 4.1 of the template) — pass only the items that
// should actually be logged; for Memory Flip that means found pairs only,
// never mismatches.
export async function logWordAttempts({ userEmail, game, level, roundId, items = [] }) {
  if (!userEmail || !items.length) return;
  await Promise.all(
    items.map(({ word, wordId, correct }) =>
      base44.entities.WordAttempt.create({
        user_email: userEmail,
        word,
        word_id: wordId,
        game,
        correct: !!correct,
        level,
        round_id: roundId,
      }).catch((e) => console.error("WordAttempt write failed", e))
    )
  );
}
