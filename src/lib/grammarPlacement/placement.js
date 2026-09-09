// Grammar Placement Engine — domain placement, confidence, aggregation. PURE.
//
// Produces a GRAMMAR-ONLY profile. Nothing here speaks for vocabulary,
// reading, listening, writing or speaking, and nothing here may be written to
// User.cefr_level (requirement 12).
//
// The honesty rule (requirement 2) shows up in the output shape: every domain
// result separates what was OBSERVED from what was INFERRED. A learner who
// cleared B1 without ever being asked an A1 question is reported as
// `estimatedLevel: "B1"` with `untestedBelow: ["A1","A2"]` — not as somebody
// with verified A1 and A2. The inference is stated as an inference.

import {
  PLACEMENT_LEVELS, levelIndex, levelAbove, levelBelow,
  comparableIndex, levelFromComparableIndex,
} from "@/lib/grammarPlacement/levels";
import { cellKey } from "@/lib/grammarPlacement/evidence";
import { independentLowerFailures } from "@/lib/grammarPlacement/prerequisites";

export const BASIS = {
  VERIFIED: "verified",           // highest cleared rung was directly observed
  // A rung above was observed as FAILED, nothing below it was observed as
  // cleared, so the estimate one rung down is a reasoned inference from a real
  // observation — not a measurement, and not nothing. Kept distinct from
  // UNASSESSED precisely because conflating the two would either throw away a
  // usable signal or dress an inference up as a verified result.
  INFERRED: "inferred",
  CONTRADICTED: "contradicted",   // placed conservatively below an unresolved gap
  BELOW_FLOOR: "below_floor",     // failed the lowest rung this domain can assess
  UNASSESSED: "unassessed",       // no usable observed evidence at all
};

const band = (score, config) =>
  score <= config.confidence.lowMax ? "low"
    : score <= config.confidence.mediumMax ? "medium"
      : "high";

/** Compact per-rung record of what was actually observed. */
function observedRungs(domain, ladder, cells) {
  const out = {};
  for (const level of ladder) {
    const c = cells.get(cellKey(domain, level));
    if (!c || c.observed === 0) continue;
    out[level] = {
      observed: c.observed,
      ratio: c.ratio,
      state: c.state,
      outcome: c.outcome,
      classes: c.classesSeen,
      aiObservations: c.aiObservations,
      evaluationFailures: c.evaluationFailures,
    };
  }
  return out;
}

function computeConfidence(domain, result, ladder, cells, config) {
  const reasons = [];
  const at = (l) => (l ? cells.get(cellKey(domain, l)) : null);

  if (result.basis === BASIS.UNASSESSED) {
    return { score: 0.1, band: "low", reasons: ["no decisive evidence observed"] };
  }
  if (result.basis === BASIS.INFERRED) {
    reasons.push("estimate inferred from a failure above; no rung was observed as cleared");
  }

  const est = result.estimatedLevel;
  const above = est ? levelAbove(est) : ladder[0];
  const cEst = at(est);
  const cAbove = at(above);

  let score = 0.10;

  // Volume at the decisive rungs.
  const minObs = cEst?.minObservations ?? config.evidence.minObservations;
  const nDecisive = (cEst?.observed ?? 0) + (cAbove?.observed ?? 0);
  const volume = Math.min(1, nDecisive / Math.max(1, minObs * 2));
  score += volume * 0.30;
  if (volume < 0.5) reasons.push("few observations at the decisive rungs");

  // Consistency: how far the estimate rung's ratio sits from a coin flip.
  if (cEst?.observed) {
    const consistency = Math.min(1, Math.abs(cEst.ratio - 0.5) * 2);
    score += consistency * 0.20;
    if (consistency < 0.4) reasons.push("mixed performance at the estimated rung");
  }

  // Boundary sharpness: is the rung above actually failed, or merely unprobed?
  if (!above || !ladder.includes(above)) {
    score += 0.15;
    reasons.push("at this domain's coverage ceiling — nothing above to probe");
  } else if (cAbove?.outcome === "failed") {
    score += 0.25;
  } else if (cAbove?.outcome === "borderline") {
    score += 0.12;
    reasons.push("the rung above is borderline rather than clearly failed");
  } else {
    score += 0.05;
    reasons.push("the rung above was never probed to a conclusion");
  }

  // Evidence-class diversity at the estimate.
  if ((cEst?.classesSeen?.length ?? 0) >= 2) score += 0.10;
  else { score += 0.03; reasons.push("only one evidence class observed at the estimated rung"); }

  // AI dependence penalty.
  const aiShare = nDecisive ? ((cEst?.aiObservations ?? 0) + (cAbove?.aiObservations ?? 0)) / nDecisive : 0;
  if (aiShare > 0) {
    score -= aiShare * 0.10;
    if (aiShare >= 0.5) reasons.push("decisive evidence leans on AI-graded production");
  }

  // Independent lower-rung failures are uncertainty, not conflict: they shade
  // confidence down, they never cap it and never move the placement.
  if (result.independentLowerFailures?.length) {
    score -= config.contradiction.independentLowerFailurePenalty;
    reasons.push(`mixed performance at ${result.independentLowerFailures.join(", ")} in other branches`);
  }

  // Hard caps.
  if (result.contradictions.length) {
    score = Math.min(score, 0.40);
    reasons.push("unresolved conflict across a declared prerequisite");
  }
  if (est === "C2" || result.c2Probed) {
    score = Math.min(score, config.c2.confidenceCap);
    reasons.push("C2 coverage is sparse — confidence is capped by design");
  }
  if (result.basis === BASIS.BELOW_FLOOR) {
    reasons.push(`this domain has no content below ${result.floorLevel}`);
  }

  score = Math.max(0, Math.min(1, score));
  return { score: Number(score.toFixed(3)), band: band(score, config), reasons };
}

/**
 * Place one domain from observed evidence only.
 *
 * @param {object} [deps] whole-run dependency analysis from
 *        prerequisites.analyzeDependencies(). Omitted, no contradiction can be
 *        raised — CEFR ordering by itself never creates one.
 */
export function placeDomain(domain, cells, index, config, deps = null) {
  const ladder = index.levelsForDomain(domain);
  const at = (l) => cells.get(cellKey(domain, l));
  const floorLevel = ladder[0] ?? null;
  const maxAssessableLevel = ladder[ladder.length - 1] ?? null;

  const cleared = ladder.filter((l) => at(l)?.outcome === "cleared");
  const failed = ladder.filter((l) => at(l)?.outcome === "failed");
  const highestCleared = cleared.length ? cleared[cleared.length - 1] : null;
  const lowestFailed = failed.length ? failed[0] : null;

  // The boundary above the cleared rung. A failure BELOW a cleared rung is not
  // a ceiling and must not be read as one — see analyzeDomain for why.
  const ceilingFailed = highestCleared
    ? (failed.find((l) => levelIndex(l) > levelIndex(highestCleared)) ?? null)
    : lowestFailed;

  // Contradictions come from the dependency analysis, never from CEFR order.
  const contradictions = (deps?.byDomain?.[domain] ?? []).map((c) => ({ ...c }));

  // Lower-rung failures with no declared dependency on what was cleared. These
  // are the normal shape of a broad domain — a weak branch beside a strong one.
  // They are uncertainty, not conflict, and never downgrade the placement.
  const independentFailures = independentLowerFailures({
    domain, cells, index, contradictions, highestCleared,
  });

  let estimatedLevel = null;
  let basis = BASIS.UNASSESSED;
  let belowFloor = false;
  let verifiedLevel = highestCleared;

  if (highestCleared && contradictions.length) {
    // A genuine conflict across a declared learning dependency. Do not average,
    // do not silently prefer either reading — both sides stay on the record and
    // placement follows the configured resolution.
    if (config.contradiction.resolution === "optimistic") {
      estimatedLevel = highestCleared;
      basis = BASIS.CONTRADICTED;
    } else {
      // Fall below the highest rung at which a declared prerequisite is
      // actually failing — not below some unrelated lower failure.
      const bindingLevel = contradictions
        .map((c) => c.failingLevel)
        .reduce((a, b) => (levelIndex(b) > levelIndex(a) ? b : a));
      const below = levelBelow(bindingLevel);
      if (!below || !ladder.includes(below)) {
        belowFloor = true;
        estimatedLevel = null;
        basis = BASIS.BELOW_FLOOR;
      } else {
        estimatedLevel = below;
        basis = BASIS.CONTRADICTED;
      }
    }
  } else if (highestCleared) {
    estimatedLevel = highestCleared;
    basis = BASIS.VERIFIED;
  } else if (lowestFailed) {
    const below = levelBelow(lowestFailed);
    if (!below || !ladder.includes(below)) {
      belowFloor = true;
      basis = BASIS.BELOW_FLOOR;
    } else {
      // Failed a rung with nothing cleared beneath it: the level below is a
      // working estimate inferred from a real observation, but it was never
      // itself observed. Say exactly that.
      estimatedLevel = below;
      basis = BASIS.INFERRED;
    }
  }

  const estIdx = estimatedLevel ? levelIndex(estimatedLevel) : -1;
  const untestedBelow = ladder.filter(
    (l) => levelIndex(l) <= estIdx && (at(l)?.observed ?? 0) === 0
  );
  const untestedAbove = ladder.filter(
    (l) => levelIndex(l) > estIdx && (at(l)?.observed ?? 0) === 0
  );

  const atCoverageCeiling = Boolean(
    estimatedLevel && maxAssessableLevel && estimatedLevel === maxAssessableLevel &&
    levelIndex(maxAssessableLevel) < PLACEMENT_LEVELS.length - 1
  );

  const c2Probed = (at("C2")?.observed ?? 0) > 0;

  const result = {
    domain,
    estimatedLevel,
    basis,
    belowFloor,
    // The highest rung whose clearance was DIRECTLY OBSERVED. Null means the
    // estimate is inferred, not measured — the distinction requirement 2 is about.
    verifiedLevel: basis === BASIS.VERIFIED || basis === BASIS.CONTRADICTED ? verifiedLevel : null,
    // True when estimatedLevel rests on inference rather than an observed
    // clearance at that rung. Consumers rendering a level should surface this.
    inferred: basis === BASIS.INFERRED,
    floorLevel,
    maxAssessableLevel,
    atCoverageCeiling,
    c2Probed,
    observedRungs: observedRungs(domain, ladder, cells),
    // Levels at or below the estimate that were never asked about. Their
    // competence is INFERRED from the higher clearance, never observed.
    untestedBelow,
    untestedAbove,
    contradictions,
    // Failed rungs below the estimate with no declared dependency on it.
    // Reported so the profile stays honest about mixed performance, without
    // that mixture being mistaken for a logical conflict.
    independentLowerFailures: independentFailures,
    ceilingFailed,
    notes: [],
  };

  if (untestedBelow.length) {
    result.notes.push(
      `Levels ${untestedBelow.join(", ")} were not tested. Competence there is inferred from ` +
      `higher-level performance, not directly observed.`
    );
  }
  if (atCoverageCeiling) {
    result.notes.push(
      `${maxAssessableLevel} is the highest level this domain currently has content for; ` +
      `anything above it was not assessed.`
    );
  }
  if (basis === BASIS.BELOW_FLOOR) {
    result.notes.push(
      `Performance was below ${floorLevel}, the lowest level this domain has content for.`
    );
  }
  if (basis === BASIS.INFERRED) {
    result.notes.push(
      `${lowestFailed} was not passed and no lower rung was tested, so ${estimatedLevel} is ` +
      `inferred rather than directly observed.`
    );
  }
  if (independentFailures.length) {
    result.notes.push(
      `Weaker performance at ${independentFailures.join(", ")} sits below the estimate, but ` +
      `nothing cleared here declares a prerequisite that those results contradict — in a domain ` +
      `this broad that is ordinary variation between branches, not a conflict. Recorded as ` +
      `uncertainty; it lowers confidence but does not lower the placement.`
    );
  }
  if (contradictions.length) {
    result.notes.push(
      `A declared prerequisite (${contradictions.map((c) => c.concept).join(", ")}) is failing ` +
      `beneath cleared higher-level evidence. Placement is conservative until that resolves.`
    );
  }

  result.confidence = computeConfidence(domain, result, ladder, cells, config);
  return result;
}

/**
 * Aggregate the 13 domain results into one grammar-only summary.
 *
 * Rule 1 (floor share): the highest rung at or above which `floorShare` of the
 * assessed domains sit. Tolerates one or two weak outliers without letting a
 * single strong domain inflate the answer.
 *
 * Rule 2 (core guard): the summary may not exceed the weakest assessed core
 * domain by more than `maxRungsAboveWeakestCore`. The core set is PROVISIONAL
 * configuration, not a curriculum ruling — see config.js.
 */
export function aggregateOverall(domainResults, config) {
  // Inferred placements count toward the summary: they rest on a real observed
  // failure, and excluding them would quietly drop the weakest domains from the
  // aggregate, biasing every summary upward.
  const assessed = domainResults.filter((d) => d.basis !== BASIS.UNASSESSED || d.belowFloor);
  const unassessed = domainResults.filter((d) => !assessed.includes(d)).map((d) => d.domain);

  if (!assessed.length) {
    return {
      level: null, belowA1: false, confidence: { score: 0, band: "low", reasons: ["nothing assessed"] },
      rationale: { boundBy: "no_evidence", detail: "No domain gathered enough evidence to place." },
      assessedDomains: 0, unassessedDomains: unassessed,
      coreGuard: { applied: false, provisional: config.coreDomains.provisional },
    };
  }

  const idxOf = (d) => comparableIndex(d.estimatedLevel, { belowFloor: d.belowFloor, floorLevel: d.floorLevel });
  const indices = assessed.map(idxOf).filter((v) => v != null);

  // Rule 1
  let floorIdx = -1;
  for (let i = PLACEMENT_LEVELS.length - 1; i >= 0; i -= 1) {
    const share = indices.filter((v) => v >= i).length / indices.length;
    if (share >= config.overall.floorShare) { floorIdx = i; break; }
  }

  // Rule 2
  let boundBy = "floor_share";
  let capIdx = Infinity;
  const coreAssessed = assessed.filter((d) => config.coreDomains.ids.includes(d.domain));
  const coreApplied = config.overall.applyCoreGuard && config.coreDomains.enabled && coreAssessed.length > 0;
  if (coreApplied) {
    const weakestCore = Math.min(...coreAssessed.map(idxOf));
    capIdx = weakestCore + config.coreDomains.maxRungsAboveWeakestCore;
    if (capIdx < floorIdx) boundBy = "core_guard";
  }

  const finalIdx = Math.min(floorIdx, capIdx);
  const level = levelFromComparableIndex(finalIdx);

  // Confidence: mean of assessed domains, capped by the weakest core domain.
  const mean = assessed.reduce((s, d) => s + d.confidence.score, 0) / assessed.length;
  let score = mean;
  const capReasons = [];
  if (coreApplied) {
    const minCore = Math.min(...coreAssessed.map((d) => d.confidence.score));
    if (minCore < score) {
      score = minCore;
      capReasons.push("capped by the least confident core domain");
    }
  }
  if (unassessed.length) capReasons.push(`${unassessed.length} domain(s) not assessed`);

  const detail = boundBy === "core_guard"
    ? `${Math.round(config.overall.floorShare * 100)}% floor gave ${levelFromComparableIndex(floorIdx) ?? "below A1"}; ` +
      `the weakest assessed core domain caps the summary at ${level ?? "below A1"}.`
    : `${Math.round(config.overall.floorShare * 100)}% of assessed domains sit at ${level ?? "below A1"} or above.`;

  return {
    level,
    belowA1: finalIdx < 0,
    confidence: { score: Number(score.toFixed(3)), band: band(score, config), reasons: capReasons },
    rationale: { boundBy, detail, floorShare: config.overall.floorShare },
    assessedDomains: assessed.length,
    unassessedDomains: unassessed,
    coreGuard: {
      applied: coreApplied && boundBy === "core_guard",
      enabled: coreApplied,
      // Carried into every stored result so no consumer mistakes this for a
      // settled curriculum decision.
      provisional: config.coreDomains.provisional,
      ids: config.coreDomains.ids,
    },
  };
}

/** Full grammar profile: per-domain results plus the grammar-only summary. */
export function buildProfile(cells, index, config, meta = {}) {
  const domains = index.domainIds.map((d) => placeDomain(d, cells, index, config, meta.deps ?? null));
  const overall = aggregateOverall(domains, config);
  return {
    scope: "grammar",
    // Explicit and machine-readable: this profile is not authoritative for any
    // other skill and must never be written to User.cefr_level.
    authoritativeFor: ["grammar"],
    overall,
    domains,
    generatedAt: meta.generatedAt ?? null,
    configVersion: config.version,
  };
}
