// What happened to each planned item in one run of a Coach session (VT-40
// Stage 3 correction A, 2026-10-09). Pure, so it is unit-tested.
//   completed    the learner finished it and its answers were sent
//   unavailable  its content could not be loaded / rendered: NOTHING was sent
//   left         the learner quit it part-way: nothing was sent for it
// Skipped items are never reported as practised: the server only ever sees
// evidence for "completed" items, and the plan keeps the rest.

export const OUTCOME = { COMPLETED: "completed", UNAVAILABLE: "unavailable", LEFT: "left" };

/** outcomes: { [item_key]: OUTCOME } -> counts + the unavailable keys. */
export function summarise(outcomes = {}) {
  const vals = Object.entries(outcomes);
  const keysOf = (o) => vals.filter(([, v]) => v === o).map(([k]) => k);
  return {
    completed: keysOf(OUTCOME.COMPLETED).length,
    unavailable: keysOf(OUTCOME.UNAVAILABLE).length,
    left: keysOf(OUTCOME.LEFT).length,
    unavailableKeys: keysOf(OUTCOME.UNAVAILABLE),
  };
}

/**
 * Which screen follows a run, from the SERVER's view of the session (after the
 * awaited submissions) and this run's outcomes:
 *   "done"         the server says the session is complete
 *   "plan"         the server still has items this run did not find unavailable
 *                  (left part-way, a save that failed, or room left in the budget)
 *   "done_partial" only unavailable items remain and the learner completed others
 *   "unavailable"  only unavailable items remain and nothing was completed
 */
export function afterRunView({ session, items = [], summary }) {
  if (session?.complete) return "done";
  const unavailable = new Set(summary?.unavailableKeys || []);
  const playable = items.filter((i) => !unavailable.has(i.item_key));
  if (playable.length) return "plan";
  if (!items.length) return "plan"; // nothing left and not complete: the plan screen shows "nothing urgent"
  return (summary?.completed || 0) > 0 ? "done_partial" : "unavailable";
}
