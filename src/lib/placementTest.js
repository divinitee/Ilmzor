import { base44 } from "@/api/base44Client";
import { shuffle } from "@/lib/vocabGameUtils";
import {
  GATES, GATE_POOLS, STARTER_LEVEL, MCQ_PASS_RATIO, OPEN_PASS_AVG,
} from "@/lib/placementContent";

// Saves one graded result to the AssessmentResult entity. Always stamps
// user_email explicitly (required by that entity's create RLS rule, which
// has no created_by_id fallback the way sibling entities do).
export async function recordAssessmentResult({
  userEmail, source = "placement_test", skill, subskill, itemLabel,
  studentAnswer, score, axisScores, diagnosis, tip, lessonId, activityId,
}) {
  try {
    await base44.entities.AssessmentResult.create({
      user_email: userEmail,
      source,
      skill,
      subskill: subskill || "",
      item_label: itemLabel || "",
      student_answer: (studentAnswer || "").slice(0, 1000),
      score,
      axis_scores: axisScores || {},
      diagnosis: diagnosis || "",
      tip: (tip || "").slice(0, 500),
      ...(lessonId ? { lesson_id: lessonId } : {}),
      ...(activityId ? { activity_id: activityId } : {}),
    });
  } catch (e) {
    // Don't let a logging failure break the test experience itself.
    console.error("recordAssessmentResult failed:", e);
  }
}

export const gateFormat = (level) => GATE_POOLS[level]?.format || "open";

export const nextGate = (level) => GATES[GATES.indexOf(level) + 1] || null;

// The level a student settles at when they fail the gate for `level`:
// the previous gate they actually cleared, or Starter if they failed A1.
export const previousGate = (level) => GATES[GATES.indexOf(level) - 1] || STARTER_LEVEL;

// Builds one gate's 10 items — 5 vocab + 5 grammar, shuffled and
// interleaved. Randomized per attempt so retakes aren't identical and
// answers are harder to share between students; each item is scored
// independently, so order doesn't affect placement accuracy.
export function pickGateSet(level) {
  const pool = GATE_POOLS[level];
  if (!pool) return [];
  if (pool.format === "mcq") {
    const vocab = shuffle(pool.mcq.filter((q) => q.type === "vocab")).slice(0, 5);
    const grammar = shuffle(pool.mcq.filter((q) => q.type === "grammar")).slice(0, 5);
    return shuffle([...vocab, ...grammar]);
  }
  const vocab = shuffle(pool.vocab).slice(0, 5).map((w) => ({ type: "vocab", ...w }));
  const grammar = shuffle(pool.grammar).slice(0, 5).map((g) => ({ type: "grammar", ...g }));
  return shuffle([...vocab, ...grammar]);
}

// MCQ gates: `answers` is an array of chosen option indexes, compared to the
// item answer keys. Returns a 0-1 ratio.
export function scoreMcqGate(answers, items) {
  let correct = 0;
  answers.forEach((a, i) => {
    if (a === items[i].answer) correct += 1;
  });
  return { correct, total: items.length, ratio: items.length ? correct / items.length : 0 };
}

// Open-ended gates: `results` is an array of graded entries with a 1-5 score.
export function scoreOpenGate(results) {
  if (!results.length) return { avg: 0, total: 0 };
  const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
  return { avg, total: results.length };
}

// The whole point of the 5-gate model: a gate has exactly ONE failure
// outcome — settle at the previous gate. There is no fixed default level to
// fall into, which is what caused the old tier2Outcome() B1 floor bug.
export function gateOutcome(level, score) {
  const passed = gateFormat(level) === "mcq"
    ? score >= MCQ_PASS_RATIO
    : score >= OPEN_PASS_AVG;

  if (!passed) return { passed: false, advance: false, settleAt: previousGate(level) };

  const next = nextGate(level);
  // Cleared the top gate — nothing left to climb.
  if (!next) return { passed: true, advance: false, settleAt: level };
  return { passed: true, advance: true, next };
}

// Groups logged results into a plain-language "what to work on" summary
// for the results screen, using each item's diagnosis tag and score.
export function summarizeWeakAreas(results) {
  const weak = results.filter((r) => r.score <= 2);
  return weak.map((r) => ({
    label: r.itemLabel || r.subskill,
    skill: r.skill,
    diagnosis: r.diagnosis,
    tip: r.tip,
  }));
}