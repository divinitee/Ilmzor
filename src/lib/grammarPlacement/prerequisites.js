// Grammar Placement Engine — prerequisite-aware dependency analysis. PURE.
//
// WHY THIS MODULE EXISTS
//
// CEFR level is a complexity and curriculum signal. It is NOT a claim that
// every lower-level topic in a broad domain is a prerequisite for every
// higher-level one. A learner can fail an A2 topic in one branch of Tenses and
// clear a C1 topic in another branch without contradicting themselves — the
// measured dataset makes this concrete: 283 item->concept edges cross a branch
// boundary and 48 concepts are exercised in more than one domain, so branch
// membership and CEFR order are simply not the dependency structure.
//
// The dependency structure the dataset actually declares is item -> concept,
// via each item's `prerequisites[]`. This module reads only that.
//
// WHAT COUNTS AS A DEPENDENCY EDGE
//
// The concept registry (`CONCEPTS`) is a flat list of {id, owner} with no
// concept -> concept edges, so a concept graph has to be derived. Deriving it
// from co-occurrence does NOT work: concepts that appear together on the same
// items become each other's parents, producing cycles like
// present-simple -> third-person-s -> present-simple. That derivation was
// tried, rejected, and is deliberately not used here.
//
// Instead, edges come only from declared prerequisites, walked through items:
//
//   item I declares concept C            (declared by the dataset)
//   C's evidence = items declaring C     (declared by the dataset)
//   those items declare concepts B       (declared by the dataset)
//   => B is a transitive prerequisite of I
//
// CEFR appears in exactly one place in that walk: an edge is only followed to a
// concept whose anchor (its lowest CEFR level in the bank) is STRICTLY lower.
// That is a cycle guard and an orientation for an edge the dataset already
// declared — it never creates an edge. Two concepts anchored at the same level
// are never made prerequisites of each other, which is precisely what kills the
// co-occurrence cycles above.

import { PLACEMENT_LEVELS, levelIndex } from "@/lib/grammarPlacement/levels";
import { EVAL_STATUS } from "@/lib/grammarPlacement/scoring";

// Per-index memo of the concept structures derived from the item bank.
const _memo = new WeakMap();

function conceptStructures(index) {
  const hit = _memo.get(index);
  if (hit) return hit;

  const itemsByConcept = new Map();   // conceptId -> item[]
  const anchorOf = new Map();         // conceptId -> lowest level index in the bank

  for (const it of index.items) {
    for (const c of it.prerequisites ?? []) {
      if (!itemsByConcept.has(c)) itemsByConcept.set(c, []);
      itemsByConcept.get(c).push(it);
      const li = levelIndex(it.cefrLevel);
      if (!anchorOf.has(c) || li < anchorOf.get(c)) anchorOf.set(c, li);
    }
  }
  const out = { itemsByConcept, anchorOf };
  _memo.set(index, out);
  return out;
}

/** Concepts an observation's item declares, preferring the ledger's own copy. */
function prereqsOf(obs, index) {
  if (Array.isArray(obs.prerequisites)) return obs.prerequisites;
  return index.getItem(obs.itemId)?.prerequisites ?? [];
}

/**
 * Transitive prerequisite closure of a set of concepts.
 *
 * @returns {Map<string, number>} conceptId -> shortest hop distance (1 = direct)
 */
export function prerequisiteClosure(seedConcepts, index, config) {
  const { itemsByConcept, anchorOf } = conceptStructures(index);
  const maxDepth = Math.max(1, config.prerequisite.maxChainDepth);

  const result = new Map();
  const seen = new Set();
  let frontier = [];

  for (const c of seedConcepts) {
    if (seen.has(c)) continue;
    seen.add(c);
    frontier.push([c, 1]);
  }

  while (frontier.length) {
    const next = [];
    for (const [c, depth] of frontier) {
      if (!result.has(c) || result.get(c) > depth) result.set(c, depth);
      if (depth >= maxDepth) continue;

      const anchorIdx = anchorOf.get(c);
      if (anchorIdx === undefined) continue;

      // Only the items that DEFINE the concept (those at its anchor level)
      // contribute onward edges; a C1 item that happens to also use an A1
      // concept says nothing about that concept's own prerequisites.
      for (const it of itemsByConcept.get(c) ?? []) {
        if (levelIndex(it.cefrLevel) !== anchorIdx) continue;
        for (const p of it.prerequisites ?? []) {
          if (p === c || seen.has(p)) continue;
          const pa = anchorOf.get(p);
          if (pa === undefined || pa >= anchorIdx) continue; // cycle guard, see header
          seen.add(p);
          next.push([p, depth + 1]);
        }
      }
    }
    frontier = next;
  }
  return result;
}

/**
 * Evidence gathered per concept, broken down by CEFR level so a caller can ask
 * specifically about the FOUNDATIONAL evidence below some rung.
 *
 * Only scored observations count. Evaluation failures and skips are invisible
 * here exactly as they are in the main evidence ledger.
 *
 * @param {object} opts.domain  when set, restrict to observations in this
 *        domain. Contradiction analysis uses this: a dependency is real across
 *        domains, but downgrading one domain because of evidence gathered in
 *        another is a cascade that has to be opted into, not a default.
 */
export function buildConceptEvidence(ledger, index, config, { domain = null } = {}) {
  const byConcept = new Map();
  for (const o of ledger.observations) {
    if (o.status !== EVAL_STATUS.SCORED || typeof o.credit !== "number") continue;
    if (domain && o.domain !== domain) continue;
    for (const c of prereqsOf(o, index)) {
      let e = byConcept.get(c);
      if (!e) {
        e = { concept: c, n: 0, credit: 0, ratio: 0, byLevel: {}, observations: [] };
        byConcept.set(c, e);
      }
      e.n += 1;
      e.credit += o.credit;
      e.ratio = e.credit / e.n;
      const lv = (e.byLevel[o.level] ??= { n: 0, credit: 0 });
      lv.n += 1;
      lv.credit += o.credit;
      e.observations.push({ itemId: o.itemId, level: o.level, credit: o.credit, domain: o.domain, branch: o.branch ?? null, topic: o.topic ?? null });
    }
  }
  return byConcept;
}

/** The slice of a concept's evidence that sits strictly below `levelIdx`. */
export function conceptEvidenceBelow(conceptEv, levelIdx) {
  if (!conceptEv) return { n: 0, credit: 0, ratio: 0, levels: [] };
  let n = 0, credit = 0;
  const levels = [];
  for (const [lv, agg] of Object.entries(conceptEv.byLevel)) {
    if (levelIndex(lv) >= levelIdx) continue;
    n += agg.n;
    credit += agg.credit;
    levels.push(lv);
  }
  return { n, credit, ratio: n ? credit / n : 0, levels };
}

/**
 * Detect genuine dependency contradictions in one domain.
 *
 * A contradiction requires ALL of:
 *   1. a rung in this domain was CLEARED,
 *   2. the observations that cleared it declare a concept C (directly, or
 *      transitively through C's own declared prerequisites),
 *   3. C's foundational evidence — observations BELOW the cleared rung, on
 *      items that exercise C — is repeatedly failing (>= minConceptObservations
 *      and ratio <= the negative threshold).
 *
 * Anything else is not a contradiction. Failure in an unrelated branch, a lower
 * CEFR failure with no declared dependency, mixed evidence across independent
 * topics, and sparse evidence all fall through and are reported as uncertainty
 * by the caller.
 */
export function detectDependencyContradictions({ domain, cells, ledger, index, config }) {
  if (!config.prerequisite.enabled) return [];

  const ladder = index.levelsForDomain(domain);
  const conceptEv = buildConceptEvidence(ledger, index, config, {
    domain: config.prerequisite.crossDomainEvidence ? null : domain,
  });
  const { anchorOf } = conceptStructures(index);
  const found = [];
  const seenConcepts = new Set();

  const clearedRungs = ladder.filter((l) => cells.get(`${domain}|${l}`)?.outcome === "cleared");

  for (const level of clearedRungs) {
    const lvIdx = levelIndex(level);

    // The observations that actually established this rung.
    const supporting = ledger.observations.filter(
      (o) => o.domain === domain && o.level === level &&
             o.status === EVAL_STATUS.SCORED &&
             o.credit >= config.prerequisite.supportingCreditMin
    );
    if (!supporting.length) continue;

    const direct = new Set();
    for (const o of supporting) for (const c of prereqsOf(o, index)) direct.add(c);
    if (!direct.size) continue;

    const closure = prerequisiteClosure(direct, index, config);

    for (const [conceptId, hops] of closure) {
      if (seenConcepts.has(conceptId)) continue;

      // A concept anchored at or above the cleared rung is not foundational to
      // it — there is nothing "underneath" to have failed.
      const anchorIdx = anchorOf.get(conceptId);
      if (anchorIdx === undefined || anchorIdx >= lvIdx) continue;

      const below = conceptEvidenceBelow(conceptEv.get(conceptId), lvIdx);

      // Sparse evidence is uncertainty, never contradiction (requirement 5).
      if (below.n < config.prerequisite.minConceptObservations) continue;
      if (below.ratio > config.evidence.ratios.negative) continue;

      const failingObs = (conceptEv.get(conceptId)?.observations ?? [])
        .filter((x) => levelIndex(x.level) < lvIdx && x.credit <= config.evidence.ratios.negative);

      // The rung the conservative reading has to fall below: the highest level
      // at which this prerequisite is actually failing.
      const failingLevel = failingObs.length
        ? failingObs.reduce((a, b) => (levelIndex(b.level) > levelIndex(a.level) ? b : a)).level
        : below.levels[below.levels.length - 1] ?? PLACEMENT_LEVELS[0];

      seenConcepts.add(conceptId);
      found.push({
        type: hops === 1 ? "direct_prerequisite_conflict" : "transitive_prerequisite_conflict",
        concept: conceptId,
        hops,
        clearedAt: level,
        failingLevel,
        clearedEvidence: cells.get(`${domain}|${level}`) ?? null,
        // Preserved verbatim — the earlier evidence is never overwritten.
        prerequisiteEvidence: {
          observations: below.n,
          ratio: Number(below.ratio.toFixed(4)),
          levels: below.levels,
          itemIds: failingObs.map((x) => x.itemId),
          branches: [...new Set(failingObs.map((x) => x.branch).filter(Boolean))],
          topics: [...new Set(failingObs.map((x) => x.topic).filter(Boolean))],
        },
        supportingItemIds: supporting.map((o) => o.itemId),
        resolution: config.contradiction.resolution,
        detail:
          `Cleared ${level} on evidence that declares "${conceptId}" as a prerequisite` +
          (hops > 1 ? ` (${hops} steps down the declared prerequisite chain)` : "") +
          `, while that prerequisite's own evidence below ${level} is failing ` +
          `(${below.n} observations, ratio ${below.ratio.toFixed(2)}). This is a conflict ` +
          `across a declared learning dependency, not merely a lower CEFR result.`,
      });
    }
  }
  return found;
}

/**
 * Lower-rung failures in this domain that are NOT dependency conflicts.
 *
 * These are the ordinary case in a broad domain: a weak topic in one branch
 * alongside a strong topic in another. They are reported as uncertainty and
 * shade confidence down slightly; they never downgrade a placement.
 */
export function independentLowerFailures({ domain, cells, index, contradictions, highestCleared }) {
  if (!highestCleared) return [];
  const conflicted = new Set(contradictions.map((c) => c.failingLevel));
  return index.levelsForDomain(domain).filter(
    (l) => levelIndex(l) < levelIndex(highestCleared) &&
           cells.get(`${domain}|${l}`)?.outcome === "failed" &&
           !conflicted.has(l)
  );
}

/**
 * Whole-run dependency analysis, computed once per selection/placement pass.
 * @returns {{byDomain: Record<string, Array>}}
 */
export function analyzeDependencies(ledger, cells, index, config) {
  const byDomain = {};
  for (const domain of index.domainIds) {
    byDomain[domain] = detectDependencyContradictions({ domain, cells, ledger, index, config });
  }
  return { byDomain };
}

export const _internal = { conceptStructures, prereqsOf };
