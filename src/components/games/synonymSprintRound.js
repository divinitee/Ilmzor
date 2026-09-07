import { shuffle } from "@/lib/vocabGameUtils";
import { sprintSynonymForLevel, translationClue } from "@/lib/synonymTiers";

// Pure round builder for Synonym Sprint — no network, no React, so the
// distractor rules are testable on their own (same split as
// contextGuessRound.js and definitionMatchBoard.js).
//
// One question = one word shown ALONE (no context sentence — Tee's spec is
// "show the word, pick the synonym") plus four options that are all synonyms
// at the student's own tier: an A2 student chooses between four A2-register
// words, a C1 student between four C1-register words. Same-tier distractors
// are what stop "spot the fancy one" from working as a strategy.
//
// Starter/A1 read the A2 rung here (see sprintSynonymForLevel) rather than
// Context Guess's translation clue.

export const OPTION_COUNT = 4;

// Wrong options: same-tier synonyms belonging to other words, preferring the
// target's own CEFR band at the higher tiers so the four options sit close
// together. Mirrors contextGuessRound.js's pickDistractors, minus the
// translation mode it no longer needs.
function pickDistractors({ target, pool, level, correct, n }) {
  const used = new Set([correct.toLowerCase(), String(target.english || "").toLowerCase()]);
  const wantClose = level === "B2" || level === "C1";
  const ordered = wantClose
    ? shuffle(pool).sort((a, b) => (a?.cefr === target?.cefr ? 0 : 1) - (b?.cefr === target?.cefr ? 0 : 1))
    : shuffle(pool);
  const out = [];
  for (const w of ordered) {
    if (w.english === target.english) continue;
    const syn = sprintSynonymForLevel(w, level);
    if (!syn || used.has(syn.toLowerCase())) continue;
    used.add(syn.toLowerCase());
    out.push(syn);
    if (out.length >= n) break;
  }
  return out;
}

export function buildQuestions({ chosen = [], pool = [], level, lang }) {
  const out = [];
  for (const w of chosen) {
    const correct = sprintSynonymForLevel(w, level);
    if (!correct) continue;
    const distractors = pickDistractors({ target: w, pool, level, correct, n: OPTION_COUNT - 1 });
    // Fewer than two wrong options isn't a question — skip rather than show a
    // giveaway.
    if (distractors.length < 2) continue;
    out.push({
      id: `${w.english}-${out.length}`,
      word: w.english,
      wordId: w.id,
      provenance: w._provenance,
      pronunciation: w.pronunciation,
      translation: translationClue(w, lang),
      correct,
      options: shuffle([correct, ...distractors]),
    });
  }
  return out;
}