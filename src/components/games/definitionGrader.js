import { base44 } from "@/api/base44Client";

// The grading call for the Definition game — moved verbatim out of
// DefinitionGame.jsx on 2026-09-07 so the engine file could shrink. The prompt,
// the three criteria, the 1-5 XP mapping the model returns and the error
// fallback are all UNCHANGED; the engine simply no longer uses `xp` for the
// round economy (gameScoring.js owns that now).

// Evaluate a user-written definition and award 1-5 XP.
export async function evaluateDefinition(userDef, word, cfg, level) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: [
        `You are a strict but fair English vocabulary examiner for ${level || "B1"}-level learners.`,
        `Target word (English): "${word.english}" — Uzbek: "${word.uzbek}".`,
        `Reference definition: "${word.definition || ""}".`,
        `The student rewrote the definition in their own words:`,
        `"${userDef}".`,
        ``,
        `Evaluate the student's text ONLY on meaning, not wording. A paraphrase that uses completely different words but keeps the correct meaning is EXCELLENT (accuracy 90-100). A definition that is factually wrong scores 0-20 on accuracy.`,
        ``,
        `Score these criteria each 0-100 (whole numbers):`,
        `- accuracy: does it convey the CORRECT meaning of "${word.english}"? (synonyms/paraphrase = high; wrong meaning = low)`,
        `- completeness: does it capture the key idea, not just a vague synonym?`,
        `- own_words: did the student paraphrase rather than copy the reference almost word-for-word? (near-copy = 0-30)`,
        ``,
        `Then reward XP (integer 1-5) from the AVERAGE of the three scores:`,
        `>=85 → 5, 70-84 → 4, 55-69 → 3, 35-54 → 2, <35 → 1.`,
        `Minimum ${cfg.minWords} words expected; much shorter answers subtract ~10 from each score.`,
        `Also give ONE concrete, specific tip (max 15 words) pointing out exactly what to improve — not generic praise.`,
        `Reply as JSON only.`,
      ].join("\n"),
      response_json_schema: {
        type: "object",
        properties: {
          accuracy: { type: "number" },
          completeness: { type: "number" },
          own_words: { type: "number" },
          xp: { type: "number" },
          tip: { type: "string" },
        },
      },
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