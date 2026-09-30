// Skill Intelligence — classifyEvidence, spelling server grading, write-time enrichment.
// DEV ONLY. Plain Node: node tools/skill-intelligence/classify-tests.mjs
import { classifyEvidence, CLASSIFIER_VERSION, STRENGTHS } from "../../base44/shared/skillClassify.js";
import { enrichmentFor } from "../../base44/shared/skillActivityMap.js";
import { gradeWordItem, gradeSpelling, DEFINITION_CLEAR } from "../../base44/shared/progressCore.js";
import { TAXONOMY_VERSION } from "../../base44/shared/skillTaxonomy.js";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const hdr = (t) => console.log(`\n=== ${t} ===`);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SHAPE = ["leaf", "facets", "mode", "level", "support", "verification", "strength"];

const W = (o) => ({ ledger: "WordAttempt", id: "w1", user_email: "a@x", word: "apple", game: "spelling", bank: "typing", correct: true, level: "A2", round_id: "r1", round_at: "2026-09-30T08:00:00.000Z", verification: "server_graded", support: "none", taxonomy_version: 1, ...o });
const G = (o) => ({ ledger: "GrammarAttempt", id: "g1", user_email: "a@x", game: "grammar_practice", item_id: "gpr.tenses.present.simple-routine.b.001", correct: true, level: "A1", round_id: "r2", round_at: "2026-09-30T09:00:00.000Z", verification: "server_graded", ...o });
const AI = (o) => ({ ledger: "AiGradedItem", id: "a1", user_email: "a@x", round_id: "r3", task: "sentence", score: 72, counted: true, round_at: "2026-09-30T10:00:00.000Z", sub_scores: { grammar: 80, relevance: 70, creativity: 66 }, ...o });

/* ------------------------------------------------------------------ */
hdr("1. Classification shape + determinism");
const c = classifyEvidence(W());
ok("returns the architecture shape", SHAPE.every((k) => k in c), Object.keys(c).join(","));
ok("strength vocabulary is fixed", STRENGTHS.includes(c.strength));
ok("stamps taxonomy / map / classifier versions", c.taxonomy_version === TAXONOMY_VERSION && c.activity_map_version === 1 && c.classifier_version === CLASSIFIER_VERSION && c.row_taxonomy_version === 1);
ok("deterministic: same row -> identical output", eq(classifyEvidence(W()), classifyEvidence(W())));
ok("deterministic: key order of the input does not matter", eq(classifyEvidence(W()), classifyEvidence(Object.fromEntries(Object.entries(W()).reverse()))));
ok("pure: input row is not mutated", (() => { const r = W(); const s = JSON.stringify(r); classifyEvidence(r); return JSON.stringify(r) === s; })());
ok("no clock / no randomness in output", !JSON.stringify(c).includes(String(new Date().getFullYear() + 1)));
ok("rejects non-objects", (() => { try { classifyEvidence(null); return false; } catch { return true; } })());

/* ------------------------------------------------------------------ */
hdr("2. Ownership through the classifier");
ok("Spelling -> Orthography › Spelling, construct", eq([c.leaf, c.area, c.mode], ["orthography.spelling", "orthography", "construct"]));
const def = classifyEvidence(W({ game: "definition", bank: undefined, verification: "server_ai" }));
ok("Definition -> Vocabulary › Form & Meaning, produce, verified", eq([def.leaf, def.mode, def.strength], ["vocabulary.form_and_meaning", "produce", "verified"]));
const g = classifyEvidence(G());
ok("grammar practice -> domain leaf + branch facet + stage mode", eq([g.leaf, g.facets.grammar_branch, g.mode, g.strength], ["grammar.tenses", "present", "construct", "verified"]));
const sent = classifyEvidence(AI());
ok("counted sentence grade -> Writing: Sentence, server_ai, credit = score/100, sub-scores kept", eq([sent.leaf, sent.verification, sent.credit, sent.sub_scores.creativity], ["production.writing_sentence", "server_ai", 0.72, 66]));
ok("uncounted sentence grade is not evidence", classifyEvidence(AI({ counted: false })).strength === "none");
ok("definition grade receipt is not evidence (no double count)", classifyEvidence(AI({ task: "definition" })).strength === "none");
ok("crossword is not evidence", classifyEvidence(W({ game: "crossword" })).strength === "none");
ok("unknown game is not evidence", classifyEvidence(W({ game: "zzz" })).reason === "unknown_game");
ok("mode comes from the map even if the row claims another", classifyEvidence(W({ mode: "produce" })).mode === "construct");

/* ------------------------------------------------------------------ */
hdr("3. Client-attested evidence can NEVER become verified");
const att = classifyEvidence(W({ game: "odd_one_out", bank: undefined, verification: "client_attested" }));
ok("client_attested -> strength attested", att.strength === "attested" && att.verification === "client_attested");
ok("attested is not progress- or mastery-eligible", att.eligibility.progress === false && att.eligibility.mastery === false);
ok("attested stays attested even on a server-graded activity (spelling)", classifyEvidence(W({ verification: "client_attested" })).strength === "attested");
ok("attested stays attested even when correct=true and support=none", classifyEvidence(W({ verification: "client_attested", correct: true })).strength === "attested");
ok("missing/unknown verification is NOT treated as verified", ["", undefined, "server", "SERVER_GRADED", "verified"].every((v) => classifyEvidence(W({ verification: v })).strength === "attested"));
ok("legacy RewardEvent is legacy tier, area only, never eligible", (() => { const l = classifyEvidence({ ledger: "RewardEvent", game: "spelling", items_total: 10, items_correct: 7 }); return l.strength === "legacy" && l.leaf === null && l.area === "orthography" && !l.eligibility.progress; })());
ok("VT-6 XP RewardEvent (ledger_version 2) is not evidence", classifyEvidence({ ledger: "RewardEvent", game: "spelling", ledger_version: 2, items_total: 10 }).strength === "none");

/* ------------------------------------------------------------------ */
hdr("4. Targeted vs incidental; retained; unattributed");
ok("primary-leaf evidence is TARGETED and progress/mastery input", c.targeted && c.eligibility.progress && c.eligibility.mastery);
ok("sentence's general-grammar co-measurement stays a sub-score (no incidental leaf)", sent.incidental.length === 0);
ok("retired punctuation bank -> retained (leaf COMING_SOON), never eligible", (() => { const p = classifyEvidence(G({ game: "grammar", item_id: "punctuation:2" })); return p.leaf === "orthography.punctuation" && p.strength === "retained" && !p.eligibility.progress; })());
ok("historic usage row without bank -> unattributed at Vocabulary area", (() => { const u = classifyEvidence(W({ game: "usage", bank: undefined, verification: "client_attested" })); return u.strength === "unattributed" && u.area === "vocabulary" && u.leaf === null; })());
const FX = [{ key: "fx", game: "fx", bank: null, leaf: "vocabulary.collocations_chunks", mode: "recognise", verification: "server_graded", dimensions: ["correct", "form"], coMeasured: [{ dimension: "form", leaf: "vocabulary.form_and_meaning", basis: "fixture" }], retired: false }];
const fxc = classifyEvidence(W({ game: "fx", bank: undefined }), { activities: FX });
ok("co-measured activity keeps ONE primary (targeted) leaf", fxc.leaf === "vocabulary.collocations_chunks" && fxc.targeted && fxc.strength === "verified");
ok("declared co-measurement yields INCIDENTAL evidence on the other leaf", eq(fxc.incidental.map((i) => [i.leaf, i.dimension, i.strength]), [["vocabulary.form_and_meaning", "form", "incidental"]]));
ok("incidental evidence is never progress/mastery-eligible", fxc.incidental.every((i) => !i.eligibility.progress && !i.eligibility.mastery));
ok("support facet: hint recorded, unknown values normalised", classifyEvidence(W({ support: "hint" })).support === "hint" && classifyEvidence(W({ support: "lots" })).support === "unknown");
ok("level facet: known CEFR kept, junk dropped", classifyEvidence(W({ level: "B1" })).level === "B1" && classifyEvidence(W({ level: "Z9" })).level === null);

/* ------------------------------------------------------------------ */
hdr("5. Spelling server grading (gradeWordItem)");
const word = { id: "w", english: "ice-cream" };
ok("correct first attempt -> true", gradeWordItem({ game: "spelling", word, item: { given: "icecream" } }) === true);
ok("wrong first attempt -> false", gradeWordItem({ game: "spelling", word, item: { given: "icecrem" } }) === false);
ok("never-reached word (given \"\") -> false", gradeWordItem({ game: "spelling", word, item: { given: "" } }) === false);
ok("client 'correct' flag is ignored when the server can grade", gradeWordItem({ game: "spelling", word, item: { given: "wrong", correct: true } }) === false);
ok("old client (no given) -> null (stays client-attested, backward compatible)", gradeWordItem({ game: "spelling", word, item: { correct: true } }) === null);
ok("no word_id match -> null", gradeWordItem({ game: "spelling", word: null, item: { given: "x" } }) === null);
ok("same normalisation as the game (letters only, case-insensitive)", gradeSpelling("Ice Cream", "ICECREAM") && gradeWordItem({ game: "spelling", word, item: { given: "Ice-Cream" } }) === true);
ok("definition unchanged: AI score vs DEFINITION_CLEAR", gradeWordItem({ skill: "comprehension", aiScore: DEFINITION_CLEAR }) === true && gradeWordItem({ skill: "comprehension", aiScore: DEFINITION_CLEAR - 1 }) === false && gradeWordItem({ skill: "comprehension" }) === false);
ok("quiz unchanged: option items graded, typed items null", gradeWordItem({ game: "quiz", word: { english: "apple", uzbek: "olma" }, item: { type: "translation", given: "apple" } }) === true
  && gradeWordItem({ game: "quiz", word: { english: "apple" }, item: { type: "define", given: "x" } }) === null);
ok("other vocab games still null (client-attested)", ["odd_one_out", "usage", "wordforms", "picture_match"].every((game) => gradeWordItem({ game, word, item: { given: "x", correct: true } }) === null));

/* ------------------------------------------------------------------ */
hdr("6. Write-time enrichment");
const e = enrichmentFor({ game: "spelling", bank: "typing", support: "hint" });
ok("fields: bank, mode, support, taxonomy_version, activity_map_version", eq(Object.keys(e).sort(), ["activity_map_version", "bank", "mode", "support", "taxonomy_version"]));
ok("values for spelling:typing", eq(e, { bank: "typing", mode: "construct", support: "hint", taxonomy_version: 1, activity_map_version: 1 }));
ok("unknown support -> 'unknown'", enrichmentFor({ game: "spelling", support: "cheat" }).support === "unknown");
ok("practice item mode from item id", enrichmentFor({ game: "grammar_practice", item_id: "gpr.tenses.present.continuous-now.c.001" }).mode === "recognise");
ok("bankless usage has no mode claim it can't make", enrichmentFor({ game: "usage" }).mode === "recognise");
ok("crossword gets no mode", enrichmentFor({ game: "crossword" }).mode === undefined);
ok("bank is length-capped", enrichmentFor({ game: "usage", bank: "x".repeat(100) }).bank.length === 40);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
