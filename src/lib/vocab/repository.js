import { base44 } from "@/api/base44Client";
import { lemmaOf, normalizeLemma } from "@/lib/vocab/lemma";

// Corpus access that stays correct as the table grows from 2,282 to 10,000+.
//
// Two rules, both learned from bugs already fixed in this codebase:
//
// 1. NEVER a fixed cap. `list("id", 2000)` silently drops words the moment the
//    corpus passes the cap, and the corpus only ever grows. Everything here
//    pages until a short page comes back.
// 2. ALWAYS page by `id`. Most rows have no unit_number, which makes that sort
//    non-deterministic and produces overlapping pages — the duplicate-row bug
//    VocabReview.jsx and SkillHub.jsx both hit and both fixed this way.
//
// This module does not replace SkillHub's own loader; it is the shared,
// index-building entry point new code uses so a 10,000-word load is written
// once rather than per screen.

export const PAGE_SIZE = 500;

// Every VocabularyWord row, deduped by id. Optional onPage lets a caller show
// progress without this module knowing anything about UI.
export async function loadAllWords({ onPage } = {}) {
  const byId = new Map();
  let skip = 0;
  for (;;) {
    const page = await base44.entities.VocabularyWord.list("id", PAGE_SIZE, skip);
    page.forEach((w) => byId.set(w.id, w));
    if (onPage) onPage(byId.size);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return [...byId.values()];
}

// Lookup indexes over an already-loaded pool.
//
// byLemma holds an ARRAY per lemma, not a single word: the corpus currently has
// 129 duplicate headwords (43 unit-to-unit, 85 unit-to-enrichment). Collapsing
// them to one row would be a silent data decision, so both are kept and
// `primary` picks the richer one deterministically. Nothing is merged, renamed
// or deleted.
export function indexWords(words = []) {
  const byId = new Map();
  const byLemma = new Map();
  for (const w of words) {
    if (!w) continue;
    if (w.id) byId.set(w.id, w);
    const lemma = lemmaOf(w);
    if (!lemma) continue;
    const bucket = byLemma.get(lemma);
    if (bucket) bucket.push(w);
    else byLemma.set(lemma, [w]);
  }
  return { byId, byLemma };
}

// How complete a row's enrichment is — the tie-break for duplicate headwords,
// and a useful coverage metric on its own.
function richness(w) {
  let n = 0;
  for (const f of ["english_definition", "example_en", "cefr", "russian", "uzbek", "pronunciation", "def_a2", "def_b1", "def_b2", "def_c1"]) {
    if (typeof w?.[f] === "string" && w[f].trim()) n += 1;
  }
  if (Array.isArray(w?.tags) && w.tags.length) n += 1;
  return n;
}

// The row to use when a lemma has more than one. Richest first, then oldest id
// so the choice is stable across reloads.
export function primaryForLemma(index, lemma) {
  const bucket = index?.byLemma?.get(normalizeLemma(lemma));
  if (!bucket || bucket.length === 0) return null;
  if (bucket.length === 1) return bucket[0];
  return [...bucket].sort((a, b) => richness(b) - richness(a) || String(a.id).localeCompare(String(b.id)))[0];
}

// Resolve string-keyed learner history (WordAttempt.word, SavedWord.word) back
// to corpus rows. This is the compatibility seam: it accepts exactly what those
// entities already store, in any casing, and never requires them to change.
export function resolveHistory(index, rows = [], field = "word") {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const lemma = normalizeLemma(row?.[field]);
    if (!lemma || seen.has(lemma)) continue;
    const word = (row?.word_id && index?.byId?.get(row.word_id)) || primaryForLemma(index, lemma);
    if (!word) continue; // a hardcoded-bank word with no corpus row — expected, not an error
    seen.add(lemma);
    out.push(word);
  }
  return out;
}

// Words matching a set of lemmas, in the order given. Used by curriculum pool
// composition, which knows lemmas (from ThemeWord) before it knows rows.
export function wordsForLemmas(index, lemmas = []) {
  const out = [];
  const seen = new Set();
  for (const l of lemmas) {
    const lemma = normalizeLemma(l);
    if (!lemma || seen.has(lemma)) continue;
    const w = primaryForLemma(index, lemma);
    if (w) { seen.add(lemma); out.push(w); }
  }
  return out;
}