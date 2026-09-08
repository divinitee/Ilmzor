// Grammar Placement Engine — response scoring. PURE.
//
// Turns a learner response into a normalised 0..1 `credit` plus an evaluation
// status. Deterministic answer types (index / exact / sequence) are scored
// here with no I/O. Rubric answers cannot be scored here — the caller supplies
// an already-evaluated AI result, which this module normalises onto the same
// scale so every evidence class lives on one comparable axis.
//
// The one rule that matters most (requirement 10): an infrastructure failure
// is never a learner error. A failed evaluation produces status "failed" with
// credit null, and evidence.js excludes it from every count and ratio.

export const EVAL_STATUS = {
  SCORED: "scored",     // a real learner result; credit is meaningful
  FAILED: "failed",     // AI/infrastructure failure; NOT learner evidence
  SKIPPED: "skipped",   // learner or session skipped it; NOT learner evidence
};

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")   // curly apostrophes -> straight
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:]+$/g, "")               // trailing punctuation
    .replace(/\s+/g, " ")
    .trim();

const sameText = (a, b) => norm(a) === norm(b);

const sameSequence = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
  a.every((v, i) => sameText(v, b[i]));

/**
 * Score a deterministic item. Returns null for rubric answers, which this
 * module cannot evaluate — the caller must supply an AI evaluation instead.
 *
 * @param {object} item     a dataset item (public contract shape)
 * @param {*} response      index:number · exact:string · sequence:string[]
 * @returns {{status:string, credit:number|null, correct:boolean|null, detail:string}|null}
 */
export function scoreDeterministic(item, response) {
  const a = item?.answer;
  if (!a || a.type === "rubric") return null;

  if (a.type === "index") {
    if (typeof response !== "number" || !Number.isInteger(response)) {
      return { status: EVAL_STATUS.SKIPPED, credit: null, correct: null, detail: "no option selected" };
    }
    const correct = response === a.expected;
    return { status: EVAL_STATUS.SCORED, credit: correct ? 1 : 0, correct, detail: "" };
  }

  if (a.type === "exact") {
    if (typeof response !== "string" || !response.trim()) {
      // A blank answer IS a learner result, not an infrastructure failure.
      return { status: EVAL_STATUS.SCORED, credit: 0, correct: false, detail: "blank" };
    }
    const accepted = [a.expected, ...(a.acceptable ?? [])];
    const correct = accepted.some((x) => sameText(x, response));
    return { status: EVAL_STATUS.SCORED, credit: correct ? 1 : 0, correct, detail: "" };
  }

  if (a.type === "sequence") {
    if (!Array.isArray(response) || response.length === 0) {
      return { status: EVAL_STATUS.SCORED, credit: 0, correct: false, detail: "blank" };
    }
    const accepted = [a.expected, ...(a.acceptable ?? [])];
    const correct = accepted.some((x) => sameSequence(x, response));
    return { status: EVAL_STATUS.SCORED, credit: correct ? 1 : 0, correct, detail: "" };
  }

  return { status: EVAL_STATUS.SKIPPED, credit: null, correct: null, detail: `unsupported answer.type ${a.type}` };
}

/**
 * Normalise an AI grading result onto the engine's 0..1 credit scale.
 *
 * Expects the shape returned by evaluateGrammarConstruction() in
 * src/lib/assessor.js — {score: 1..5, diagnosis, tip, ...axes}. That grader
 * fails CLOSED to `{score: 1, diagnosis: "error"}` on any exception, which
 * would otherwise read as a wrong answer. Detecting that and demoting it to a
 * non-evidence failure is the whole point of this function.
 *
 * `diagnosis: "blank"` and `"not_in_english"` are genuine learner results and
 * stay as scored evidence — the learner did respond, just not correctly.
 *
 * @param {object|null} aiResult
 * @param {{error?: any}} [meta] set meta.error when the call itself threw
 */
export function normalizeAiEvaluation(aiResult, meta = {}) {
  if (meta.error || !aiResult) {
    return {
      status: EVAL_STATUS.FAILED, credit: null, correct: null,
      detail: `ai_unavailable: ${meta.error?.message ?? meta.error ?? "no result"}`,
      raw: aiResult ?? null,
    };
  }
  if (aiResult.diagnosis === "error") {
    return {
      status: EVAL_STATUS.FAILED, credit: null, correct: null,
      detail: `ai_grader_error: ${aiResult.tip ?? "grading failed"}`,
      raw: aiResult,
    };
  }
  const score = Number(aiResult.score);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return {
      status: EVAL_STATUS.FAILED, credit: null, correct: null,
      detail: `ai_bad_score: ${aiResult.score}`, raw: aiResult,
    };
  }
  // 1..5 -> 0, .25, .5, .75, 1
  const credit = (score - 1) / 4;
  return {
    status: EVAL_STATUS.SCORED,
    credit,
    // "Correct" is a coarse read of a graded production item, used only for
    // human-readable summaries; `credit` is what the evidence model uses.
    correct: credit >= 0.5,
    detail: aiResult.diagnosis ?? "",
    raw: aiResult,
  };
}

/** True when this item needs an AI call to be evaluated at all. */
export const requiresAiEvaluation = (item) => item?.answer?.type === "rubric";
