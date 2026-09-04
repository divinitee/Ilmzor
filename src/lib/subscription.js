import { base44 } from "@/api/base44Client";

// Whether new registrations get an automatic 1-week trial at all. Flip this
// to false to retire the trial entirely (the founder has already flagged
// this as likely, once account-multiplication abuse becomes a problem) —
// when off, chooseFreePlan() below just grants the real Free Plan directly,
// no code restructuring needed.
export const TRIAL_ENABLED = true;
// Cut from 7 to 3 on 2026-09-04. The trial still hands out full Learner access
// (25 AI calls/day), so every throwaway signup draws on the same shared Base44
// credit pool — shortening the window caps that exposure per farmed account
// while keeping a strong first impression for real students. If abuse keeps
// growing, TRIAL_ENABLED above is the kill switch.
export const TRIAL_DAYS = 3;

async function findSubscription(userEmail) {
  const existing = await base44.entities.StudentSubscription.filter({ phone: userEmail });
  return existing[0] || null;
}

// Called when a student picks "Start Free" during onboarding. Grants a real
// week of Learner-tier access if TRIAL_ENABLED, tagged is_trial so it can be
// told apart from someone who actually paid for Learner. If a referral
// already created a StudentSubscription record (inactive, pending), that
// record is updated rather than duplicated.
export async function chooseFreePlan(userEmail, studentName) {
  try {
    const existing = await findSubscription(userEmail);
    const payload = TRIAL_ENABLED
      ? {
          status: "active",
          plan: "Learner Plan",
          is_trial: true,
          expires_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }
      : { status: "active", plan: "Free Plan", is_trial: false, expires_at: "" };
    if (existing) {
      await base44.entities.StudentSubscription.update(existing.id, payload);
    } else {
      await base44.entities.StudentSubscription.create({ student_name: studentName || userEmail, phone: userEmail, ...payload });
    }
  } catch (e) {
    console.error("chooseFreePlan failed:", e);
  }
}

// Called from Home.jsx's existing expiry check. A lapsed TRIAL lands
// softly on the real, permanent Free Plan (still status: "active", since
// Free Plan costs nothing) — only a lapsed PAID plan goes "inactive" and
// hits the paywall, exactly as it already correctly did before today.
export async function handleExpiredSubscription(sub) {
  if (sub.is_trial) {
    return base44.entities.StudentSubscription.update(sub.id, {
      status: "active", plan: "Free Plan", is_trial: false, expires_at: "",
    });
  }
  return base44.entities.StudentSubscription.update(sub.id, { status: "inactive" });
}
