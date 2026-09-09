# VIRORA Grammar Taxonomy — repository source of truth

**Status: LOCKED. Verified against the implementation on 2026-09-09.**

This document is the authoritative map of VIRORA's grammar content architecture. It lives in the repository so that anyone working on the dataset or the placement engine can find it. A copy of the narrative history is kept in the Claude Project (`claude/virora-grammar-taxonomy.md`), but **this file is the version that must match the code**.

Every figure below was read out of the implementation, not transcribed from a design document. If this file and the code ever disagree, the code wins and this file is wrong — fix it here.

## Verified state

| | |
|---|---|
| Domains | **13** |
| Branches (declared in `domains.js`) | **83** |
| Branches populated with items | **83** — no empty, no undeclared |
| Concepts | **158** |
| Assessment items | **533** |
| `validateDataset` | 0 problems |

Items by CEFR level: A1 87 · A2 104 · B1 121 · B2 123 · C1 78 · C2 20
Items by evidence class: recognition 343 · controlled_construction 142 · free_production 48

## Where the architecture actually lives

| Layer | File | Authority |
|---|---|---|
| Domains, branches, concept ownership | `src/lib/adaptiveGrammar/domains.js` | **Definitive** |
| Item contract + validation | `src/lib/adaptiveGrammar/schema.js` | Definitive |
| Items | `src/lib/adaptiveGrammar/bank/*.js` | Definitive |
| Public contract | `src/lib/adaptiveGrammar/index.js` | The only import the engine may use |
| Placement engine | `src/lib/grammarPlacement/` | Consumes the taxonomy; never defines it |
| Regression harness | `tools/grammar-placement-sim/` | Dev-only, offline, no AI |

**Item ids encode the taxonomy path**: `agp.<domain>.<branch>.<topic>.<level>.<nnn>`, and `schema.js` validates it. Moving an item between domains or branches renames its id, and stored `GrammarAssessmentRun.item_log` rows reference ids. This is the migration cost that governs every future taxonomy change — it is cheap only while no learner data exists.

## Layer 1 — the 13 domains (locked)

Referenced by all 533 items, the placement engine, and the `GrammarAssessmentRun` / `GrammarProfile` entities. Re-opening this layer means a dataset rewrite plus an engine and persistence migration.

| # | id | User-facing name | Items | CEFR span |
|---|---|---|---|---|
| 1 | `tenses` | Tenses & Time | 64 | A1–C2 |
| 2 | `nouns-articles` | Nouns & Articles | 47 | A1–C2 |
| 3 | `pronouns` | Pronouns | 43 | A1–C2 |
| 4 | `verb-patterns` | Verb Patterns | 38 | A1–C2 |
| 5 | `adj-adv` | Adjectives & Adverbs | 32 | A1–C2 |
| 6 | `comparison` | Comparison | 30 | A1–C2 |
| 7 | `questions-negation` | Questions & Negation | 47 | A1–C2 |
| 8 | `modals` | Modals & Attitude | 43 | A1–C2 |
| 9 | `prep-phrasal` | Prepositions & Phrasal Verbs | 40 | A1–C1 |
| 10 | `sentence-structure` | Sentence Structure | 52 | A1–C2 |
| 11 | `conditionals-wishes` | Conditionals & Wishes | 37 | A2–C2 |
| 12 | `passive-causative` | Passive & Causative | 32 | A2–C2 |
| 13 | `reported-speech` | Reported Speech | 28 | B1–C2 |

Three domains do not start at A1 and one does not reach C2. This is deliberate — `reported-speech` has no meaningful A1/A2 content, and `prep-phrasal` has no defensible C2 item. The placement engine handles it through per-domain assessable ladders and reports `atCoverageCeiling` rather than inventing a level.

**Cluster grouping** (a candidate top-level navigation grouping, not a decision): Verb core 1·4 · Noun phrase 2·3 · Modification 5·6 · Functional 7·8·9 · Complex sentence 10·11·12·13.

## Layer 2 — the 83 branches (locked)

Format: `branch (items, CEFR span)`.

**1 `tenses` — 5 branches**
present (15, A1–C2) · past (15, A2–C1) · future (15, A2–C2) · perfect (14, A2–C1) · used-to (5, B1–C1)

**2 `nouns-articles` — 5**
articles (13, A1–C2) · plurals-agreement (13, A1–C2) · quantifiers (12, A1–B2) · countability (7, A1–C1) · possession (2, A2)

**3 `pronouns` — 6**
personal (12, A1–C1) · possessive (6, A1–B2) · reflexive (6, B1–C2) · indefinite (7, A2–B2) · demonstrative (4, A1–A2) · substitution (8, A2–C1)

**4 `verb-patterns` — 5**
gerund-infinitive (14, A2–C1) · meaning-change-verbs (11, B1–C1) · object-infinitive (4, A2–B2) · have-got (5, A1) · perfect-forms (4, B2–C2)

**5 `adj-adv` — 6**
adjective-form (8, A1–C2) · adverb-form (7, A2–C1) · frequency (6, A1–A2) · order-position (4, B1–C1) · intensifiers (5, B1–B2) · gradability (2, B2–C1)

**6 `comparison` — 6**
comparative (8, A1–C1) · superlative (5, A2–C1) · equality (5, A2–C1) · parallel-comparison (4, B1–C1) · modified-comparison (6, B1–C2) · like-as (2, B2)

**7 `questions-negation` — 7**
yes-no (7, A1–A2) · wh-questions (12, A1–B2) · indirect-questions (4, B1–B2) · tag-questions (6, B1–C1) · negation (9, A1–C2) · subject-questions (1, A2) · **emphasis-inversion (8, B2–C2)**

**8 `modals` — 7**
ability-permission (7, A1–A2) · obligation (5, A2–B2) · deduction (7, A2–B2) · past-modals (13, B1–C2) · hedging (5, C1–C2) · advice (1, A2) · semi-modals (5, A2–C1)

**9 `prep-phrasal` — 6**
time (9, A1–B2) · place (5, A1–A2) · movement (4, A2–B1) · dependent-prepositions (10, A2–C1) · phrasal-verbs (8, A2–C1) · stranding (4, B2–C1)

**10 `sentence-structure` — 10**
word-order (5, A1–C2) · conjunctions (7, A1–B1) · relative-clauses (11, A2–B2) · participle-clauses (7, B2–C1) · cleft (3, B2–C1) · existential (4, A1–A2) · imperatives (3, A1–A2) · predication (5, A1) · subjunctive (3, C1) · clause-linkers (4, B1–C2)

**11 `conditionals-wishes` — 7**
zero-first (6, A2–B1) · second (5, B1–B2) · third (3, B2) · mixed (4, B2–C1) · inverted (5, C1–C2) · wishes-preference (8, B2–C2) · linkers (6, B1–C1)

**12 `passive-causative` — 7**
simple-passive (10, A2–B2) · perfect-progressive-passive (7, B1–C1) · modal-passive (4, B1–C2) · reporting-passive (4, B2–C1) · causative (4, B2–C1) · get-passive (2, B2–C2) · passive-infinitive (1, C1)

**13 `reported-speech` — 6**
statements (7, B1–B2) · questions (4, B1–C1) · commands-requests (3, B1–B2) · reporting-verbs (5, B2–C1) · backshift-exceptions (4, C1–C2) · modals-reported (5, B2–C2)

## Domain ownership rulings

These resolve boundaries where two domains could plausibly claim the same grammar point. All are implemented and verified.

**Emphatic inversion → Questions & Negation (7).** *Never have I seen… / Not only did she…* uses the same subject–auxiliary inversion mechanic as question formation. The syntactic tool is taught once and applied to two communicative purposes, rather than split across domains by surface function. Concept `negative-adverbial-inversion` is owned by `questions-negation`; all 8 items live in `questions-negation/emphasis-inversion`.

**Substitution & ellipsis → Pronouns (3).** Substitution is referential — the same family as the pronouns already in Domain 3. Concepts `ellipsis-substitution` and `so-neither-responses` are owned by `pronouns`; `pronouns/substitution` holds 8 items. Two further items *exercise* `ellipsis-substitution` while being owned elsewhere, which is legitimate and is exactly what `prerequisites[]` is for: `comparison/parallel-comparison` (the more…the more) and `sentence-structure/clause-linkers` (reduced adverbial ellipsis).

**Causatives → Passive & Causative (12).** Not Verb Patterns. Concept `causative-have-get`.

**Phrasal verbs → Prepositions & Phrasal Verbs (9).** Not Verb Patterns. Concept `phrasal-verb-separability`.

**Frequency split.** Domain 1 owns frequency as tense *meaning*; Domain 5 owns frequency-adverb *word order* (`adj-adv/frequency`, concept `frequency-adverbs`).

**Degree → Comparison (6).** Domain 5 never uses the term.

**Participles split by function.** Tense-building → 1 (`past-participle`); adjectival → 5 (`ed-ing-adjectives`); clause-reduction → 10 (`participle-clauses`).

**Word formation is not Grammar.** Prefixes, suffixes and derivation belong to Vocabulary's Word Forms node. Domain 5 owns *how an adjective is used*, never how the word is built.

Concept ownership totals: tenses 21 · sentence-structure 18 · conditionals-wishes 15 · nouns-articles 13 · pronouns 13 · passive-causative 12 · questions-negation 11 · adj-adv 10 · modals 10 · verb-patterns 9 · comparison 9 · prep-phrasal 9 · reported-speech 8.

## Structural facts worth knowing before changing anything

**Boundary porosity is real and structured.** 48 of 158 concepts are exercised in more than one domain. `tenses` is the universal donor, lending concepts to six other domains — expected, since tense is foundational to passive, conditional, reported and interrogative structures alike. 62 items carry an explicit `overlaps[]` declaration. A concept owned by one domain and exercised by another is correct design, not drift.

**Branch density is uneven.** Several branches are very thin — `questions-negation/subject-questions`, `modals/advice` and `passive-causative/passive-infinitive` hold exactly one item; `nouns-articles/possession`, `adj-adv/gradability`, `comparison/like-as` and `passive-causative/get-passive` hold two. A branch cannot support its own CEFR estimate at that density. This is the binding constraint on any future branch-level placement model.

**Domain × level is the placement unit.** The engine aggregates evidence per domain per CEFR rung, so branches inside a domain are pooled. One weak branch can move a whole domain estimate by a rung.

## Deferred decisions

**D1 — Sentence Structure size.** It remains the widest domain at 10 branches and is the most common `overlaps[]` target. Options: keep as one domain and let branches carry the size, or split clause-building from discourse/emphasis devices and go to 14 domains. Splitting re-opens the locked domain layer.

**D2 — Branch-level placement.** Candidate output models: (A) domain level only — current, (B) branch level, (C) hybrid domain estimate plus branch strengths — the stated preference. Blocked on the thin-branch constraint above.

**D3 — Prerequisite contradiction detection stays opportunistic.** Locked for V1. Concept-aware probing would require explicit `concept → prerequisiteConcepts[]` edges, which the taxonomy does not define. The engine deliberately derives no concept-to-concept edges; see `src/lib/grammarPlacement/prerequisites.js`.

**D4 — Core-domain set for placement aggregation.** The engine ships a provisional default (`tenses`, `nouns-articles`, `questions-negation`, `sentence-structure`), flagged `provisional: true` in config and carried into every stored result. Still needs a curriculum ruling.

**D5 — Navigation grouping.** Two candidate axes, unresolved: the 5 topic-family clusters, and the CEFR-tier / mastery-gate "Elevate" concept.

**D6 — The topic layer is unratified.** Every item carries a topic encoded in its id, so a full topic inventory already exists in the bank — but it has never been reviewed, exactly as the branch layer had not been before 2026-09-09. Extracting and ratifying it deliberately is the natural next architectural step.

## Changing this taxonomy

1. `domains.js` is the definitive structure. Change it there first.
2. Any item move renames its id. Check `GrammarAssessmentRun` rows before moving anything once learners exist.
3. Run `validateDataset(ADAPTIVE_GRAMMAR_ITEMS)` — it catches ids that no longer match their path.
4. Run the harness in `tools/grammar-placement-sim/` (110 assertions, 9 deterministic profiles, fully offline).
5. Update this file with values read from the code, not from the plan.
