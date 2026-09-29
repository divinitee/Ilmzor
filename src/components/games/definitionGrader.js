import { runAiTask } from "@/lib/aiLimits";

// The grading call for the Definition game — moved verbatim out of
// DefinitionGame.jsx on 2026-09-07 so the engine file could shrink. The prompt,
// the three criteria, the 1-5 XP mapping the model returns and the error
// fallback are all UNCHANGED; the engine simply no longer uses `xp` for the
// round economy (gameScoring.js owns that now).

// Evaluate a user-written definition and award 1-5 XP.
// roundId/wordId let aiApi record its own grade as progress evidence.
export async function evaluateDefinition(userDef, word, cfg, level, roundId) {
  try {
    const res = await runAiTask("gradeDefinition", {
      round_id: roundId, word_id: word.id,
      word: { english: word.english, uzbek: word.uzbek, definition: word.definition || "" },
      answer: userDef, minWords: cfg.minWords, level,
    });
    const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    let xp = Math.round(Number(res.xp) || 0);
    xp = Math.max(1, Math.min(5, xp));
    return {
      accuracy: clamp(res.accuracy),
      completeness: clamp(res.completeness),
      own_words: clamp(res.own_words),
      xp,
      tip: res.tip || "",
    };
  } catch {
    return { accuracy: 0, completeness: 0, own_words: 0, xp: 1, tip: "" };
  }
}

// "Correct" for an AI-graded free-text answer: the average of the three
// sub-scores clears CLEAR_AVG. 55 is the prompt's own boundary between the
// 3-XP band ("conveys the meaning") and the 2/1-XP bands ("vague or wrong"),
// so the student never sees a bar the grader didn't already draw.
export const CLEAR_AVG = 55;

export const averageScore = (r) => Math.round(((r?.accuracy || 0) + (r?.completeness || 0) + (r?.own_words || 0)) / 3);
export const clearedBar = (r) => averageScore(r) >= CLEAR_AVG;