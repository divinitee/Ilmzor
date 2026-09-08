import { meaningInLang } from "@/lib/vocabGameUtils";
import { definitionForLevel } from "@/lib/definitionTiers";

// CEFR-aware meaning representation for CardFlip Fable only.
//
// DATA REALITY, updated 2026-09-06: the reader-relative tier fields
// (`def_a2` / `def_b1` / `def_b2` / `def_c1`) now exist on VocabularyWord, and
// `src/lib/definitionTiers.js` resolves them. So:
//   Starter/A1 -> the support-language translation the app already stores
//                 (uzbek / russian), chosen by the app's current language.
//   A2+        -> definitionForLevel(), which reads the student's own tier and
//                 falls back to english_definition, then to meaningInLang.
//
// This replaces the previous A2 path, which truncated the single
// english_definition to its first clause and ~8 words. That was written before
// the tier fields existed and it amputated rather than simplified — "The person
// who is the leader of a sports group." became "The person who is the leader of
// a…", which is harder to learn from than the original, not easier.
//
// The tier fields (def_a2 / def_b1 / def_b2 / def_c1) are now fully populated
// across the 2,282-row VocabularyWord set, so A2+ students receive their own
// CEFR-readable definition through definitionForLevel().

export const SUPPORT_LEVELS = ["Starter", "A1"];

export const usesSupportLanguage = (level) => SUPPORT_LEVELS.includes(level);

// The truncating simplifyDefinition() helper that used to live here was removed
// on 2026-09-06 along with its A2_MAX_WORDS cap. Nothing referenced it once the
// tier fields landed, and leaving it in place invited someone to put definition
// truncation back on the card path — which is what it was doing wrong.

// The text a meaning card shows for this student. `lang` is the app's current
// language, which is also the support language.
export function meaningForLevel(word, level, lang) {
  if (usesSupportLanguage(level)) {
    // Always a translation at Starter/A1 — never an English definition. The
    // app language picks which one; an English interface still falls back to
    // the stored uzbek (then russian) translation, because a beginner card is
    // meant to anchor on the student's own language.
    const support = (lang !== "en" && meaningInLang(word, lang)) || word?.uzbek || word?.russian;
    if (support) return support;
  }
  return definitionForLevel(word, level, lang);
}