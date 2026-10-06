# Deep Mode word-family run: handoff to the Base44 AI

From: Claude (Cowork session with Tee), 6 Oct 2026. To: the Base44 builder AI (Opus 5.5) working in this app.
Tee is the founder and decides everything marked **Tee decides**. Read this whole file before doing anything.

## 1. What this is

VIRORA's Deep Mode tab shows a "word lab" for each corpus word: a glowing radial map with branches Meaning, Word forms, People & things, Synonyms, Antonyms, Affixes and In context. The data for every map is generated offline, checked by a deterministic **gate** (`gate.py`), sampled by a human, and only then shown to learners.

The corpus is `VocabularyWord`: 2,282 rows = 2,150 headwords. Work is split into 209 batches of 10 headword groups (a group = all corpus rows with the same spelling).

**State when you take over:**

| part | status |
|---|---|
| 75 pilot + regression headwords | done, reviewed by Tee (18/20 approved, the 2 fixes applied), pass the gate |
| batches 001–052 and 209 | done by Claude: 524 maps, **all pass** gate-4.2 |
| **batches 053–208 (156 batches, 1,555 headword groups)** | **your job**. Tee uploads the inputs file `deepmode-inputs-053-208.json` (section 3) |
| the 599 finished maps | Tee has them as one file, `deepmode-maps-done-599.json`, to upload through the importer you'll build (section 5) |

Nothing has been written to the database yet. The app's Deep Mode tab currently shows a "Coming soon" preview with 3 sample words (`src/components/deepmode/`); don't touch it unless Tee asks (section 8).

## 2. House rules

1. **Never publish the app.** Tee publishes. Work on main is fine, but checkpoint after each unit of work.
2. Everything for this job lives in `/app/deepmode-run/`. Don't put run data in `src/`.
3. Nothing reaches learners unapproved: every row you write has `approved: false`.
4. **Accuracy beats coverage.** Never invent a word to fill a slot. Never delete a real word just to make the gate pass.
5. The rules are in `GENERATOR.md` (generator-6). Follow it exactly; it encodes 4 rounds of Tee's review. If you think a rule is wrong, tell Tee rather than changing it silently.
6. Keep a written log in `PROGRESS.md` (section 4) so Tee and any later session can see exactly where things stand.

## 3. Setup (nothing to install)

Since gate-4.3 (6 Oct) **everything the gate needs is committed in `deepmode-run/vendor/`**: `wordfreq_lite.py` with wordfreq 3.1.1's English data (verified identical on the gate's vocabulary), `lemminflect` 0.2.3 with a small `numpy` stub (the gate only uses its dictionary lookups), and WordNet 3.1 data files (`vendor/wordnet/*.gz`). No pip, no npm, no network. A sandbox reset doesn't break it. `bash setup.sh` now only checks that the gate loads (`gate ready: gate-4.4`) and the examples pass.

Sanity check: `python3 gate_batch.py examples.json` must print `4 maps · 4 pass · 0 fail`. Delete the `examples.json.*.json` logs it writes.

**Inputs.** Tee uploads `deepmode-inputs-053-208.json` (one JSON object: batch number → list of headword groups). Save it into the sandbox (e.g. download the uploaded file's URL with curl), then:

```bash
python3 /app/deepmode-run/split_inputs.py /path/to/deepmode-inputs-053-208.json   # -> inputs/batch_053 … batch_208.json, 1555 groups
```

Fallback if the upload doesn't work: export every `VocabularyWord` row to `/app/deepmode-run/corpus.json` (fields `id, english, cefr, english_definition, example_en`) and run `python3 make_inputs_from_corpus.py`. It skips the 595 finished headwords in `done_index.json` and must report 1,555 groups / 156 batches. Either way the batches are identical.

## 4. The generation loop (batches 053 → 208, in order)

For each batch `NNN`:

1. Read `GENERATOR.md` and `examples.json` (once per session is enough; re-read if unsure).
2. Input: `inputs/batch_NNN.json`. Output: `outputs/batch_NNN.json` (a JSON array of maps).
3. Generate **one map per distinct meaning** of every group. Rows in a group that mean the same thing share one map (`word_ids` lists all of them).
4. Run `python3 gate_batch.py outputs/batch_NNN.json`. It prints every FAIL. The first run is logged automatically to `outputs/batch_NNN.json.firstpass.json`; keep those logs, they measure quality.
5. Fix every FAIL, then re-run. Up to 3 rounds. **Don't chase FLAGs**; they are notes for the human reviewer.
6. If a FAIL is the gate's mistake (see the playbook below), handle it the sanctioned way, never by mangling the map.
7. Append one line to `PROGRESS.md`:
   `| NNN | maps | first-pass FAILs (by category) | final: pass | notes |`
8. Every 5 batches: run `python3 gate_all_outputs.py` (gates every output in one process; should end `… 0 fail`) and create a checkpoint.

Do as many batches per turn as you can keep high quality; 3–5 per turn is a good pace. When Tee says "continue", carry on from the first batch not in `PROGRESS.md`.

### Gate-mistake playbook (learned on batches 001–052)

| situation | what to do |
|---|---|
| A real modern word is missing from WordNet 3.1 (2011): carer, hoodie, offline, gendered, overcrowded, driverless, text (verb) | Check it is in the **Oxford or Cambridge learner dictionary**. If yes, add it with its parts of speech to `lexicon_supplement.json` (keys `noun`, `verb`, `adj`, `adv`) and re-run. Note the addition in PROGRESS.md. If it is not in those dictionaries, don't use the word. |
| The gate is wrong about one specific item and the supplement doesn't fit | Add to that map: `"gate_overrides": [{"msg_contains": "<unique part of the FAIL message>", "reason": "<why the gate is wrong>"}]`. The FAIL becomes a visible `override` flag for the reviewer. Use rarely, always with a real reason. |
| The gate pushes you to add a rare word you only mentioned in a note | Rare words (zipf < 2.5) in notes no longer fail. If one still does, remove the mention from the note rather than adding a rare word. |
| A grammar word (although, because, each, whose, must, nowhere, etc.) | `kind: "function"`: simple map with `usage_note`, `relations`, `context`. No word forms. |
| A headword that is itself a person noun (actor, artist, bully) | It stays the main entry of its own noun slot. Other person/thing nouns go in `people`. |
| Compounds (backache, armchair, raincoat) | Leave them out entirely. A later Compounds branch will collect them. |
| Two rows, same spelling, different meanings (iron: metal / clothes; coach: sport / bus) | Separate maps, each with its own `sense_label`. |
| A corpus row looks wrong (e.g. its example uses another meaning, a typo in the definition) | Follow the definition, and note the corpus problem in `reviewer_note` starting `CORPUS:`. Don't edit VocabularyWord. |

First-pass FAILs on Claude's 524 maps (before self-fixing), for reference: 122 of 524 maps had at least one. Top categories: missing form 36, bad synonym (usually wrong part of speech) 33, bad example 28, bad definition 13, bad antonym 10. All were fixed within 3 rounds. If your first-pass FAIL rate is much higher than ~25 % of maps, slow down and re-read GENERATOR.md.

## 5. Storage and import

### 5a. Create the `WordFamily` entity (**Tee decides**: ask once before creating)

Use `WordFamily.schema.json` as is (one row per map; `approved` defaults false; admin-only writes). Don't copy translations into it; the app reads uz/ru from `VocabularyWord` via `word_id`.

### 5b. Build an admin-only importer

- A backend function `deepModeImport` (admin only) that takes a JSON array of maps and, for each one:
  - **rejects** it if it has no `headword`, `word_id`, `kind` or `cefr`;
  - **upserts** by (`word_id`, `sense_label`), so re-importing a batch never duplicates rows;
  - stores the map's fields plus `generator_version: "generator-6"`, `gate_version` (from the gate log), `gate_flags` (from `outputs/batch_NNN.json.gate.json` when available), `approved: false`;
  - returns counts: created / updated / rejected.
- A small admin page or section, e.g. in the existing admin console, called "Deep Mode import": a file picker (JSON) that calls the function in chunks of 50 and shows the counts.
- **Tee uploads `deepmode-maps-done-599.json` there** (the 524 batch maps + 75 pilot/regression maps).
- Your own batches: once a batch passes the gate, import it the same way (through the function or your data tools) and mark it imported in PROGRESS.md.

### 5c. Coverage check (after the last batch)

Every `VocabularyWord.id` must appear in exactly one WordFamily row's `word_ids`. Write a quick admin check (backend function) that reports missing ids and ids covered twice; fix gaps by generating the missing groups as a new batch `210`.

## 6. Human review (**Tee decides** when maps go live)

Build an admin "Deep Mode review" page on WordFamily:
- Filters: all / has flags / reviewer_note starts with `GATE?` or `CORPUS:` / random sample (stratified by `kind` × `cefr`).
- For each map: render the content (a readable card list is fine; the radial map is not needed here), the gate flags, and verdict buttons **Approve / Minor wording / Needs a fix**, with categories (missing form, invented form, wrong POS, wrong morphology, wrong sense, bad example, bad definition, false affix, bad synonym, bad antonym, level mismatch) and a comment box. Store verdicts on the row (`review_verdict`, `review_cats`, `review_comment`, `reviewed_at`; already in the schema).
- Bar to approve the run: Tee reviews ~100 maps (every `GATE?` map plus a stratified sample). ≥ 90 % need no factual fix, and there are 0 invented forms, 0 false affixes and 0 wrong meanings. If a serious class appears, fix the rule and regenerate only the affected batches.
- Only Tee flips `approved: true` (bulk-approve after the sample passes is fine if he says so).

## 7. Later (only when Tee asks)

1. **WordRelation rows for the games:** `to_rows.py` shows the mapping. Every synonym/antonym of an approved map becomes a `WordRelation` row (`from_lemma` = the form, `to_lemma`, `relation`, `strength`, `note`, `source: "deepmode:<headword>"`, `approved: false`).
2. **Corpus-wide clue collisions:** the same synonym target at 0.80+ used by two headwords. The gate checks within one file; run it over all maps together before approving relations.

## 8. Wiring the app's Deep Mode tab to real data (only when Tee asks)

The preview engine is in `src/components/deepmode/` (`DeepModeMap.jsx`, `deepModeEngine.js`, `deepModeMapCopy.js` with en/uz/ru copy, `deepModeSamples.js`). To use WordFamily it needs:
- **Data and search:** read approved `WordFamily` rows, plus search or pick a word.
- **Word forms branch:**
  - extra entries per slot (main entry + up to 2);
  - `other_meaning` entries (dashed, "other meaning" tag, no Explore button);
  - "No such form" only for `no_form`.
- **New People & things branch:** gold `#E9B872`, items tagged person/job/field/thing.
- **Simple map** for `kind` `phrasal`/`phrase`/`function`: Meaning + "How to use it" (`particle_note`/`usage_note`) + Synonyms/Antonyms + In context.
- **Meanings picker:** for headwords with several maps (`sense_label`), a button above the map, not a node.
- **Already built (keep):** re-centring on any form ("Explore {form} →", ring turns 30° per slot, "← Back to {headword}") and per-form synonyms/antonyms.
- **Level rule:** Affixes sit behind "More" for A2–B1 learners and show directly from B2. People & things shows at every level.

## 9. Files in this folder

| file | what |
|---|---|
| `HANDOFF.md` | this file |
| `GENERATOR.md` | generator-6: the full rule sheet for writing maps |
| `examples.json` | 4 schema examples (economy, receive, give up, make sure) |
| `gate.py` | gate-4.4 (WordNet 3.1 + lemminflect + wordfreq, all vendored; affix table affix-2) |
| `gate_batch.py` | gate one file, print FAILs, log the first pass |
| `gate_all_outputs.py` | gate every output file in one process |
| `lexicon_supplement.json` | verified modern words missing from WordNet |
| `setup.sh` | checks the gate loads (nothing to install) |
| `vendor/` | the gate's bundled dependencies: don't edit |
| `split_inputs.py` | turns Tee's uploaded inputs file into `inputs/batch_NNN.json` |
| `make_inputs_from_corpus.py`, `done_index.json` | fallback: rebuild the same inputs from a corpus export |
| `outputs/` | your output files go here |
| `WordFamily.schema.json` | the entity to create (5a) |
| `to_rows.py` | reference for WordRelation rows (section 7) |
| `PROGRESS.md` | your log (first row already filled in) |

Full design history (decisions, pilot results, spec) is in Tee's Claude project: `claude/virora-deep-mode-spec-v2.md`, `claude/deep-mode-pilot/RESULTS.md`, `claude/deep-mode-pilot/full/RUNBOOK.md`. Tee can paste anything you need from there.
