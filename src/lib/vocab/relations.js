import { synonymForLevel, translationClue, usesTranslationClue } from "@/lib/synonymTiers";
import { normalizeLemma } from "@/lib/vocab/lemma";

// Semantic relationships as CONTEXTUAL, LEVELED data rather than a flat list.
//
// The rule this exists to encode: synonyms are not universally interchangeable.
// "important → significant → crucial → essential → vital" is a rising ladder,
// and which rung is right depends on the reader's level and on the context the
// word is being taught in. A single synonym field cannot say that; a row per
// (from, to, relation, reader_level, context) can.
//
// BACKWARD COMPATIBILITY: WordRelation is empty today. Resolution reads it
// first, then falls back to VocabularyWord.syn_a2..syn_c1, then to the ~170
// hand-authored ladders in synonymTiers.js — which is exactly the fallback
// chain synonymForLevel() already implements. Context Guess and Synonym Sprint
// therefore behave identically until rows are added, and improve automatically
// as rows land, with no engine change.

export const RELATION = {
  SYNONYM: "synonym",
  ANTONYM: "antonym",
  RELATED: "related",
  CONFUSABLE: "confusable",
  COLLOCATE: "collocate",
  WORD_FORM: "word_form",
  HYPERNYM: "hypernym",
  HYPONYM: "hyponym",
};

// Reader rungs, most precise first — a learner with no rung of their own
// resolves DOWNWARD, never upward, so nobody is shown a synonym above their
// level. Same direction synonymForLevel() already descends.
const RUNGS = ["C1", "B2", "B1+", "B1", "A2"];
const rungsFrom = (level) => {
  const i = RUNGS.indexOf(level);
  return i === -1 ? RUNGS.slice(RUNGS.indexOf("A2")) : RUNGS.slice(i);
};

// Index by lemma → relation kind. Unapproved rows are dropped: a wrong synonym
// rung teaches something false, which is why the pilot ladder was hand-authored.
export function indexRelations(rows = []) {
  const byLemma = new Map();
  for (const r of rows) {
    if (!r || r.approved === false) continue;
    const from = normalizeLemma(r.from_lemma);
    const to = normalizeLemma(r.to_lemma);
    if (!from || !to || !r.relation) continue;
    let kinds = byLemma.get(from);
    if (!kinds) { kinds = new Map(); byLemma.set(from, kinds); }
    const bucket = kinds.get(r.relation);
    if (bucket) bucket.push(r);
    else kinds.set(r.relation, [r]);
  }
  return byLemma;
}

function candidates(index, lemma, relation) {
  return index?.get(normalizeLemma(lemma))?.get(relation) || [];
}

// Filter to the rows valid in this teaching context. A row with no
// context_theme_key is context-free and always eligible; a row naming a theme is
// only eligible inside it — which is how "party → celebration" stays out of a
// politics round.
function inContext(rows, { themeKey, senseIndex } = {}) {
  return rows.filter((r) => {
    if (r.context_theme_key && themeKey && r.context_theme_key !== themeKey) return false;
    if (r.context_theme_key && !themeKey) return false;
    if (r.sense_index !== undefined && r.sense_index !== null && senseIndex !== undefined && senseIndex !== null && r.sense_index !== senseIndex) return false;
    return true;
  });
}

const byStrength = (a, b) => (b.strength ?? 0.5) - (a.strength ?? 0.5);

// The synonym rung for this learner, in this context — the leveled clue Context
// Guess runs on, now context-aware. Returns "" when nothing is available at or
// below the learner's rung, which is the signal the existing pool filters use.
export function synonymFor({ word, level, relations, themeKey, senseIndex } = {}) {
  const lemma = normalizeLemma(word?.english);
  const rows = inContext(candidates(relations, lemma, RELATION.SYNONYM), { themeKey, senseIndex });
  if (rows.length) {
    for (const rung of rungsFrom(level)) {
      const hit = rows.filter((r) => !r.reader_level || r.reader_level === rung).sort(byStrength)[0];
      if (hit) return hit.to_lemma;
    }
  }
  // Entity fields, then the hand-authored pilot ladder — unchanged behaviour.
  return synonymForLevel(word, level);
}

// The clue a learner actually sees: Starter/A1 read the support-language
// translation, everyone above reads a synonym. Identical rule to
// clueForLevel() in synonymTiers.js, extended with context.
export function clueFor({ word, level, lang, relations, themeKey, senseIndex } = {}) {
  return usesTranslationClue(level)
    ? translationClue(word, lang)
    : synonymFor({ word, level, relations, themeKey, senseIndex });
}

// All targets of one relation kind, best first. Antonym Hunt, Related Words and
// Connection Challenge run on hardcoded banks today; this is the data path that
// lets them read real corpus relations later without changing their mechanics.
export function relatedLemmas({ word, relation, relations, themeKey, senseIndex, level, limit = 8 } = {}) {
  const rows = inContext(candidates(relations, normalizeLemma(word?.english), relation), { themeKey, senseIndex });
  const allowed = new Set(rungsFrom(level));
  return rows
    .filter((r) => !r.reader_level || allowed.has(r.reader_level))
    .sort(byStrength)
    .slice(0, limit)
    .map((r) => ({ lemma: r.to_lemma, wordId: r.to_word_id || null, cefr: r.to_cefr || "", strength: r.strength ?? 0.5, note: r.note || "" }));
}

// Commonly-confused pairs. Level-independent by nature (affect/effect confuses
// a B2 as much as a B1), so no rung filtering.
export function confusablesFor({ word, relations, themeKey } = {}) {
  return inContext(candidates(relations, normalizeLemma(word?.english), RELATION.CONFUSABLE), { themeKey })
    .sort(byStrength)
    .map((r) => ({ lemma: r.to_lemma, note: r.note || "" }));
}