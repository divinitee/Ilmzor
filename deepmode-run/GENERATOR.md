# Deep Mode word-family map generator (generator-6)

You are generating Deep Mode "word family maps" for VIRORA, an English app for Uzbek/Russian-speaking learners at A1–B2. Each map takes ONE corpus word in ONE meaning and lays out its whole family: word forms, people & things, synonyms, antonyms, affixes and a short text. A deterministic gate (WordNet 3.1 + lemminflect + wordfreq) and a human reviewer check every map. **Accuracy beats coverage:** a wrong form, a wrong affix split or a wrong meaning is the worst possible error. Never invent a word.

Read `/app/deepmode-run/examples.json` first (schema examples: economy and receive = single words, give up = phrasal verb, make sure = phrase).

## Input and output

- Input: a JSON array of **headword groups**: `{headword, kind_hint, rows: [{word_id, cefr, corpus_definition, example_en}]}`. Most groups have one row. A group with several rows is the same spelling entered more than once in the corpus.
- Output: a JSON array of maps written to the output path you are given.
  - **One map per distinct meaning in the group.** Rows that mean the same thing share one map: put all their ids in `word_ids` (first one also in `word_id`), and use the lowest `cefr` of those rows. Rows with different meanings get separate maps.
  - Every map gets a `sense_label`: one or two plain words naming the meaning ("General", "Money", "River", "School", "Body"). It will label the meaning picker later.
- If a group has `note_for_generator`, follow it.
- `kind`: `word` (a single content word), `phrasal` (verb + particle(s): give up, look after, take part in), `phrase` (any other multi-word item: board game, make sure, good at, for fun, in time (for)) or `function` (a single grammar word: conjunctions, prepositions, determiners, pronouns, modal verbs, e.g. although, because, during, each, whose, must). `kind_hint` is a guess; correct it if it's wrong.

## Single words (kind "word")

- `headword`, `word_id`, `word_ids`, `cefr`, `corpus_definition` (copy the row's English definition), `sense_label`, `sense_pos` (part of speech of the corpus definition: "To …" = verb, etc.).
- **Anchor to the corpus meaning.** Forms, definitions, examples, synonyms and context are all about that one meaning.

### `forms`: the 4 slots noun, verb, adjective, adverb

Each slot has a **main entry** and up to **2 extra entries** (extras come straight after their main entry, same `slot`).

- `existing`: a real word of that part of speech, in this meaning, in the same family (made from the headword, or the headword made from it; zero-change conversions and participle adjectives like "interested" count). Fields: `form`, `relation` (`base` = the headword itself, `derivational`, `participial`, `conversion` = same spelling as the headword, other part of speech), `definition` (learner English, 4–15 words, must NOT contain the form itself or any other family form), `example` (4–25 words, contains the form or an inflection of it), optional `register` (formal/informal/literary) and `note`, plus `syn` and `ant`.
- `other_meaning`: a real family word of that part of speech that belongs to a DIFFERENT meaning of the headword. Fields: `form`, `definition`, `example`, `note` (one line saying which meaning it belongs to: "Belongs to receive = accept ideas or people, not getting a parcel."). No `syn`/`ant`/`relation`.
- `no_form`: ONLY when no real English word exists for that slot in this family. Optional `note`. Words with the same old root that aren't made from this word (certain → certify, health → heal) go in `not_family: ["certify"]` with an explanation in the note.
- Main entry order: `existing` if one exists in this meaning, else `other_meaning`, else `no_form`.
- Extras: `existing` (same meaning: please → pleased) or `other_meaning` (consider → considerable, considerate). Extras of status `existing` may have empty `syn`/`ant`.

**Rules learned in review (each one caused a real error):**
1. **Never hide a real word.** "No such form" tells a learner the word doesn't exist. economy → economize, receive → receptive are `other_meaning`, never `no_form`. Check every slot: -ly adverbs; -ize/-ise/-en/-ify verbs; -able/-ive/-ful/-ous/-al/-ic/-y adjectives; -ness/-ment/-ion/-ity/-ance/-ship nouns; same-spelling conversions; -ed/-ing adjectives.
2. **Never hide a common family word in a note.** If an A1–B2 learner may meet it (consider → considerable, sense → sensible/sensitive, respect → respectable/respectively, wonder → wonderful), it must be an entry. Notes may mention only rare words.
3. **Opposites are not forms.** A family form + a negative prefix (unpleasant, distrust, mistrust) goes in that form's `ant` list.
4. **False friends inside a family** (hardly, lately, respectively) are `other_meaning` with a clear note.
5. **Only learner-dictionary words** (Oxford, Cambridge, Longman). If the only candidate is doubtful or extremely rare (applicably), use `no_form` and mention it in the note.
6. **When the headword is itself a person noun** (actor, artist, teacher), it stays the main entry of its own noun slot; People & things then holds the other person/thing nouns (actor → actress).
7. **Compounds are not forms or people** (backache, armchair, raincoat, sunlight): leave them out for now; a separate Compounds branch will collect them later.
8. **Person and thing nouns go in People & things, not in the noun slot.** The noun slot holds the noun for the action, quality, state or thing itself (training, ownership, invention); the person who does it (trainer, owner, inventor) goes in `people`.

### `people`: People & things (0–4 entries)

Nouns made from this family that name **a person, a job, a field or sector, or a thing/tool/device**:
- `form`, `kind` (`person` | `job` | `field` | `thing`), `status` (`existing` = this meaning, `other_meaning` = another meaning, with `note`), `definition` (4–15 words, not using the word itself), `example` (contains the word), optional `note`.
- Examples: train → trainer (job), trainee (person); economy → economist (job), economics (field); invent → inventor (job); receive → receiver (thing), recipient (person), receptionist (other_meaning job); own → owner (person); apply → applicant (person); sense → sensor (thing); industry → industrialist (job).
- Most useful first. Max 4. Must be made from the family (-er, -or, -ist, -ant, -ent, -ee, -ian, -ics, -ess, or another clear derivation). Never repeat a word already shown in `forms`.
- If a common noun looks like it belongs but isn't made from this word (fly → flee, close → closet), list it in `people_not_family` instead. Empty list is fine when nothing exists (leaf, weather).

### `syn` and `ant` per existing form

- `syn` (0–6) and `ant` (0–3), matching THAT form's part of speech.
- syn row: `to`, `relation` ("synonym" at strength 0.95 or 0.8; "related" at 0.6 or 0.4), `strength` ∈ {0.95, 0.8, 0.6, 0.4}, `note` (how close it is / how it differs, learner English, max 300 characters), optional `register`.
- ant row: `to`, `relation` "antonym", `note`. Never "not X". Empty list when there's no true opposite.
- Include at least one EASY (A1–B1) word when one exists. Never list a family member as a synonym.

### `affixes`

- Only on `existing` entries (forms or people), never on other_meaning ones. Only real, transparent affixes from this table, at the edge of the word: un- in- im- dis- re- en- mis- pre- uni- bi- tri- multi- -ion -ation -sion -ment -ness -ity -ty -ence -ance -hood -er -or -ist -ant -ent -ee -ian -ics -ship -ive -able -ful -less -al -ic -ous -ish -y -ing -ly -ize -fy.
- Each: `affix`, `in_form`, `meaning_key` (= affix), `also` (3 other common words with the same affix).
- Removing the affix must leave a real related word (re-ceive is FALSE). Negative prefixes only when the word means the opposite (unnerve is NOT un- + nerve). Empty list is fine.

### `context` and notes

- `context.text`: 2–3 short sentences (≤ 60 words) using at least 2 different existing forms (1 if only one exists), natural, everyday life, Uzbekistan where it fits. `context.uses`: the forms as they appear.
- `reviewer_note`: one line about any trap you handled.

## Phrasal verbs (kind "phrasal"), phrases (kind "phrase") and grammar words (kind "function")

`headword`, `word_id`, `word_ids`, `cefr`, `kind`, `sense_label`, `sense_pos` ("verb" for phrasal; the phrase's function for phrases: noun, verb, adjective, adverb), `corpus_definition`, then:
- phrasal: `particle_note` (separable or not, typical pattern: "give up sugar / give sugar up; give up + -ing").
- phrase and function: `usage_note` (how it's used: "make sure + (that) clause"; "good at + noun / -ing"; "in time for + event").
- `relations`: synonyms + antonyms, same row rules as above (single list).
- `context`: 2–3 sentences that use the item.
- `reviewer_note`.
No forms, people or affixes.

## Style

Plain learner English (A2–B1 words in definitions and notes). Note American/British spelling differences where relevant. Uzbek names and places are welcome in examples. No emojis.

## Check your own work (required)

1. Write the output file and make sure it parses as JSON.
2. Run `python3 /app/deepmode-run/gate_batch.py <your output file>`.
3. Fix every FAIL it prints, then run it again. Up to 3 rounds. Don't chase FLAGs (they go to the human reviewer).
4. Never "fix" a FAIL by deleting a real word or inventing one. If you're sure a FAIL is the gate's mistake, follow the gate-mistake playbook in HANDOFF.md (lexicon supplement or a `gate_overrides` entry with a reason); if neither fits, start that map's `reviewer_note` with "GATE?" and the reason.
5. Reply with: maps written, gate result of the last run, and any GATE? cases.
