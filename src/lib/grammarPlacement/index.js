// Grammar Placement Engine — public contract.
//
// The engine consumes the dataset ONLY through `@/lib/adaptiveGrammar`'s public
// exports and never reaches into its bank/ layout. It owns selection, evidence,
// placement, confidence, stopping and profile generation; it does not own
// question content, UI, or any global CEFR field.
//
// Layers:
//   levels · config · scoring · evidence · selection · placement · engine   PURE
//   datasetIndex                                                            PURE (given items)
//   session · persistence                                                   IMPURE
//
// Grammar-only by construction: nothing in this folder writes User.cefr_level.

export { PLACEMENT_LEVELS, levelIndex, levelAbove, levelBelow } from "@/lib/grammarPlacement/levels";
export { DEFAULT_CONFIG, CONFIG_VERSION, resolveConfig } from "@/lib/grammarPlacement/config";
export { EVAL_STATUS, scoreDeterministic, normalizeAiEvaluation, requiresAiEvaluation } from "@/lib/grammarPlacement/scoring";
export { CELL_STATES, CELL_OUTCOMES, deriveCells, deriveCell, createLedger } from "@/lib/grammarPlacement/evidence";
export { buildIndex } from "@/lib/grammarPlacement/datasetIndex";
export { analyzeDomain, domainResolved, cellValue } from "@/lib/grammarPlacement/selection";
export { BASIS, placeDomain, aggregateOverall, buildProfile } from "@/lib/grammarPlacement/placement";
export {
  analyzeDependencies, detectDependencyContradictions, buildConceptEvidence,
  conceptEvidenceBelow, prerequisiteClosure, independentLowerFailures,
} from "@/lib/grammarPlacement/prerequisites";
export {
  ENGINE_VERSION, PHASES, STOP_REASONS,
  createSession, selectNext, applyResponse, abandon, finalize,
} from "@/lib/grammarPlacement/engine";
export {
  startGrammarPlacement, nextQuestion, submitAnswer, completeRun,
  loadDraft, clearDraft, buildGrammarIndex,
} from "@/lib/grammarPlacement/session";
export {
  saveGrammarPlacementRun, loadLatestGrammarProfile, loadGrammarRuns,
} from "@/lib/grammarPlacement/persistence";
