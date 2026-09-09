// Grammar map node states. PURE — derives every state shown on the Grammar
// node map from the ONE real Grammar progress record that exists today: the
// per-domain placement in GrammarProfile (via grammarPlacementResult's
// student-facing shape). Nothing here is invented:
//
//   TIER    — where the learner's overall grammar level sits relative to a
//             tier's CEFR band: inside it (current), above it (placed above),
//             or below it (ahead). No tier is ever locked: there is no
//             mastery-gate rule in the product yet, and this module will not
//             pretend there is one.
//   DOMAIN  — the placement verdict for that domain (focus / strong / not
//             assessed) plus the same relative position against the tier
//             being viewed.
//   CLUSTER — the count of its domains in each placement state, and which
//             cluster the placement suggests starting with (most focus areas).
//
// There is NO per-branch or per-domain practice completion in the data model
// (SkillHubProgress is one aggregate row per skill). "Completed" therefore
// never appears here; it will once practice activities and their persistence
// exist.

import { levelIndex } from "@/lib/grammarPlacement/levels";
import { TIERS } from "@/lib/grammarTiers";

export const TIER_STATE = { CURRENT: "current", PLACED_ABOVE: "placed_above", AHEAD: "ahead", UNKNOWN: "unknown" };
export const DOMAIN_STATE = { FOCUS: "focus", STRONG: "strong", UNKNOWN: "unknown" };
export const RELATIVE = { ABOVE: "above", WITHIN: "within", BELOW: "below", UNKNOWN: "unknown" };

const tierRange = (tier) => {
  const idx = tier.levels.map(levelIndex);
  return { min: Math.min(...idx), max: Math.max(...idx) };
};

export function tierIdForLevel(level) {
  return TIERS.find((t) => t.levels.includes(level))?.id ?? null;
}

export function tierState(tier, overallLevel) {
  if (!overallLevel) return TIER_STATE.UNKNOWN;
  const li = levelIndex(overallLevel);
  if (li < 0) return TIER_STATE.UNKNOWN;
  const { min, max } = tierRange(tier);
  if (li < min) return TIER_STATE.AHEAD;
  if (li > max) return TIER_STATE.PLACED_ABOVE;
  return TIER_STATE.CURRENT;
}

/** r = one entry of result.domains (grammarPlacementResult), or undefined. */
export function domainState(r) {
  if (!r?.assessed) return DOMAIN_STATE.UNKNOWN;
  return r.needsAttention ? DOMAIN_STATE.FOCUS : DOMAIN_STATE.STRONG;
}

export function domainRelative(r, tier) {
  if (!tier || !r?.assessed || !r.level) return RELATIVE.UNKNOWN;
  const li = levelIndex(r.level);
  if (li < 0) return RELATIVE.UNKNOWN;
  const { min, max } = tierRange(tier);
  if (li > max) return RELATIVE.ABOVE;
  if (li < min) return RELATIVE.BELOW;
  return RELATIVE.WITHIN;
}

export function clusterSummary(cluster, byId) {
  const s = { focus: 0, strong: 0, unknown: 0, total: cluster.domains.length };
  cluster.domains.forEach((d) => { s[domainState(byId[d.id])] += 1; });
  return s;
}

/** The cluster with the most focus areas, or null when placement flagged none. */
export function recommendedClusterId(tier, byId) {
  let best = null, bestN = 0;
  tier.clusters.forEach((cl) => {
    const n = clusterSummary(cl, byId).focus;
    if (n > bestN) { best = cl.id; bestN = n; }
  });
  return best;
}