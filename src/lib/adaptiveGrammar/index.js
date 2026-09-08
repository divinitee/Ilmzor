// Adaptive Grammar Placement Test — PUBLIC DATASET CONTRACT.
//
// This is the ONLY module the adaptive engine should import. Everything
// exported here is plain, read-only data plus a dataset integrity validator.
// No selection, scoring, thresholding, aggregation or stop logic lives in this
// folder — that is the engine's responsibility.
//
// Isolation: nothing in src/lib/adaptiveGrammar/ imports from, or is imported
// by, the legacy placement system (placementContent.js / placementTest.js /
// PlacementTest.jsx). Legacy items reused here are COPIED with a `legacyRef`
// pointer, never referenced live.
//
// Stable contract: ADAPTIVE_GRAMMAR_ITEMS · DOMAINS · CONCEPTS · validateDataset
// (plus the enumerations below). Internal file layout under bank/ is private.

export { CEFR_LEVELS, DOMAINS, DOMAIN_IDS, CONCEPTS, CONCEPT_IDS } from "@/lib/adaptiveGrammar/domains";
export {
  FORMATS, FORMAT_TYPES, EVIDENCE_CLASSES, EVIDENCE_CLASS_OF_FORMAT, ANSWER_TYPES, SOURCES,
  validateItem, validateDataset,
} from "@/lib/adaptiveGrammar/schema";
export { BANK_ITEMS as ADAPTIVE_GRAMMAR_ITEMS } from "@/lib/adaptiveGrammar/bank/index";