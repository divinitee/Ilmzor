// The stable identity of a lexical item.
//
// Every new vocabulary structure (WordSense, WordRelation, ThemeWord,
// LearnerWordState) keys on a NORMALIZED HEADWORD rather than inventing a new
// id, for one reason: the learner history that already exists is string-keyed.
// WordAttempt.word and SavedWord.word are plain English strings, and
// roundComposition.js joins on them today. A new id would mean migrating that
// history; a normalized form of the field they already store means every
// existing record resolves on day one, with nothing rewritten.
//
// VocabularyWord.english is NOT renamed and its meaning is unchanged. This is a
// derived read of it. `word_id` (VocabularyWord.id) is stored alongside
// lemma_key wherever possible and is the preferred join when present — lemma is
// the resilient fallback, exactly the pairing WordAttempt already documents.

// Lowercase, trim, collapse inner whitespace, drop surrounding punctuation.
// Deliberately conservative: no stemming, no plural stripping, no accent
// folding. "get in(to)", "etc." and "in love with" are real headwords in the
// current corpus, and an aggressive normalizer would silently merge distinct
// entries — which is the one failure mode that would corrupt learner history.
export function normalizeLemma(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}(]+|[^\p{L}\p{N})]+$/gu, "");
}

// The lemma of a VocabularyWord row. Reads `english` only — the master
// headword field — so it is impossible for this to disagree with what a game
// displays.
export const lemmaOf = (word) => normalizeLemma(word?.english);

// The lemma a piece of learner history refers to. WordAttempt and SavedWord
// both store the shown English string under different field names.
export const lemmaOfAttempt = (row) => normalizeLemma(row?.word);

export const sameLemma = (a, b) => {
  const na = normalizeLemma(a);
  return !!na && na === normalizeLemma(b);
};

// First token of a headword, for matching a multi-word entry inside a sentence
// ("give up" → "give"). Mirrors the rule splitSentence() in
// contextGuessRound.js already uses, so highlighting and lemma logic agree.
export const headToken = (value) => normalizeLemma(value).split(" ")[0] || "";