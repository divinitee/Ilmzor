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

const DAY_MS = 24 * 60 * 60 * 1000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * DAY_MS).toISOString().slice(0, 10);

async function findSubscription(userEmail) {
  const existing = await base44.entities.StudentSubscription.filter({ phone: userEmail });
  return existing[0] || null;
}

// --- Classification -------------------------------------------------------

// `status` alone never meant "paid": the self-serve onboarding trial sets
// status:"active" with no payment and no approval, and a lapsed trial rolls
// onto a permanent free plan that is also status:"active" forever. Both
// dashboards render subscriptions through this one classifier so a teacher
// and an admin can never be looking at two different versions of the truth.
export function subscriptionKind(sub) {
  if (!sub) return "unpaid";
  if (sub.status === "pending") return "pending";
  if (sub.status === "paused") return "paused";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.status !== "active") return "unpaid";
  // Cancelled at period end: still has the access they paid for, but it is
  // scheduled to end and must not be mistaken for a healthy subscription.
  if (sub.cancelled_at) return "ending";
  if (sub.is_trial) return "trial";
  if (!sub.plan || /free/i.test(sub.plan)) return "free";
  return "paid";
}

// Only real money counts as revenue — trial, free and cancelled never do.
export const isPaying = (sub) => ["paid", "ending"].includes(subscriptionKind(sub));

export const SUB_KIND_META = {
  paid: { label: "✅ Paid", cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10" },
  trial: { label: "🎁 Trial", cls: "text-sky-700 dark:text-sky-400 bg-sky-500/10" },
  free: { label: "Free plan", cls: "text-muted-foreground bg-muted" },
  pending: { label: "⏳ Pending", cls: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  paused: { label: "⏸ Paused", cls: "text-amber-700 dark:text-amber-400 bg-amber-500/10" },
  ending: { label: "⚠ Ending", cls: "text-orange-700 dark:text-orange-400 bg-orange-500/10" },
  cancelled: { label: "Cancelled", cls: "text-muted-foreground bg-muted line-through" },
  unpaid: { label: "❌ Unpaid", cls: "text-destructive bg-destructive/10" },
};

// Days of access left, or null for a subscription with no expiry at all
// (the permanent free plan). 0 means it has already run out.
export function daysRemaining(sub) {
  if (!sub?.expires_at) return null;
  return Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / DAY_MS));
}

// One billing period from today, honouring the sub's own monthly/yearly cycle.
export function periodEnd(sub) {
  const d = new Date();
  if (sub?.billing_cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

// --- Admin actions --------------------------------------------------------
// Each returns the patched subscription so a caller can update local state
// without a full refetch. All of them clear the pause/cancel bookkeeping they
// supersede, so a subscription can never sit in two states at once.

// Approve a pending payment, or revive a cancelled/lapsed one, with a fresh
// billing period. Previously duplicated verbatim in both dashboards.
export async function approveSubscription(sub) {
  const patch = {
    status: "active",
    expires_at: periodEnd(sub),
    cancelled_at: "",
    paused_at: "",
    paused_days_remaining: null,
  };
  await base44.entities.StudentSubscription.update(sub.id, patch);
  return { ...sub, ...patch };
}

// Halt: suspend access but bank the days they already paid for, so resuming
// gives the time back instead of letting the calendar eat it.
export async function pauseSubscription(sub, note = "") {
  const patch = {
    status: "paused",
    paused_at: todayStr(),
    paused_days_remaining: daysRemaining(sub),
  };
  if (note) patch.admin_note = note;
  await base44.entities.StudentSubscription.update(sub.id, patch);
  return { ...sub, ...patch };
}

export async function resumeSubscription(sub, note = "") {
  const banked = sub.paused_days_remaining;
  // null/undefined = there was no expiry to bank (permanent free plan), so it
  // comes back permanent. 0 = it had already run out before being paused, so
  // it comes back already expired rather than silently gaining time.
  const expires_at =
    typeof banked === "number" ? (banked > 0 ? addDays(banked) : todayStr()) : "";
  const patch = { status: "active", paused_at: "", paused_days_remaining: null, expires_at };
  if (note) patch.admin_note = note;
  await base44.entities.StudentSubscription.update(sub.id, patch);
  return { ...sub, ...patch };
}

// immediate:true  — access dies now. expires_at is deliberately left intact so
//                   you can still see how much they had left when you pulled
//                   the plug (refund math, chargeback evidence).
// immediate:false — they keep the access they paid for; the sub stays active
//                   and lapses to "cancelled" on its expiry date, handled by
//                   handleExpiredSubscription() below.
export async function cancelSubscription(sub, { immediate = true, note = "" } = {}) {
  const patch = immediate
    ? { status: "cancelled", cancelled_at: todayStr(), paused_at: "", paused_days_remaining: null }
    : { cancelled_at: todayStr() };
  if (note) patch.admin_note = note;
  await base44.entities.StudentSubscription.update(sub.id, patch);
  return { ...sub, ...patch };
}

// Undo. A scheduled cancellation (still active) just loses its end date and
// carries on; a fully cancelled one gets a fresh period like an approval.
export async function reactivateSubscription(sub, note = "") {
  const scheduledOnly = sub.status === "active" && sub.cancelled_at;
  const patch = scheduledOnly
    ? { cancelled_at: "" }
    : {
        status: "active",
        cancelled_at: "",
        paused_at: "",
        paused_days_remaining: null,
        expires_at: periodEnd(sub),
      };
  if (note) patch.admin_note = note;
  await base44.entities.StudentSubscription.update(sub.id, patch);
  return { ...sub, ...patch };
}

// --- Student-facing flows -------------------------------------------------

// Called when a student picks "Start Free" during onboarding. Grants a real
// week of Learner-tier access if TRIAL_ENABLED, tagged is_trial so it can be
// told apart from someone who actually paid for Learner. If a referral
// already created a StudentSubscription record (inactive, pending), that
// record is updated rather than duplicated.
export async function chooseFreePlan(userEmail, studentName) {
  try {
    const existing = await findSubscription(userEmail);
    // An admin-paused or admin-cancelled account must not be able to hand
    // itself access back by re-running onboarding — without this, "cancel"
    // would be undone by the student in about four taps.
    if (existing && ["paused", "cancelled"].includes(existing.status)) return;
    const payload = TRIAL_ENABLED
      ? {
          status: "active",
          plan: "Learner Plan",
          is_trial: true,
          expires_at: addDays(TRIAL_DAYS),
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
  // A subscription cancelled at period end has now reached that end. It
  // lapses to "cancelled" rather than "inactive" so the deliberate
  // cancellation stays distinguishable afterwards — and, importantly, a
  // cancelled trial does NOT get rolled onto the free plan below, which
  // would have quietly handed access back to someone you cancelled.
  if (sub.cancelled_at) {
    return base44.entities.StudentSubscription.update(sub.id, { status: "cancelled" });
  }
  if (sub.is_trial) {
    return base44.entities.StudentSubscription.update(sub.id, {
      status: "active", plan: "Free Plan", is_trial: false, expires_at: "",
    });
  }
  return base44.entities.StudentSubscription.update(sub.id, { status: "inactive" });
}
