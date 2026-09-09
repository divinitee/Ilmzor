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
// WHAT THE DATASET ACTUALLY DECLARES
//
//   item -> prerequisites[]        EXPLICIT. Every dependency used here.
//   concept -> prerequisiteConcepts[]   DOES NOT EXIST.
//
// V1 uses only the explicit relation. If an item declares
// [present-simple, third-person-s], that proves both concepts are prerequisites
// OF THAT ITEM. It proves nothing about a relationship BETWEEN them — not
// present-simple -> third-person-s, nor the reverse. An earlier version of this
// module derived concept-to-concept edges by walking items and using CEFR
// anchor order to orient them. That inference is not sound: anchor ordering
// only constrains such an edge, it never justifies one. It has been removed,
// along with the transitive detection built on top of it.
//
// TRANSITIVE DETECTION IS DEFERRED, NOT REPLACED. There is deliberately no
// substitute heuristic here. It will be reconsidered only once the taxonomy
// defines explicit concept -> prerequisiteConcepts[] edges, and must then be
// derived from those edges rather than inferred from item co-occurrence.

import { EVAL_STATUS } from "@/lib/grammarPlacement/scoring";
import { levelIndex } from "@/lib/grammarPlacement/levels";

/** Concepts an observation's item declares, preferring the ledger's own copy. */
function prereqsOf(obs, index) {
  if (Array.isArray(obs.prerequisites)) return obs.prerequisites;
  return index.getItem(obs.itemId)?.prerequisites ?? [];
}

/**
 * Evidence gathered per concept, broken down by CEFR level so a caller can ask
 * specifically about the FOUNDATIONAL evidence below some rung.
 *
 * A concept's evidence is the set of observations on items that explicitly
 * declare it. Only scored observations count; evaluation failures and skips are
 * invisible here exactly as they are in the main evidence ledger.
 *
 * @param {object} opts.domain  when set, restrict to observations in this
 *        domain. Contradiction analysis uses this: a concept can be exercised
 *        in more than one domain, but letting evidence gathered in one domain
 *        downgrade another is a cascade that has to be opted into.
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
      e.observations.push({
        itemId: o.itemId, level: o.level, credit: o.credit,
        domain: o.domain, branch: o.branch ?? null, topic: o.topic ?? null,
      });
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
 * THE COMPLETE V1 MODEL. A contradiction requires ALL of:
 *   1. a rung in this domain was CLEARED;
 *   2. the observations that cleared it EXPLICITLY declare concept C in their
 *      own `prerequisites[]` — direct declaration only, no derived edges;
 *   3. the session holds foundational evidence directly exercising C, below the
 *      cleared rung, of at least `minConceptObservations`;
 *   4. that evidence is repeatedly failing (ratio <= the negative threshold).
 *
 * Anything else is not a contradiction. Failure in an unrelated branch, a lower
 * CEFR failure on a concept the cleared evidence never declared, mixed results
 * across independent topics, and sparse evidence all fall through and are
 * reported as uncertainty by the caller.
 */
export function detectDependencyContradictions({ domain, cells, ledger, index, config }) {
  if (!config.prerequisite.enabled) return [];

  const ladder = index.levelsForDomain(domain);
  const conceptEv = buildConceptEvidence(ledger, index, config, {
    domain: config.prerequisite.crossDomainEvidence ? null : domain,
  });
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

    // Concepts these cleared items explicitly declare. This set is used as-is:
    // it is never expanded through a derived concept graph.
    const declared = new Set();
    for (const o of supporting) for (const c of prereqsOf(o, index)) declared.add(c);

    for (const conceptId of declared) {
      if (seenConcepts.has(conceptId)) continue;

      const below = conceptEvidenceBelow(conceptEv.get(conceptId), lvIdx);

      // Sparse evidence is uncertainty, never contradiction.
      if (below.n < config.prerequisite.minConceptObservations) continue;
      if (below.ratio > config.evidence.ratios.negative) continue;

      const failingObs = (conceptEv.get(conceptId)?.observations ?? [])
        .filter((x) => levelIndex(x.level) < lvIdx && x.credit <= config.evidence.ratios.negative);

      // The rung the conservative reading has to fall below: the highest level
      // at which this declared prerequisite is actually failing.
      const failingLevel = failingObs.length
        ? failingObs.reduce((a, b) => (levelIndex(b.level) > levelIndex(a.level) ? b : a)).level
        : below.levels[below.levels.length - 1];
      if (!failingLevel) continue;

      seenConcepts.add(conceptId);
      found.push({
        type: "direct_prerequisite_conflict",
        concept: conceptId,
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
          `Cleared ${level} on evidence that explicitly declares "${conceptId}" as a ` +
          `prerequisite, while evidence directly exercising that concept below ${level} is ` +
          `failing (${below.n} observations, ratio ${below.ratio.toFixed(2)}). This is a ` +
          `conflict across a declared learning dependency, not merely a lower CEFR result.`,
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

export const _internal = { prereqsOf };
