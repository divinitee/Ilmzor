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
//
// ⚠ OPERATIONAL RULE THAT KEEPS "LOCKED FOR LIFE" TRUE:
// When a rung changes, create BRAND NEW products in Dodo Payments at the new
// price and repoint the DODO_PRODUCT_* secrets at them. Do NOT edit the price
// of an existing Dodo product — existing subscribers are attached to that
// product, so editing it raises THEIR price too and breaks the promise for
// exactly the people who trusted it earliest. New rung = new product, always.
//
// The amounts here are display only. What a customer is actually charged is
// whatever the Dodo product is set to, so these numbers and the Dodo products
// must be kept in step by hand.

export const CURRENCY = "USD";
export const FINAL_ANNOUNCEMENT = "2027-01-01";

// The reference price every discount is measured against: what VIRORA costs
// once pricing is finalised, from 1 January 2027.
//
// This is a FUTURE price, and the UI must always frame it that way — "$9.99
// from January", never "was $9.99". It has never been charged, so presenting
// it as a former price would be invented reference pricing: dishonest, and
// illegal in many markets. Stated as a dated upcoming price it is simply true,
// and it is the anchor the founder discount is calculated from.
export const LAUNCH_PRICE = {
  monthly: { learner: 9.99, vip: 14.99 },
  yearly: { learner: 99.99, vip: 149.99 },
};

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
    usdYear: { learner: 29.99, vip: 59.99 },
  },
  {
    id: "early",
    // Ends when Grammar and the grammar lessons ship — a milestone, not a date,
    // so it is never shown as a countdown we can't honour.
    endsOn: null,
    endsReason: "milestone",
    usd: { learner: 5.55, vip: 9.99 },
    // DERIVED, not specified: the yearly figures for the two middle rungs were
    // interpolated at roughly ten months' equivalent, matching the ratio of the
    // founder and launch prices. Replace with real numbers when decided.
    usdYear: { learner: 55.99, vip: 99.99 },
  },
  {
    id: "standard",
    endsOn: null,
    endsReason: "announcement",
    usd: { learner: 8.88, vip: 14.99 },
    usdYear: { learner: 88.88, vip: 149.99 },
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

// Yearly is now an explicit price per plan per rung, not a formula off the
// monthly rate — the old "monthly × 12 × 0.75" produced $26.91, and the real
// price is $29.99. A formula that disagrees with what the customer is actually
// charged is worse than no formula.
export function usdYearFor(planId, stageId = null) {
  const stage = stageId
    ? PRICE_STAGES.find((s) => s.id === stageId) || getCurrentStage()
    : getCurrentStage();
  return stage.usdYear?.[planId] ?? 0;
}

// Price for a plan on either cycle at the current (or a named) rung.
export const priceFor = (planId, cycle = "monthly", stageId = null) =>
  cycle === "yearly" ? usdYearFor(planId, stageId) : usdFor(planId, stageId);

// How far below the January launch price the current price sits. This is what
// "70% off" on the pricing page means — always computed, never hardcoded, so
// it cannot drift out of step with the numbers above.
export function discountVsLaunch(planId, cycle = "monthly") {
  const now = priceFor(planId, cycle);
  const launch = (cycle === "yearly" ? LAUNCH_PRICE.yearly : LAUNCH_PRICE.monthly)[planId];
  if (!now || !launch || now >= launch) return 0;
  return Math.round((1 - now / launch) * 100);
}

export const launchPriceFor = (planId, cycle = "monthly") =>
  (cycle === "yearly" ? LAUNCH_PRICE.yearly : LAUNCH_PRICE.monthly)[planId] ?? 0;

// What a year saves against paying monthly at the SAME rung. Computed from the
// real prices rather than the old hardcoded 25%, which stopped being true the
// moment yearly became an explicit number ($2.99 × 12 = $35.88 vs $29.99 is
// ~16%, not 25%).
export function yearlySavingPct(planId = "learner") {
  const monthly = usdFor(planId);
  const yearly = usdYearFor(planId);
  if (!monthly || !yearly) return 0;
  const full = monthly * 12;
  if (yearly >= full) return 0;
  return Math.round((1 - yearly / full) * 100);
}

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

// What the UI should TELL a subscriber they are locking in, and the rung label
// to pass to createDodoCheckout as reporting metadata.
//
// NOT the stored record. This runs in the browser, so a tampered client could
// claim any number it liked; the authoritative StudentSubscription.locked_price_usd
// is resolved server-side in dodoWebhook from Dodo's own product. The key here
// is deliberately named display_price_usd so this object can never be spread
// straight into an entity write and silently become the record.
export function lockSnapshot(planId, cycle = "monthly") {
  const stage = getCurrentStage();
  return {
    founder_stage: stage.id,
    display_price_usd: priceFor(planId, cycle, stage.id),
  };
}
