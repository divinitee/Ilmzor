import { base44 } from "@/api/base44Client";
import { shuffle } from "@/lib/vocabGameUtils";
import {
  TIER1_MCQ, TIER2_VOCAB, TIER2_GRAMMAR,
  TIER1_PASS_THRESHOLD, TIER2_ADVANCE_AVG, TIER2_SETTLE_B1_AVG,
} from "@/lib/placementContent";

// Saves one graded result to the AssessmentResult entity. Always stamps
// user_email explicitly (required by that entity's create RLS rule, which
// has no created_by_id fallback the way sibling entities do).
export async function recordAssessmentResult({
  userEmail, source = "placement_test", skill, subskill, itemLabel,
  studentAnswer, score, axisScores, diagnosis, tip,
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
    });
  } catch (e) {
    // Don't let a logging failure break the test experience itself.
    console.error("recordAssessmentResult failed:", e);
  }
}

// Picks a random 5 vocab + 5 grammar from the Tier 1 pool of 20, shuffled
// and interleaved — same rationale as Tier 2's randomization: with a fixed
// set every student (and every retake) would see identical questions in
// identical order, which is both stale and easy to share answers for.
export function pickTier1Set() {
  const vocab = shuffle(TIER1_MCQ.filter((q) => q.type === "vocab")).slice(0, 5);
  const grammar = shuffle(TIER1_MCQ.filter((q) => q.type === "grammar")).slice(0, 5);
  return shuffle([...vocab, ...grammar]);
}

// Picks a random 5 vocab + 5 grammar from the Tier 2 pools, shuffled and
// interleaved into one ordered list. Randomized per the reviewed design —
// each item is scored independently, so order doesn't affect placement
// accuracy, and it's more resistant to answers being shared between students.
export function pickTier2Set() {
  const vocab = shuffle(TIER2_VOCAB).slice(0, 5).map((w) => ({ type: "vocab", ...w }));
  const grammar = shuffle(TIER2_GRAMMAR).slice(0, 5).map((g) => ({ type: "grammar", ...g }));
  return shuffle([...vocab, ...grammar]);
}

export function scoreTier1(answers, items) {
  let correct = 0;
  answers.forEach((a, i) => {
    if (a === items[i].answer) correct += 1;
  });
  return { correct, total: items.length, pct: correct / items.length };
}

export function tier1Passed(pct) {
  return pct >= TIER1_PASS_THRESHOLD;
}

// avg is the mean 1-5 score across the 10 Tier 2 results.
// Below TIER2_SETTLE_B1_AVG -> B1. Between that and TIER2_ADVANCE_AVG -> B2
// (this middle band wasn't spelled out in the original design doc — filling
// the gap here; worth a second look). TIER2_ADVANCE_AVG+ -> unlock Tier 3.
export function tier2Outcome(avg) {
  if (avg >= TIER2_ADVANCE_AVG) return { level: null, advance: true };
  if (avg >= TIER2_SETTLE_B1_AVG) return { level: "B2", advance: false };
  return { level: "B1", advance: false };
}

// Tier 3 only refines the placement upward from the B2/B1 floor Tier 2
// already earned — a weak Tier 3 attempt doesn't erase a strong Tier 2 one.
export function tier3Outcome(avg) {
  return avg >= 3 ? "C1" : "B2";
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
