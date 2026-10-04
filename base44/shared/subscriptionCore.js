// Subscription rules shared by the browser and the server (VT-35 P2, 2026-10-04).
//
// Plain JS on purpose: Vite (src/lib/subscription.js, /admin) and Deno
// (adminApi, adminOverviewCore) both import this one file, so a pause, a
// cancel or "is this person paying?" can never mean two different things.
//
// Every builder is pure: it takes the current row (and `now`), and returns
// the PATCH to write. Nothing here talks to the database.

const DAY_MS = 24 * 60 * 60 * 1000;
const dateStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDaysFrom = (fromMs, n) => dateStr(fromMs + n * DAY_MS);

export const PLAN_NAMES = { learner: "Learner Plan", vip: "VIP Plan" };
export const CYCLES = ["monthly", "yearly"];

// --- Classification -------------------------------------------------------

// `status` alone never meant "paid": the onboarding trial is status:"active"
// with no payment, and a lapsed trial rolls onto a permanent free plan that is
// also status:"active". Every list classifies through this one function.
export function subscriptionKind(sub) {
  if (!sub) return "unpaid";
  if (sub.status === "pending") return "pending";
  if (sub.status === "paused") return "paused";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.status !== "active") return "unpaid";
  if (sub.cancelled_at) return "ending";
  if (sub.is_trial) return "trial";
  if (!sub.plan || /free/i.test(sub.plan)) return "free";
  return "paid";
}

export const isPaying = (sub) => ["paid", "ending"].includes(subscriptionKind(sub));
export const isRealPlan = (sub) => !!sub?.plan && !/free/i.test(sub.plan);

// A live card subscription is owned by Dodo's webhooks: a manual edit would be
// overwritten on the next renewal, and cancelling here would NOT stop Dodo
// charging the card. Plan changes for these rows happen in Dodo.
export const isLiveCardSub = (sub) => !!sub && sub.provider === "dodo" && sub.status === "active" && !sub.cancelled_at;

export function paidSinceStamp(sub, now = Date.now()) {
  if (!sub || sub.paid_since || sub.is_trial || !isRealPlan(sub)) return {};
  return { paid_since: dateStr(now) };
}

export function daysRemaining(sub, now = Date.now()) {
  if (!sub?.expires_at) return null;
  return Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - now) / DAY_MS));
}

// One billing period from `now`, honouring the row's own cycle.
export function periodEnd(sub, now = Date.now(), cycle = sub?.billing_cycle) {
  const d = new Date(now);
  if (cycle === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return dateStr(d.getTime());
}

// --- Patch builders (same behaviour /admin has had since 2026-09) --------

export function approvePatch(sub, now = Date.now()) {
  return {
    status: "active",
    expires_at: periodEnd(sub, now),
    cancelled_at: "",
    paused_at: "",
    paused_days_remaining: null,
    ...paidSinceStamp(sub, now),
  };
}

export function pausePatch(sub, now = Date.now(), note = "") {
  const patch = { status: "paused", paused_at: dateStr(now), paused_days_remaining: daysRemaining(sub, now) };
  if (note) patch.admin_note = note;
  return patch;
}

export function resumePatch(sub, now = Date.now(), note = "") {
  const banked = sub?.paused_days_remaining;
  // null = nothing to bank (permanent free plan) → comes back permanent;
  // 0 = had already run out → comes back already expired.
  const expires_at = typeof banked === "number" ? (banked > 0 ? addDaysFrom(now, banked) : dateStr(now)) : "";
  const patch = { status: "active", paused_at: "", paused_days_remaining: null, expires_at, ...paidSinceStamp(sub, now) };
  if (note) patch.admin_note = note;
  return patch;
}

// immediate:true  → access ends now (expires_at kept for refund maths)
// immediate:false → keeps paid access until expires_at, then lapses
export function cancelPatch(sub, { immediate = true, note = "" } = {}, now = Date.now()) {
  const patch = immediate
    ? { status: "cancelled", cancelled_at: dateStr(now), paused_at: "", paused_days_remaining: null }
    : { cancelled_at: dateStr(now) };
  if (note) patch.admin_note = note;
  return patch;
}

export function reactivatePatch(sub, now = Date.now(), note = "") {
  const scheduledOnly = sub?.status === "active" && sub?.cancelled_at;
  const patch = scheduledOnly
    ? { cancelled_at: "" }
    : { status: "active", cancelled_at: "", paused_at: "", paused_days_remaining: null, expires_at: periodEnd(sub, now), ...paidSinceStamp(sub, now) };
  if (note) patch.admin_note = note;
  return patch;
}

// Console-only (P2): give someone a paid plan by hand (cash, a comp, a fix).
// `until` (YYYY-MM-DD) overrides the normal one-period length.
export function grantPatch(sub, { plan, cycle = "monthly", until = "", note = "" }, now = Date.now()) {
  const patch = {
    status: "active",
    provider: "manual",
    plan: PLAN_NAMES[plan],
    billing_cycle: cycle,
    is_trial: false,
    expires_at: until || periodEnd(sub, now, cycle),
    payment_ref: "admin-grant",
    cancelled_at: "",
    paused_at: "",
    paused_days_remaining: null,
  };
  if (!sub?.paid_since) patch.paid_since = dateStr(now);
  if (note) patch.admin_note = note;
  return patch;
}

// Adds days on top of whatever they have left (never eats paid days).
export function extendPatch(sub, days, now = Date.now(), note = "") {
  const today = dateStr(now);
  const current = sub?.expires_at && String(sub.expires_at).slice(0, 10) > today ? String(sub.expires_at).slice(0, 10) : today;
  const patch = { expires_at: addDaysFrom(Date.parse(current + "T00:00:00Z"), days) };
  if (note) patch.admin_note = note;
  return patch;
}

// Move to a teacher's group (or out of every group with group = null). The
// commission rule (Tee, 2026-10-04): it follows the student, so renewals
// after the move credit the NEW teacher (dodoWebhook reads row.teacher_id at
// renewal). Earlier payments stay with whoever had the student then.
export function movePatch(group, teacherName = "") {
  if (!group) return { referral_code: "", teacher_id: "", teacher_name: "", roster_status: "active" };
  return {
    referral_code: group.code,
    teacher_id: group.teacher_id,
    teacher_name: group.teacher_name || teacherName || "",
    roster_status: "active",
  };
}
