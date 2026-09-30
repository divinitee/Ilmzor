// VIRORA Skill Intelligence — SHADOW leaf state, pure derivation. No SDK, no
// I/O, no clock (the caller passes `now`). Source of truth:
// docs/skill-intelligence-architecture.md.
//
//   ledger rows -> classifyEvidence -> deriveLeafStates -> LeafState rows
//
// Rebuildable from the immutable ledgers alone. Not exposed to learners and
// not read by any live path; the 5-skill SkillState is untouched.
//
// Reuses the locked VT-6 window/confidence/freshness math from progressCore.
// Correctness is computed ONLY from verified, targeted evidence on the leaf.
// It is null (never 0) when there is none. There is no cross-leaf average,
// no mastery, and nothing here reads the transfer graph.

import { EVIDENCE_WINDOW_N, confidenceFor, freshnessFor } from "./progressCore.js";
import { classifyEvidence, CLASSIFIER_VERSION } from "./skillClassify.js";
import { TAXONOMY_VERSION, MODES, nodeById } from "./skillTaxonomy.js";
import { ACTIVITY_MAP_VERSION } from "./skillActivityMap.js";

export const LEAF_STATE_VERSION = 1;
const LEVEL_ORDER = ["Starter", "A1", "A2", "B1", "B2", "C1", "C2", "unknown"];
const r4 = (x) => Math.round(x * 10000) / 10000;
const dayOf = (at) => (at ? String(at).slice(0, 10) : null); // UTC calendar day (provisional; see doc)

function emptyNode(node_id) {
  const n = nodeById(node_id);
  return {
    node_id, node_kind: n?.kind || "unknown", node_state: n?.state || null,
    verified_items: 0, verified_credit: 0, verified: new Map(),
    attested_items: 0, attested: new Set(),
    retained_items: 0, incidental_items: 0, unattributed_items: 0, unattributed: new Set(),
    legacy_rounds: 0, legacy_items: 0,
    verification_profile: {}, by_mode: {}, by_level: {}, by_support: {},
    cells: new Map(), first_verified_at: null, last_verified_at: null, last_evidence_at: null,
  };
}
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);
const earlier = (a, b) => (!a ? b : !b ? a : a < b ? a : b);

/** Deterministic order: time, then round, then row id. */
const rowOrder = (a, b) => {
  const ka = `${a.round_at || a.created_date || ""}|${a.round_id || ""}|${a.id || ""}|${a.item_index ?? ""}`;
  const kb = `${b.round_at || b.created_date || ""}|${b.round_id || ""}|${b.id || ""}|${b.item_index ?? ""}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
};

/**
 * rows: ledger rows tagged with `ledger`. Returns LeafState-shaped objects
 * (one per node that has any evidence), sorted by node_id.
 */
export function deriveLeafStates(rows, now, opts = {}) {
  if (!Number.isFinite(now)) throw new TypeError("deriveLeafStates: pass `now` explicitly (determinism)");
  const nodes = new Map();
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, emptyNode(id)); return nodes.get(id); };
  const coverage = {};

  for (const row of [...rows].sort(rowOrder)) {
    const c = classifyEvidence(row, opts);
    bump(coverage, c.strength);
    if (c.strength === "none") continue;
    const at = c.at;

    for (const inc of c.incidental) { const n = get(inc.leaf); n.incidental_items += 1; n.last_evidence_at = later(n.last_evidence_at, at); }

    if (c.strength === "legacy") {
      const n = get(c.area); n.legacy_rounds += 1; n.legacy_items += c.items || 0; n.last_evidence_at = later(n.last_evidence_at, at);
      continue;
    }
    if (c.strength === "unattributed") {
      const n = get(c.area || "english"); n.unattributed_items += 1; if (c.round_id) n.unattributed.add(c.round_id);
      bump(n.verification_profile, c.verification); n.last_evidence_at = later(n.last_evidence_at, at);
      continue;
    }

    const n = get(c.leaf);
    bump(n.verification_profile, c.verification);
    n.last_evidence_at = later(n.last_evidence_at, at);
    if (c.strength === "attested") { n.attested_items += 1; if (c.round_id) n.attested.add(c.round_id); continue; }
    if (c.strength === "retained") { n.retained_items += 1; continue; }

    // verified + targeted + LIVE leaf
    n.verified_items += 1;
    n.verified_credit += c.credit;
    const rk = c.round_id || `row:${row.id}`;
    const g = n.verified.get(rk) || { round_id: rk, at, total: 0, credit: 0 };
    g.total += 1; g.credit += c.credit; n.verified.set(rk, g);
    bump(n.by_mode, c.mode); bump(n.by_level, c.level || "unknown"); bump(n.by_support, c.support);
    n.first_verified_at = earlier(n.first_verified_at, at);
    n.last_verified_at = later(n.last_verified_at, at);
    if (c.eligibility.progress) {
      const ck = `${c.level || "unknown"}|${c.mode}`;
      const cell = n.cells.get(ck) || { level: c.level || "unknown", mode: c.mode, items: 0, credit: 0, rounds: new Set(), days: new Set(), first_at: null, last_at: null };
      cell.items += 1; cell.credit += c.credit; cell.rounds.add(rk);
      const d = dayOf(at); if (d) cell.days.add(d);
      cell.first_at = earlier(cell.first_at, at); cell.last_at = later(cell.last_at, at);
      n.cells.set(ck, cell);
    }
  }

  const states = [...nodes.values()].map((n) => finalize(n, now)).sort((a, b) => (a.node_id < b.node_id ? -1 : 1));
  return { states, coverage: sortKeys(coverage) };
}

const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

function finalize(n, now) {
  const rounds = [...n.verified.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.round_id < b.round_id ? 1 : -1));
  const win = rounds.slice(0, EVIDENCE_WINDOW_N);
  const wt = win.reduce((s, r) => s + r.total, 0);
  const wc = win.reduce((s, r) => s + r.credit, 0);
  const cells = [...n.cells.values()]
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || MODES.indexOf(a.mode) - MODES.indexOf(b.mode))
    .map((c) => ({ level: c.level, mode: c.mode, items: c.items, credit: r4(c.credit), rounds: c.rounds.size, distinct_days_utc: c.days.size, first_at: c.first_at, last_at: c.last_at }));
  const s = {
    node_id: n.node_id,
    node_kind: n.node_kind,
    node_state: n.node_state,
    taxonomy_version: TAXONOMY_VERSION,
    activity_map_version: ACTIVITY_MAP_VERSION,
    classifier_version: CLASSIFIER_VERSION,
    leaf_state_version: LEAF_STATE_VERSION,
    correctness: rounds.length ? Math.round((100 * wc) / wt) : null,
    confidence: rounds.length ? confidenceFor(rounds.length) : null,
    freshness: rounds.length ? freshnessFor(n.last_verified_at, now) : null,
    verified_rounds: rounds.length,
    verified_items: n.verified_items,
    items_in_window: wt,
    attested_rounds: n.attested.size,
    attested_items: n.attested_items,
    retained_items: n.retained_items,
    incidental_items: n.incidental_items,
    unattributed_items: n.unattributed_items,
    unattributed_rounds: n.unattributed.size,
    legacy_rounds: n.legacy_rounds,
    legacy_items: n.legacy_items,
    verification_profile: sortKeys(n.verification_profile),
    evidence_profile: { by_mode: sortKeys(n.by_mode), by_level: sortKeys(n.by_level), by_support: sortKeys(n.by_support) },
    cells,
    first_verified_at: n.first_verified_at,
    last_verified_at: n.last_verified_at,
    last_evidence_at: n.last_evidence_at,
    fingerprint: "",
  };
  s.fingerprint = fingerprint(s);
  return s;
}

// Fields that must match between a stored row and a fresh rebuild. freshness is
// re-derived from `now` on every read, so it is not compared.
export const LEAF_COMPARABLE = [
  "node_state", "taxonomy_version", "activity_map_version", "classifier_version", "leaf_state_version",
  "correctness", "confidence", "verified_rounds", "verified_items", "items_in_window", "attested_rounds", "attested_items",
  "retained_items", "incidental_items", "unattributed_items", "unattributed_rounds", "legacy_rounds", "legacy_items",
  "verification_profile", "evidence_profile", "cells", "first_verified_at", "last_verified_at", "last_evidence_at",
];

/** Canonical JSON (sorted keys) of the comparable fields. */
export function canonical(s) {
  const pick = {};
  for (const k of LEAF_COMPARABLE) pick[k] = s[k] ?? null;
  return stable(pick);
}
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}
/** FNV-1a 32-bit over the canonical JSON. */
export function fingerprint(s) {
  const str = canonical(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

/** Field-level diff between a stored LeafState row and a fresh derivation. */
export function diffLeafState(stored, fresh) {
  const out = [];
  for (const k of LEAF_COMPARABLE) {
    const a = stable(stored?.[k] ?? null), b = stable(fresh?.[k] ?? null);
    if (a !== b) out.push({ field: k, stored: stored?.[k] ?? null, rebuilt: fresh?.[k] ?? null });
  }
  return out;
}
