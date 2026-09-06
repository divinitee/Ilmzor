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
// The tier fields are still EMPTY pending the enrichment batch, so today every
// level resolves to english_definition — identical to what the app has always
// shown, with no truncation. Each row the batch fills upgrades itself with no
// further code change.

export const SUPPORT_LEVELS = ["Starter", "A1"];
export const A2_MAX_WORDS = 8;

export const usesSupportLanguage = (level) => SUPPORT_LEVELS.includes(level);

// Retained as an exported utility (deterministic: same input, same output) but
// no longer on the meaning-card path — see the header note. Truncating a
// definition is not the same as writing a simpler one; the tier fields are how
// A2 gets genuinely simpler text.
export function simplifyDefinition(def = "", maxWords = A2_MAX_WORDS) {
  let s = String(def).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  s = s.split(/[;.]|\s[—–-]\s|,\s(?:or|and|especially|which|that)\s/i)[0].trim();
  const parts = s.split(" ").filter(Boolean);
  if (parts.length > maxWords) return parts.slice(0, maxWords).join(" ") + "…";
  return s;
}

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