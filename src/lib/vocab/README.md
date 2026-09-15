# Vocabulary architecture (src/lib/vocab)

Created 2026-09-15. Five separated concerns, so the corpus can grow from 2,282
words to 10,000+ as **data** rather than as an architecture change.

| Layer | Where it lives | Status |
|---|---|---|
| 1. Master vocabulary | `VocabularyWord` (unchanged) | 2,282 rows, live |
| 2. Enrichment | `WordSense`, `WordRelation` + `enrichment.js`, `relations.js` | empty, falls back to the master row |
| 3. Thematic curriculum | `VocabTheme`, `ThemeWord` + `curriculum.js` | empty, no curriculum published |
| 4. Learner state | `LearnerWordState`, `ThemeProgress` + `learnerState.js`, `themeProgress.js` | empty, `WordAttempt`/`SavedWord` still authoritative |
| 5. Adaptive engine | `adaptive.js` | pure, not yet wired into any game |

## The one rule everything follows

**A word is one record.** `issue` has one `VocabularyWord` row, several
`WordSense` rows, and a `ThemeWord` row per theme that teaches it. Nothing is
ever duplicated to appear in a second theme, and nothing learner-specific is
ever written onto a shared record.

## Identity and backward compatibility

`WordAttempt.word` and `SavedWord.word` are plain English strings and
`roundComposition.js` joins on them. Every new structure therefore keys on
`lemma_key` — `normalizeLemma(VocabularyWord.english)` — alongside `word_id`.
`english` is **not renamed** and its meaning is unchanged, so existing history
resolves with nothing rewritten. `normalizeLemma` is deliberately conservative
(no stemming, no plural stripping): `get in(to)` and `etc.` are real headwords,
and merging distinct entries is the one failure that would corrupt history.

## Degradation is the contract

Every pool path only ever **adds**:

```
theme core + supporting → theme recycled → prerequisite themes → CEFR band pool
```

A thin theme plays slightly off-theme rather than handing a game an unplayable
pool. `MIN_POOL = 40`, Crossword's 4-placeable-word floor and every 4-option MCQ
still hold. Approval gates (`WordSense.approved`, `WordRelation.approved`,
`ThemeWord.approved`) mean an unreviewed AI batch can sit in the table without
reaching a learner.

## Not yet done (next phase)

1. Seed `VocabTheme` rows and run the assignment pass into `ThemeWord`
   (rule-derived first, then AI for the ~247 `general`-tagged and 540
   multi-tagged words, reviewed in batches).
2. Author `WordSense` rows for polysemous words; migrate `synonymTiers.js`'s
   ~170 pilot ladders into `WordRelation`.
3. Backfill `LearnerWordState` from existing `WordAttempt` history with
   `rebuildFromAttempts()`, then call `recordRound()` alongside the existing
   `logWordAttempts()`.
4. Wire `planPractice()` into `SkillHub.jsx` behind a flag; games keep receiving
   a plain `words` array, so no engine changes.
5. Theme map UI and mastery board.