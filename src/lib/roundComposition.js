import { base44 } from "@/api/base44Client";
import { shuffle } from "@/lib/vocabGameUtils";

// ---------------------------------------------------------------------------
// Layer 4.2 of claude/virora-game-template.md — identical round-composition
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
const SAVED_QUERY_LIMIT = 150;

// Shared-engine defect fix (2026-09-20): the original fetchPersonalizationSignals
// had per-call .catch() guards for a *rejected* request, but nothing guarded
// against a request that simply never resolves (a hang under rate limiting —
// exactly the failure mode UsageGame's startRound comment described when it
// opted out of buildPersonalizedRound entirely and fell back to a plain
// shuffle). A hang inside Promise.all blocks the round from ever starting,
// with no error to catch. SIGNAL_TIMEOUT_MS bounds every signal fetch so a
// slow/stuck request degrades to "no signal" (same as a brand-new student)
// instead of hanging the round — this is what makes it safe for every game,
// including Usage, to call buildPersonalizedRound without a local workaround.
const SIGNAL_TIMEOUT_MS = 3500;

function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);
    promise.then(
      (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } },
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(fallback); } }
    );
  });
}

export const PROVENANCE = { WRONG: "wrong", SAVED: "saved", FRESH: "fresh" };

export async function fetchPersonalizationSignals(userEmail) {
  if (!userEmail) return { previouslyWrong: [], saved: [] };
  const [previouslyWrong, saved] = await Promise.all([
    withTimeout(
      base44.entities.WordAttempt
        .filter({ user_email: userEmail, correct: false }, "-created_date", ATTEMPT_QUERY_LIMIT)
        .catch((e) => { console.error("WordAttempt read failed", e); return []; }),
      SIGNAL_TIMEOUT_MS,
      []
    ),
    withTimeout(
      base44.entities.SavedWord
        .filter({ user_email: userEmail }, "-saved_at", SAVED_QUERY_LIMIT)
        .catch((e) => { console.error("SavedWord read failed", e); return []; }),
      SIGNAL_TIMEOUT_MS,
      []
    ),
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

// Prefer stable row identity. Fall back to the legacy displayed word only
// when it maps to exactly one row in this learner's pool; never guess between
// duplicate headwords/senses.
function resolveSignalWord(signal, byId, byEnglish) {
  if (signal?.word_id && byId.has(signal.word_id)) return byId.get(signal.word_id);
  const matches = byEnglish.get(signal?.word) || [];
  return matches.length === 1 ? matches[0] : null;
}

// Pure — no network — so it's independently testable and reusable by
// anything that already has signals in hand.
export function composeRound({ words = [], signals = {}, count }) {
  const pool = words.filter((w) => w && w.english);
  const byId = new Map(pool.filter((w) => w.id).map((w) => [w.id, w]));
  const byEnglish = new Map();
  for (const word of pool) {
    const rows = byEnglish.get(word.english) || [];
    rows.push(word);
    byEnglish.set(word.english, rows);
  }

  const wrongTarget = Math.round(count * WRONG_SHARE);
  const savedTarget = Math.round(count * SAVED_SHARE);

  const wrongWords = dedupeByEnglish(
    (signals.previouslyWrong || []).map((a) => resolveSignalWord(a, byId, byEnglish)).filter(Boolean)
  ).slice(0, wrongTarget);

  const used = new Set(wrongWords.map((w) => w.english));
  const savedWords = dedupeByEnglish(
    (signals.saved || []).map((s) => resolveSignalWord(s, byId, byEnglish)).filter((w) => w && !used.has(w.english))
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

// ---------------------------------------------------------------------------
// Bank-round review — the same "previously-wrong words come back" idea as
// composeRound above, but for games whose content is a hand-authored fixed
// bank (OddOneOutGame, RelatedWordsGame, WordFormsGame, Usage's fixed-bank
// modes) rather than the VocabularyWord corpus.
//
// These banks don't map onto VocabularyWord rows — no word_id, often not
// even matching casing (see OddOneOutGame's own comment) — so composeRound's
// id/english resolution doesn't apply and there is no SavedWord signal (none
// of these games expose a "save" affordance). What they DO already have is a
// real signal that was being captured and thrown away: every one of them
// already calls logWordAttempts with `word` set to the bank entry's own
// identity string (entry.target / entry.base / entry.root / entry.correct —
// whichever the game already treats as that item's WordAttempt.word). That
// string is exactly what a caller's `keyFn` extracts from a pool entry here,
// so "has this student gotten this entry wrong recently" is answerable with
// no schema change and no new write path.
//
// composeBankRound is pure (no network) so it's independently testable, same
// as composeRound. fetchWrongEntryWords does the (timeout-guarded) fetch.
// ---------------------------------------------------------------------------

const WRONG_ENTRY_QUERY_LIMIT = 150;

// Bounded, most-recent-first, timeout-guarded (see withTimeout above) — same
// discipline as fetchPersonalizationSignals. Returns plain word strings in
// recency order (a student's most recent miss should be the first thing
// prioritized for review).
export async function fetchWrongEntryWords(userEmail, game, limit = WRONG_ENTRY_QUERY_LIMIT) {
  if (!userEmail || !game) return [];
  const rows = await withTimeout(
    base44.entities.WordAttempt
      .filter({ user_email: userEmail, game, correct: false }, "-created_date", limit)
      .catch((e) => { console.error("WordAttempt read failed", e); return []; }),
    SIGNAL_TIMEOUT_MS,
    []
  );
  return (rows || []).map((r) => r.word).filter(Boolean);
}

// Pure. `pool` is the full fixed bank (or, for RelatedWordsGame, the list of
// category names — any array of entries `keyFn` can turn into a stable
// identity string). `wrongWords` is fetchWrongEntryWords's output: recent-
// first, may contain duplicates or keys no longer in `pool`. Same shape as
// composeRound: dedupe by key, fill a WRONG_SHARE-sized bucket first (in
// recency order, most recent miss first), then top up with a shuffled fresh
// remainder, and never return short.
export function composeBankRound({ pool = [], keyFn, wrongWords = [], count, wrongShare = WRONG_SHARE }) {
  const byKey = new Map();
  for (const entry of pool) {
    const k = entry && keyFn(entry);
    if (!k || byKey.has(k)) continue; // first occurrence wins identity
    byKey.set(k, entry);
  }

  const wrongTarget = Math.round(count * wrongShare);
  const usedKeys = new Set();
  const wrongPicked = [];
  for (const w of wrongWords) {
    if (wrongPicked.length >= wrongTarget) break;
    if (!w || usedKeys.has(w) || !byKey.has(w)) continue;
    usedKeys.add(w);
    wrongPicked.push(byKey.get(w));
  }

  const freshPool = [...byKey.entries()].filter(([k]) => !usedKeys.has(k)).map(([, e]) => e);
  const freshNeeded = Math.max(0, count - wrongPicked.length);
  const freshPicked = shuffle(freshPool).slice(0, freshNeeded);
  freshPicked.forEach((e) => usedKeys.add(keyFn(e)));

  let combined = [
    ...tag(wrongPicked, PROVENANCE.WRONG),
    ...tag(freshPicked, PROVENANCE.FRESH),
  ];

  // Never a short round — top up from anything unused if the bank itself is
  // smaller than `count` after dedup (mirrors composeRound's own top-up).
  if (combined.length < count) {
    const topUpPool = [...byKey.entries()].filter(([k]) => !usedKeys.has(k)).map(([, e]) => e);
    const topUp = shuffle(topUpPool).slice(0, count - combined.length);
    combined = [...combined, ...tag(topUp, PROVENANCE.FRESH)];
  }

  return shuffle(combined);
}

// Convenience wrapper: fetch wrong-entry signal + compose in one call.
export async function buildBankRound({ pool, keyFn, userEmail, game, count, wrongShare }) {
  const wrongWords = await fetchWrongEntryWords(userEmail, game);
  return composeBankRound({ pool, keyFn, wrongWords, count, wrongShare });
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
