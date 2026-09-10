// What the student is told at the end of a round.
//
// PURE — no imports, no copy. It returns a tier key and the numbers; the copy
// layer decides the words so the message translates like everything else.
//
// The tiers are deliberately not symmetrical around 50%. A round is ten items
// drawn from one stage of one topic, so 7/10 is a student who has the rule and
// is slipping on edges, while 4/10 is a student who does not have the rule yet.
// Those two need different sentences, and the boundary between them matters
// more than the boundary between 9/10 and 10/10.

export const TIERS = [
  { key: "perfect", min: 100 },
  { key: "strong", min: 90 },
  { key: "solid", min: 70 },
  { key: "shaky", min: 50 },
  { key: "early", min: 0 },
];

export const tierFor = (pct) => (TIERS.find((t) => pct >= t.min) || TIERS[TIERS.length - 1]).key;

/** Longest run of consecutive correct answers in the round. */
export function bestStreak(graded) {
  let best = 0;
  let run = 0;
  for (const g of graded) {
    run = g.correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Round summary for the result screen.
 * `graded` is what scoreRound returns: [{ item, correct, expected }].
 */
export function summarise(graded) {
  const total = graded.length;
  const correct = graded.filter((g) => g.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return {
    correct,
    total,
    pct,
    tier: tierFor(pct),
    streak: bestStreak(graded),
    // Only what they got wrong — a list of things they already know is noise,
    // and the whole value of the screen is the second look at the misses.
    missed: graded.filter((g) => !g.correct).map((g) => ({
      variantId: g.item.variantId,
      prompt: g.item.prompt || g.item.hint || g.item.source || "",
      expected: g.expected,
      why: g.item.why || "",
    })),
  };
}
