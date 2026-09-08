# Adaptive Grammar Placement Test — dataset (content layer)

Owner: content (Fable). Consumer: adaptive engine (Claude). Status: **representative samples only — awaiting approval before mass generation.**

## Layout

```
src/lib/adaptiveGrammar/
  index.js        ← the only import the engine should use
  domains.js      13 domains, branches, stable concept ids
  schema.js       item contract + validateDataset()
  samples/        one file per domain, aggregated by samples/index.js
```

Legacy placement stays untouched at `src/lib/placementContent.js`, `src/lib/placementTest.js`, `src/pages/PlacementTest.jsx`, `src/components/placement/*`. Nothing here imports it or is imported by it.

## Item contract
See the header of `schema.js`. Key rules:
- one primary `domain` per item; other touched domains go in `overlaps[]`
- `prerequisites[]` are concept ids from `domains.js` — never prose
- `answer.type` ∈ index | exact | sequence | rubric; rubric fields mirror the legacy `evaluateGrammarConstruction` task shape (`instruction`, `requiredElement`) so the existing LLM grader can be reused unchanged
- `source: "legacy"` items carry a verbatim `legacyRef.question` back into `placementContent.js`
- `reviewFlags[]` mark items needing a curriculum decision

## ID convention
`agp.<domain>.<branch>.<topic>.<level>.<nnn>` — lowercase, stable, never reused after deletion.

## What this folder must never contain
Question selection, pass/fail thresholds, confidence, CEFR aggregation, stop rules, or per-learner item counts.