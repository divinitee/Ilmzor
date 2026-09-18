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
//
// SENSE IDENTITY (added 2026-09-18, species-C duplicate-headword migration):
// lemma text alone cannot key a sense once two physical VocabularyWord rows
// share one lemma_key ("coach" the bus / "coach" the trainer, "iron" the
// metal / "iron" the appliance). WordSense.word_id always points at ONE
// canonical row for BOTH senses of a split group, so a caller holding the
// OTHER physical row (the one about to be deleted and reassigned) cannot
// resolve its sense by word_id, and resolving by lemma string alone is
// exactly the ambiguity this migration exists to remove. WordSense.source_row_id
// records which physical VocabularyWord row a sense's content was actually
// drawn from during the split, independent of which row survives as
// word_id. resolveWordSense() below is keyed on that field first.
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

// Index senses two ways so a round can resolve without a query per word:
//   byLemma  — normalizeLemma(lemma_key) -> [senses], sorted primary-first then
//              by sense_index. Unchanged from before; still the fallback path.
//   byRowId  — source_row_id -> [senses]. This is the identity-safe path: a
//              caller holding a specific physical VocabularyWord row (e.g. the
//              bus-"coach" row, mid-migration, before it is deleted) resolves
//              its OWN sense even though WordSense.word_id points at the
//              trainer-"coach" row that survives as canonical.
// Unapproved rows are dropped from both indexes, which is what lets an
// AI-authored batch sit in the table without reaching a single learner.
export function indexSenses(senses = []) {
  const byLemma = new Map();
  const byRowId = new Map();
  for (const s of senses) {
    if (!s || s.approved === false) continue;
    const lemma = normalizeLemma(s.lemma_key);
    if (lemma) {
      const lemmaBucket = byLemma.get(lemma);
      if (lemmaBucket) lemmaBucket.push(s);
      else byLemma.set(lemma, [s]);
    }
    const rowId = s.source_row_id;
    if (rowId) {
      const rowBucket = byRowId.get(rowId);
      if (rowBucket) rowBucket.push(s);
      else byRowId.set(rowId, [s]);
    }
  }
  const bySenseOrder = (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sense_index ?? 0) - (b.sense_index ?? 0);
  for (const bucket of byLemma.values()) bucket.sort(bySenseOrder);
  for (const bucket of byRowId.values()) bucket.sort(bySenseOrder);
  return { byLemma, byRowId };
}

// resolveWordSense(index, input) — the sense-identity resolver.
//
// `index` is the { byLemma, byRowId } result of indexSenses().
// `input` accepts three shapes, tried in priority order:
//
//   { row_id }                  — resolve by the physical VocabularyWord row
//                                  the caller actually holds. Preferred: this
//                                  is the only shape that survives a
//                                  species-C split, because it does not
//                                  depend on which row kept the lemma's
//                                  canonical id.
//   { word_id, sense_index }    — direct addressing when both are already
//                                  known (e.g. re-hydrating a stored
//                                  senseIndex against the canonical word_id).
//                                  Trusted as given; no lookup, no ambiguity
//                                  possible by construction.
//   { lemma }                   — legacy string path, kept for callers that
//                                  only have word.english. Safe ONLY while the
//                                  lemma maps to a single sense_index; the
//                                  moment a lemma is genuinely multi-sense,
//                                  this path refuses to guess.
//
// Returns { ok: true, word_id, sense_index, sense_id, sense } on success —
// `sense` is null only for the "no rows at all yet for this id" fallback case
// (T5/T6, see below), and { ok: false, reason, candidates? } on failure.
// reason is one of:
//   "ambiguous_sense" — multiple senses matched and nothing disambiguated
//                        which one (candidates lists "word_id:sense_index").
//   "no_corpus_row"    — the lemma has no senses indexed at all.
//   "unparseable"      — input had none of the three recognized shapes.
//
// Known, accepted limitation: a row_id with ZERO senses indexed under it is
// indistinguishable here from a row_id that is simply stale (e.g. a
// WordAttempt not yet reassigned post-migration) — both hit the
// `!bucket || bucket.length === 0` branch and return the same safe
// single-implicit-sense fallback (sense: null, sense_index: 0). This is why
// the migration's operation order runs the 5 WordAttempt reassignments BEFORE
// any deletion: it structurally prevents a stale row_id from ever reaching
// this resolver in the first place, rather than asking the resolver to
// distinguish the two cases at runtime.
export function resolveWordSense(index, input = {}) {
  const { byRowId, byLemma } = index || {};
  const { row_id, word_id, sense_index, lemma } = input;

  if (row_id) {
    const bucket = byRowId?.get(row_id);
    if (!bucket || bucket.length === 0) {
      // No sense rows keyed to this physical row (yet, or ever — a word with
      // no senses at all resolves the same way). Safe fallback: treat it as
      // its own single implicit sense and let the caller fall through to the
      // VocabularyWord row for content, exactly like today's no-senses path.
      return { ok: true, word_id: row_id, sense_index: 0, sense_id: `${row_id}:0`, sense: null };
    }
    if (bucket.length === 1) {
      const sense = bucket[0];
      return { ok: true, word_id: sense.word_id, sense_index: sense.sense_index, sense_id: `${sense.word_id}:${sense.sense_index}`, sense };
    }
    if (sense_index !== undefined && sense_index !== null) {
      const exact = bucket.find((s) => s.sense_index === sense_index);
      if (exact) {
        return { ok: true, word_id: exact.word_id, sense_index: exact.sense_index, sense_id: `${exact.word_id}:${exact.sense_index}`, sense: exact };
      }
    }
    // Multiple senses share this row_id and nothing disambiguated which one.
    // Schema-permitted (a future word could split one physical row into two
    // senses), not the current migration's shape, but refuse to guess rather
    // than silently pick bucket[0].
    return {
      ok: false,
      reason: "ambiguous_sense",
      word_id: bucket[0].word_id,
      candidates: bucket.map((s) => `${s.word_id}:${s.sense_index}`),
    };
  }

  if (word_id && sense_index !== undefined && sense_index !== null) {
    // Trusted direct address — no ambiguity possible, nothing to look up.
    return { ok: true, word_id, sense_index, sense_id: `${word_id}:${sense_index}` };
  }

  if (lemma) {
    const bucket = byLemma?.get(normalizeLemma(lemma));
    if (!bucket || bucket.length === 0) {
      return { ok: false, reason: "no_corpus_row" };
    }
    const distinctIndexes = new Set(bucket.map((s) => s.sense_index));
    if (distinctIndexes.size > 1) {
      // Frozen identity-contract safeguard: a multi-sense lemma resolved only
      // by string must never default to sense_index 0. Refuse and surface
      // candidates instead.
      return {
        ok: false,
        reason: "ambiguous_sense",
        word_id: bucket[0].word_id,
        candidates: bucket.map((s) => `${s.word_id}:${s.sense_index}`),
      };
    }
    const sense = bucket[0];
    return { ok: true, word_id: sense.word_id, sense_index: sense.sense_index, sense_id: `${sense.word_id}:${sense.sense_index}`, sense };
  }

  return { ok: false, reason: "unparseable" };
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
// `senses` is the { byLemma, byRowId } index from indexSenses() and may be
// omitted entirely — which is the current state of the system and yields
// today's exact behaviour. Resolution prefers the row-id path (identity-safe
// across a species-C split) and falls back to the legacy lemma path only when
// the word carries no id or the row-id path is unavailable.
export function supportFor({ word, level, lang, senses, senseIndex } = {}) {
  const senseResolution = senses
    ? (word?.id && resolveWordSense(senses, { row_id: word.id, sense_index: senseIndex })) ||
      (word?.english && resolveWordSense(senses, { lemma: word.english })) ||
      null
    : null;
  const sense = senseResolution?.ok ? senseResolution.sense : null;
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
    senseResolution,
  };
}