# VIRORA Skill Intelligence: repository source of truth

**Status: architecture LOCKED. Phase 1 (data foundation, shadow mode) implemented 2026-09-30. Nothing learner-facing reads it yet.**

This document is the authoritative map of how VIRORA turns learner activity into a picture of the learner's English. `docs/grammar-taxonomy.md` stays the authority for the grammar layer; this file only mirrors it.

If this file and the code disagree, the code wins and this file is wrong. Fix it here. Every invariant below is enforced by the suites in `tools/skill-intelligence/`.

## Terminology (locked)

| Term | Meaning | Is it built? |
|---|---|---|
| **Correctness** | How the learner is performing **now**. Computed over the newest 10 *verified, targeted* rounds on one leaf, item-weighted, no decay. | Yes (shadow `LeafState.correctness`) |
| **Progress** | How far the learner has **travelled** through demonstrated cells. A cell is leaf × CEFR level × response mode. | Inputs only (`LeafState.cells`). Cell states are not decided yet. |
| **Mastery** | A **rare, long-term** achievement earned through sustained evidence. Leaf-level, permanent once awarded (immutable `MasteryAward`), and may show "Needs refresh". | **No.** Thresholds are undecided. |
| **The Tree** | What exists: the taxonomy. Every evidence item has exactly one owner leaf. | Yes |
| **The Graph** | What connects: transfer/support and co-measurement relationships. It never produces evidence and never moves a number. | Schema only |
| **Quality** | A descriptor such as Accuracy, Precision, Range, Fluency, Coherence, Flexibility or Originality. Never a node and never mastered. It may appear as a note on an edge. | Constant list |

Four clarifications:

- **◆ Secured is not Mastery.**
- **Correctness is not Mastery.** The legacy field `SkillState.current_mastery` actually measures correctness; it will be renamed when `SkillState` is retired.
- **There is no "overall English %".**
- **There is no cross-skill average.**

## Target pipeline

```
Evidence (immutable ledgers)
  ↓  classifyEvidence            base44/shared/skillClassify.js
Classification
  ↓  deriveLeafStates            base44/shared/leafStateCore.js
Leaf State (shadow)              LeafState entity
  ↓  (later) progress-cell policy
Progress Cells ○ ◐ ● ◆
  ↓  (later) MasteryPolicy
Mastery (MasteryAward)
  ↓
Skill Intelligence UI

Transfer Graph → recommendation candidates → human-reviewed qualitative suggestions
```

Transfer is **never** used as "transfer → automatic score increase".

## Where it lives

| Layer | File | Authority |
|---|---|---|
| Tree: stable ids, versions, hierarchy, LIVE/COMING_SOON states, modes, qualities, facets | `base44/shared/skillTaxonomy.js` | **Definitive** |
| Activity map: activity → primary leaf, mode, declared co-measurement; write-time enrichment | `base44/shared/skillActivityMap.js` | **Definitive** |
| Classification | `base44/shared/skillClassify.js` | **Definitive** |
| Graph schema + validation | `base44/shared/skillTransferGraph.js` | **Definitive** |
| Shadow leaf state (pure) | `base44/shared/leafStateCore.js` | **Definitive** |
| Shadow leaf state (DB, admin-only) | `base44/shared/leafStateEngine.ts`, `LeafState` entity, `progressApi` actions `rebuildLeafStates` / `verifyLeafStates` | Admin-only |
| Grammar domains/branches | `src/lib/adaptiveGrammar/domains.js` | Definitive (LOCKED). Mirrored, with a drift test. |
| Live 5-skill progress (VT-6) | `progressCore.js`, `progressEngine.ts`, `progressApi` | **Live. Unchanged.** |

All shared modules are plain JS with no SDK, no I/O and no clock (the caller passes `now`), under the same contract as `progressCore.js`. Versions: `TAXONOMY_VERSION`, `ACTIVITY_MAP_VERSION`, `CLASSIFIER_VERSION` and `LEAF_STATE_VERSION`, all at **1**.

## Layer 1: taxonomy (the Tree)

Node ids are **stable identifiers, never display strings**. Never rename or reuse one. A rename is an `ALIASES` entry (old → new) plus a `TAXONOMY_VERSION` bump. `ALIASES` is empty in v1.

Kinds are `root > group > area > leaf`. Only leaves own evidence.

States are **`LIVE`** and **`COMING_SOON`** only. There is **no Premium state**: monetisation is out of scope.

```
english
├─ systems                       LANGUAGE SYSTEMS
│  ├─ vocabulary                 LIVE
│  │  ├─ vocabulary.form_and_meaning        LIVE
│  │  ├─ vocabulary.meaning_in_context      LIVE
│  │  ├─ vocabulary.sense_relations         LIVE
│  │  ├─ vocabulary.collocations_chunks     LIVE
│  │  ├─ vocabulary.word_formation          LIVE
│  │  └─ vocabulary.register_connotation    COMING_SOON
│  ├─ grammar                    LIVE
│  │  └─ grammar.<domain> ×13               LIVE   (the LOCKED domains; branches are facets)
│  ├─ orthography                LIVE
│  │  ├─ orthography.spelling               LIVE
│  │  ├─ orthography.punctuation            COMING_SOON
│  │  └─ orthography.capitalization         COMING_SOON
│  └─ pronunciation              COMING_SOON  (no leaves yet)
└─ use                           LANGUAGE USE
   ├─ comprehension              COMING_SOON
   │  ├─ comprehension.reading              COMING_SOON
   │  └─ comprehension.listening            COMING_SOON
   └─ production                 LIVE
      ├─ production.writing_sentence        LIVE
      ├─ production.writing_text            COMING_SOON
      └─ production.speaking                COMING_SOON
```

The 13 grammar leaves are `grammar.tenses`, `grammar.nouns-articles`, `grammar.pronouns`, `grammar.verb-patterns`, `grammar.adj-adv`, `grammar.comparison`, `grammar.questions-negation`, `grammar.modals`, `grammar.prep-phrasal`, `grammar.sentence-structure`, `grammar.conditionals-wishes`, `grammar.passive-causative` and `grammar.reported-speech`. Their ids use the locked domain ids verbatim. **No grammar branch is a node.** The 83 locked branches only validate the `grammar_branch` facet, and there is no branch-level progress.

There are **20 LIVE leaves**: 5 Vocabulary, 13 Grammar, Spelling and Writing: Sentence. No other live capability exists.

**Progressive reveal** (`revealLevel`). The top level shows only Systems/Use and their six areas. Opening an area reveals its leaves together with their state.

**Coming Soon.** A `COMING_SOON` node is future territory. Render it dim or outlined, never "0%" and never red. Its correctness is `null`.

**Comprehension.** The area id is `comprehension` (Reading, Listening). The legacy SkillState key `"comprehension"` means the **Definition game** and maps to `vocabulary.form_and_meaning`. That remap lives only in `LEGACY_SKILL_NODE`, and a test pins it.

**Creativity** is not a node, and there is no permanent top-level Creativity skill. Creative and quality analysis stays future/Coming Soon. The Sentence game's rubric sub-scores are stored so that analysis is possible later.

## Layer 2: canonical response modes

The only modes are **`recognise` · `construct` · `produce`**. A mode is decided by what the learner has to do, not by what the game is called:

| Mode | Definition | Grammar stage | Placement evidence class |
|---|---|---|---|
| recognise | The answer is on screen. The learner selects, matches or groups it. | choose | recognition |
| construct | The learner generates the form against a closed key (type it, fill the gap, arrange it, transform it). | build, transform | controlled_construction |
| produce | Open response judged against a rubric (AI or human). | create, express | free_production |

The mode is always taken from the activity map and **never from the client**. A stored `mode` is informational only; the classifier re-derives it.

**Known divergence.** `LearnerWordState` classifies modes per game: `quiz` is "recall" and `usage` is "usage". On this axis both are `recognise`, because the learner picks from options. The name crosswalk is recognition → recognise, recall → construct, usage → produce. `LearnerWordState` is not changed by this work.

## Layer 3: leaf ownership (activity map)

**One evidence item has ONE primary leaf.** There are no weights and nothing sums to 1. The old `ActivitySkill` "weights sum to 1" model is not used and must not be revived. There is no cross-skill percentage averaging.

| Activity `game[:bank]` | Primary leaf | Mode | Verification today |
|---|---|---|---|
| quiz | vocabulary.form_and_meaning | recognise | mixed: option items server-graded, typed/count-only attested |
| picture_match, definition_match, memory_flip | vocabulary.form_and_meaning | recognise | client_attested |
| **definition** | **vocabulary.form_and_meaning** | produce | server_ai |
| context_guess, usage:fill_blank, usage:best_word, usage:sentence_repair | vocabulary.meaning_in_context | recognise | client_attested |
| synonym_sprint, odd_one_out, related_words, connection_challenge | vocabulary.sense_relations | recognise | client_attested |
| usage:collocation_match | vocabulary.collocations_chunks | recognise | client_attested |
| wordforms:word_family, prefix_match, suffix_builder, root_hunt | vocabulary.word_formation | recognise | client_attested |
| **spelling:missing_letters, letter_order, typing** | **orthography.spelling** (and nothing else) | construct | **server_graded** (from 2026-09-30) |
| sentence | production.writing_sentence | produce | server_ai |
| grammar_practice | `grammar.<domain>` from `item_id` | from the stage letter (c = recognise, b/t = construct) | server_graded |
| grammar:articles, prepositions, verb_tenses, conditionals, question_formation, active_passive, reported_speech (retired quiz) | nouns-articles, prep-phrasal, tenses, conditionals-wishes, questions-negation, passive-causative, reported-speech | recognise | server_graded |
| grammar:punctuation (retired quiz) | orthography.punctuation (COMING_SOON → retained) | recognise | server_graded |
| crossword | — (XP only, never evidence) | — | — |

Resolution never guesses:

- The exact `(game, bank)` row wins.
- With no bank, the map resolves only what every bank of that game agrees on. Spelling and wordforms still resolve to a leaf.
- **Historic `usage` rows have no bank, so they stay at the `vocabulary` area as *unattributed*.**
- Malformed practice ids stay at the `grammar` area.
- An unknown quiz bank is `unknown`, because it could be grammar or punctuation.

### Co-measurement

If an activity legitimately measures another dimension, the activity map declares it as `coMeasured: [{ dimension, leaf | null, basis }]`. It is allowed only for a dimension the grader actually scores.

- **`leaf: null`**: the dimension is scored but cannot be attributed to one leaf. It is kept as a sub-score and is never evidence. v1 has one: the Sentence grader's `grammar` sub-score, which measures general accuracy and not one of the 13 domains.
- **`leaf: <id>`**: yields **incidental** evidence on that leaf and a derived `co_measurement` graph edge. There is none in v1; a fixture test proves the mechanism.

## Layer 4: evidence classification

`classifyEvidence(row)` is pure and deterministic, with no AI inference and no clock. Its input is one ledger row tagged with its ledger (`WordAttempt | GrammarAttempt | AiGradedItem | RewardEvent`). Its output:

```js
{ leaf, facets, mode, level, support, verification, strength,
  area, resolution, credit, targeted, eligibility: { progress, mastery }, incidental: [...],
  taxonomy_version, activity_map_version, classifier_version, row_taxonomy_version, round_id, at, sub_scores? }
```

| strength | Meaning | Progress/mastery input? |
|---|---|---|
| `verified` | Server-verified (`server_graded` / `server_ai`), targeted, on a LIVE leaf | **Yes.** Whether it *qualifies* is policy, and policy is deferred. |
| `attested` | Client-attested, **or any unrecognised verification value** | **Never.** Visible as activity only. |
| `retained` | Server-verified, but the leaf is COMING_SOON (e.g. the retired punctuation bank) | No. Kept, not shown. |
| `legacy` | Pre-VT-6 `RewardEvent` (no `ledger_version`) | No. Area-level activity only. |
| `unattributed` | No leaf without guessing | No. Area-level activity only. |
| `none` | Not evidence: XP-only game, VT-6 XP row, definition grade receipt, uncounted sentence grade | — |

**Client-attested evidence can never become verified.** Verification is read from the server-written row. Only the exact values `server_graded` / `server_ai` count, and correctness flags or support values cannot upgrade a row.

**Targeted vs incidental.**

- Primary-leaf evidence is *targeted*. It is the only evidence that can feed progress or mastery.
- Co-measured evidence on another leaf is *incidental*. It is retained and counted (`incidental_items`), and **never** silently becomes progress or mastery evidence.

**Facets:** game, bank, activity, grammar_branch, grammar_topic, retired_activity.
**Level:** the row's CEFR level.
**Support:** `none | hint | unknown`. It is client-reported and can only lower a claim.

Definition `AiGradedItem` rows are grade receipts behind the Definition game's `WordAttempt` rows. The `WordAttempt` row is the evidence, so there is no double counting.

## Layer 5: write-time enrichment

New evidence rows carry the following fields. Existing rows are untouched, and every consumer tolerates their absence.

| Entity | New fields |
|---|---|
| `WordAttempt` | `bank`, `mode`, `support`, `taxonomy_version`, `activity_map_version`, `given` (spelling: the learner's first attempt) |
| `GrammarAttempt` | `bank` (retired quiz bank), `mode`, `support`, `taxonomy_version`, `activity_map_version` |
| `AiGradedItem` | `sub_scores` (sentence: grammar/relevance/creativity; definition: accuracy/completeness/own_words), `rubric` (`sentence.v1` / `definition.v1`). `score` stays the average. |

Clients now send `bank` from SpellingGame, UsageGame and WordFormsGame. SpellingGame also sends each word's first attempt as `given` and its `support`. Old clients that send none of this still work: their rows are enriched without a bank, and spelling from an old client stays `client_attested`, exactly as before.

### Server grading: spelling (done)

`gradeSpelling` is now wired in through the pure `gradeWordItem` in `progressCore.js`. The server compares the learner's **first attempt** against the canonical headword, using the same letters-only, case-insensitive normalisation as the game. A word never reached sends `given: ""` and is graded wrong, as before. A round where every item is graded this way is `server_graded`. The scores learners see are unchanged, because the game already scored only the first attempt.

### Remaining vocabulary paths (prepared, not implemented)

Each needs (a) stable item ids plus the learner's `given` in the payload, (b) a server copy of the answer key, and (c) a pure grader. For fixed banks, (b) follows the `grammarKeys.js` pattern: a generated key file with a drift check.

| Game | Key source | Needed |
|---|---|---|
| usage:best_word / sentence_repair / collocation_match | `usageBank.js` (fixed) | generated key file + `gradeUsage` |
| wordforms (4 banks) | `wordFormsBank.js` (fixed) | generated key file + `gradeWordForms` |
| odd_one_out, related_words, connection_challenge, synonym_sprint | fixed banks in `src/lib` | generated key file per bank |
| usage:fill_blank, context_guess, definition_match, picture_match, memory_flip | `VocabularyWord` (already server-side) | send `word_id` + chosen `word_id`; grade by id equality |

Until then, these leaves stay empty for progress and mastery: meaning_in_context, sense_relations, collocations_chunks and word_formation (`leavesAwaitingServerGrading()`).

## Layer 6: shadow leaf state

`deriveLeafStates(rows, now)` produces one `LeafState` per node that has evidence. Evidence normally lands on leaves; area rows hold only unattributed or legacy activity.

- **correctness**: newest 10 verified targeted rounds, item-weighted. It is **`null` without verified evidence**, never 0.
- **confidence / freshness**: the VT-6 math from `progressCore.js`, applied to verified evidence only.
- **Counts**: `verified_rounds/items`, `attested_rounds/items`, `retained_items`, `incidental_items`, `unattributed_items/rounds` and `legacy_rounds/items`.
- **Profiles**: the verification profile (item counts by verification) and the evidence profile (verified items by mode, level and support).
- **Progress-cell inputs** (`cells`): per (level × mode), from verified targeted evidence: items, credit, rounds, `distinct_days_utc`, first_at and last_at. **No cell state is decided.** The distinct-day count uses the UTC calendar day, which is provisional (see deferred decisions).
- **fingerprint**: an FNV-1a hash of the comparable fields.

Admin actions on `progressApi` take `email`, or `offset`/`limit` to walk all learners:

- `rebuildLeafStates` rebuilds from the ledgers, upserts `LeafState`, removes stale nodes and returns a coverage report by strength.
- `verifyLeafStates` does two derivations from differently ordered input, which must be identical (`deterministic`), then diffs the stored rows against a fresh rebuild field by field. It reports mismatched, missing and stale nodes.

`LeafState` RLS is **admin-only for read and write**. Nothing learner-facing reads it, it is not updated at write time, and it is refreshed only by rebuild. `SkillState`, `RoundReceipt`, `RewardEvent` and the ledgers are never written by it.

## Layer 7: the Graph

| Relationship | Meaning | Recommendation input? |
|---|---|---|
| `supports` | Transfer/support: source leaf may also support target leaf | **Only when `reviewed`** |
| `co_measurement` | Derived from declared, leaf-attributed co-measurement | Never |
| `prerequisite` | **Reserved.** Rejected in v1. | — |

Edge fields: `id, source_leaf, target_leaf, relationship, strength (strong|moderate|weak), mechanism, basis (pedagogical_judgement|research|grader_declaration), conditions, status (draft|reviewed), version, quality_notes[{quality, note}], authored_by, reviewed_by, reviewed_at`.

`validateEdge` enforces:

- Edges are **directional**.
- Endpoints are **leaves only**. Qualities and areas are rejected as endpoints.
- **No numbers anywhere**: no numeric field and no weight/percent/gain field, and strength is ordinal.
- `reviewed` requires `reviewed_by` and `reviewed_at`, and AI may only propose drafts.
- **Draft edges are never learner-visible and never recommendation-eligible.** `recommendationEligibleEdges()` is the only gate.

Suggestions are words only:

```js
{ source_leaf: "vocabulary.collocations_chunks", target_leaf: "production.writing_sentence", relationship: "supports",
  strength: "moderate", mechanism: "Known chunks lower the load of composing a sentence.", basis: "pedagogical_judgement",
  quality_notes: [{ quality: "precision", note: "May also support precision in written production." }], status: "draft", version: 1 }
```

This example is **not shipped**. v1 ships **zero** authored `supports` edges, because who owns and reviews the graph is undecided.

## Migration strategy

1. **Shadow, then switch.** `LeafState` is built beside the untouched 5-skill `SkillState`. Learners keep seeing `SkillState` until a later phase proves `LeafState` with `verifyLeafStates`, and only then switches the UI (Constellation v2).
2. **Deterministic from immutable ledgers.** History is classified, never rewritten:

| Legacy | New |
|---|---|
| SkillState `vocabulary` | Vocabulary leaves by game + bank. Bankless `usage` stays area-level. |
| SkillState `grammar` | The 13 domain leaves. Retired punctuation → `orthography.punctuation` (retained). |
| SkillState `spelling` | `orthography.spelling` |
| SkillState `comprehension` (Definition game) | `vocabulary.form_and_meaning` |
| SkillState `creativity` (Sentence game) | `production.writing_sentence` |
| Pre-VT-6 RewardEvent | **Area only** (`legacyRewardArea`). Never a leaf, a cell or mastery. |

3. **Versioned.** Rows stamp `taxonomy_version` / `activity_map_version` at write time. `LeafState` stamps every version used. A version bump means rebuild and then verify.
4. **Renames later.** `SkillState.current_mastery` → `correctness`, keeping an alias. `LearnerWordState.mastered` → e.g. `secure`. `overall.avgMastery` is retired.

## Explicitly NOT built (Phase 1)

- New Constellation UI
- Live taxonomy switch
- MasteryPolicy thresholds
- MasteryAward issuance
- Numerical transfer weights
- AI-generated active edges
- Grammar branch-level progress
- ML/knowledge tracing
- "Hours → % improvement"
- Premium gating or a Premium state
- An overall English % or any cross-skill average
- Automatic correctness increases from transfer
- Write-time `LeafState` updates
- Progress-cell state policy

## Deferred decisions (need product answers)

- **Mastery criteria values**: verified volume, sustained correctness across distinct days, breadth, level, independence (support), freshness. The mechanism is locked (server-verified only, at most one qualifying session per leaf per day); the values are not.
- **Progress-cell criteria**: when a cell is ◐ Emerging, ● Demonstrated or ◆ Secured.
- **Day boundary** for distinct-day counting: UTC (current input) or the learner's local day.
- **Graph ownership**: who authors and reviews `supports` edges.
- **Remaining vocabulary server grading**, in the order above.
- **Retired punctuation evidence**: whether it counts once Punctuation goes LIVE.
- **`ActivitySkill` (Learning Path)** still splits one activity across skills with weights; it must be reconciled with one-primary-leaf ownership before the Learning Path feeds skill state.

## Changing this architecture

1. Change the registry module first, then this file.
2. Never rename a node id. Add an `ALIASES` entry and bump the version.
3. A new game or bank needs an activity-map row. The tests fail if a Skill Hub challenge or a server-accepted game has no owner.
4. The grammar leaves follow `domains.js`; never edit them independently.
5. Run the suites:

```
node tools/skill-intelligence/registry-tests.mjs
node tools/skill-intelligence/classify-tests.mjs
node --experimental-strip-types tools/skill-intelligence/leafstate-tests.mjs
deno run --import-map=tools/skill-intelligence/deno/import_map.json tools/skill-intelligence/deno/progressapi-smoke.ts
```

The Deno smoke test runs the **real** `progressApi` handler against an in-memory store, with the SDK stubbed through the import map. It covers the spelling server-grading path, enrichment, old-client compatibility, the admin-only guard, and the rebuild/verify round trip with `SkillState` untouched.
