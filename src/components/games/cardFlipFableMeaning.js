import { meaningInLang } from "@/lib/vocabGameUtils";

// CEFR-aware meaning representation for CardFlip Fable only.
//
// DATA REALITY (checked against VocabularyWord, 2026-09-05): a word row has
// `uzbek`, `russian` and ONE `english_definition`. There is no separate
// "simple" definition field and no per-level definition variants. So instead
// of inventing a second content system:
//   Starter/A1 -> the support-language translation the app already stores
//                 (uzbek / russian), chosen by the app's current language.
//   A2         -> the same english_definition, deterministically shortened to
//                 its first clause and a word cap, so it reads simpler than
//                 the full dictionary-style string B1+ sees.
//   B1+        -> unchanged: the full english_definition.
// The A2 path is a rendering rule over existing data, not new content — a
// genuinely re-authored A2 definition set would need an enrichment pass.

export const SUPPORT_LEVELS = ["Starter", "A1"];
export const A2_MAX_WORDS = 8;

export const usesSupportLanguage = (level) => SUPPORT_LEVELS.includes(level);

// Deterministic simplification: drop parentheticals, keep the first clause,
// cap the word count. Same input always gives the same output.
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
  const def = word?.english_definition || meaningInLang(word, lang) || "";
  if (level === "A2" || usesSupportLanguage(level)) return simplifyDefinition(def);
  return def;
}