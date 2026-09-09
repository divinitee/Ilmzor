# Grammar Placement Engine — deterministic simulation harness

**Development-only. Never imported by the app.**

This folder sits outside `src/`, so Vite's build never reaches it — nothing here
can end up in a production bundle. It exists so that any future change to the
placement engine can be regression-tested reproducibly, without spending a
single AI credit.

## Hard constraints (do not relax)

1. **No Base44, no AI, no network.** The simulator imports only the *pure*
   engine core and the dataset. `session.js` and `persistence.js` — the only
   engine modules that reach `base44Client`, the AI grader or the network — are
   deliberately not imported. The run also replaces `fetch` and
   `XMLHttpRequest` with throwing tripwires and reports the counts.
2. **Every AI-format item is scored locally.** Items with `answer.type:
   "rubric"` would normally go to `evaluateGrammarConstruction()`. Here a
   deterministic evaluation is injected instead: correct `1.0`, partial `0.5`,
   incorrect `0.0`. The purpose is to test *engine behaviour*, not AI grading.
3. **No randomness.** Learner responses are a pure function of the item. The
   engine's own tie-break seed is fixed per profile. Every run is byte-identical
   on repeat, and the harness asserts this by running each profile twice.
4. **Never becomes runtime code.** If something here is genuinely needed by the
   app, move it into `src/lib/grammarPlacement/` properly — do not import from
   `tools/`.

## Running it

The engine uses the `@/` alias, so bundle first with the repo's own esbuild:

```bash
cd /app
./node_modules/.bin/esbuild tools/grammar-placement-sim/simulate.mjs \
  --bundle --platform=node --format=esm \
  --outfile=/tmp/gps-sim.mjs --alias:@=/app/src --log-level=error
node /tmp/gps-sim.mjs
```

Full per-item detail is written to `results.json` beside the simulator
(override with the `SIM_OUT` env var). That file is a build artifact, not
source — don't commit it.

### Verifying the no-AI guarantee

Audit the bundle before trusting a run. Every one of these must report zero:

```bash
for p in base44Client InvokeLLM evaluateGrammarConstruction checkAiGate \
         incrementAiUsage @base44/sdk grammarPlacement/session \
         grammarPlacement/persistence; do
  echo "$p: $(grep -c "$p" /tmp/gps-sim.mjs)"
done
```

## The nine profiles

| Id | Learner |
|----|---------|
| P1–P5 | A1 / A2 / B1 / B2 / C1 — correct at or below their level, failing above |
| P6 | Strongest available — correct across the entire range |
| P7 | Independent weakness — strong at B2, but one whole branch (`tenses/past`) failing |
| P8 | Genuine prerequisite conflict — fails foundational evidence for a concept that higher cleared items declare |
| P9 | Inconsistent — deterministic alternation across unrelated branches and levels |

## What it audits

Per run: overall placement, per-domain placement with basis and confidence,
item count, every item id with its level/branch/topic, stop reason,
contradictions, independent lower failures, level substitutions (fallback),
repeated items, and suspicious selection jumps. Across runs: determinism,
C2 handling (per-domain ceiling, never selected in a domain with no C2 content),
sparse-bucket safety, and whether selection moved up after strong evidence and
probed boundaries after weak evidence.

## Known interpretation notes

- **Partial credit is only expressible on rubric items.** 485 of the 533 items
  are `index`/`exact`/`sequence` with no half-credit, so a `0.5` intent on those
  is emitted as a wrong answer and recorded as credit `0`. The harness counts
  these as `degradedPartialsOnDeterministicItems` so the effect stays visible.
- **`independentLowerFailures` rarely populates in a natural run.** The engine
  deliberately does not probe below a cleared rung, so a failed rung under the
  estimate is uncommon. The field is exercised by the unit tests instead.
- **Contradiction detection is opportunistic by design (V1 decision).**
  Selection is domain x level and never targets concepts, so a prerequisite
  conflict only surfaces when sampling happens to land enough evidence on the
  same concept. P8 will usually report zero contradictions; that is expected,
  not a defect.
- **Domain x level cells mix branches.** One weak branch can move a whole domain
  estimate by a rung (visible in P7). Branch-aware placement is deferred until
  the taxonomy and output granularity are settled.
