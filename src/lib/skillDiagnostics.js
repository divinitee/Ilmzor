// Skill Diagnostic State — the reusable capability behind the Skill Hub gate.
//
// A "diagnostic" is the adaptive assessment a student takes the first time they
// enter a skill, so the app can build a path instead of guessing. Grammar is the
// first implementation. Vocabulary is expected to adopt the same pattern.
//
// Deliberately thin. This is a registry plus three states — not a framework.
// Everything skill-specific (which entity holds the result, which route runs the
// assessment) lives in the skill's own entry below, so adding Vocabulary later
// means adding one entry and its loader, not reworking the Skill Hub.

import { base44 } from "@/api/base44Client";

export const DIAGNOSTIC_STATE = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

// A run left half-finished is kept in sessionStorage by the placement engine's
// session layer. Reading the key here (rather than importing the engine) keeps
// this module free of any engine dependency — the Skill Hub must not pull the
// placement engine into its bundle just to decide where to navigate.
const GRAMMAR_DRAFT_KEY = "vm_grammar_placement_draft";

function hasLocalDraft(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    return Boolean(JSON.parse(raw)?.state?.runId);
  } catch {
    return false;
  }
}

/**
 * One entry per skill that has a diagnostic. `enabled: false` means the skill
 * behaves exactly as it did before — the Skill Hub gate ignores it entirely.
 */
export const SKILL_DIAGNOSTICS = {
  grammar: {
    enabled: true,
    skillId: "grammar",
    homeRoute: "/grammar",
    assessmentRoute: "/grammar/assessment",
    draftKey: GRAMMAR_DRAFT_KEY,
    /** @returns {"not_started"|"in_progress"|"completed"} */
    async loadState(userEmail) {
      if (!userEmail) return DIAGNOSTIC_STATE.NOT_STARTED;
      try {
        const rows = await base44.entities.GrammarProfile.filter({ user_email: userEmail });
        if (rows?.length) return DIAGNOSTIC_STATE.COMPLETED;
      } catch (e) {
        // A read failure must not strand the student in front of a gate they
        // cannot pass. Fall through to the local draft check and, failing that,
        // treat it as not started — the assessment intro is always escapable.
        console.error("grammar diagnostic state read failed", e);
      }
      return hasLocalDraft(GRAMMAR_DRAFT_KEY)
        ? DIAGNOSTIC_STATE.IN_PROGRESS
        : DIAGNOSTIC_STATE.NOT_STARTED;
    },
  },
};

export const diagnosticFor = (skillId) => {
  const d = SKILL_DIAGNOSTICS[skillId];
  return d?.enabled ? d : null;
};

export const hasDiagnostic = (skillId) => Boolean(diagnosticFor(skillId));

/**
 * Where a student should land when they open a skill that has a diagnostic.
 * Returns null for skills without one, so the caller keeps its existing
 * behaviour untouched.
 */
export async function resolveSkillEntry(skillId, userEmail) {
  const d = diagnosticFor(skillId);
  if (!d) return null;
  const state = await d.loadState(userEmail);
  return {
    skillId,
    state,
    // A completed diagnostic goes straight to the skill's home. Anything else
    // goes to the assessment route, which itself decides whether to show the
    // introduction or resume a part-finished run.
    route: state === DIAGNOSTIC_STATE.COMPLETED ? d.homeRoute : d.assessmentRoute,
  };
}
