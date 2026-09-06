import { shuffle } from "@/lib/vocabGameUtils";
import { rankDistractors } from "@/lib/levels";
import { PROVENANCE } from "@/lib/roundComposition";

// ---------------------------------------------------------------------------
// Which words share a set — the whole difficulty lever of Definition Match.
//
// With definitions now read from the database instead of generated per round,
// the prompt can no longer make a round harder. What makes it harder is
// putting words on screen whose definitions are hard to tell apart. Four
// random words (flu, kit, captain, cheat) are a reading-comprehension test:
// you win without knowing any of them.
//
// Two proximity signals exist in the data, and they are NOT equivalent:
//
//   unit_key  — topical adjacency. Words in one unit are about one subject,
//               so their definitions genuinely compete ("a person who leads a
//               team" vs "a person who trains a team"). This is the signal
//               that actually creates confusion.
//   cefr      — difficulty adjacency, via rankDistractors(). Two C1 words are
//               equally hard but can be about completely unrelated things, so
//               their definitions may still be trivially distinguishable.
//
// So unit-proximity is the primary lever and rankDistractors is the fallback:
// only 1081 of 2282 rows carry a unit_key (12 units), and a student's band
// filter can thin that further, so same-unit sets are not always buildable.
// Where they aren't, CEFR proximity is a weaker but real second-best — it at
// least keeps a C1 target away from A1 fillers whose definitions are written
// in obviously simpler language, which is a giveaway of its own.
//
// Demand tiers (cognitiveDemandForLevel):
//   recognition / controlled — spread across units, definitions clearly apart
//   application              — no constraint, natural mix
//   nuance / precision       — same unit where possible, else nearest CEFR
// ---------------------------------------------------------------------------

export const WANTS_CLOSE = ["nuance", "precision"];
export const WANTS_SPREAD = ["recognition", "controlled"];

const unitOf = (w) => w?.unit_key || null;

// Group into sets of `size`, maximising topical distance: walk the words in
// round-robin order over their units so set members rarely share one.
function spreadSets(words, size) {
  const byUnit = new Map();
  words.forEach((w) => {
    const k = unitOf(w) || `__none_${w.english}`;
    if (!byUnit.has(k)) byUnit.set(k, []);
    byUnit.get(k).push(w);
  });
  const queues = shuffle([...byUnit.values()]);
  const ordered = [];
  while (ordered.length < words.length) {
    let moved = false;
    for (const q of queues) {
      if (q.length) { ordered.push(q.shift()); moved = true; }
    }
    if (!moved) break;
  }
  return chunk(ordered, size);
}

// Group into sets of `size`, maximising confusability: cluster same-unit words
// together, then fill short sets from the pool — same unit first, else nearest
// CEFR band via rankDistractors.
function closeSets(words, size, pool, demand) {
  const remaining = [...words];
  const used = new Set(words.map((w) => w.english));
  const sets = [];

  while (remaining.length) {
    const anchor = remaining.shift();
    const set = [anchor];
    const unit = unitOf(anchor);

    // 1. same-unit members already in the round
    if (unit) {
      for (let i = remaining.length - 1; i >= 0 && set.length < size; i--) {
        if (unitOf(remaining[i]) === unit) set.push(remaining.splice(i, 1)[0]);
      }
    }
    // 2. same-unit words from the wider pool
    if (unit && set.length < size) {
      const mates = shuffle(pool.filter((w) => unitOf(w) === unit && !used.has(w.english)));
      for (const m of mates) {
        if (set.length >= size) break;
        set.push({ ...m, _provenance: m._provenance || PROVENANCE.FRESH });
        used.add(m.english);
      }
    }
    // 3. nearest-CEFR fallback — the weaker signal, used only where unit
    //    proximity could not fill the set (no unit_key, or a thin unit).
    if (set.length < size) {
      const candidates = rankDistractors(
        pool.filter((w) => !used.has(w.english)),
        anchor,
        demand
      );
      for (const cand of candidates) {
        if (set.length >= size) break;
        set.push({ ...cand, _provenance: cand._provenance || PROVENANCE.FRESH });
        used.add(cand.english);
      }
    }
    // 4. last resort: pull from the round's own remaining words
    while (set.length < size && remaining.length) set.push(remaining.shift());

    if (set.length === size) sets.push(shuffle(set));
    else if (set.length > 1) sets.push(shuffle(set)); // short final set rather than dropping words
  }
  return sets;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    const part = list.slice(i, i + size);
    if (part.length > 1) out.push(part);
  }
  return out;
}

// `words` is the personalized round (buildPersonalizedRound output), `pool` the
// student's band. Returns an array of sets, each an array of words.
export function buildSets({ words = [], pool = [], size = 4, demand = "application" }) {
  const clean = words.filter((w) => w && w.english);
  if (clean.length <= size) return clean.length > 1 ? [shuffle(clean)] : [];
  if (WANTS_SPREAD.includes(demand)) return spreadSets(clean, size);
  if (WANTS_CLOSE.includes(demand)) return closeSets(clean, size, pool, demand);
  return chunk(shuffle(clean), size);
}

// A set is only playable if every definition on screen is distinct — two
// identical definition cards would make one of them unanswerable.
export function dedupeByDefinition(items) {
  const seen = new Set();
  return items.filter((it) => {
    const key = (it.definition || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}