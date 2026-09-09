// Grammar Placement Engine — the single source of every tunable number.
//
// NOTHING in this engine may hardcode a threshold, a count, a weight or a
// domain list. If a number matters, it lives here. That is what makes a later
// calibration pass a config edit instead of a refactor, and it is what lets a
// stored run be re-scored against new thresholds without re-testing anyone.
//
// PROVISIONAL: none of these values are psychometrically validated. They are
// reasoned defaults chosen against the real V1 dataset's density (measured
// 2026-09-08: 533 items, 73 of 78 domain x level buckets populated, 12 of those
// with fewer than 3 items, almost all at C2). Treat every number as a starting
// estimate that real learner data should move.

import { PLACEMENT_LEVELS } from "@/lib/grammarPlacement/levels";

export const CONFIG_VERSION = "v1";

export const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,

  // -------------------------------------------------------------------------
  // Evidence sufficiency, per (domain x level) cell
  // -------------------------------------------------------------------------
  evidence: {
    // Observations needed before a cell can leave `insufficient`. Reduced
    // automatically to whatever the dataset can actually supply for that cell
    // — see effectiveMinObservations() in evidence.js. 12 real buckets hold
    // fewer than 3 items, so a rigid 3 would make them permanently unusable.
    //
    // WHY 2, not 3: there are 13 domains and a ~45-item ceiling. Requiring 3
    // observations before a rung can be read at all costs 39 items to give
    // every domain one readable rung, before a single boundary is probed — so
    // a 3-minimum leaves most domains unplaced within any acceptable test
    // length. At n=2 the read is a clean three-way split (1.0 clears, 0.0
    // fails, 0.5 is borderline and attracts another probe), and confidence
    // reporting already carries the thinness of that evidence.
    minObservations: 2,
    // Never spend more than this on one cell, however uncertain it stays.
    // At n=4 the reachable ratios are 0, .25, .5, .75, 1 — a cell still sitting
    // at .5 after four items is a genuine coin flip, and further items buy
    // very little. Leaving this at 6 let borderline rungs absorb budget that
    // other domains needed more.
    maxObservations: 4,
    // Positive-evidence ratios. `credit` is normalised 0..1 per observation.
    // WHY 0.65 for confirm rather than 0.70: at the small samples this budget
    // allows, the threshold has to land between reachable fractions. With 3
    // observations the possible ratios are 0, 0.33, 0.67, 1.0 — a 0.70 line
    // leaves 2-of-3 permanently borderline, so a domain could never resolve no
    // matter how many items it was given. 0.65 also sits alongside the app's
    // existing 0.6 pass convention (gameScoring.PASS_THRESHOLD, MCQ_PASS_RATIO)
    // rather than introducing a third, unrelated standard.
    ratios: {
      tentative: 0.50, // >= this and < confirm  -> ambiguous middle
      confirm: 0.65,   // >= this               -> cleared
      strong: 0.85,    // >= this               -> strong
      negative: 0.40,  // <= this               -> failed
    },
  },

  // -------------------------------------------------------------------------
  // Assessment length. Not a fixed target: the engine stops when the evidence
  // is clear and expands while it is not. These bound that behaviour.
  // -------------------------------------------------------------------------
  length: {
    minItems: 22,      // never stop for "sufficient evidence" before this
    softTarget: 34,    // where the value threshold starts tightening
    hardCap: 45,       // normal ceiling
    absoluteCap: 60,   // safety stop; a bug, not a plan, gets you here
  },

  // -------------------------------------------------------------------------
  // AI-evaluated items (free_production / rubric answers)
  // -------------------------------------------------------------------------
  ai: {
    // Hard ceiling on AI-graded items in one run. Bounds both cost and the
    // learner's daily AI allowance, which the legacy placement test could
    // silently exhaust mid-test.
    maxItems: 8,
    // After this many infrastructure failures, stop selecting AI items at all
    // and finish the run on deterministic evidence.
    maxFailures: 3,
    // An AI result is only trusted as learner evidence when its status is
    // "scored". Anything else records an observation with no evidence value.
    // See scoring.js and requirement 10.
  },

  // -------------------------------------------------------------------------
  // Phase 1 — rapid calibration. Binary search on the ladder rather than a
  // climb from A1, using cheap deterministic items only.
  // -------------------------------------------------------------------------
  calibration: {
    startLevel: "B1",
    // WHY 3 items per probe, not 2: a 2-item probe is too noisy to steer a
    // binary search. A learner who gets a rung right 30% of the time still
    // scores 1-of-2 about half the time, so the search climbed past them and
    // anchored high — which then wasted screening items across all 13 domains
    // at rungs the learner could not reach. At 3 items the same learner clears
    // the bar ~22% of the time while a learner genuinely at the rung clears it
    // ~91%. The extra items are repaid several times over in screening.
    itemsPerProbe: 3,
    maxItems: 12,
    // Calibration is a coarse band search, not a placement, so it uses its own
    // rule rather than the evidence model's thresholds: 2 of 3 right at a rung
    // means "try higher". Applying the placement thresholds here was a real
    // bug — a single unlucky answer landed in the ambiguous band and ended the
    // search immediately, anchoring a C1 learner at B1.
    passRatio: 0.66,
    // Bellwether domains: chosen because each spans A1..C2 in the real dataset
    // and each is broad enough that performance correlates with general
    // grammatical control. PROVISIONAL — a curriculum decision, not a
    // measurement.
    domains: ["tenses", "sentence-structure", "nouns-articles", "verb-patterns"],
    // Calibration never spends AI budget.
    evidenceClasses: ["recognition", "controlled_construction"],
  },

  // -------------------------------------------------------------------------
  // Phase 2 — domain screening. One probe per domain at the anchor level.
  // -------------------------------------------------------------------------
  screening: {
    // Two per domain, so every domain reaches the minimum observation count
    // and becomes readable. 13 x 2 = 26 items, plus ~6-8 of calibration, lands
    // a typical run near the soft target with budget left for resolution.
    // Evidence a domain already gathered during calibration counts toward this
    // — bellwether domains are not re-probed.
    itemsPerDomain: 2,
    evidenceClasses: ["recognition", "controlled_construction"],
  },

  // -------------------------------------------------------------------------
  // C2 — a limited ceiling probe, NOT a normally-confirmed rung.
  //
  // The dataset holds 20 C2 items across 12 domains (1-3 each); one domain
  // (prep-phrasal) has none. Normal confirmation is impossible there by
  // construction, so C2 gets its own rules and its own confidence ceiling.
  // -------------------------------------------------------------------------
  c2: {
    enabled: true,
    minObservations: 1,      // a single C2 item may stand as evidence
    maxObservations: 2,      // never spend more than this on C2
    // A C2 success is real evidence but cannot be "confirmed" on this little
    // data — cap what the cell may claim and what confidence may be reported.
    maxState: "tentative",
    // Applies only when the domain's ESTIMATE IS C2, i.e. the placement itself
    // rests on sparse C2 evidence. It deliberately does NOT apply just because
    // C2 was sampled: failing a C2 probe brackets a C1 placement and should
    // raise confidence in it, not lower it.
    confidenceCap: 0.45,     // -> "low" band
    // Only probe C2 at all once C1 is cleared for that domain.
    requiresClearedBelow: true,
  },

  // -------------------------------------------------------------------------
  // Evidence-class requirements per level.
  //
  // DEFAULT: EMPTY — no level requires any particular evidence class.
  // The V1 dataset holds only 48 free_production items and many (domain,level)
  // buckets have none, so requiring free production at higher rungs would make
  // those rungs unreachable for reasons of content, not learner ability.
  // Requirement 3 is explicit that free production must not be required for
  // every advanced topic. Left configurable for when coverage grows, e.g.
  //   requiredEvidenceClasses: { B2: ["controlled_construction"] }
  // -------------------------------------------------------------------------
  requiredEvidenceClasses: {},

  // Preference (not requirement): when several candidates are equally useful,
  // favour a class the cell has not seen yet. Diversity raises confidence
  // without ever blocking a placement.
  evidenceClassDiversityBonus: 0.15,

  // -------------------------------------------------------------------------
  // Prerequisite-aware dependency analysis
  //
  // CEFR order alone never creates a contradiction. A contradiction requires a
  // conflict across a dependency the dataset EXPLICITLY declares, via a cleared
  // item's own `prerequisites[]`. The dataset has no concept -> concept edges,
  // so no concept graph is derived and no transitive detection exists in V1 —
  // see the header of prerequisites.js.
  // -------------------------------------------------------------------------
  prerequisite: {
    enabled: true,
    // "Repeatedly failing" — a single miss on a prerequisite is uncertainty,
    // not a contradiction.
    minConceptObservations: 2,
    // 48 concepts are exercised in more than one domain, so evidence directly
    // exercising a declared prerequisite can live in another domain. Counting
    // it would let one domain downgrade another, which is a cascade worth
    // opting into deliberately rather than shipping on by default. Off keeps
    // contradiction analysis local.
    crossDomainEvidence: false,
    // Minimum credit for an observation to count as "the learner cleared
    // something that explicitly requires this concept".
    supportingCreditMin: 0.5,
  },

  // -------------------------------------------------------------------------
  // Contradiction handling
  // -------------------------------------------------------------------------
  contradiction: {
    // Extra probes spent trying to resolve one contradiction before giving up
    // and placing conservatively.
    maxExtraProbes: 2,
    // Prefer a different item AND a different evidence class when re-probing:
    // a format artefact (a lucky 4-option guess) is a common cause.
    preferDifferentEvidenceClass: true,
    // "conservative" places below the failed lower rung. The alternative,
    // "optimistic", places at the cleared higher rung with a prominent gap
    // warning. Conservative is the default because too-hard content is where
    // learners quit, and placement is an opening estimate that gameplay
    // mastery corrects within days.
    resolution: "conservative",
    // Cap on the share of the total item budget contradictions may consume, so
    // two messy domains cannot starve the other eleven.
    maxBudgetShare: 0.25,
    // Need-weight applied to the two contradicted rungs, overriding whatever
    // their cell state would normally imply. Without this a strongly-failed
    // lower rung and a strongly-cleared upper rung both score need 0 — the
    // state machine considers each settled on its own — and the contradiction
    // between them could never be re-probed at all.
    reprobeNeedWeight: 1.4,
    // A failed lower rung with NO declared dependency on the cleared rung is
    // ordinary variation across independent branches, not a conflict. It never
    // downgrades a placement; it only shades confidence down by this much.
    independentLowerFailurePenalty: 0.10,
  },

  // -------------------------------------------------------------------------
  // Overall grammar aggregation
  //
  // NOTE: this produces a GRAMMAR-only summary. It must never be written to
  // User.cefr_level or treated as authoritative for any other skill.
  // -------------------------------------------------------------------------
  overall: {
    // Rule 1: the highest rung at or above which this share of assessed
    // domains sits.
    floorShare: 0.60,
    // Rule 2: the core-domain guard, below.
    applyCoreGuard: true,
  },

  // -------------------------------------------------------------------------
  // Core-domain guard.
  //
  // PROVISIONAL DEFAULT — NOT a curriculum ruling. This set was proposed by
  // the engine architecture, has not been ratified by the curriculum owner,
  // and is isolated here specifically so it can be changed without touching
  // engine logic. `provisional: true` is carried into every stored result so
  // no downstream consumer mistakes it for a settled decision.
  // -------------------------------------------------------------------------
  coreDomains: {
    enabled: true,
    provisional: true,
    ids: ["tenses", "nouns-articles", "questions-negation", "sentence-structure"],
    // Overall may not exceed the weakest assessed core domain by more than
    // this many rungs.
    maxRungsAboveWeakestCore: 1,
    // Small selection boost, since overall is more sensitive to these.
    selectionWeight: 1.2,
  },

  // -------------------------------------------------------------------------
  // Selection tuning
  // -------------------------------------------------------------------------
  selection: {
    // Below this value nothing is worth asking; contributes to stopping.
    minValue: 0.05,
    // Value multipliers by cell state — how much more evidence would help.
    needWeight: {
      untested: 1.0,
      insufficient: 1.2,
      tentative: 1.5,
      confirmed: 0.3,
      strong: 0.0,
    },
    // Distance decay applied to cells away from a domain's decision frontier.
    offFrontierDecay: 0.35,
    // Difficulty preference: 2 (typical) to establish, 3 to confirm an upper
    // bound, 1 when a learner is struggling at the rung.
    difficultyPreference: { establish: 2, confirmUpper: 3, struggling: 1 },
  },

  // Confidence band boundaries on the internal 0..1 scale.
  confidence: {
    lowMax: 0.45,
    mediumMax: 0.75,
  },
};

// Deep-merge an override map over the defaults. Only plain objects merge;
// arrays and scalars replace wholesale, which is what callers expect for
// things like coreDomains.ids.
export function resolveConfig(overrides = {}) {
  const merge = (base, over) => {
    if (!over || typeof over !== "object" || Array.isArray(over)) return over ?? base;
    const out = { ...base };
    for (const k of Object.keys(over)) {
      out[k] = base && typeof base[k] === "object" && !Array.isArray(base[k])
        ? merge(base[k], over[k])
        : over[k];
    }
    return out;
  };
  const cfg = merge(DEFAULT_CONFIG, overrides);
  // Cheap sanity checks — a misconfigured ladder is worth failing loudly on.
  const r = cfg.evidence.ratios;
  if (!(r.negative < r.tentative && r.tentative < r.confirm && r.confirm < r.strong)) {
    throw new Error("grammarPlacement config: evidence.ratios must be strictly increasing (negative < tentative < confirm < strong)");
  }
  if (cfg.length.minItems > cfg.length.hardCap) {
    throw new Error("grammarPlacement config: length.minItems exceeds length.hardCap");
  }
  for (const l of Object.keys(cfg.requiredEvidenceClasses)) {
    if (!PLACEMENT_LEVELS.includes(l)) {
      throw new Error(`grammarPlacement config: requiredEvidenceClasses has unknown level ${l}`);
    }
  }
  return cfg;
}
