// VIRORA Skill Intelligence — the Graph (what connects). PURE (no SDK, no I/O).
// Source of truth: docs/skill-intelligence-architecture.md.
//
// The Graph NEVER produces evidence and NEVER moves a number. There are no
// numeric weights anywhere. Transfer feeds recommendation CANDIDATES only, and
// only from REVIEWED edges; learners see it as qualitative suggestions
// ("may also support precision in written production"), never "+8%".
//
// Relationship types:
//   supports        transfer/support between two leaves — planning only
//   co_measurement  derived from declared co-measurement in skillActivityMap.js
//                   (documentation of evidence the grader really scores);
//                   never a recommendation input
//   prerequisite    RESERVED — rejected in v1
//
// Endpoints are LEAVES only. Qualities are never endpoints; they may appear as
// explanatory notes on an edge.

import { isLeaf, QUALITIES, AREA_IDS } from "./skillTaxonomy.js";
import { ACTIVITIES } from "./skillActivityMap.js";

export const TRANSFER_GRAPH_VERSION = 1;
export const RELATIONSHIPS = ["supports", "co_measurement"];
export const RESERVED_RELATIONSHIPS = ["prerequisite"];
export const STRENGTHS = ["strong", "moderate", "weak"];
export const STATUSES = ["draft", "reviewed"];
export const BASES = ["pedagogical_judgement", "research", "grader_declaration"];

const FIELDS = new Set([
  "id", "source_leaf", "target_leaf", "relationship", "strength", "mechanism", "basis",
  "conditions", "status", "version", "quality_notes", "authored_by", "reviewed_by", "reviewed_at",
]);
const NUMERIC_NAME = /weight|percent|pct|gain|boost|multiplier|coefficient|score|delta/i;

/** Problems with one edge ([] = valid). Edges are always directional: source supports target. */
export function validateEdge(e) {
  const p = [];
  if (!e || typeof e !== "object") return ["not an object"];
  for (const k of Object.keys(e)) if (!FIELDS.has(k)) p.push(NUMERIC_NAME.test(k) ? `numeric field "${k}" is forbidden` : `unknown field "${k}"`);
  for (const [k, v] of Object.entries(e)) if (typeof v === "number" && k !== "version") p.push(`numeric value on "${k}" is forbidden`);
  if (!e.id || typeof e.id !== "string") p.push("missing id");
  if (RESERVED_RELATIONSHIPS.includes(e.relationship)) p.push(`relationship "${e.relationship}" is reserved`);
  else if (!RELATIONSHIPS.includes(e.relationship)) p.push(`relationship must be one of ${RELATIONSHIPS.join("|")}`);
  for (const end of ["source_leaf", "target_leaf"]) {
    const v = e[end];
    if (QUALITIES.includes(v)) p.push(`${end} "${v}" is a quality — qualities are never endpoints`);
    else if (AREA_IDS.includes(v)) p.push(`${end} "${v}" is an area — endpoints are leaves only`);
    else if (!isLeaf(v)) p.push(`${end} "${v}" is not a leaf`);
  }
  if (e.source_leaf === e.target_leaf) p.push("self-loop");
  if (!STRENGTHS.includes(e.strength)) p.push(`strength must be one of ${STRENGTHS.join("|")}`);
  if (!e.mechanism || typeof e.mechanism !== "string") p.push("missing mechanism");
  if (!BASES.includes(e.basis)) p.push(`basis must be one of ${BASES.join("|")}`);
  if (e.conditions != null && typeof e.conditions !== "string") p.push("conditions must be a string or null");
  if (e.quality_notes != null) {
    if (!Array.isArray(e.quality_notes)) p.push("quality_notes must be a list");
    else for (const q of e.quality_notes) {
      if (!q || !QUALITIES.includes(q.quality) || typeof q.note !== "string") p.push("quality_notes entries are { quality, note }");
    }
  }
  if (!STATUSES.includes(e.status)) p.push(`status must be one of ${STATUSES.join("|")}`);
  if (!Number.isInteger(e.version) || e.version < 1) p.push("version must be a positive integer");
  if (e.status === "reviewed") {
    if (e.authored_by === "ai") p.push("AI may only propose drafts");
    if (!e.reviewed_by) p.push("reviewed edge needs reviewed_by");
    if (!e.reviewed_at || isNaN(Date.parse(e.reviewed_at))) p.push("reviewed edge needs a valid reviewed_at");
  }
  return p;
}

export function validateGraph(edges) {
  const p = [], ids = new Set(), keys = new Set();
  for (const e of edges) {
    for (const x of validateEdge(e)) p.push(`${e?.id || "?"}: ${x}`);
    if (ids.has(e?.id)) p.push(`${e.id}: duplicate id`);
    ids.add(e?.id);
    const k = `${e?.relationship}:${e?.source_leaf}>${e?.target_leaf}`;
    if (keys.has(k)) p.push(`${e?.id}: duplicate edge ${k}`);
    keys.add(k);
  }
  return p;
}

// Authored support edges. EMPTY in v1: the owner/reviewer of the graph is an
// open decision, and an unreviewed edge in code would be an unreviewed claim.
export const SUPPORT_EDGES = Object.freeze([]);

/** co_measurement edges derived from declared, leaf-attributed co-measurement. */
export function deriveCoMeasurementEdges(activities = ACTIVITIES) {
  const out = [];
  for (const a of activities) for (const c of a.coMeasured) {
    if (!c.leaf) continue;
    out.push({
      id: `cm:${a.key}:${c.dimension}`, source_leaf: a.leaf, target_leaf: c.leaf, relationship: "co_measurement",
      strength: "moderate", mechanism: `grader of ${a.key} scores ${c.dimension}`, basis: "grader_declaration",
      conditions: null, status: "reviewed", version: 1, authored_by: "code", reviewed_by: "activity_map", reviewed_at: "2026-09-30",
    });
  }
  return out;
}

export const allEdges = () => [...SUPPORT_EDGES, ...deriveCoMeasurementEdges()];

/**
 * The ONLY edges a recommender may read: valid, REVIEWED, relationship "supports".
 * Drafts and co-measurement edges are excluded.
 */
export const recommendationEligibleEdges = (edges = allEdges()) =>
  edges.filter((e) => e.relationship === "supports" && e.status === "reviewed" && validateEdge(e).length === 0);

/** The ONLY edges a learner may see. Same gate as the recommender. */
export const learnerVisibleEdges = recommendationEligibleEdges;

/** Qualitative suggestions for a leaf — words only, never numbers. */
export function supportSuggestionsFor(leaf, edges = allEdges()) {
  return recommendationEligibleEdges(edges)
    .filter((e) => e.source_leaf === leaf)
    .map((e) => ({ target_leaf: e.target_leaf, strength: e.strength, wording: "may also support", notes: (e.quality_notes || []).map((q) => q.note) }));
}
