// Grammar Placement Engine — CEFR ladder vocabulary (pure, no imports).
//
// The engine declares its own ladder rather than importing the dataset's
// CEFR_LEVELS, so that the pure core has zero dataset dependency. The dataset
// adapter (datasetAdapter.js) asserts the two agree on load and throws a
// contract error if they ever diverge — a silent mismatch between a dataset
// ladder and an engine ladder would corrupt every placement quietly, which is
// exactly the class of bug worth failing loudly on.
//
// There is deliberately no "Starter" here. Starter belongs to the GLOBAL level
// vocabulary in src/lib/levels.js, which this engine must not write to or
// speak for (grammar placement is grammar-only). A learner below a domain's
// lowest assessable rung is described as `belowFloor`, not as Starter.

export const PLACEMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const levelIndex = (level) => PLACEMENT_LEVELS.indexOf(level);

export const isLevel = (level) => PLACEMENT_LEVELS.includes(level);

export const levelAbove = (level) => PLACEMENT_LEVELS[levelIndex(level) + 1] ?? null;

export const levelBelow = (level) => {
  const i = levelIndex(level);
  return i > 0 ? PLACEMENT_LEVELS[i - 1] : null;
};

// Distance in rungs between two levels. Negative when `a` is below `b`.
export const levelDistance = (a, b) => levelIndex(a) - levelIndex(b);

// Sort a list of levels into ladder order, dropping anything unrecognised.
export const orderLevels = (levels = []) =>
  PLACEMENT_LEVELS.filter((l) => levels.includes(l));

// The comparable position of a domain result, used ONLY for cross-domain
// aggregation. A domain whose floor is B1 (Reported Speech has no A1/A2
// content) and whose floor rung was failed sits "below B1" — which is a real
// position on the ladder, one rung under its floor, not an unknown. Encoding
// it as such is what lets aggregation treat it honestly instead of either
// dropping it or pretending it means A1.
export const comparableIndex = (level, { belowFloor = false, floorLevel = null } = {}) => {
  if (belowFloor) return levelIndex(floorLevel ?? "A1") - 1;
  if (!isLevel(level)) return null;
  return levelIndex(level);
};

// Inverse of comparableIndex for reporting an aggregate back as a label.
export const levelFromComparableIndex = (idx) => {
  if (idx == null || idx < 0) return null; // below A1
  return PLACEMENT_LEVELS[Math.min(idx, PLACEMENT_LEVELS.length - 1)] ?? null;
};
