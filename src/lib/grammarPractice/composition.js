// Round composition — PURE. No React, no network, no Base44.
//
// Turns a topic's authored items into the specific questions a student sees.
// Three jobs, none of which belong in a component:
//
//   1. Slot expansion. One authored item with two four-filler slots is sixteen
//      distinct surface variants. This is where practice variety actually comes
//      from — the authored count alone badly understates the pool.
//   2. Option shuffling. Authored option order is never final. A batch arrived
//      with the correct answer at index 1 in all twenty items, and its "fix" put
//      the key in a 0,1,2,3 cycle — equally gameable. Shuffling here means the
//      stored index is only ever a starting position.
//   3. Repeat distance. Unseen variants are served before seen ones, and seen
//      ones oldest-first, so a student reaches genuinely new material before
//      meeting anything twice.
//
// Deterministic under a seed, so a round can be replayed exactly and the whole
// thing is testable without mocks — same discipline as the placement engine.

/** Small deterministic PRNG (mulberry32). Same seed, same round, always. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffled = (arr, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const slotNames = (item) => Object.keys(item?.slots || {}).sort();

/** How many distinct surface variants an item expands to. */
export function variantCount(item) {
  return slotNames(item).reduce((n, k) => n * item.slots[k].length, 1);
}

/** Every variant of every item, as {item, variantIndex, variantId} triples. */
export function expandPool(items) {
  const pool = [];
  for (const item of items) {
    const n = variantCount(item);
    for (let v = 0; v < n; v += 1) {
      pool.push({ item, variantIndex: v, variantId: n > 1 ? `${item.id}#${v}` : item.id });
    }
  }
  return pool;
}

/** Resolves slot placeholders for one variant. Mixed-radix over the slot lists. */
export function fillersFor(item, variantIndex) {
  const names = slotNames(item);
  const out = {};
  let rest = variantIndex;
  for (const name of names) {
    const list = item.slots[name];
    out[name] = list[rest % list.length];
    rest = Math.floor(rest / list.length);
  }
  return out;
}

const applyFillers = (text, fillers) =>
  typeof text === "string"
    ? text.replace(/\{(\w+)\}/g, (m, k) => (k in fillers ? fillers[k] : m))
    : text;

/**
 * One item, ready to render: slots resolved, options shuffled, key remapped.
 * `slots` is dropped from the result — downstream never needs the template.
 */
export function renderItem({ item, variantIndex, variantId }, rand) {
  const fillers = fillersFor(item, variantIndex);
  const out = { ...item, variantId };
  delete out.slots;

  for (const field of ["prompt", "source", "hint", "instr"]) {
    if (out[field]) out[field] = applyFillers(out[field], fillers);
  }

  if (out.format === "mcq" && Array.isArray(out.options)) {
    const correct = out.options[out.key];
    out.options = shuffled(out.options, rand);
    out.key = out.options.indexOf(correct);
  }
  return out;
}

/**
 * Build a round.
 *
 * @param items    authored items for one topic (any stages)
 * @param stage    which stage to draw from
 * @param size     how many questions
 * @param seed     integer; same seed reproduces the round exactly
 * @param history  { [variantId]: ordinal } — higher ordinal = more recently seen
 * @returns { items, variantIds, exhausted }  `exhausted` is true when the pool
 *          was smaller than the round and something had to repeat.
 */
export function composeRound({ items, stage, size = 10, seed = 1, history = {} }) {
  const rand = rng(seed);
  const pool = expandPool(items.filter((i) => i.stage === stage));
  if (!pool.length) return { items: [], variantIds: [], exhausted: true };

  // Unseen first, then least-recently-seen. Ties broken deterministically by
  // the seed rather than by authoring order, so round one isn't always item one.
  const unseen = shuffled(pool.filter((p) => history[p.variantId] === undefined), rand);
  const seen = pool
    .filter((p) => history[p.variantId] !== undefined)
    .sort((a, b) => history[a.variantId] - history[b.variantId]);

  const picked = [...unseen, ...seen].slice(0, size);
  return {
    items: picked.map((p) => renderItem(p, rand)),
    variantIds: picked.map((p) => p.variantId),
    exhausted: picked.length < size || unseen.length < size,
  };
}

/** Fold a completed round back into history so the next one avoids it. */
export function recordSeen(history, variantIds) {
  const next = { ...history };
  const start = Math.max(0, ...Object.values(next).map(Number), 0);
  variantIds.forEach((id, i) => { next[id] = start + i + 1; });
  return next;
}

/** Pool size per stage, counting slot expansion. For honest UI labels. */
export function poolSizes(items) {
  const out = {};
  for (const it of items) out[it.stage] = (out[it.stage] || 0) + variantCount(it);
  return out;
}
