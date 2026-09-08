// Grammar Placement Engine — the orchestrator. PURE.
//
// No React, no Base44, no fetch, no Date.now(), no Math.random(). Every
// function here takes state in and returns new state out. The impure work —
// loading the dataset, calling the AI grader, writing to storage — lives in
// session.js, which drives this.
//
//   const { state } = createSession({ index, config, seed, runId, startedAt });
//   let s = state;
//   for (;;) {
//     const step = selectNext(s, index, config, { allowAi });
//     s = step.state;
//     if (step.action === "complete") break;
//     // ...render step.item, collect a response, evaluate if needed...
//     s = applyResponse(s, index, config, { itemId, response, evaluation, at });
//   }
//   const run = finalize(s, index, config, { completedAt });

import { PLACEMENT_LEVELS, levelIndex } from "@/lib/grammarPlacement/levels";
import { CONFIG_VERSION, resolveConfig } from "@/lib/grammarPlacement/config";
import {
  createLedger, recordObservation, deriveCells, evidentialCount,
  evaluationFailures, aiAttemptCount, aiFailureCount,
} from "@/lib/grammarPlacement/evidence";
import { EVAL_STATUS, scoreDeterministic, requiresAiEvaluation } from "@/lib/grammarPlacement/scoring";
import {
  mulberry32, analyzeDomain, selectCalibrationItem, advanceCalibration,
  selectScreeningItem, selectResolutionItem,
} from "@/lib/grammarPlacement/selection";
import { buildProfile } from "@/lib/grammarPlacement/placement";

export const ENGINE_VERSION = "1.0.0";

export const PHASES = { CALIBRATION: "calibration", SCREENING: "screening", RESOLUTION: "resolution", COMPLETE: "complete" };

export const STOP_REASONS = {
  SUFFICIENT: "sufficient_evidence",
  NO_VALUE: "no_further_value",
  DATASET_EXHAUSTED: "dataset_exhausted",
  HARD_CAP: "hard_cap",
  ABSOLUTE_CAP: "absolute_cap",
  ABANDONED: "abandoned",
};

/**
 * @param {object} args
 * @param {object} args.index   from buildIndex()
 * @param {object} [args.config] overrides merged over DEFAULT_CONFIG
 * @param {number} [args.seed]   deterministic tie-breaking seed
 * @param {string} args.runId
 * @param {string} [args.startedAt] ISO string supplied by the caller (no clock here)
 */
export function createSession({ index, config: overrides, seed = 1, runId, startedAt = null }) {
  const config = resolveConfig(overrides);
  const startIdx = levelIndex(config.calibration.startLevel);
  const state = {
    runId,
    engineVersion: ENGINE_VERSION,
    configVersion: config.version ?? CONFIG_VERSION,
    seed,
    startedAt,
    phase: config.calibration.maxItems > 0 ? PHASES.CALIBRATION : PHASES.SCREENING,
    ledger: createLedger(),
    itemsServed: 0,
    aiItemsServed: 0,
    aiFailures: 0,
    contradictionItems: 0,
    anchorLevel: config.calibration.startLevel,
    calibration: {
      lo: 0,
      hi: PLACEMENT_LEVELS.length - 1,
      probeLevel: config.calibration.startLevel,
      servedAtProbe: 0,
      domainCursor: 0,
      done: config.calibration.maxItems <= 0,
      anchorIndex: startIdx,
    },
    pending: null,
    stopped: null,
    substitutions: [],
  };
  return { state, config, index };
}

/** Everything the selectors need that is derived rather than stored. */
function buildContext(state, index, config, { allowAi = true } = {}) {
  const cells = deriveCells(state.ledger, index, config);
  const aiBudgetLeft =
    state.aiItemsServed < config.ai.maxItems && state.aiFailures < config.ai.maxFailures;
  return {
    cells,
    anchorLevel: state.anchorLevel,
    allowAi: Boolean(allowAi) && aiBudgetLeft,
    rng: mulberry32(state.seed + state.itemsServed * 2654435761),
    contradictionItems: state.contradictionItems,
    contradictionBudget: Math.floor(config.length.hardCap * config.contradiction.maxBudgetShare),
  };
}

function stop(state, reason) {
  return { ...state, phase: PHASES.COMPLETE, pending: null, stopped: { reason } };
}

/**
 * Choose the next item, advancing phases as needed.
 * @returns {{state, action:"ask"|"complete", item?, meta?, reason?}}
 */
export function selectNext(state, index, config, opts = {}) {
  if (state.stopped) return { state, action: "complete", reason: state.stopped.reason };

  // Safety caps first — these bind regardless of phase.
  if (state.itemsServed >= config.length.absoluteCap) {
    const s = stop(state, STOP_REASONS.ABSOLUTE_CAP);
    return { state: s, action: "complete", reason: s.stopped.reason };
  }
  if (state.itemsServed >= config.length.hardCap) {
    const s = stop(state, STOP_REASONS.HARD_CAP);
    return { state: s, action: "complete", reason: s.stopped.reason };
  }

  let s = state;
  let ctx = buildContext(s, index, config, opts);

  // ---- Phase 1: calibration ------------------------------------------------
  if (s.phase === PHASES.CALIBRATION) {
    const pick = selectCalibrationItem(s, index, config, ctx);
    if (pick) {
      s = { ...s, calibration: { ...s.calibration, domainCursor: (pick.cursorUsed + 1) % Math.max(1, config.calibration.domains.length) } };
      const level = pick.item.cefrLevel;
      if (level !== pick.probeLevel) {
        s = { ...s, substitutions: [...s.substitutions, { itemId: pick.item.id, wanted: pick.probeLevel, served: level, domain: pick.domain, phase: PHASES.CALIBRATION }] };
      }
      s = { ...s, pending: { itemId: pick.item.id, domain: pick.item.domain, level, phase: PHASES.CALIBRATION, probeLevel: pick.probeLevel } };
      return { state: s, action: "ask", item: pick.item, meta: { phase: PHASES.CALIBRATION, probeLevel: pick.probeLevel } };
    }
    // Calibration cannot continue — settle the anchor and move on.
    s = finishCalibration(s, config);
    ctx = buildContext(s, index, config, opts);
  }

  // ---- Phase 2: screening --------------------------------------------------
  if (s.phase === PHASES.SCREENING) {
    const pick = selectScreeningItem(s, index, config, ctx);
    if (pick) {
      if (pick.item.cefrLevel !== s.anchorLevel) {
        s = { ...s, substitutions: [...s.substitutions, { itemId: pick.item.id, wanted: s.anchorLevel, served: pick.item.cefrLevel, domain: pick.domain, phase: PHASES.SCREENING }] };
      }
      s = { ...s, pending: { itemId: pick.item.id, domain: pick.item.domain, level: pick.item.cefrLevel, phase: PHASES.SCREENING } };
      return { state: s, action: "ask", item: pick.item, meta: { phase: PHASES.SCREENING } };
    }
    s = { ...s, phase: PHASES.RESOLUTION };
    ctx = buildContext(s, index, config, opts);
  }

  // ---- Phase 3: resolution -------------------------------------------------
  const pick = selectResolutionItem(s, index, config, ctx);

  if (!pick) {
    // Nothing worth asking. Distinguish "we know enough" from "we ran out".
    const anySupply = index.domainIds.some((d) =>
      index.levelsForDomain(d).some((l) => index.remainingSupply(d, l, s.ledger) > 0)
    );
    const reason = !anySupply
      ? STOP_REASONS.DATASET_EXHAUSTED
      : s.itemsServed >= config.length.minItems
        ? STOP_REASONS.SUFFICIENT
        : STOP_REASONS.NO_VALUE;
    const stopped = stop(s, reason);
    return { state: stopped, action: "complete", reason };
  }

  s = {
    ...s,
    pending: { itemId: pick.item.id, domain: pick.item.domain, level: pick.item.cefrLevel, phase: PHASES.RESOLUTION, contradiction: pick.contradiction },
  };
  return { state: s, action: "ask", item: pick.item, meta: { phase: PHASES.RESOLUTION, value: pick.value, contradiction: pick.contradiction } };
}

function finishCalibration(state, config) {
  const idx = Math.max(0, Math.min(PLACEMENT_LEVELS.length - 1, state.calibration.anchorIndex ?? levelIndex(config.calibration.startLevel)));
  return {
    ...state,
    phase: PHASES.SCREENING,
    anchorLevel: PLACEMENT_LEVELS[idx],
    calibration: { ...state.calibration, done: true, anchorIndex: idx },
  };
}

/**
 * Record a response to the pending item.
 *
 * Deterministic items are scored here. Rubric items require `evaluation` —
 * the normalised AI result from scoring.normalizeAiEvaluation(). Passing an
 * evaluation with status FAILED records the attempt for audit and contributes
 * NO evidence in either direction (requirement 10).
 */
export function applyResponse(state, index, config, { itemId, response, evaluation = null, at = null }) {
  const item = index.getItem(itemId);
  if (!item) throw new Error(`grammarPlacement: unknown item ${itemId}`);
  if (state.pending && state.pending.itemId !== itemId) {
    throw new Error(`grammarPlacement: response for ${itemId} but ${state.pending.itemId} is pending`);
  }

  const aiGraded = requiresAiEvaluation(item);
  let outcome;
  if (aiGraded) {
    outcome = evaluation ?? {
      status: EVAL_STATUS.FAILED, credit: null, correct: null,
      detail: "no evaluation supplied for a rubric item",
    };
  } else {
    outcome = scoreDeterministic(item, response) ?? {
      status: EVAL_STATUS.SKIPPED, credit: null, correct: null, detail: "unscoreable",
    };
  }

  const obs = {
    seq: state.itemsServed + 1,
    itemId: item.id,
    domain: item.domain,
    level: item.cefrLevel,
    evidenceClass: item.evidenceClass,
    format: item.format,
    formatType: item.formatType,
    difficulty: item.difficulty,
    phase: state.pending?.phase ?? state.phase,
    probeLevel: state.pending?.probeLevel ?? null,
    aiGraded,
    status: outcome.status,
    credit: outcome.credit,
    correct: outcome.correct,
    detail: outcome.detail ?? "",
    at,
  };

  let s = {
    ...state,
    ledger: recordObservation(state.ledger, obs),
    itemsServed: state.itemsServed + 1,
    aiItemsServed: state.aiItemsServed + (aiGraded ? 1 : 0),
    aiFailures: state.aiFailures + (aiGraded && outcome.status === EVAL_STATUS.FAILED ? 1 : 0),
    contradictionItems: state.contradictionItems + (state.pending?.contradiction ? 1 : 0),
    pending: null,
  };

  // Calibration bracket advances once a probe level has had its full sample.
  if (s.phase === PHASES.CALIBRATION && !s.calibration.done) {
    const served = s.calibration.servedAtProbe + 1;
    if (served < config.calibration.itemsPerProbe) {
      s = { ...s, calibration: { ...s.calibration, servedAtProbe: served } };
    } else {
      const probeObs = s.ledger.observations.filter(
        (o) => o.phase === PHASES.CALIBRATION &&
               o.probeLevel === s.calibration.probeLevel &&
               o.status === EVAL_STATUS.SCORED
      );
      // No evaluable evidence at this probe (e.g. every item failed to grade):
      // treat as ambiguous and settle here rather than searching blind.
      const ratio = probeObs.length
        ? probeObs.reduce((sum, o) => sum + o.credit, 0) / probeObs.length
        : 0.5;
      const cal = advanceCalibration({ ...s, calibration: { ...s.calibration, servedAtProbe: served } }, config, ratio);
      s = { ...s, calibration: cal };
      if (cal.done) s = finishCalibration(s, config);
    }
  }

  return s;
}

/** Mark a run abandoned (learner quit). Still produces a usable, honest result. */
export const abandon = (state) => stop(state, STOP_REASONS.ABANDONED);

/**
 * Build the final run record: the grammar profile plus everything needed to
 * audit or re-score the run later without re-testing anybody.
 */
export function finalize(state, index, config, { completedAt = null } = {}) {
  const cells = deriveCells(state.ledger, index, config);
  const profile = buildProfile(cells, index, config, { generatedAt: completedAt });

  const failures = evaluationFailures(state.ledger).map((o) => ({
    seq: o.seq, itemId: o.itemId, domain: o.domain, level: o.level,
    aiGraded: o.aiGraded, detail: o.detail, at: o.at,
  }));

  const contradictions = profile.domains
    .filter((d) => d.contradictions.length)
    .map((d) => ({ domain: d.domain, ...d.contradictions[0] }));

  return {
    runId: state.runId,
    engineVersion: state.engineVersion,
    configVersion: state.configVersion,
    seed: state.seed,
    startedAt: state.startedAt,
    completedAt,
    scope: "grammar",

    profile,

    // Full, replayable record. Everything below is what makes the placement
    // auditable rather than merely asserted.
    itemLog: state.ledger.observations,
    evaluationFailures: failures,
    contradictions,
    levelSubstitutions: state.substitutions,

    totals: {
      itemsServed: state.itemsServed,
      evidentialObservations: evidentialCount(state.ledger),
      aiItemsAttempted: aiAttemptCount(state.ledger),
      aiItemsFailed: aiFailureCount(state.ledger),
      anchorLevel: state.anchorLevel,
      stoppedBecause: state.stopped?.reason ?? STOP_REASONS.SUFFICIENT,
      datasetItems: index.totalItems,
    },
  };
}

export const _internal = { buildContext, finishCalibration };
