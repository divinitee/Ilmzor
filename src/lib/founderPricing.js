// The founder price ladder — the single source of truth for what VIRORA costs
// and when that changes. Every price, date and milestone lives here; no screen
// hardcodes a number.
//
// The strategy: pressure that RENEWS rather than decays. A single "beta ends
// soon" banner stops working the moment someone ignores it once. A ladder with
// real, dated rungs keeps giving a reason to act, and every rung is a promise
// that has to be kept — the whole thing only works while it stays true.
//
// Near-final pricing is announced 2027-01-01 (FINAL_ANNOUNCEMENT below).

export const CURRENCY = "USD";
export const YEARLY_DISCOUNT = 0.25;
export const FINAL_ANNOUNCEMENT = "2027-01-01";

// Each stage is available while today <= endsOn (inclusive, in the viewer's own
// timezone). A stage with endsOn null runs until a milestone we can't date yet,
// and is only entered once the stage above it has expired.
export const PRICE_STAGES = [
  {
    id: "founder",
    // 21 October — Day of the Adoption of the Law on the State Language in
    // Uzbekistan. Deliberate: this is a product about language, so the deadline
    // means something locally rather than being an arbitrary countdown.
    endsOn: "2026-10-21",
    endsReason: "date",
    usd: { learner: 2.99, vip: 5.99 },
  },
  {
    id: "early",
    // Ends when Grammar and the grammar lessons ship — a milestone, not a date,
    // so it is never shown as a countdown we can't honour.
    endsOn: null,
    endsReason: "milestone",
    usd: { learner: 5.55, vip: 9.99 },
  },
  {
    id: "standard",
    endsOn: null,
    endsReason: "announcement",
    usd: { learner: 8.88, vip: 14.99 },
  },
];

// Set to a stage id to force it — used when a milestone-triggered stage begins
// (e.g. flip to "standard" the day Grammar launches). null = resolve by date.
export const STAGE_OVERRIDE = null;

// End of the given day, in the viewer's own timezone. A deadline of "21 Oct"
// has to include all of 21 Oct, or someone buying that morning is told they
// missed it.
const endOfDay = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

export function getCurrentStage(now = new Date()) {
  if (STAGE_OVERRIDE) {
    const forced = PRICE_STAGES.find((s) => s.id === STAGE_OVERRIDE);
    if (forced) return forced;
  }
  for (const stage of PRICE_STAGES) {
    if (!stage.endsOn) return stage;
    const cutoff = endOfDay(stage.endsOn);
    if (!cutoff || now <= cutoff) return stage;
  }
  return PRICE_STAGES[PRICE_STAGES.length - 1];
}

export function getNextStage(now = new Date()) {
  const current = getCurrentStage(now);
  const i = PRICE_STAGES.findIndex((s) => s.id === current.id);
  return i >= 0 && i < PRICE_STAGES.length - 1 ? PRICE_STAGES[i + 1] : null;
}

// Monthly price for a plan at the current (or a named) stage. Free stays free.
export function usdFor(planId, stageId = null) {
  const stage = stageId
    ? PRICE_STAGES.find((s) => s.id === stageId) || getCurrentStage()
    : getCurrentStage();
  return stage.usd[planId] ?? 0;
}

// 25% off twelve months. Kept to two decimals because it is a real charge.
export const yearlyUsd = (monthly) =>
  Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT) * 100) / 100;

export const formatUsd = (n) => {
  const num = Number(n) || 0;
  // Whole dollars read better without the trailing zeros ($27 not $27.00),
  // but anything with cents must show both digits.
  return Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`;
};

// Milliseconds until the current stage's deadline, or null when the current
// stage has no date (milestone-triggered). Null is the signal to show no
// countdown at all rather than an invented one.
export function msUntilStageEnd(now = new Date()) {
  const stage = getCurrentStage(now);
  const cutoff = endOfDay(stage.endsOn);
  if (!cutoff) return null;
  return Math.max(0, cutoff.getTime() - now.getTime());
}

export function countdownParts(ms) {
  if (ms === null || ms === undefined) return null;
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired: total <= 0,
  };
}

// What a subscriber locks in at the moment they pay. Stored on their
// StudentSubscription so "locked for life" is an auditable record and not just
// a line of marketing copy — see createDodoCheckout / dodoWebhook.
export function lockSnapshot(planId, cycle = "monthly") {
  const stage = getCurrentStage();
  const monthly = usdFor(planId, stage.id);
  return {
    founder_stage: stage.id,
    locked_price_usd: cycle === "yearly" ? yearlyUsd(monthly) : monthly,
  };
}
