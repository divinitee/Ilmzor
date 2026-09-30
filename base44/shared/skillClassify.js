// VIRORA Skill Intelligence — evidence classification. PURE, deterministic,
// no AI inference, no clock. Source of truth: docs/skill-intelligence-architecture.md.
//
// classifyEvidence(row) -> {
//   leaf, facets, mode, level, support, verification, strength,
//   ...bookkeeping (area, resolution, credit, targeted, eligibility, incidental[], versions)
// }
//
// `row` is one immutable ledger row, tagged with the ledger it came from:
//   { ledger: "WordAttempt" | "GrammarAttempt" | "AiGradedItem" | "RewardEvent", ...fields }
//
// strength (what the evidence can be used for):
//   verified      server-verified, targeted, on a LIVE leaf -> progress/mastery INPUT
//                 (whether it qualifies is MasteryPolicy's job, not decided here)
//   attested      client-attested -> activity only. Can NEVER become verified.
//   retained      server-verified but its leaf is COMING_SOON -> kept, not shown
//   legacy        pre-VT-6 RewardEvent -> area-level activity only
//   unattributed  no leaf can be determined without guessing -> area/activity only
//   none          not evidence (XP-only game, grade receipt, uncounted AI grade)
// Incidental evidence (declared co-measurement on another leaf) is returned in
// `incidental[]` with strength "incidental" and is never progress/mastery input.

import { TAXONOMY_VERSION, isLive, MODES } from "./skillTaxonomy.js";
import { ACTIVITY_MAP_VERSION, SUPPORT_VALUES, resolveActivity, legacyRewardArea } from "./skillActivityMap.js";

export const CLASSIFIER_VERSION = 1;
export const STRENGTHS = ["verified", "attested", "retained", "legacy", "unattributed", "none"];
export const SERVER_VERIFICATIONS = ["server_graded", "server_ai"];
const LEVELS = ["Starter", "A1", "A2", "B1", "B2", "C1", "C2"];

/** Row verification -> normalised value. Anything unrecognised is NOT verified. */
function verificationOf(row) {
  if (row.ledger === "AiGradedItem") return "server_ai"; // only aiApi writes these, in the grading request
  if (row.ledger === "RewardEvent") return "client_attested";
  const v = row.verification;
  if (v === "server_graded" || v === "server_ai" || v === "client_attested") return v;
  return "unknown";
}

function creditOf(row) {
  if (row.ledger === "AiGradedItem") return Math.max(0, Math.min(100, Number(row.score) || 0)) / 100;
  if (row.ledger === "RewardEvent") {
    const t = Number(row.items_total) || 0;
    return t > 0 ? Math.min(Number(row.items_correct) || 0, t) / t : 0;
  }
  return row.correct === true ? 1 : 0;
}

const base = (row) => ({
  taxonomy_version: TAXONOMY_VERSION,
  activity_map_version: ACTIVITY_MAP_VERSION,
  classifier_version: CLASSIFIER_VERSION,
  row_taxonomy_version: Number.isInteger(row.taxonomy_version) ? row.taxonomy_version : null,
  round_id: row.round_id || null,
  at: row.round_at || row.created_date || null,
});

const notEvidence = (row, reason) => ({
  ...base(row), leaf: null, area: null, resolution: "none", facets: {}, mode: null, level: null,
  support: "unknown", verification: verificationOf(row), strength: "none", reason,
  credit: 0, targeted: false, eligibility: { progress: false, mastery: false }, incidental: [],
});

/** opts.activities: injectable activity map (tests only; defaults to the real map). */
export function classifyEvidence(row, opts = {}) {
  if (!row || typeof row !== "object") throw new TypeError("classifyEvidence: row must be an object");

  // Legacy tier: area only, never a leaf, a cell or mastery.
  if (row.ledger === "RewardEvent") {
    if (row.ledger_version != null) return notEvidence(row, "xp_ledger"); // VT-6 XP rows are never evidence
    const area = legacyRewardArea(row.game);
    if (!area) return notEvidence(row, "xp_only");
    return {
      ...base(row), leaf: null, area, resolution: "area", facets: { game: row.game }, mode: null,
      level: LEVELS.includes(row.level) ? row.level : null, support: "unknown", verification: "client_attested",
      strength: "legacy", reason: "legacy_tier", credit: creditOf(row), items: Number(row.items_total) || 0,
      targeted: false, eligibility: { progress: false, mastery: false }, incidental: [],
    };
  }

  let game = row.game;
  if (row.ledger === "AiGradedItem") {
    // Definition grades are receipts behind WordAttempt rows (the evidence);
    // counting them too would double-count. Sentence grades count only once
    // progressApi accepted the round.
    if (row.task !== "sentence") return notEvidence(row, "grade_receipt");
    if (row.counted !== true) return notEvidence(row, "uncounted_grade");
    game = "sentence";
  }

  const r = resolveActivity({ game, bank: row.bank, item_id: row.item_id }, opts.activities);
  if (!r) return notEvidence(row, "unknown_game");
  if (!r.evidence) return notEvidence(row, r.reason);

  const verification = verificationOf(row);
  const verified = SERVER_VERIFICATIONS.includes(verification);
  const support = SUPPORT_VALUES.includes(row.support) ? row.support : "unknown";
  const level = LEVELS.includes(row.level) ? row.level : null;
  // Mode is canonical from the map; a stored `mode` is informational only.
  const mode = MODES.includes(r.mode) ? r.mode : null;

  let strength;
  if (!r.leaf) strength = "unattributed";
  else if (!verified) strength = "attested";
  else if (!isLive(r.leaf)) strength = "retained";
  else strength = "verified";

  const targeted = !!r.leaf; // the primary leaf is, by definition, what the activity targets
  const eligible = strength === "verified" && targeted && mode !== null;

  const incidental = r.coMeasured
    .filter((c) => c.leaf)
    .map((c) => ({ leaf: c.leaf, dimension: c.dimension, strength: "incidental", verification, eligibility: { progress: false, mastery: false } }));

  return {
    ...base(row),
    leaf: r.leaf,
    area: r.area,
    resolution: r.resolution,
    facets: { ...r.facets, activity: r.activity, retired_activity: r.retired || undefined },
    mode,
    level,
    support,
    verification,
    strength,
    reason: null,
    credit: creditOf(row),
    targeted,
    eligibility: { progress: eligible, mastery: eligible },
    incidental,
    sub_scores: row.sub_scores && typeof row.sub_scores === "object" ? { ...row.sub_scores } : undefined,
  };
}
