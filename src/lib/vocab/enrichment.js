import { definitionForLevel } from "@/lib/definitionTiers";
import { meaningInLang } from "@/lib/vocabGameUtils";
import { normalizeLemma } from "@/lib/vocab/lemma";

// The support layer a learner reads for a word — sense-aware, level-aware, and
// backward-compatible by construction.
//
// THE LEVELING LADDER, preserved exactly as specified:
//   A1   → support-language translation (no English definition at all)
//   A2   → A1-level English definition
//   B1   → A2-level English definition
//   B1+  → B1-level English definition
//   B2   → B1+-level English definition
//   C1   → B2-level English definition
// Every rung is READER-relative: the same word explained differently depending
// on who is looking at it. That contract already exists on VocabularyWord as
// def_a2..def_c1 (see definitionTiers.js) and is not changed here.
//
// WHAT IS NEW: the same ladder can now be answered by a WordSense row, so
// "issue" can carry a business definition and an academic-argument definition
// without duplicating the word. Resolution order is always
//     chosen sense → the VocabularyWord row → translation
// so a word with no senses — all 2,282 of them today — resolves through
// definitionForLevel() to precisely the text it shows right now.

// B1+ is a real rung of the ladder with no field on the legacy master record.
// It resolves to def_b1_plus on a sense and falls back to def_b1 on a word, so
// the rung exists in the architecture without a change to VocabularyWord.
export const SUPPORT_LADDER = {
  Starter: { mode: "translation", field: null, writtenFor: null },
  A1: { mode: "translation", field: null, writtenFor: null },
  A2: { mode: "definition", field: "def_a2", writtenFor: "A1" },
  B1: { mode: "definition", field: "def_b1", writtenFor: "A2" },
  "B1+": { mode: "definition", field: "def_b1_plus", writtenFor: "B1" },
  B2: { mode: "definition", field: "def_b2", writtenFor: "B1+" },
  C1: { mode: "definition", field: "def_c1", writtenFor: "B2" },
};

// Descending order used when a learner's own rung is empty: a C1 student on a
// word that only has def_a2 still gets a usable definition rather than nothing.
const DESCENT = ["C1", "B2", "B1+", "B1", "A2"];

const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");

export const usesTranslationSupport = (level) => SUPPORT_LADDER[level]?.mode === "translation";

// Index senses by lemma so a round can resolve without a query per word.
// Unapproved rows are dropped here, which is what lets an AI-authored batch sit
// in the table without reaching a single learner.
export function indexSenses(senses = []) {
  const byLemma = new Map();
  for (const s of senses) {
    if (!s || s.approved === false) continue;
    const lemma = normalizeLemma(s.lemma_key);
    if (!lemma) continue;
    const bucket = byLemma.get(lemma);
    if (bucket) bucket.push(s);
    else byLemma.set(lemma, [s]);
  }
  for (const bucket of byLemma.values()) {
    bucket.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sense_index ?? 0) - (b.sense_index ?? 0));
  }
  return byLemma;
}

// The sense to teach. An explicit senseIndex (from ThemeWord, i.e. "this theme
// teaches this meaning") wins; otherwise the primary sense; otherwise none, and
// the caller falls back to the word row.
export function pickSense(senseIndexByLemma, word, senseIndex) {
  const bucket = senseIndexByLemma?.get(normalizeLemma(word?.english));
  if (!bucket || bucket.length === 0) return null;
  if (senseIndex !== undefined && senseIndex !== null) {
    const exact = bucket.find((s) => s.sense_index === senseIndex);
    if (exact) return exact;
  }
  return bucket[0];
}

function definitionFromSense(sense, level) {
  if (!sense) return "";
  const own = SUPPORT_LADDER[level]?.field;
  if (own && clean(sense[own])) return clean(sense[own]);
  // B1+ on a sense with no def_b1_plus reads def_b1, then continues descending.
  for (const rung of DESCENT) {
    const field = SUPPORT_LADDER[rung].field;
    if (field && clean(sense[field])) return clean(sense[field]);
  }
  return clean(sense.english_definition);
}

function translationFromSense(sense, lang) {
  if (!sense) return "";
  if (lang === "ru") return clean(sense.translation_ru) || clean(sense.translation_uz);
  if (lang === "uz") return clean(sense.translation_uz) || clean(sense.translation_ru);
  return clean(sense.translation_uz) || clean(sense.translation_ru);
}

// The single call a game makes: everything a learner should see for this word,
// at their level, in the app's language, optionally in a specific sense.
//
// `senses` is the index from indexSenses() and may be omitted entirely — which
// is the current state of the system and yields today's exact behaviour.
export function supportFor({ word, level, lang, senses, senseIndex } = {}) {
  const sense = pickSense(senses, word, senseIndex);
  const translation = translationFromSense(sense, lang) || clean(meaningInLang(word, lang === "en" ? "uz" : lang));
  const definition = definitionFromSense(sense, level) || clean(definitionForLevel(word, level, lang));
  const mode = usesTranslationSupport(level) ? "translation" : "definition";
  return {
    mode,
    // What to show as the meaning, respecting the ladder: A1/Starter read the
    // translation, everyone above reads their own definition rung — with the
    // other value always available for the optional hint reveal that
    // HINT_XP_MULTIPLIER already prices.
    primary: mode === "translation" ? translation || definition : definition || translation,
    definition,
    translation,
    example: clean(sense?.example_en) || clean(word?.example_en),
    pronunciation: clean(sense?.pronunciation) || clean(word?.pronunciation),
    cefr: clean(sense?.cefr) || clean(word?.cefr),
    register: clean(sense?.register),
    collocations: sense?.collocations || [],
    wordForms: sense?.word_forms || [],
    senseIndex: sense?.sense_index ?? null,
    senseLabel: clean(sense?.sense_label),
    fromSense: !!sense,
  };
}