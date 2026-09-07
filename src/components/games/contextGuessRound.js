import { shuffle } from "@/lib/vocabGameUtils";
import { clueForLevel, usesTranslationClue, translationClue } from "@/lib/synonymTiers";
import { getEmoji } from "@/lib/wordEmoji";

// Pure round builder for Context Guess — no network, no React, so the
// distractor rules are testable on their own (same split as
// definitionMatchBoard.js).
//
// One question = one word shown inside its own example sentence, plus four
// options that ARE the level's clue type: support-language translations at
// Starter/A1, tier-appropriate synonyms at A2+. Distractors are other words'
// clues at the SAME tier, so a B2 student chooses between four B2-register
// synonyms and cannot win by spotting the one option that "looks advanced".
//
// Starter additionally gets the word's emoji when wordEmoji.js has one, and
// silently goes without when it doesn't.

export const OPTION_COUNT = 4;

// Split a sentence around the first occurrence of the word so the engine can
// emphasize it without dangerouslySetInnerHTML. Matches on the first token of
// the entry, so "give up" still highlights inside "She had to give up."
export function splitSentence(sentence, word) {
  const s = String(sentence || "");
  const first = String(word || "").trim().split(" ")[0];
  if (!first) return { before: s, match: "", after: "" };
  const idx = s.toLowerCase().indexOf(first.toLowerCase());
  if (idx === -1) return { before: s, match: "", after: "" };
  return { before: s.slice(0, idx), match: s.slice(idx, idx + first.length), after: s.slice(idx + first.length) };
}

// Wrong options: same-tier clues from other words, preferring the target's own
// CEFR band at nuance/precision demand so the four options sit close together.
function pickDistractors({ target, pool, level, lang, correct, n }) {
  const used = new Set([correct.toLowerCase(), String(target.english || "").toLowerCase()]);
  const wantClose = level && (level === "B2" || level === "C1");
  const ordered = wantClose
    ? shuffle(pool).sort((a, b) => (a?.cefr === target?.cefr ? 0 : 1) - (b?.cefr === target?.cefr ? 0 : 1))
    : shuffle(pool);
  const out = [];
  for (const w of ordered) {
    if (w.english === target.english) continue;
    const clue = clueForLevel(w, level, lang);
    if (!clue || used.has(clue.toLowerCase())) continue;
    used.add(clue.toLowerCase());
    out.push(clue);
    if (out.length >= n) break;
  }
  return out;
}

export function buildQuestions({ chosen = [], pool = [], level, lang }) {
  const translationMode = usesTranslationClue(level);
  const out = [];
  for (const w of chosen) {
    const correct = clueForLevel(w, level, lang);
    if (!correct) continue;
    const distractors = pickDistractors({ target: w, pool, level, lang, correct, n: OPTION_COUNT - 1 });
    // A question with fewer than two options isn't a question — skip rather
    // than show a giveaway.
    if (distractors.length < 2) continue;
    out.push({
      id: `${w.english}-${out.length}`,
      word: w.english,
      wordId: w.id,
      provenance: w._provenance,
      pronunciation: w.pronunciation,
      sentence: w.example_en,
      parts: splitSentence(w.example_en, w.english),
      emoji: level === "Starter" ? getEmoji(w.english) : null,
      translation: translationMode ? "" : translationClue(w, lang),
      correct,
      options: shuffle([correct, ...distractors]),
    });
  }
  return out;
}