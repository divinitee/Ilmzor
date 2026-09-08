# Adaptive Grammar Placement Test — dataset (content layer)

Owner: content. Consumer: adaptive engine. Status: **V1 full bank produced (2026-09-08).**

## Layout

```
src/lib/adaptiveGrammar/
  index.js        ← the ONLY import the engine should use
  domains.js      13 domains, branches, stable concept ids
  schema.js       item contract + validateItem / validateDataset
  build.js        private item builder (ids, format→evidenceClass, provenance)
  bank/           one file per domain, aggregated by bank/index.js
```

Legacy placement stays untouched at `src/lib/placementContent.js`, `src/lib/placementTest.js`, `src/pages/PlacementTest.jsx`, `src/components/placement/*`. Nothing here imports it or is imported by it.

## Public contract
`ADAPTIVE_GRAMMAR_ITEMS` (flat array) · `DOMAINS` · `CONCEPTS` · `validateDataset` — plus enumerations `CEFR_LEVELS`, `FORMATS`, `FORMAT_TYPES`, `EVIDENCE_CLASSES`, `EVIDENCE_CLASS_OF_FORMAT`, `ANSWER_TYPES`, `SOURCES`.

## Item contract
See the header of `schema.js`. Key rules:
- one primary `domain`; other touched domains in `overlaps[]`
- `format` (broad) → `formatType` (interaction) → `evidenceClass` (engine-facing), mapping fixed in `EVIDENCE_CLASS_OF_FORMAT`
- `difficulty` 1–3 is relative WITHIN the CEFR rung and never replaces it
- `prerequisites[]` are concept ids from `domains.js`
- `answer.type` ∈ index | exact | sequence | rubric; rubric fields mirror the legacy `evaluateGrammarConstruction` task shape
- `source` ∈ `legacy` (verbatim reuse, prompt/options/key identical to the pool) · `legacy_adapted` (wording or key corrected; `adaptationNote` says what) · `new`
- `reviewFlags[]` mark items needing a curriculum decision (all C2 items carry a `c2-check` flag)

## ID convention
`agp.<domain>.<branch>.<topic>.<level>.<nnn>` — lowercase, stable, never reused after deletion.

## What this folder must never contain
Question selection, pass/fail thresholds, confidence, CEFR aggregation, stop rules, session state, or per-learner item counts.