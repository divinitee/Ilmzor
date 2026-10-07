# VIRORA Grammar practice production: handoff (2026-10-07)

You are writing grammar practice content for VIRORA, an English app for Uzbek- and
Russian-speaking learners (A1–C1, mostly teenagers and young adults). You work in
this Base44 sandbox (`/app`). The founder, Tee, approves everything. A teacher will
read every sentence you write.

**One unit of work = one topic**: hand-author it, run it through the pipeline,
log it, checkpoint. Do **5 topics per turn**, then stop and report. Start a
**fresh chat every 5 topics** (long chats get expensive); the next chat reads
this file and `grammar-run/PROGRESS.md` and continues from there.

## 0. Hard rules

1. **Never publish the app.** Tee publishes. Checkpoint after every topic.
2. **Never edit the gates**: `tools/grammar-practice/ingest.mjs`,
   `src/lib/grammarPractice/schema.js`, `tools/grammar-practice/lint-topic.mjs`,
   or the test files. Never use `--allow-legacy`. If a gate blocks good content,
   stop and write it up in PROGRESS.md under "Gate questions" for Tee.
3. **Touch only**: `tools/grammar-practice/authored/<key>.mjs` (yours),
   `content/grammar-practice/<key>.json`, `src/lib/grammarPractice/bank/<key>.js`,
   `src/lib/grammarPractice/manifest.js`, `base44/shared/grammarKeys.js` (the last
   four are written by scripts, never by hand), and files in `grammar-run/`.
   No other app code, no entities, no database rows.
4. **No bulk JSON.** Each topic is a hand-written data table in JavaScript, like
   `tools/grammar-practice/authored/continuous-negative.mjs`. Every sentence and
   every filler is chosen on purpose.
5. **Don't touch the Deep Mode run** (`deepmode-run/`) or its progress files.

## 1. Where things stand

- **385 practice topics** exist as slugs in the placement bank
  (`src/lib/adaptiveGrammar/bank/*.js`, 533 items, 13 domains, 83 branches).
  The node map only shows a topic once it has a practice bank.
- **Live: 5 topics, all in `tenses.present`**: simple-routine, simple-negative,
  continuous-now, continuous-negative (hand-authored), third-person-s (old GPT
  batch, **below the variance floor**: 20/58/15 variants; it needs a rebuild).
- Answers in choose/build/transform are graded **on the server** from
  `base44/shared/grammarKeys.js` and stored as `GrammarAttempt` evidence. A topic
  missing from that file still plays, but its answers never count toward
  progress. `build-keys.mjs` (step 5 below) handles this; never skip it.
- CREATE and EXPRESS stages are **locked in the app** (AI marking isn't built yet).
  Write them anyway (8 + 5 per topic) so they're ready when marking ships.

## 2. The worklist

`grammar-run/WORKLIST.tsv` lists all 385 topics in run order, with the CEFR level
(lowest level in the placement bank), status (live / rebuild / todo) and the
placement bank's own description of what each topic tests. Rebuild it any time:
`node grammar-run/make_worklist.mjs`.

| wave | what | topics | when |
|---|---|---|---|
| **A** | finish `tenses.present`: 6 new + rebuild third-person-s | 7 | now |
| **B** | the rest of the Foundational tier (lowest level A1–A2), core domains first: tenses, nouns-articles, questions-negation, sentence-structure, then the rest | 129 | only after Tee approves wave A |
| C | B1 topics | 83 | after Tee's go |
| D | B2–C2 topics | 162 | after Tee's go |

Work strictly in worklist order inside a wave. **Stop after wave A** and wait for
Tee: he plays every new topic in the preview first.

**Topic triage.** 272 of the 385 slugs come from a single placement item, and the
topic layer was never formally reviewed. Before authoring, ask: can this topic
carry 20 *different* natural choose sentences that all test the same point? If
it's too narrow, or it's the same grammar point as another topic in the same
branch, **don't write it**: log it as `needs Tee` with a merge or skip suggestion
and move to the next topic. Never rename a slug or invent a topic; the slug must
match the placement bank exactly (the lint checks this).

## 3. Writing one topic

### 3a. Read first (once per chat)
- `tools/grammar-practice/authored/continuous-negative.mjs`, the reference topic.
  Copy its structure: shared constants, `opts()`/`agree()`-style helpers that
  build options and `why` lines, and one array row per item.
- `tools/grammar-practice/ingest.mjs` and `src/lib/grammarPractice/schema.js`
  (what gets refused).

### 3b. Read for each topic
- Its WORKLIST row, and its placement items:
  `grep -n 't: "<topic>"' src/lib/adaptiveGrammar/bank/<domainFile>.js`.
  The `focus`, `prompt` and `why` there define exactly what the topic tests.
  Your practice must test **that** point, at **that** level.

### 3c. File
`tools/grammar-practice/authored/<domain>.<branch>.<topic>.mjs`. It writes
`content/grammar-practice/<domain>.<branch>.<topic>.json`. Every item carries
`domain, branch, topic, level` (one level for the whole topic: the worklist
level) and `pv: "2.5"`.

### 3d. Stages (fixed, 68 items)

| stage | count | format | shape |
|---|---|---|---|
| choose | 20 | `mcq` | `prompt` with one `______`, 4 `options`, `key` = index, `why`, `slots` |
| build | 20 | `gap_fill` | `instr`, `source` with `______` + cue in brackets, `key`, `why`, `slots` |
| transform | 15 | `rewrite` | `instr`, `source`, `hint` (target with blanks), `key` (string, or array = one part per blank), `why`, `slots` |
| create | 8 | `constrained_sentence` | `prompt`, `requiredElement`, `constraints[]` (no slots, no key) |
| express | 5 | `free_response` | `prompt`, `targetGrammar`, `lookFor[]` (no slots, no key) |

Use only these formats. `word_order`, `error_identification` and
`sentence_correction` are not used.

### 3e. The rules (each one comes from a batch that failed)
1. **Slots**: two slots × four fillers on every choose/build/transform item where the
   sentence can carry them (= 320/320/240 variants). At most 4 one-slot items per
   stage. Each stage needs 200+ variants. Every declared slot appears in the
   sentence as `{name}`, and nothing else does.
2. **A slot never touches what's being tested.** Never slot the word under test,
   or anything the key depends on (the subject, for agreement; the time marker, for
   tense choice; the noun, for articles). Swap in every filler: same key every
   time, and natural English every time ("goes to {place}" can't take "home").
3. **Exactly one defensible answer.** In build/transform, put the root word in
   brackets after the blank: `______ (go)`, `______ (big)`, `______ (he)`.
   The bracket holds **one word**. For closed-class choices (articles,
   prepositions, quantifiers), list the choices in `instr`, never in the sentence.
   Without a cue, several answers are defensible and the item can't be marked.
4. **The key never repeats words printed in the sentence**, and the blank count
   equals the key parts.
5. **Transform changes the target form itself.** Vary the kind of change; no
   more than a third of items use any one kind. Don't drift into another topic's
   grammar.
6. **Distractors are real learner errors.** Think about Uzbek/Russian L1 transfer:
   missing articles, a dropped copula, wrong auxiliary, double negatives, word order.
   Never nonsense, and never a second correct answer. Check each distractor: could
   a native speaker say it in some context? If yes, replace it.
7. **`why` is true of that exact item**, in one or two plain sentences aimed at
   the student.
8. **One time marker per sentence.**
9. **Every sentence in a stage is different**: different subject, verb and
   context. Counts are floors, not targets.
10. **Typed answers avoid British/American spelling splits** (travelling,
    colour, practise, -ise/-ize). Pick another word, or list both spellings in
    `acceptable`. Contractions are expanded automatically (don't/do not,
    won't/will not, can't/cannot, I'm/I am, etc.). `'s` and `'d` are not: add
    the full form to the item's `acceptable` array yourself.
11. **No zero-article typed keys** ("–"). Test "no article" only in choose.

**Content:** everyday life for young people in Uzbekistan (study, work, family,
phone, food, transport, sport, weather, shopping, travel). Mix Uzbek, Russian and
international names. No brands, politics, religion, alcohol, romance or violence.
CEFR-appropriate vocabulary: an A1 sentence uses A1 words.

### 3f. Run it
```
bash grammar-run/run_topic.sh <domain>.<branch>.<topic>
```
This runs, in order: your file → `lint-topic.mjs` → `ingest.mjs` (bank + manifest)
→ `build-keys.mjs` (server answer keys) → all test suites → a review sheet at
`grammar-run/review/<key>.md`. It stops at the first failure. Fix the
**content** and re-run, up to 3 rounds. If it still fails, log `blocked` with
the exact error and move on.

**FLAGs** don't stop the run. Fix each one or give a one-line reason in the log.

**Self-review (required):** read your own `review/<key>.md` top to bottom as a
strict teacher would. Every rendered sentence natural? One right answer each? Fix
anything doubtful, then re-run.

### 3g. Log and checkpoint
Append one row to `grammar-run/PROGRESS.md`:
`| # | topic | level | lint FAIL→FLAG | variants c/b/t | status | notes |`
Status values: `done` (passed everything), `needs Tee` (triage),
`blocked` (gate refused 3 times). Then create a checkpoint named
`grammar <topic>`.

Every 5 topics (end of each turn), also run `npm run build` and `npm run lint`.
Both must pass; a stale Browserslist warning is fine.

## 4. Report to Tee (end of every turn)
Short, plain English:
- topics done (keys), with variant counts;
- anything `needs Tee` or `blocked`, with the reason;
- 2 sample choose items per topic, copied from the review sheet;
- whether build/lint passed and the checkpoint name;
- what's next.

**After wave A, stop** and ask Tee to play all 7 topics in the preview
(Grammar → Foundational → Verb Core → Tenses & Time → Present).
