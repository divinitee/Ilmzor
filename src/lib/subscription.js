import { base44 } from "@/api/base44Client";
import { studentApi } from "@/lib/serverApi";
import {
  subscriptionKind as coreKind,
  isPaying as coreIsPaying,
  isRealPlan,
  paidSinceStamp as corePaidSinceStamp,
  daysRemaining as coreDaysRemaining,
  periodEnd as corePeriodEnd,
  approvePatch,
  pausePatch,
  resumePatch,
  cancelPatch,
  reactivatePatch,
} from "../../base44/shared/subscriptionCore.js";

// The rules themselves live in base44/shared/subscriptionCore.js (VT-35 P2,
// 2026-10-04), shared with the Admin Console's server function so the old
// /admin page and the console can never disagree. This file keeps the same
// exports the app already imports.

// Whether new registrations get an automatic trial at all. Flip to false to
// retire the trial entirely; chooseFreePlan() then grants the Free Plan.
export const TRIAL_ENABLED = true;
// Cut from 7 to 3 on 2026-09-04 (AI-credit exposure per farmed account).
export const TRIAL_DAYS = 3;

// --- Classification -------------------------------------------------------

export const subscriptionKind = (sub) => coreKind(sub);
export const isPaying = (sub) => coreIsPaying(sub);
export const paidSinceStamp = (sub) => corePaidSinceStamp(sub);

// When this person first became a paying member, or null if they never have.
export function paidSince(sub) {
  if (!sub || sub.is_trial) return null;
  if (sub.paid_since) return sub.paid_since;
  return coreIsPaying(sub) ? sub.created_date || null : null;
}

export const SUB_KIND_META = {
  paid: { label: "✅ Paid", cls: "text-emerald-400 bg-emerald-500/10" },
  trial: { label: "🎁 Trial", cls: "text-sky-400 bg-sky-500/10" },
  free: { label: "Free plan", cls: "text-muted-foreground bg-muted" },
  pending: { label: "⏳ Pending", cls: "text-amber-400 bg-amber-500/10" },
  paused: { label: "⏸ Paused", cls: "text-amber-400 bg-amber-500/10" },
  ending: { label: "⚠ Ending", cls: "text-orange-400 bg-orange-500/10" },
  cancelled: { label: "Cancelled", cls: "text-muted-foreground bg-muted line-through" },
  unpaid: { label: "❌ Unpaid", cls: "text-destructive bg-destructive/10" },
};

export const daysRemaining = (sub) => coreDaysRemaining(sub);
export const periodEnd = (sub) => corePeriodEnd(sub);
export { isRealPlan };

// --- Admin actions (old /admin page) --------------------------------------
// Each returns the patched subscription so the caller can update local state.
// The Admin Console does NOT use these: it goes through adminApi, which
// builds the same patches server-side.

async function applyPatch(sub, patch) {
  await base44.entities.StudentSubscription.update(sub.id, patch);
  return { ...sub, ...patch };
}

export const approveSubscription = (sub) => applyPatch(sub, approvePatch(sub));
export const pauseSubscription = (sub, note = "") => applyPatch(sub, pausePatch(sub, Date.now(), note));
export const resumeSubscription = (sub, note = "") => applyPatch(sub, resumePatch(sub, Date.now(), note));
export const cancelSubscription = (sub, { immediate = true, note = "" } = {}) =>
  applyPatch(sub, cancelPatch(sub, { immediate, note }));
export const reactivateSubscription = (sub, note = "") => applyPatch(sub, reactivatePatch(sub, Date.now(), note));

// --- Student-facing flows -------------------------------------------------
//
// Moved server-side on 2026-09-23 (Teacher Panel phase 1). Students can no
// longer write their own StudentSubscription row at all — RLS allows only
// admins — so the trial grant and the expiry transition run in
// base44/functions/studentApi. Keep TRIAL_ENABLED / TRIAL_DAYS in sync there.

// Called when a student picks "Start Free" during onboarding.
// One in-flight call at a time (VT-36: a double tap created two trial rows).
let trialInFlight = null;
export function chooseFreePlan() {
  if (!trialInFlight) {
    trialInFlight = studentApi("startTrial")
      .then((res) => res?.subscription || null)
      .catch((e) => { console.error("startTrial failed:", e); return null; })
      .finally(() => { trialInFlight = null; });
  }
  return trialInFlight;
}

// The caller's own subscription, with any due expiry transition applied
// server-side. Also returns the caller's class membership.
export async function refreshMySubscription() {
  return studentApi("refresh");
}