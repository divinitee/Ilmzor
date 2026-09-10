// Practice grading — PURE. Deterministic stages only.
//
// choose / build / transform are graded here, by comparison, and cost nothing.
// create / express are rubric-judged and belong to the AI path behind
// checkAiGate — they never reach this module.
//
// Typed answers need real normalisation, not a strict equality check: students
// type curly apostrophes, trailing full stops, double spaces and stray capitals,
// and none of those are grammar mistakes. What normalisation must NOT do is
// forgive the thing being tested, so it never touches letters inside words.

/** Lowercase, collapse whitespace, straighten quotes, drop edge punctuation. */
export function normalise(s) {
  return String(s ?? "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, "")
    .trim();
}

const accepted = (item) => [item.key, ...(item.acceptable || [])];

/**
 * Grade one composed item.
 * @returns { correct, expected, given }  `expected` is the canonical answer for feedback.
 */
export function gradeItem(item, response) {
  if (!item) return { correct: false, expected: null, given: response };

  if (item.format === "mcq") {
    return {
      correct: Number.isInteger(response) && response === item.key,
      expected: item.options?.[item.key] ?? null,
      given: Number.isInteger(response) ? item.options?.[response] ?? null : null,
    };
  }

  if (Array.isArray(item.key)) {
    const given = Array.isArray(response) ? response : [];
    const correct =
      given.length === item.key.length &&
      item.key.every((k, i) => normalise(given[i]) === normalise(k));
    return { correct, expected: item.key.join(" … "), given: given.join(" … ") };
  }

  const n = normalise(response);
  return {
    correct: accepted(item).some((k) => normalise(k) === n),
    expected: item.key,
    given: response,
  };
}

/** True once the student has entered something submittable. */
export function hasResponse(item, response) {
  if (item?.format === "mcq") return Number.isInteger(response);
  if (Array.isArray(item?.key)) {
    return Array.isArray(response) && response.length === item.key.length &&
      response.every((r) => String(r ?? "").trim().length > 0);
  }
  return typeof response === "string" && response.trim().length > 0;
}

/** The empty response for a fresh item. */
export const emptyResponse = (item) =>
  item?.format === "mcq" ? null : Array.isArray(item?.key) ? item.key.map(() => "") : "";

/** Round summary. */
export function scoreRound(items, responses) {
  const graded = items.map((it, i) => ({ item: it, ...gradeItem(it, responses[i]) }));
  const correct = graded.filter((g) => g.correct).length;
  return { graded, correct, total: items.length, pct: items.length ? Math.round((correct / items.length) * 100) : 0 };
}
