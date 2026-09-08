// Grammar Placement Engine — persistence. IMPURE BOUNDARY.
//
// Two entities, deliberately separate:
//
//   GrammarAssessmentRun  immutable audit record of one run — item log,
//                         evaluation failures, contradictions, coverage.
//                         Never updated after creation.
//   GrammarProfile        the learner's CURRENT derived profile, one row per
//                         student, rewritten on each completed assessment.
//                         Exists so a consumer can read "where is this learner
//                         in grammar" without loading a 40-item run log and
//                         re-deriving it.
//
// WHAT THIS FILE MUST NEVER DO
//   · write User.cefr_level, level_source or level_set_at
//   · write SkillHubProgress, StudentProgress, or any Learning Path record
//   · touch AssessmentResult rows written by the legacy placement test
//
// Grammar placement is grammar-only (requirement 12). Whether and how a global
// CEFR summary is eventually derived from grammar + vocabulary + the rest is a
// separate decision, outside this engine.

import { base44 } from "@/api/base44Client";

/** Compact per-domain shape for the current-profile row. */
function compactDomains(profile) {
  const out = {};
  for (const d of profile.domains) {
    out[d.domain] = {
      estimatedLevel: d.estimatedLevel,
      basis: d.basis,
      verifiedLevel: d.verifiedLevel,
      belowFloor: d.belowFloor,
      atCoverageCeiling: d.atCoverageCeiling,
      maxAssessableLevel: d.maxAssessableLevel,
      confidence: d.confidence.band,
      confidenceScore: d.confidence.score,
      untestedBelow: d.untestedBelow,
      contradictionCount: d.contradictions.length,
    };
  }
  return out;
}

/**
 * Persist a completed run and refresh the learner's current profile.
 * Best-effort: a persistence failure is reported, never thrown into the
 * learner's session — the run result itself is already in hand.
 */
export async function saveGrammarPlacementRun({ userEmail, run, coverage = null }) {
  const result = { runSaved: false, profileSaved: false, runRecordId: null, errors: [] };
  if (!userEmail) {
    result.errors.push("no userEmail — nothing persisted");
    return result;
  }
  const p = run.profile;

  try {
    const created = await base44.entities.GrammarAssessmentRun.create({
      user_email: userEmail,
      run_id: run.runId,
      engine_version: run.engineVersion,
      config_version: run.configVersion,
      seed: run.seed,
      started_at: run.startedAt || undefined,
      completed_at: run.completedAt || undefined,
      stopped_because: run.totals.stoppedBecause,
      anchor_level: run.totals.anchorLevel,
      items_served: run.totals.itemsServed,
      ai_items_attempted: run.totals.aiItemsAttempted,
      ai_items_failed: run.totals.aiItemsFailed,
      overall_level: p.overall.level || "",
      overall_confidence: p.overall.confidence.band,
      profile: p,
      item_log: run.itemLog,
      evaluation_failures: run.evaluationFailures,
      contradictions: run.contradictions,
      coverage: coverage || {},
      dataset_items: run.totals.datasetItems,
    });
    result.runSaved = true;
    result.runRecordId = created?.id ?? null;
  } catch (e) {
    result.errors.push(`GrammarAssessmentRun.create failed: ${e?.message || e}`);
  }

  const profileRow = {
    user_email: userEmail,
    run_id: run.runId,
    scope: "grammar",
    overall_level: p.overall.level || "",
    overall_confidence: p.overall.confidence.band,
    overall_bound_by: p.overall.rationale.boundBy,
    domains: compactDomains(p),
    core_guard_provisional: Boolean(p.overall.coreGuard?.provisional),
    engine_version: run.engineVersion,
    config_version: run.configVersion,
    assessed_at: run.completedAt || undefined,
  };

  try {
    const existing = await base44.entities.GrammarProfile.filter({ user_email: userEmail });
    if (existing?.length) {
      await base44.entities.GrammarProfile.update(existing[0].id, profileRow);
    } else {
      await base44.entities.GrammarProfile.create(profileRow);
    }
    result.profileSaved = true;
  } catch (e) {
    result.errors.push(`GrammarProfile write failed: ${e?.message || e}`);
  }

  return result;
}

/** The learner's current grammar profile row, or null. */
export async function loadLatestGrammarProfile(userEmail) {
  if (!userEmail) return null;
  try {
    const rows = await base44.entities.GrammarProfile.filter({ user_email: userEmail });
    return rows?.[0] ?? null;
  } catch (e) {
    console.error("loadLatestGrammarProfile failed", e);
    return null;
  }
}

/** Past runs, newest first — for reassessment comparison and teacher review. */
export async function loadGrammarRuns(userEmail, limit = 10) {
  if (!userEmail) return [];
  try {
    const rows = await base44.entities.GrammarAssessmentRun.filter({ user_email: userEmail });
    return (rows ?? [])
      .sort((a, b) => String(b.completed_at ?? "").localeCompare(String(a.completed_at ?? "")))
      .slice(0, limit);
  } catch (e) {
    console.error("loadGrammarRuns failed", e);
    return [];
  }
}
