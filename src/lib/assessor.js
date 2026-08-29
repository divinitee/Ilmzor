import { base44 } from "@/api/base44Client";

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
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: [
        `You are a strict but fair English vocabulary examiner.`,
        `Target word: "${word.english}".`,
        `Dictionary definition: "${word.definition}".`,
        `The student's own-words explanation: "${answer}".`,
        ``,
        `Evaluate ONLY on meaning, not wording. A paraphrase using completely different`,
        `words that keeps the correct meaning is EXCELLENT (accuracy 90-100). A definition`,
        `that is factually wrong, off-topic, or gibberish scores 0-20 on accuracy.`,
        ``,
        `CRITICAL CHECK FIRST: this is a test of the student's ability to explain the word`,
        `IN ENGLISH. If the answer is not written in English — including a transliteration,`,
        `loanword, or direct translation of the target word itself into another language or`,
        `script (e.g. writing the Russian/Uzbek cognate of "compensate" instead of explaining`,
        `it in English) — this FAILS the exercise regardless of whether the underlying concept`,
        `is correct. Score accuracy 0-10, completeness 0-10, own_words 0, and use diagnosis`,
        `"not_in_english" for this case, skipping all other checks below.`,
        ``,
        `Score 0-100 each:`,
        `- accuracy: how close is the meaning to the dictionary definition above?`,
        `- completeness: does it capture the key idea, not just a vague gesture at it?`,
        `- own_words: did the student paraphrase rather than near-copy the definition word-for-word? (near-copy = 0-30)`,
        ``,
        `Also classify the answer with ONE diagnosis tag, exactly one of:`,
        `"correct" (good answer), "vague" (too imprecise to confirm understanding),`,
        `"wrong_meaning" (confidently states an incorrect meaning),`,
        `"near_copy" (just restates the definition with minor word swaps),`,
        `"not_in_english" (answer is not a genuine English-language explanation — see check above),`,
        `"off_topic" (doesn't address the word's meaning at all / gibberish).`,
        ``,
        `Give ONE concrete, specific tip (max 15 words) — not generic praise.`,
        `Reply as JSON only.`,
      ].join("\n"),
      response_json_schema: {
        type: "object",
        properties: {
          accuracy: { type: "number" },
          completeness: { type: "number" },
          own_words: { type: "number" },
          diagnosis: { type: "string" },
          tip: { type: "string" },
        },
      },
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
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: [
        `You are a strict English grammar examiner grading ONE sentence.`,
        `Task instruction given to the student: "${task.instruction}"`,
        `Required grammatical element: "${task.requiredElement}"`,
        `Grammar topic being tested: "${task.topic}"`,
        `The student's sentence: "${answer}"`,
        ``,
        `Score 0-100 each, based on actual grammatical rules, not style preference:`,
        `- structureUsed: did the sentence genuinely use the required element correctly`,
        `  (e.g. a real subordinating conjunction like "because/although/when", NOT a`,
        `  coordinating conjunction like "and/but/so" used instead)? 0 if not used at all.`,
        `- correctness: is the sentence grammatically well-formed (no fragment, no run-on`,
        `  or comma splice, correct verb forms, subject-verb agreement, punctuation)?`,
        `- naturalness: does it read like a sentence a fluent speaker would actually write,`,
        `  not a mechanical attempt to satisfy the rule?`,
        ``,
        `Also classify with ONE diagnosis tag, exactly one of:`,
        `"correct", "wrong_form" (used the wrong word form, e.g. an adjective instead of a`,
        `past participle, or a double comparative), "missing_element" (a required word was`,
        `left out, e.g. a missing article), "wrong_word_choice" (the wrong specific word for`,
        `the job, e.g. wrong preposition, wrong conjunction type, wrong quantifier),`,
        `"tense_error", "sentence_fragment", "run_on_or_comma_splice", "off_topic_or_blank".`,
        ``,
        `Give ONE concrete, specific tip (max 15 words) naming the exact issue — not generic praise.`,
        `Reply as JSON only.`,
      ].join("\n"),
      response_json_schema: {
        type: "object",
        properties: {
          structureUsed: { type: "number" },
          correctness: { type: "number" },
          naturalness: { type: "number" },
          diagnosis: { type: "string" },
          tip: { type: "string" },
        },
      },
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
