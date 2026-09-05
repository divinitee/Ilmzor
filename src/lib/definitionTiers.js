import { meaningInLang } from "@/lib/vocabGameUtils";

// Reader-relative definition tiers.
//
// VocabularyWord.english_definition is written relative to the WORD ("one band
// below the word's own level"). These four fields are written relative to the
// STUDENT reading them, so an A2 and a C1 student looking up the same B1 word
// get different sentences. There is deliberately no def_a1: an A1 student reads
// the support-language translation, which is the game's decision, not this
// module's.
//
// Built but NOT wired: meaningInLang() and every existing game are untouched.
// The only intended consumer for now is CardFlipFable. Resolution always
// degrades safely, so a row this enrichment pass hasn't reached behaves exactly
// as it does today.

export const TIER_FIELD = {
  A2: "def_a2",
  B1: "def_b1",
  B2: "def_b2",
  C1: "def_c1",
};

const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");

// The English definition text for a student at `studentLevel`.
// Starter/A1 have no tier of their own; they fall through to def_a2, which is
// the closest thing to "explained for a beginner" that exists in English.
export function tieredDefinition(word, studentLevel) {
  const field = TIER_FIELD[studentLevel] || TIER_FIELD.A2;
  return clean(word?.[field]);
}

// Full resolution: the student's own tier → english_definition → today's
// meaningInLang behaviour (which may be a translation).
//
// `lang` is the app's current language. The one explicit edge case: an A1
// student whose support language is English has no translation to read, so the
// def_a2 line stands in rather than rendering an empty meaning card.
export function definitionForLevel(word, studentLevel, lang) {
  return (
    tieredDefinition(word, studentLevel) ||
    clean(word?.english_definition) ||
    clean(meaningInLang(word, lang))
  );
}