// Application-level Grammar placement result. PURE.
//
// The placement engine's output is a diagnostic record: cell states, evidence
// ratios, basis codes, confidence scores, contradiction objects. None of that
// belongs in front of a student. This module is the single translation layer
// between the engine's model and the product's model.
//
// Rules it enforces:
//   · no raw engine vocabulary reaches the UI (no "basis", no "cleared",
//     no ratios, no cell states)
//   · confidence becomes a plain sentence, never a number
//   · a domain the run could not place is reported as not-yet-known, never
//     silently defaulted to a level
//   · strengths and focus areas are chosen from the profile, not invented

import { PLACEMENT_LEVELS, levelIndex } from "@/lib/grammarPlacement/levels";

export const RESULT_VERSION = 1;

/** How sure the system is, in words a learner can act on. */
function certainty(band) {
  if (band === "high") return "clear";
  if (band === "medium") return "reasonable";
  return "provisional";
}

/**
 * Build the student-facing result from an engine run.
 *
 * @param {object} run     the object returned by engine.finalize()
 * @param {object} names   domainId -> user-facing name
 */
export function toStudentResult(run, names = {}) {
  const p = run?.profile;
  if (!p) return null;

  const label = (id) => names[id] || id;

  const placed = p.domains.filter((d) => d.estimatedLevel && d.basis !== "unassessed");
  const unplaced = p.domains.filter((d) => !d.estimatedLevel || d.basis === "unassessed");

  const overallIdx = p.overall.level ? levelIndex(p.overall.level) : -1;

  // Strengths: placed at or above the overall level, best first. A domain that
  // matches the overall level is not a "strength" unless nothing beat it, so
  // strictly-above is preferred and equal-level is the fallback.
  const above = placed.filter((d) => levelIndex(d.estimatedLevel) > overallIdx);
  const equal = placed.filter((d) => levelIndex(d.estimatedLevel) === overallIdx);
  const strengths = (above.length ? above : equal)
    .sort((a, b) => levelIndex(b.estimatedLevel) - levelIndex(a.estimatedLevel))
    .slice(0, 3)
    .map((d) => ({ domain: d.domain, name: label(d.domain), level: d.estimatedLevel }));

  // Focus areas: placed below the overall level, weakest first. Domains that
  // fell below their own content floor count as the weakest of all.
  const focus = placed
    .filter((d) => levelIndex(d.estimatedLevel) < overallIdx || d.belowFloor)
    .sort((a, b) => levelIndex(a.estimatedLevel) - levelIndex(b.estimatedLevel))
    .slice(0, 3)
    .map((d) => ({ domain: d.domain, name: label(d.domain), level: d.estimatedLevel }));

  return {
    version: RESULT_VERSION,
    scope: "grammar",
    level: p.overall.level,           // null means "could not be established"
    certainty: certainty(p.overall.confidence.band),
    strengths,
    focus,
    // Named plainly so the UI can say "we haven't seen enough of these yet"
    // rather than pretending every domain got an answer.
    notYetKnown: unplaced.map((d) => ({ domain: d.domain, name: label(d.domain) })),
    domains: p.domains.map((d) => ({
      domain: d.domain,
      name: label(d.domain),
      level: d.estimatedLevel,
      certainty: certainty(d.confidence.band),
      // Kept because the Grammar home uses it to order study, not to display.
      needsAttention: Boolean(
        d.estimatedLevel && (levelIndex(d.estimatedLevel) < overallIdx || d.belowFloor)
      ),
      assessed: Boolean(d.estimatedLevel && d.basis !== "unassessed"),
    })),
    questionsAnswered: run.totals?.itemsServed ?? 0,
    completedAt: run.completedAt ?? null,
  };
}

/**
 * Rebuild the same student-facing shape from a stored GrammarProfile row, so a
 * returning student sees exactly what they saw on completion without the run
 * record having to be loaded and re-derived.
 */
export function fromStoredProfile(row, names = {}) {
  if (!row) return null;
  const label = (id) => names[id] || id;
  const entries = Object.entries(row.domains || {});
  const overallIdx = row.overall_level ? levelIndex(row.overall_level) : -1;

  const assessed = entries.filter(([, v]) => v.estimatedLevel && v.basis !== "unassessed");
  const above = assessed.filter(([, v]) => levelIndex(v.estimatedLevel) > overallIdx);
  const equal = assessed.filter(([, v]) => levelIndex(v.estimatedLevel) === overallIdx);

  const pick = (list) =>
    list.slice(0, 3).map(([id, v]) => ({ domain: id, name: label(id), level: v.estimatedLevel }));

  return {
    version: RESULT_VERSION,
    scope: "grammar",
    level: row.overall_level || null,
    certainty: certainty(row.overall_confidence),
    strengths: pick(
      (above.length ? above : equal).sort(
        (a, b) => levelIndex(b[1].estimatedLevel) - levelIndex(a[1].estimatedLevel)
      )
    ),
    focus: pick(
      assessed
        .filter(([, v]) => levelIndex(v.estimatedLevel) < overallIdx || v.belowFloor)
        .sort((a, b) => levelIndex(a[1].estimatedLevel) - levelIndex(b[1].estimatedLevel))
    ),
    notYetKnown: entries
      .filter(([, v]) => !v.estimatedLevel || v.basis === "unassessed")
      .map(([id]) => ({ domain: id, name: label(id) })),
    domains: entries.map(([id, v]) => ({
      domain: id,
      name: label(id),
      level: v.estimatedLevel,
      certainty: certainty(v.confidence),
      needsAttention: Boolean(
        v.estimatedLevel && (levelIndex(v.estimatedLevel) < overallIdx || v.belowFloor)
      ),
      assessed: Boolean(v.estimatedLevel && v.basis !== "unassessed"),
    })),
    questionsAnswered: 0,
    completedAt: row.assessed_at ?? null,
  };
}

export { PLACEMENT_LEVELS };
