// VIRORA Coach Engine — policies, personas, entitlement (VT-40, Stage 1).
// PURE config + resolution. Locked architecture (A2):
//   * Policy = limits + ranking weights + capabilities. The engine/planner read it.
//   * Persona = name/colour/copy. ONLY the UI reads it. Never inside a policy.
//   * Both are resolved on the SERVER from the subscription on every request.
//     Nothing about limits is ever stored per student.
//   * Handoff screens trigger on an ENTITLEMENT change, never on a policy
//     version bump (velvet@2 ships silently).
//
// P1 limits: FINAL (Tee + GPT, Oct 8). The minutes are the guided prescription
// VIRORA guarantees each day, NOT an app usage limit: normal VIRORA activities are
// never stopped when the Coach budget is used. "Continuation sessions" are fresh
// sessions planned from updated learner state (UI: "Keep going"), never replays.
// Config values: changing them never touches the engine. Bump `version` when a
// policy's behaviour changes (a version bump never triggers a handoff screen).

import { subscriptionKind } from "./subscriptionCore.js";

export const ENTITLEMENTS = ["free", "trial", "learner", "vip"];

export const POLICIES = {
  vira: {
    id: "vira", version: "vira@2",
    limits: { minutesOptions: [10], continuationSessionsPerDay: 0, maxReviewRatio: 0.6, maxRemediationsPer10Min: 1, activeGoals: 1, goalSwitching: false },
    weights: { weakness: 0.30, goalRelevance: 0.25, prereqImportance: 0.15, urgency: 0.10, uncertainty: 0.10, novelty: 0.10 },
    capabilities: { returnDates: false, mistakeReview: false, earlyTopics: false, focusSwitch: false, telegram: "none" },
  },
  velvet: {
    id: "velvet", version: "velvet@2",
    limits: { minutesOptions: [10, 15, 20], continuationSessionsPerDay: 1, maxReviewRatio: 0.6, maxRemediationsPer10Min: 1, activeGoals: 1, goalSwitching: true },
    weights: { weakness: 0.25, goalRelevance: 0.25, prereqImportance: 0.15, urgency: 0.15, uncertainty: 0.10, novelty: 0.10 },
    capabilities: { returnDates: true, mistakeReview: false, earlyTopics: false, focusSwitch: false, telegram: "nudge" },
  },
  vi: {
    id: "vi", version: "vi@2",
    limits: { minutesOptions: [15, 20, 25], continuationSessionsPerDay: 2, maxReviewRatio: 0.6, maxRemediationsPer10Min: 1, activeGoals: 1, goalSwitching: true },
    weights: { weakness: 0.20, goalRelevance: 0.20, prereqImportance: 0.20, urgency: 0.20, uncertainty: 0.15, novelty: 0.05 },
    capabilities: { returnDates: true, mistakeReview: true, earlyTopics: true, focusSwitch: true, telegram: "nudge+weekly" },
  },
};

export const PERSONAS = {
  vira: { id: "vira", colorToken: "coach-vira", copyKey: "coach.vira" },     // friendly, lilac orb
  velvet: { id: "velvet", colorToken: "coach-velvet", copyKey: "coach.velvet" }, // personal, deep plum orb
  vi: { id: "vi", colorToken: "coach-vi", copyKey: "coach.vi" },             // strategic, gold metallic orb
};

/** Subscription row -> entitlement. Only an active paid/trial row unlocks more than free. */
export function entitlementOf(sub, now = Date.now()) {
  const kind = subscriptionKind(sub, now);
  if (kind === "trial") return "trial";
  if (kind === "paid" || kind === "ending") return /vip/i.test(String(sub?.plan || "")) ? "vip" : "learner";
  return "free"; // free, unpaid, pending, paused, cancelled
}

/**
 * The one resolver. Trial = Velvet's POLICY with Vira's PERSONA; Velvet appears
 * only as the conversion persona (extra-round line, last-day sign-off). There
 * is no hybrid coach inside the engine.
 */
export function resolveCoach(sub, now = Date.now()) {
  const entitlement = entitlementOf(sub, now);
  switch (entitlement) {
    case "vip": return { entitlement, coach: "vi", policy: POLICIES.vi, persona: PERSONAS.vi, conversionPersona: null };
    case "learner": return { entitlement, coach: "velvet", policy: POLICIES.velvet, persona: PERSONAS.velvet, conversionPersona: null };
    case "trial": return { entitlement, coach: "vira", policy: { ...POLICIES.velvet, capabilities: { ...POLICIES.velvet.capabilities, telegram: "none" } }, persona: PERSONAS.vira, conversionPersona: PERSONAS.velvet };
    default: return { entitlement: "free", coach: "vira", policy: POLICIES.vira, persona: PERSONAS.vira, conversionPersona: PERSONAS.velvet };
  }
}

/** Handoff screen: only on a real entitlement change (never a policy version bump). */
export const needsHandoff = (lastEntitlement, entitlement) => !!lastEntitlement && lastEntitlement !== entitlement;

/** Every policy's weights must sum to 1 (tests enforce it). */
export const weightSum = (p) => Number(Object.values(p.weights).reduce((s, x) => s + x, 0).toFixed(6));

/** Clamp a stored daily_minutes to the resolved policy's options (first option if absent). */
export function minutesFor(policy, requested) {
  const opts = policy.limits.minutesOptions;
  const n = Number(requested);
  return opts.includes(n) ? n : opts[0];
}
