import { runAiTask } from "@/lib/aiLimits";

// Shared LLM-graded assessor logic for open-ended ("articulation") answers.
// Generalizes the pattern proven in DefinitionGame's evaluateDefinition() to
// cover both vocabulary articulation and grammar-construction tasks, so both
// can feed the same downstream signal: a 1-5 score + a diagnostic tag that
// maps to a specific weak subskill, not just a number.

const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

function scoreFromAverage(avg) {
  if (avg >= 85) return 5;
  if (avg >= 70) return 4;
  if (avg >= 55) return 3;
  if (avg >= 35) return 2;
  return 1;
}

/**
 * Grade a student's own-words explanation of a vocabulary word's meaning.
 * Graded on closeness to the dictionary meaning (not exact wording),
 * completeness, and whether it's genuinely paraphrased rather than copied.
 *
 * @param {{ english: string, definition: string }} word - the reference dictionary definition.
 * @param {string} studentAnswer
 */
export async function evaluateVocabArticulation(word, studentAnswer) {
  const answer = (studentAnswer || "").trim();
  if (!answer) {
    return {
      accuracy: 0, completeness: 0, own_words: 0, score: 1,
      diagnosis: "blank", tip: "No answer given — try explaining what the word means in your own sentence.",
    };
  }
  try {
    const res = await runAiTask("gradeVocabArticulation", {
      word: { english: word.english, definition: word.definition }, answer,
    });
    const accuracy = clamp(res.accuracy);
    const completeness = clamp(res.completeness);
    const own_words = clamp(res.own_words);
    const avg = (accuracy + completeness + own_words) / 3;
    return {
      accuracy, completeness, own_words,
      score: scoreFromAverage(avg),
      diagnosis: res.diagnosis || "correct",
      tip: res.tip || "",
    };
  } catch (e) {
    return {
      accuracy: 0, completeness: 0, own_words: 0, score: 1,
      diagnosis: "error", tip: `Grading failed: ${e?.message || "unknown error"}`,
    };
  }
}

/**
 * Grade a student's attempt at a specific grammar construction task
 * (e.g. "write a sentence with two clauses joined by a subordinating
 * conjunction"). Graded on actual grammatical correctness and whether the
 * required structure was genuinely used — not semantic closeness to anything.
 *
 * @param {{ instruction: string, requiredElement: string, topic: string }} task
 * @param {string} studentAnswer
 */
export async function evaluateGrammarConstruction(task, studentAnswer) {
  const answer = (studentAnswer || "").trim();
  if (!answer) {
    return {
      structureUsed: 0, correctness: 0, naturalness: 0, score: 1,
      diagnosis: "blank", tip: "No answer given — try writing one sentence following the instruction.",
    };
  }
  try {
    const res = await runAiTask("gradeGrammarConstruction", {
      task: { instruction: task.instruction, requiredElement: task.requiredElement, topic: task.topic }, answer,
    });
    const structureUsed = clamp(res.structureUsed);
    const correctness = clamp(res.correctness);
    const naturalness = clamp(res.naturalness);
    const avg = (structureUsed + correctness + naturalness) / 3;
    return {
      structureUsed, correctness, naturalness,
      score: scoreFromAverage(avg),
      diagnosis: res.diagnosis || "correct",
      tip: res.tip || "",
    };
  } catch (e) {
    return {
      structureUsed: 0, correctness: 0, naturalness: 0, score: 1,
      diagnosis: "error", tip: `Grading failed: ${e?.message || "unknown error"}`,
    };
  }
}