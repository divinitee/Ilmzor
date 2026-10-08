# Coach Engine tests (VT-40)

```
cd tools/coach && npm i          # ts-fsrs 5.4.2, tests only (functions use npm:ts-fsrs@5.4.2)
cd ../.. && node --experimental-strip-types tools/coach/core-tests.mjs
```

Covers: sense-aware identity (unresolved = evidence-only), evidence weighting
(multipliers -> same-day decay -> client cap), learner state, FSRS boundary (coach-targeted
only, one transition per item per day, replayed from evidence), decision engine (probe,
weak-prerequisite replacement, due / overdue / first check, low confidence, gates),
planner invariants (400 random learners x every policy/minutes: never over budget, review
cap held), fallback chain, P1 policies, policy/persona separation, entitlement + handoff,
and the DB engine on an in-memory store (lazy backfill, PlanLog snapshots incl. concurrent
calls, idempotent / concurrent / forged / cross-user submissions, continuation sessions,
profile limits, Learner Map, verify, shadow mode writes nothing).

The Deno smoke for progressApi maps `npm:ts-fsrs@5.4.2` to this folder's node_modules
(tools/skill-intelligence/deno/import_map.json), so run `npm i` here first.
