// Grammar Placement Engine — session runner. IMPURE BOUNDARY.
//
// This is the only file in the engine that touches the dataset module, the AI
// grader, the clock, or browser storage. Everything it does with the evidence
// itself is delegated to the pure core, so the placement logic stays testable
// without any of this.
//
// It reuses existing app infrastructure rather than duplicating it:
//   · evaluateGrammarConstruction() from src/lib/assessor.js — the rubric
//     answer fields were named to match its task shape exactly.
//   · checkAiGate() / incrementAiUsage() from src/lib/aiLimits.js — the same
//     plan-aware allowance every other AI call site in the app respects.
//
// The legacy placement test is not imported, referenced, or affected.

import {
  ADAPTIVE_GRAMMAR_ITEMS, DOMAINS, CEFR_LEVELS, validateDataset,
} from "@/lib/adaptiveGrammar";
import { evaluateGrammarConstruction } from "@/lib/assessor";
import { checkAiGate, incrementAiUsage } from "@/lib/aiLimits";
import { buildIndex } from "@/lib/grammarPlacement/datasetIndex";
import { resolveConfig } from "@/lib/grammarPlacement/config";
import { normalizeAiEvaluation, requiresAiEvaluation } from "@/lib/grammarPlacement/scoring";
import { createSession, selectNext, applyResponse, finalize, abandon } from "@/lib/grammarPlacement/engine";
import { saveGrammarPlacementRun } from "@/lib/grammarPlacement/persistence";

const DRAFT_KEY = "vm_grammar_placement_draft";

let _index = null;

/**
 * Build (and memoize) the dataset index from the public contract.
 * Throws a clear contract error if the dataset cannot back an assessment.
 */
export function buildGrammarIndex({ force = false, validate = false } = {}) {
  if (_index && !force) return _index;
  if (validate) {
    const problems = validateDataset(ADAPTIVE_GRAMMAR_ITEMS);
    if (problems.length) {
      throw new Error(`grammarPlacement: dataset failed validateDataset with ${problems.length} problem(s); first: ${JSON.stringify(problems[0])}`);
    }
  }
  _index = buildIndex(ADAPTIVE_GRAMMAR_ITEMS, {
    datasetLevels: CEFR_LEVELS,
    domainOrder: DOMAINS.map((d) => d.id),
  });
  return _index;
}

/** Human-readable domain names, for result rendering later. */
export const domainNames = () => Object.fromEntries(DOMAINS.map((d) => [d.id, d.name]));

const now = () => new Date().toISOString();

const newRunId = () =>
  `gpr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Start a run.
 * @returns {{state, config, index, ai}} a runner passed back into the calls below
 */
export async function startGrammarPlacement({
  userEmail = "", userId = "", isAdmin = false,
  configOverrides = {}, seed = null, resume = true,
} = {}) {
  const index = buildGrammarIndex();
  const config = resolveConfig(configOverrides);

  let ai = { allowed: false, remaining: 0 };
  try {
    const gate = await checkAiGate(userEmail, userId, isAdmin);
    ai = { allowed: !!gate.allowed, remaining: gate.remaining ?? 0 };
  } catch {
    // No AI available is a normal, survivable state: the engine simply builds
    // its evidence from deterministic items instead.
    ai = { allowed: false, remaining: 0 };
  }

  if (resume) {
    const draft = loadDraft();
    if (draft?.state?.runId) {
      return { state: draft.state, config, index, ai, userEmail, userId, isAdmin, resumed: true };
    }
  }

  const { state } = createSession({
    index,
    config: configOverrides,
    seed: seed ?? Math.floor(Math.random() * 2 ** 31),
    runId: newRunId(),
    startedAt: now(),
  });
  saveDraft(state);
  return { state, config, index, ai, userEmail, userId, isAdmin, resumed: false };
}

/** Ask the engine what to show next. */
export function nextQuestion(runner) {
  const step = selectNext(runner.state, runner.index, runner.config, {
    allowAi: runner.ai.allowed && runner.ai.remaining > 0,
  });
  const next = { ...runner, state: step.state };
  saveDraft(step.state);
  return { runner: next, action: step.action, item: step.item ?? null, meta: step.meta ?? null, reason: step.reason ?? null };
}

/**
 * Submit a learner response for the pending item.
 *
 * Deterministic items are scored by the pure core. Rubric items are graded by
 * the existing assessor; any failure there is recorded as an evaluation
 * failure and contributes no evidence in either direction — the engine then
 * simply selects a different item next time round.
 */
export async function submitAnswer(runner, { itemId, response }) {
  const item = runner.index.getItem(itemId);
  if (!item) throw new Error(`grammarPlacement: unknown item ${itemId}`);

  let evaluation = null;
  let nextAi = runner.ai;

  if (requiresAiEvaluation(item)) {
    const a = item.answer;
    const instruction = [a.instruction, ...(a.constraints ?? [])].filter(Boolean).join(" ");
    try {
      const gate = await checkAiGate(runner.userEmail, runner.userId, runner.isAdmin);
      if (!gate.allowed) {
        evaluation = normalizeAiEvaluation(null, { error: "ai_allowance_exhausted" });
        nextAi = { allowed: false, remaining: 0 };
      } else {
        const raw = await evaluateGrammarConstruction(
          { instruction, requiredElement: a.requiredElement, topic: item.topic },
          response
        );
        evaluation = normalizeAiEvaluation(raw);
        try { await incrementAiUsage(runner.userEmail, runner.userId, ""); } catch { /* usage logging is best-effort */ }
        nextAi = { allowed: true, remaining: Math.max(0, (gate.remaining ?? 1) - 1) };
      }
    } catch (error) {
      evaluation = normalizeAiEvaluation(null, { error });
    }
  }

  const state = applyResponse(runner.state, runner.index, runner.config, {
    itemId, response, evaluation, at: now(),
  });
  saveDraft(state);
  return { runner: { ...runner, state, ai: nextAi }, evaluation };
}

/**
 * Finish the run, build the grammar profile, and (by default) persist it.
 * Never writes User.cefr_level — see persistence.js.
 */
export async function completeRun(runner, { persist = true, abandoned = false } = {}) {
  const state = abandoned ? abandon(runner.state) : runner.state;
  const run = finalize(state, runner.index, runner.config, { completedAt: now() });

  let saved = null;
  if (persist) {
    saved = await saveGrammarPlacementRun({
      userEmail: runner.userEmail,
      run,
      coverage: runner.index.coverageSummary(),
    });
  }
  clearDraft();
  return { run, saved, runner: { ...runner, state } };
}

// ---------------------------------------------------------------------------
// Draft state — survives a refresh so a part-finished run is not lost along
// with whatever AI allowance it already spent. Per-browser and deliberately
// client-side: no server round-trip per item.
// ---------------------------------------------------------------------------

export function saveDraft(state) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: now(), state }));
  } catch { /* private mode / quota — a lost draft is survivable */ }
}

export function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
