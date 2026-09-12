import { paidSince } from "@/lib/subscription";

// The achievements registry. Every achievement is a static definition plus one
// pure `unlockedAt(ctx)` function that returns the ISO date it was earned, or
// null. Nothing is stored: eligibility is always recomputed from the facts on
// the subscription/user, so a badge can never be granted by editing a client
// flag. To add an achievement, append a definition here — the page renders
// whatever this list contains.
//
// ctx = { user, subscription }

// Founding Learner: paid before this day (exclusive, UTC midnight).
export const FOUNDING_CUTOFF = "2026-10-14";

export const ACHIEVEMENTS = [
  {
    id: "founding_learner",
    // "founder" tier gets the gold/bronze metallic treatment; future tiers
    // (e.g. "silver", "violet") map to their own palette in AchievementMedal.
    tier: "founder",
    permanent: true,
    exclusive: true,
    titleKey: "achievements.founding_title",
    subtitleKey: "achievements.founding_gen",
    criteriaKey: "achievements.founding_criteria",
    descKey: "achievements.founding_desc",
    lockedHintKey: "achievements.founding_locked_hint",
    unlockedAt: ({ subscription }) => {
      const since = paidSince(subscription);
      if (!since) return null;
      return new Date(since) < new Date(`${FOUNDING_CUTOFF}T00:00:00Z`) ? since : null;
    },
  },
];

export function evaluateAchievements(ctx) {
  return ACHIEVEMENTS.map((a) => {
    const unlockedAt = a.unlockedAt(ctx) || null;
    return { ...a, unlocked: !!unlockedAt, unlockedAt };
  });
}

export const hasAnyUnlocked = (ctx) => evaluateAchievements(ctx).some((a) => a.unlocked);