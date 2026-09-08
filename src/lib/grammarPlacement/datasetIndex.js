// Grammar Placement Engine — dataset index. PURE (takes items, imports none).
//
// The engine never reads the dataset's folder layout and never imports a
// domain file. It is handed the flat item array from the public contract
// (`ADAPTIVE_GRAMMAR_ITEMS`) and builds this index once per run. Everything
// the selector and the placement layer need to know about what content exists
// comes from here.
//
// Density is a first-class fact, not an assumption. Measured against the real
// V1 bank (2026-09-08): 73 of 78 domain x level buckets are populated, 12 hold
// fewer than 3 items, one domain has no C2 at all, and three domains do not
// start at A1. The engine adapts to that rather than assuming every bucket
// holds interchangeable alternatives.

import { PLACEMENT_LEVELS, orderLevels, levelIndex } from "@/lib/grammarPlacement/levels";

/**
 * @param {Array} items          the public ADAPTIVE_GRAMMAR_ITEMS array
 * @param {object} [opts]
 * @param {string[]} [opts.datasetLevels]  the dataset's own CEFR_LEVELS, for a
 *        contract assertion — a silent ladder mismatch would corrupt every
 *        placement quietly, so it fails loudly instead.
 * @param {string[]} [opts.domainOrder]    canonical domain order (DOMAINS ids)
 */
export function buildIndex(items, opts = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("grammarPlacement: dataset is empty or not an array");
  }
  if (opts.datasetLevels) {
    const a = opts.datasetLevels.join(",");
    const b = PLACEMENT_LEVELS.join(",");
    if (a !== b) {
      throw new Error(`grammarPlacement: CEFR ladder mismatch — dataset [${a}] vs engine [${b}]`);
    }
  }

  const byKey = new Map();          // "domain|level" -> item[]
  const byId = new Map();
  const domainSet = new Set();

  for (const it of items) {
    if (!it?.id || !it.domain || !it.cefrLevel) {
      throw new Error(`grammarPlacement: item missing id/domain/cefrLevel: ${JSON.stringify(it)?.slice(0, 120)}`);
    }
    if (byId.has(it.id)) throw new Error(`grammarPlacement: duplicate item id ${it.id}`);
    byId.set(it.id, it);
    domainSet.add(it.domain);
    const k = `${it.domain}|${it.cefrLevel}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(it);
  }

  // Canonical order if supplied, else first-seen order — deterministic either way.
  const domainIds = opts.domainOrder?.length
    ? opts.domainOrder.filter((d) => domainSet.has(d))
    : [...domainSet];
  for (const d of domainSet) if (!domainIds.includes(d)) domainIds.push(d);

  // Stable within-bucket ordering so selection is reproducible.
  for (const arr of byKey.values()) {
    arr.sort((a, b) => (a.difficulty - b.difficulty) || a.id.localeCompare(b.id));
  }

  const levelsByDomain = new Map();
  for (const d of domainIds) {
    levelsByDomain.set(d, orderLevels(PLACEMENT_LEVELS.filter((l) => byKey.has(`${d}|${l}`))));
  }

  const itemsFor = (domain, level) => byKey.get(`${domain}|${level}`) ?? [];

  const index = {
    items,
    totalItems: items.length,
    domainIds,
    byId,

    getItem: (id) => byId.get(id) ?? null,

    /** Levels this domain actually has content for, in ladder order. */
    levelsForDomain: (domain) => levelsByDomain.get(domain) ?? [],

    /** Lowest rung this domain can assess at all (its floor). */
    floorLevel: (domain) => (levelsByDomain.get(domain) ?? [])[0] ?? null,

    /** Highest rung this domain can assess at all (its coverage ceiling). */
    maxAssessableLevel: (domain) => {
      const ls = levelsByDomain.get(domain) ?? [];
      return ls[ls.length - 1] ?? null;
    },

    itemsFor,

    supply: (domain, level) => itemsFor(domain, level).length,

    /** Items in this cell not yet served in the given ledger. */
    remainingItems: (domain, level, ledger) => {
      const used = new Set(ledger?.observations?.map((o) => o.itemId) ?? []);
      return itemsFor(domain, level).filter((it) => !used.has(it.id));
    },

    remainingSupply: (domain, level, ledger) =>
      index.remainingItems(domain, level, ledger).length,

    /** Does this domain have any content at or above `level`? */
    hasContentAtOrAbove: (domain, level) =>
      (levelsByDomain.get(domain) ?? []).some((l) => levelIndex(l) >= levelIndex(level)),

    /** Nearest level in this domain to `level`, preferring downward. */
    nearestLevel: (domain, level) => {
      const ls = levelsByDomain.get(domain) ?? [];
      if (!ls.length) return null;
      if (ls.includes(level)) return level;
      const target = levelIndex(level);
      let best = null, bestScore = Infinity;
      for (const l of ls) {
        const d = levelIndex(l) - target;
        // Downward ties win: a probe that is too easy misplaces less badly
        // than one that is too hard.
        const score = Math.abs(d) * 2 + (d > 0 ? 1 : 0);
        if (score < bestScore) { bestScore = score; best = l; }
      }
      return best;
    },

    /** Coverage summary, stored on the run record for later audit. */
    coverageSummary: () => {
      const out = {};
      for (const d of domainIds) {
        out[d] = {};
        for (const l of levelsByDomain.get(d) ?? []) {
          const arr = itemsFor(d, l);
          out[d][l] = {
            total: arr.length,
            recognition: arr.filter((i) => i.evidenceClass === "recognition").length,
            controlled_construction: arr.filter((i) => i.evidenceClass === "controlled_construction").length,
            free_production: arr.filter((i) => i.evidenceClass === "free_production").length,
          };
        }
      }
      return out;
    },
  };

  return index;
}
