// Adaptive Grammar Placement Test — PUBLIC DATASET CONTRACT.
//
// This is the ONLY module Claude's adaptive engine should import. Everything
// exported here is plain, read-only data plus a dataset integrity validator.
// There is deliberately no selection, scoring, thresholding, aggregation or
// stop logic in this folder — that is the engine's responsibility.
//
// Isolation: nothing in src/lib/adaptiveGrammar/ imports from, or is imported
// by, the legacy placement system (placementContent.js / placementTest.js /
// PlacementTest.jsx). Legacy items reused here are COPIED with a `legacyRef`
// pointer, never referenced live, so either dataset can change independently.

export { CEFR_LEVELS, DOMAINS, DOMAIN_IDS, CONCEPTS, CONCEPT_IDS } from "@/lib/adaptiveGrammar/domains";
export { FORMATS, FORMAT_TYPES, EVIDENCE_TYPES, ANSWER_TYPES, validateItem, validateDataset } from "@/lib/adaptiveGrammar/schema";
export { SAMPLE_ITEMS } from "@/lib/adaptiveGrammar/samples/index";

// Alias the engine can bind to now; will point at the full bank once approved,
// without the engine changing its import.
export { SAMPLE_ITEMS as ADAPTIVE_GRAMMAR_ITEMS } from "@/lib/adaptiveGrammar/samples/index";