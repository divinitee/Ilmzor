// VIRORA Coach Engine — PURE decision engine + session planner (VT-40, Stage 2, 2026-10-08).
// Reads FACTS (LearnerItems from coachCore.js), the goal graph and ONE policy, and
// decides what to practise, in what order, for how long, and why. Never reads a
// persona. No I/O, no clock reads: `now` comes in as an argument.
//
//   candidates -> hard gates -> weighted-sum score -> buckets -> time-budget packing
//   -> explanation per item -> fallback chain when nothing is actionable
//
// Planner invariant (tested): sum(est_minutes) <= the requested minutes. Always.

import { DAY_MS, LABELS, fnv1a } from "./coachCore.js";
import { onPath, goalRelevance, prerequisitesOf, unlockCount, edgesFor } from "./coachGraph.js";

export const PLAN_VERSION = "coach-plan@1";

// Depth -> questions + estimated minutes (locked estimates; recalibrated from duration_ms later).
export const DEPTHS = {
  probe: { questions: 5, minutes: 2 },        // Unknown
  brushup: { questions: 3, minutes: 1 },      // Solid (+ due)
  practice: { questions: 6, minutes: 3 },     // Learning (+ due)
  remediation: { questions: 9, minutes: 5 },  // Weak: rule recap + practice + check
};

const UNCERTAINTY = { low: 1, medium: 0.5, high: 0 };
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export function depthFor(state) {
  if (state === "unknown") return "probe";
  if (state === "weak") return "remediation";
  if (state === "solid") return "brushup";
  return "practice";
}

// FSRS answers WHEN. An item the learner already met in games but the coach has never
// reviewed has no card yet: in FSRS terms it is a NEW card, which is due now. Without
// this, game-learned items would never enter the review flow (found in shadow mode).
const hasCard = (it) => !!it.due;
const isDue = (it, now) => (hasCard(it) ? Date.parse(it.due) <= now : it.learning_state !== "unknown");

/** The six 0..1 features (facts + graph only). */
export function featuresFor(it, { goal, now, maxUnlock }) {
  const unknown = it.learning_state === "unknown";
  const overdueDays = it.due ? (now - Date.parse(it.due)) / DAY_MS : 0;
  return {
    weakness: unknown ? 0.5 : clamp01(1 - (it.weighted_accuracy ?? 0.5)),
    goal_relevance: goalRelevance(goal, it.item_key),
    prereq_importance: maxUnlock > 0 ? clamp01(unlockCount(goal, it.item_key) / maxUnlock) : 0,
    urgency: it.due ? clamp01(overdueDays / Math.max(Number(it.scheduled_days) || 0, 1)) : 0,
    uncertainty: unknown ? 1 : (UNCERTAINTY[it.confidence] ?? 1),
    novelty: unknown ? 1 : 0,
  };
}

const W_KEYS = { weakness: "weakness", goal_relevance: "goalRelevance", prereq_importance: "prereqImportance", urgency: "urgency", uncertainty: "uncertainty", novelty: "novelty" };
export function priorityOf(features, weights) {
  let num = 0, den = 0;
  for (const [f, w] of Object.entries(W_KEYS)) { num += (weights[w] || 0) * features[f]; den += weights[w] || 0; }
  return den > 0 ? Number((num / den).toFixed(4)) : 0;
}

/**
 * Build the ranked, gated candidate list.
 *   items          resolved LearnerItems (facts) for this learner
 *   newCandidates  unseen items WITH playable content, e.g. [{ item_type, item_key, word_id }]
 *   hasContent     (item_key) => boolean   playable content exists right now
 *   doneToday      Set<item_key> already practised in a coach session today
 */
export function rankCandidates({ items = [], newCandidates = [], goal, policy, now, hasContent = () => true, doneToday = new Set() }) {
  const byKey = new Map(items.map((i) => [i.item_key, i]));
  const allKeys = new Set([...edgesFor(goal).flat()]);
  const maxUnlock = Math.max(0, ...[...allKeys].map((k) => unlockCount(goal, k)));
  const stateOf = (k) => byKey.get(k)?.learning_state || "unknown";

  // 1. Candidates.
  const raw = [];
  const dueReason = (it) => (hasCard(it) ? "due" : "first_check");
  for (const it of items) {
    if (!onPath(goal, it.item_key)) continue;
    if (it.learning_state === "weak") raw.push({ it, bucket: "remediate", reasons: isDue(it, now) ? ["weak", dueReason(it)] : ["weak"] });
    else if (isDue(it, now)) raw.push({ it, bucket: "review", reasons: [dueReason(it)] });
    else if (it.learning_state === "learning") raw.push({ it, bucket: "practice", reasons: ["practising"] });
    else if (it.learning_state === "solid") raw.push({ it, bucket: "maintenance", reasons: ["maintenance"] });
  }
  for (const c of newCandidates) {
    if (byKey.has(c.item_key) || !onPath(goal, c.item_key)) continue;
    const pre = prerequisitesOf(goal, c.item_key);
    if (pre.every((p) => ["learning", "solid"].includes(stateOf(p)))) {
      raw.push({ it: { ...c, learning_state: "unknown", confidence: "low", weighted_accuracy: null }, bucket: "new", reasons: ["new"] });
    }
  }

  // 2. Hard gates: playable content, not done today, weak prerequisite replaces the item.
  const out = new Map();
  for (const c of raw) {
    let { it, bucket, reasons } = c;
    const weakPre = prerequisitesOf(goal, it.item_key).find((p) => stateOf(p) === "weak" && byKey.has(p));
    if (weakPre) {
      it = byKey.get(weakPre);
      bucket = "remediate";
      reasons = ["weak", `prerequisite_for:${c.it.item_key}`];
    }
    if (!hasContent(it.item_key) || doneToday.has(it.item_key)) continue;
    const prev = out.get(it.item_key);
    if (prev) { prev.reasons = [...new Set([...prev.reasons, ...reasons])]; continue; }
    out.set(it.item_key, { it, bucket, reasons });
  }

  // 3. Score.
  return [...out.values()].map((c) => {
    const features = featuresFor(c.it, { goal, now, maxUnlock });
    const reasons = [...c.reasons];
    if (features.goal_relevance >= 0.5 && !reasons.includes("goal_relevant")) reasons.push("goal_relevant");
    if (c.it.learning_state !== "unknown" && c.it.confidence === "low") reasons.push("low_confidence");
    const depth = c.bucket === "maintenance" ? "brushup" : depthFor(c.it.learning_state);
    return { ...c, reasons, features, priority: priorityOf(features, policy.weights), depth, est_minutes: DEPTHS[depth].minutes };
  }).sort((a, b) => b.priority - a.priority || a.it.item_key.localeCompare(b.it.item_key));
}

const explain = (c, policy) => ({
  item_key: c.it.item_key, item_type: c.it.item_type, word_id: c.it.word_id ?? undefined,
  bucket: c.bucket, priority: c.priority, features: c.features, reasons: c.reasons,
  label: LABELS[c.it.learning_state] || LABELS.unknown,
  short_reason: c.bucket === "review" ? (c.reasons.includes("due") ? "Due" : "Review") : c.bucket === "new" ? "New" : c.bucket === "remediate" ? "Needs work" : "Practice",
  depth: c.depth, questions: DEPTHS[c.depth].questions, est_minutes: c.est_minutes,
  policy: policy.version, engine: PLAN_VERSION,
});

/**
 * Pack ranked candidates into the time budget. Invariant: total <= minutes.
 *   1. reviews up to maxReviewRatio of the minutes
 *   2. remediation, at most maxRemediationsPer10Min per started 10 minutes
 *   3. new learning
 *   4. leftover: practice + remaining new, highest priority first
 *   5. at least one non-review item whenever one fits
 *   fallback: maintenance review -> goal complete for now -> free practice
 */
export function planSession(ranked, { policy, minutes }) {
  const B = Math.max(0, Number(minutes) || 0);
  const L = policy.limits;
  // Reviews go first but must not crowd out the day's most valuable non-review work:
  // leave room for one remediation and one probe when such candidates exist (shadow-mode
  // finding: a 10-minute plan could otherwise be all reviews and never fix a weak item).
  const reserve = (ranked.some((c) => c.bucket === "remediate") ? DEPTHS.remediation.minutes : 0) + (ranked.some((c) => c.bucket === "new") ? DEPTHS.probe.minutes : 0);
  const reviewCap = Math.min(L.maxReviewRatio * B, Math.max(0, B - reserve));
  const remCap = Math.max(1, Math.ceil(B / 10) * L.maxRemediationsPer10Min);
  const queue = [];
  let used = 0, revUsed = 0, rem = 0;
  const fits = (c) => used + c.est_minutes <= B;
  const take = (c) => { queue.push(c); used += c.est_minutes; if (c.bucket === "review") revUsed += c.est_minutes; if (c.bucket === "remediate") rem++; };
  const of = (b) => ranked.filter((c) => c.bucket === b);

  for (const c of of("review")) if (fits(c) && revUsed + c.est_minutes <= reviewCap) take(c);
  for (const c of of("remediate")) if (rem < remCap && fits(c)) take(c);
  for (const c of of("new")) if (fits(c)) take(c);
  for (const c of ranked.filter((x) => (x.bucket === "practice" || x.bucket === "new") && !queue.includes(x))) if (fits(c)) take(c);

  if (queue.length && queue.every((c) => c.bucket === "review")) {
    const alt = ranked.find((c) => c.bucket !== "review" && c.bucket !== "maintenance" && !queue.includes(c) && c.est_minutes <= B && (c.bucket !== "remediate" || remCap > 0));
    if (alt) {
      while (queue.length && used + alt.est_minutes > B) { const drop = queue.pop(); used -= drop.est_minutes; }
      if (used + alt.est_minutes <= B) take(alt);
    }
  }

  let fallback = null;
  if (!queue.length) {
    const maint = of("maintenance").sort((a, b) => (Number(a.it.stability) || 0) - (Number(b.it.stability) || 0) || a.it.item_key.localeCompare(b.it.item_key));
    for (const c of maint) if (fits(c)) take({ ...c, reasons: [...c.reasons] });
    fallback = queue.length ? "maintenance" : ranked.length ? "nothing_fits" : "goal_complete";
  }
  return { queue, minutes_planned: used, fallback };
}

/**
 * One call = one plan. kind: "today" (Today's Practice) | "continuation" (Keep going).
 * A continuation is planned from the CURRENT facts with today's coach-practised items
 * excluded, so it is a fresh plan, never a replay.
 */
export function planToday({ items, newCandidates, goal, policy, minutes, now, hasContent, doneToday, kind = "today" }) {
  const ranked = rankCandidates({ items, newCandidates, goal, policy, now, hasContent, doneToday });
  const { queue, minutes_planned, fallback } = planSession(ranked, { policy, minutes });
  const explanation = queue.map((c) => explain(c, policy));
  const plan_hash = fnv1a(JSON.stringify([policy.version, goal.id, minutes, kind, explanation.map((e) => [e.item_key, e.depth])]));
  return {
    kind, minutes, minutes_planned, fallback, plan_hash, explanation,
    suggestion: fallback === "goal_complete" ? "choose_another_goal" : fallback ? "free_practice" : null,
  };
}
