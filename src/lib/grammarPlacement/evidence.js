// Grammar Placement Engine — the evidence ledger. PURE.
//
// THE RULE THIS MODULE EXISTS TO ENFORCE (requirement 2):
//   Untested is not the same as correct.
//
// Every number in a cell is derived from observations that actually happened.
// There is no code path anywhere in this file that writes positive evidence
// for a rung nobody answered. Clearing B1 may let the SELECTOR skip probing
// A1 — that is an efficiency decision, made in selection.js — but the A1 cell
// stays `untested` here, and the placement layer reports any level it did not
// observe as inferred, never as verified.
//
// A cell is one (domain x CEFR level). Its `state` describes how much and how
// consistent the evidence is; its `outcome` reads the direction off the same
// numbers. Keeping those separate is what lets a rung be confidently FAILED
// rather than forcing "confirmed" to mean "passed".

import { EVAL_STATUS } from "@/lib/grammarPlacement/scoring";

export const CELL_STATES = ["untested", "insufficient", "tentative", "confirmed", "strong"];
export const CELL_OUTCOMES = ["unknown", "borderline", "cleared", "failed"];

export const cellKey = (domain, level) => `${domain}|${level}`;

/** A fresh, empty ledger. */
export const createLedger = () => ({ observations: [] });

/**
 * Append one observation. Never mutates — returns a new ledger.
 *
 * `status` comes from scoring.js. Only EVAL_STATUS.SCORED observations carry
 * evidence weight; FAILED (infrastructure) and SKIPPED are retained in full
 * for audit and debugging but are invisible to every count, ratio and
 * threshold below.
 */
export function recordObservation(ledger, obs) {
  return { ...ledger, observations: [...ledger.observations, obs] };
}

/** Observations that count as learner evidence. */
const isEvidential = (o) => o.status === EVAL_STATUS.SCORED && typeof o.credit === "number";

/**
 * How many observations this cell needs before it can leave `insufficient`.
 *
 * Clamped to what the dataset can actually supply: 12 real buckets hold fewer
 * than 3 items, so a rigid minimum would leave them permanently unusable and
 * would report a content gap as a learner unknown. C2 has its own, smaller
 * requirement — see config.c2.
 */
export function effectiveMinObservations(level, supply, config) {
  const base = level === "C2" ? config.c2.minObservations : config.evidence.minObservations;
  if (!Number.isFinite(supply)) return base;
  return Math.max(1, Math.min(base, supply));
}

/** The ceiling on observations for this cell. */
export function effectiveMaxObservations(level, supply, config) {
  const base = level === "C2" ? config.c2.maxObservations : config.evidence.maxObservations;
  if (!Number.isFinite(supply)) return base;
  return Math.max(1, Math.min(base, supply));
}

const STATE_RANK = { untested: 0, insufficient: 1, tentative: 2, confirmed: 3, strong: 4 };

/** Clamp a state to a configured maximum (used for C2's ceiling probe). */
const capState = (state, maxState) =>
  STATE_RANK[state] > STATE_RANK[maxState] ? maxState : state;

/**
 * Derive one cell from the ledger.
 *
 * @param {object} ledger
 * @param {string} domain
 * @param {string} level
 * @param {number} supply  how many unused items the dataset has for this cell
 * @param {object} config
 */
export function deriveCell(ledger, domain, level, supply, config) {
  const all = ledger.observations.filter((o) => o.domain === domain && o.level === level);
  const scored = all.filter(isEvidential);

  const byClass = {};
  for (const o of scored) {
    const b = (byClass[o.evidenceClass] ??= { n: 0, credit: 0 });
    b.n += 1;
    b.credit += o.credit;
  }

  const n = scored.length;
  const credit = scored.reduce((s, o) => s + o.credit, 0);
  const ratio = n ? credit / n : 0;

  const minN = effectiveMinObservations(level, supply + n, config);
  const { ratios } = config.evidence;

  let state;
  if (n === 0) state = "untested";
  else if (n < minN) state = "insufficient";
  else if (ratio >= ratios.strong || ratio <= ratios.negative * 0.5) state = "strong";
  else if (ratio >= ratios.confirm || ratio <= ratios.negative) state = "confirmed";
  else state = "tentative";

  // Evidence-class requirements (default: none — see config).
  const required = config.requiredEvidenceClasses?.[level] ?? [];
  const missingClasses = required.filter((c) => !(byClass[c]?.n > 0));
  if (missingClasses.length && STATE_RANK[state] > STATE_RANK.confirmed) state = "confirmed";

  // C2 never claims more than its configured ceiling, however clean the run.
  if (level === "C2") state = capState(state, config.c2.maxState);

  let outcome;
  if (state === "untested" || state === "insufficient") outcome = "unknown";
  else if (ratio >= ratios.confirm) outcome = "cleared";
  else if (ratio <= ratios.negative) outcome = "failed";
  else outcome = "borderline";

  const failures = all.filter((o) => o.status === EVAL_STATUS.FAILED).length;

  return {
    domain, level,
    observed: n,
    attempts: all.length,
    evaluationFailures: failures,
    credit: Number(credit.toFixed(4)),
    ratio: Number(ratio.toFixed(4)),
    byClass,
    classesSeen: Object.keys(byClass),
    missingRequiredClasses: missingClasses,
    aiObservations: scored.filter((o) => o.aiGraded).length,
    state,
    outcome,
    minObservations: minN,
    maxObservations: effectiveMaxObservations(level, supply + n, config),
    remainingSupply: supply,
    atMax: n >= effectiveMaxObservations(level, supply + n, config),
  };
}

/**
 * Derive every cell that has either evidence or available supply.
 * Returns a Map keyed by cellKey.
 */
export function deriveCells(ledger, index, config) {
  const cells = new Map();
  for (const domain of index.domainIds) {
    for (const level of index.levelsForDomain(domain)) {
      const supply = index.remainingSupply(domain, level, ledger);
      cells.set(cellKey(domain, level), deriveCell(ledger, domain, level, supply, config));
    }
  }
  return cells;
}

/** Ids of every item already served, so nothing repeats (requirement 4). */
export const usedItemIds = (ledger) => new Set(ledger.observations.map((o) => o.itemId));

/** Count of observations that carried real learner evidence. */
export const evidentialCount = (ledger) => ledger.observations.filter(isEvidential).length;

/** Every evaluation failure, preserved for debugging and audit. */
export const evaluationFailures = (ledger) =>
  ledger.observations.filter((o) => o.status === EVAL_STATUS.FAILED);

/** How many AI-graded items have been attempted, successful or not. */
export const aiAttemptCount = (ledger) => ledger.observations.filter((o) => o.aiGraded).length;

export const aiFailureCount = (ledger) =>
  ledger.observations.filter((o) => o.aiGraded && o.status === EVAL_STATUS.FAILED).length;
