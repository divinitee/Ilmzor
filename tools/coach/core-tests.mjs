// Coach Engine — Stage 1 tests (pure core, policies, graph, engine backfill on
// an in-memory store). No Base44, no network.
//   node --experimental-strip-types tools/coach/core-tests.mjs
import { readFileSync } from "node:fs";
import {
  resolveWordItem, grammarItemFor, baseWeight, evidenceFromLedgers, effectiveWeights,
  deriveItemState, deriveLearnerItems, canonicalItem, dayOf, isResolved, LABELS,
} from "../../base44/shared/coachCore.js";
import { POLICIES, PERSONAS, resolveCoach, entitlementOf, needsHandoff, weightSum } from "../../base44/shared/coachPolicies.js";
import { LIVE_GRAMMAR_TOPICS, PREREQUISITES, GOALS, goalOf, onPath, goalRelevance, unlockCount, prerequisitesOf } from "../../base44/shared/coachGraph.js";
import { PRACTICE_KEYS } from "../../base44/shared/grammarKeys.js";
import { backfillLearner, verifyLearner } from "../../base44/shared/coachEngine.ts";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const hdr = (t) => console.log(`\n=== ${t} ===`);
const at = (d, h = 8) => `2026-10-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00.000Z`;

/* ------------------------------------------------------------------ */
hdr("1. Sense-aware item keys");
{
  const maps = { senseIndexes: new Map([["bank", [0, 1]], ["iron", [1]]]), wordIdsByLemma: new Map([["happy", ["w-happy"]], ["light", ["l1", "l2"]]]) };
  ok("sense_id wins", resolveWordItem({ sense_id: "bank:1", word_id: "bank" }, maps).item_key === "word:bank:1");
  ok("multi-sense word without a sense is NOT guessed", resolveWordItem({ word_id: "bank", word: "bank" }, maps).item_key === "word:bank:*");
  ok("one approved sense resolves to that sense's index", resolveWordItem({ word_id: "iron" }, maps).item_key === "word:iron:1");
  ok("no WordSense rows -> the one meaning the word row defines (:0)", resolveWordItem({ word_id: "w9" }, maps).item_key === "word:w9:0");
  ok("lemma with exactly one word row resolves", resolveWordItem({ word: " Happy " }, maps).item_key === "word:w-happy:0");
  ok("ambiguous lemma stays unresolved", resolveWordItem({ word: "light" }, maps).item_key === "word:lemma:light:*");
  ok("nothing to resolve -> null", resolveWordItem({}, maps) === null);
  ok("isResolved", isResolved("word:w9:0") && !isResolved("word:bank:*"));
  ok("grammar practice topic key", grammarItemFor({ game: "grammar_practice", grammar_topic: "tenses.present.simple-routine" }).item_key === "grammar:tenses.present.simple-routine");
  ok("hub quiz bank key", grammarItemFor({ game: "grammar", item_id: "punctuation:3" }).item_key === "grammar:hub.punctuation");
}

/* ------------------------------------------------------------------ */
hdr("2. Evidence quality");
{
  ok("server produce, no hint = 1.0", baseWeight({ attestation: "server_graded", mode: "produce" }) === 1);
  ok("client recognise = 0.36", baseWeight({ attestation: "client_attested", mode: "recognise" }) === 0.36);
  ok("hint halves", baseWeight({ attestation: "server_graded", mode: "construct", hints_used: 2 }) === 0.4);
  ok("incidental x0.3", baseWeight({ attestation: "server_graded", mode: "produce", context: "incidental" }) === 0.3);
  const rows = [
    { ledger: "WordAttempt", word_id: "w1", word: "cat", correct: true, round_id: "r1", round_at: at(1), verification: "client_attested", mode: "recognise", support: "none" },
    { ledger: "WordAttempt", word_id: "w1", word: "cat", correct: false, round_id: "r1", round_at: at(1), verification: "client_attested", mode: "recognise", support: "hint" },
    { ledger: "WordAttempt", word_id: "w2", word: "dog", correct: true, round_id: "r1", round_at: at(1), verification: "server_graded", mode: "produce", support: "none" },
    { ledger: "WordAttempt", word: "(quiz item)", correct: true, round_id: "q1", round_at: at(1) },
    { ledger: "GrammarAttempt", game: "grammar_practice", grammar_topic: "tenses.present.simple-routine", correct: true, round_id: "g1", round_at: at(2), verification: "server_graded", mode: "construct" },
    { ledger: "GrammarAttempt", game: "grammar_practice", grammar_topic: "tenses.present.simple-routine", correct: false, round_id: "g1", round_at: at(2), verification: "server_graded", mode: "construct" },
  ];
  const ev = evidenceFromLedgers(rows);
  ok("one evidence row per item per round (count-only quiz rows skipped)", ev.length === 3, JSON.stringify(ev.map((e) => e.item_key)));
  const cat = ev.find((e) => e.item_key === "word:w1:0");
  ok("items/correct/hints aggregated", cat.items === 2 && cat.correct === 1 && cat.hints_used === 1);
  ok("weight uses the hint", cat.weight === 0.18);
  ok("game rows are source game, context target, FSRS untouched", ev.every((e) => e.context === "target" && e.moved_fsrs === undefined) && cat.source === "game");
  ok("grammar practice source", ev.find((e) => e.item_type === "grammar").source === "grammar_practice");
  ok("evidence is order-independent", JSON.stringify(evidenceFromLedgers([...rows].reverse())) === JSON.stringify(ev));
  const legacy = evidenceFromLedgers([{ ledger: "GrammarAttempt", game: "grammar_practice", grammar_topic: "tenses.present.continuous-negative", item_id: "gpr.tenses.present.continuous-negative.transform.013", correct: true, round_id: "old", round_at: at(1), verification: "server_graded" }]);
  ok("pre-enrichment rows get their mode from the activity map (transform = construct)", legacy[0].mode === "construct" && legacy[0].weight === 0.8, JSON.stringify(legacy[0]));
}

/* ------------------------------------------------------------------ */
hdr("3. Diminishing returns + client cap");
{
  const E = (o) => ({ item_type: "word", item_key: "word:w1:0", items: 5, correct: 5, attestation: "server_graded", weight: 1, ...o });
  const same = effectiveWeights([E({ round_id: "a", at: at(3, 8) }), E({ round_id: "b", at: at(3, 9) }), E({ round_id: "c", at: at(3, 10) })]);
  ok("k-th same-day round x0.5^(k-1)", same.map((e) => e.w_eff).join() === "1,0.5,0.25");
  const client = effectiveWeights(Array.from({ length: 8 }, (_, i) => E({ round_id: `c${i}`, at: at(3, 8 + i), attestation: "client_attested", weight: 0.6 })));
  ok("client-attested capped at 1.0 per item per day", Math.abs(client.reduce((s, e) => s + e.w_eff, 0) - 1.0) < 1e-9 || client.reduce((s, e) => s + e.w_eff, 0) <= 1.0);
  ok("next day starts fresh", effectiveWeights([E({ round_id: "x", at: at(3) }), E({ round_id: "y", at: at(4) })]).every((e) => e.w_eff === 1));
  ok("days are Tashkent days (19:30 UTC = next day)", dayOf(Date.parse("2026-10-03T19:30:00Z")) === "2026-10-04");
}

/* ------------------------------------------------------------------ */
hdr("4. Learner state");
{
  const E = (o) => ({ item_type: "grammar", item_key: "grammar:t", items: 5, attestation: "server_graded", mode: "construct", weight: 0.8, ...o });
  ok("no evidence = unknown (label New)", deriveItemState([]).learning_state === "unknown" && LABELS.unknown === "New");
  ok("low accuracy = weak", deriveItemState([E({ round_id: "1", at: at(1), correct: 2 })]).learning_state === "weak");
  ok("two bad rounds in a row = weak even after good history", deriveItemState([E({ round_id: "1", at: at(1), correct: 5 }), E({ round_id: "2", at: at(2), correct: 5 }), E({ round_id: "3", at: at(3), correct: 1 }), E({ round_id: "4", at: at(4), correct: 2 })]).learning_state === "weak");
  ok("one great day = learning, not solid", deriveItemState([E({ round_id: "1", at: at(1), correct: 5 })]).learning_state === "learning");
  const solid = deriveItemState([E({ round_id: "1", at: at(1), correct: 5 }), E({ round_id: "2", at: at(2), correct: 4 })]);
  ok("80%+ on 2 days = solid (label Strong)", solid.learning_state === "solid" && solid.solid_days === 2 && LABELS.solid === "Strong");
  // Anti-gaming: 20 perfect client-attested rounds in ONE day.
  const spam = Array.from({ length: 20 }, (_, i) => ({ item_type: "word", item_key: "word:w1:0", items: 5, correct: 5, attestation: "client_attested", mode: "recognise", weight: 0.36, round_id: `s${i}`, at: at(5, 8) }));
  const s = deriveItemState(spam);
  ok("same-day spam cannot reach Strong", s.learning_state !== "solid", s.learning_state);
  ok("same-day spam keeps confidence low", s.confidence === "low", s.confidence);
  ok("same-day spam total weight is capped", s.evidence_weight <= 1.0, String(s.evidence_weight));
  const steady = Array.from({ length: 4 }, (_, i) => E({ round_id: `d${i}`, at: at(1 + i), correct: 5, weight: 1 }));
  ok("confidence grows across days", deriveItemState(steady).confidence === "high");
  const items = deriveLearnerItems([...spam, ...steady]);
  ok("derive per item, sorted, deterministic", items.length === 2 && JSON.stringify(deriveLearnerItems([...steady, ...spam].reverse()).map(canonicalItem)) === JSON.stringify(items.map(canonicalItem)));
}

/* ------------------------------------------------------------------ */
hdr("5. Layer rules");
{
  const core = readFileSync(new URL("../../base44/shared/coachCore.js", import.meta.url), "utf8");
  ok("coachCore (facts) imports no policy or persona", !/coachPolicies|PERSONA|persona/.test(core.replace(/\/\/.*$/gm, "")));
  ok("no policy object contains a persona", Object.values(POLICIES).every((p) => !("persona" in p)));
  ok("every policy's weights sum to 1", Object.values(POLICIES).every((p) => weightSum(p) === 1), Object.values(POLICIES).map(weightSum).join());
  ok("review cap is policy, not core", Object.values(POLICIES).every((p) => typeof p.limits.maxReviewRatio === "number") && !/maxReviewRatio/.test(core));
  ok("VI launches with 1 goal and bounded extra rounds", POLICIES.vi.limits.activeGoals === 1 && Number.isInteger(POLICIES.vi.limits.extraRoundsPerDay));
}

/* ------------------------------------------------------------------ */
hdr("6. Entitlement -> coach (server-side resolution)");
{
  const NOW = Date.parse("2026-10-08T10:00:00Z");
  const free = resolveCoach({ status: "active", plan: "Free Plan" }, NOW);
  ok("free -> Vira policy + Vira persona", free.entitlement === "free" && free.policy.id === "vira" && free.persona.id === "vira");
  const trial = resolveCoach({ status: "active", plan: "Learner Plan", is_trial: true, expires_at: "2026-10-10" }, NOW);
  ok("trial -> Velvet policy + Vira persona, Velvet only as conversion persona", trial.entitlement === "trial" && trial.policy.id === "velvet" && trial.persona.id === "vira" && trial.conversionPersona.id === "velvet");
  ok("trial gets no Telegram", trial.policy.capabilities.telegram === "none" && POLICIES.velvet.capabilities.telegram === "nudge");
  const expired = resolveCoach({ status: "active", plan: "Learner Plan", is_trial: true, expires_at: "2026-10-01" }, NOW);
  ok("an ended trial resolves to free", expired.entitlement === "free");
  ok("Learner -> Velvet", resolveCoach({ status: "active", plan: "Learner Plan", expires_at: "2026-11-01" }, NOW).coach === "velvet");
  ok("VIP -> VI", resolveCoach({ status: "active", plan: "VIP Plan", expires_at: "2026-11-01" }, NOW).coach === "vi");
  ok("cancelled / paused / none -> free", ["cancelled", "paused"].every((s) => entitlementOf({ status: s, plan: "VIP Plan" }, NOW) === "free") && entitlementOf(null, NOW) === "free");
  ok("handoff on entitlement change only", needsHandoff("learner", "vip") && !needsHandoff("learner", "learner") && !needsHandoff(null, "free"));
  ok("personas are separate config", Object.keys(PERSONAS).join() === "vira,velvet,vi");
}

/* ------------------------------------------------------------------ */
hdr("7. Goal graph");
{
  ok("live topics == grammarKeys PRACTICE_KEYS", JSON.stringify([...LIVE_GRAMMAR_TOPICS].sort()) === JSON.stringify(Object.keys(PRACTICE_KEYS).sort()), Object.keys(PRACTICE_KEYS).join());
  ok("prerequisite edges only use live topics", PREREQUISITES.flat().every((k) => LIVE_GRAMMAR_TOPICS.includes(k.replace(/^grammar:/, ""))));
  ok("unlock count is transitive", unlockCount(goalOf("grammar_basics"), "grammar:tenses.present.simple-routine") === 2);
  ok("prerequisitesOf", prerequisitesOf(goalOf("everyday"), "grammar:tenses.present.simple-negative")[0] === "grammar:tenses.present.third-person-s");
  ok("hub quiz banks are never on a goal path", !onPath(GOALS.everyday, "grammar:hub.punctuation") && onPath(GOALS.everyday, "grammar:tenses.present.simple-routine"));
  ok("goal relevance from data", goalRelevance(GOALS.vocabulary, "word:w1:0") === 0.8 && goalRelevance(GOALS.vocabulary, "grammar:tenses.present.x") === 0);
  ok("unknown goal id falls back to the default", goalOf("nope").id === "everyday");
}

/* ------------------------------------------------------------------ */
hdr("8. Engine: backfill + verify on an in-memory store");
{
  const NOW = Date.parse("2026-10-08T10:00:00Z");
  const tables = {};
  const match = (row, q) => Object.entries(q).every(([k, v]) => (v && typeof v === "object" && !Array.isArray(v)) ? ("$in" in v ? v.$in.includes(row[k]) : "$exists" in v ? (row[k] != null) === v.$exists : false) : row[k] === v);
  const entity = (name) => {
    tables[name] = tables[name] || [];
    const t = tables[name]; let n = 0;
    return {
      async filter(q, sort, limit = 50, skip = 0) { return t.filter((r) => match(r, q)).slice(skip, skip + limit).map((r) => ({ ...r })); },
      async create(o) { const r = { id: `${name}-${++n}`, created_date: new Date(NOW).toISOString(), ...o }; t.push(r); return { ...r }; },
      async bulkCreate(list) { return Promise.all(list.map((o) => this.create(o))); },
      async update(id, o) { Object.assign(t.find((x) => x.id === id), o); },
      async delete(id) { t.splice(t.findIndex((x) => x.id === id), 1); },
    };
  };
  const svc = {};
  for (const e of ["WordAttempt", "GrammarAttempt", "VocabularyWord", "WordSense", "ItemEvidence", "LearnerItem"]) svc[e] = entity(e);
  tables.VocabularyWord.push({ id: "v-run", english: "run" }, { id: "v-bank", english: "bank" });
  tables.WordSense.push({ word_id: "v-bank", sense_index: 0, approved: true }, { word_id: "v-bank", sense_index: 1, approved: true });
  const W = (o) => ({ id: `wa${Math.random()}`, user_email: "a@x", game: "usage", mode: "recognise", verification: "client_attested", support: "none", ...o });
  tables.WordAttempt.push(
    W({ word: "run", correct: true, round_id: "r1", round_at: at(1) }), W({ word: "run", correct: true, round_id: "r2", round_at: at(2) }),
    W({ word_id: "v-bank", word: "bank", correct: true, round_id: "r1", round_at: at(1) }),
    W({ word: "caught", correct: false, round_id: "r2", round_at: at(2) }),
    W({ user_email: "b@x", word: "run", correct: false, round_id: "rb", round_at: at(2) }),
  );
  tables.GrammarAttempt.push({ id: "ga1", user_email: "a@x", game: "grammar_practice", grammar_topic: "tenses.present.simple-routine", correct: true, round_id: "g1", round_at: at(3), verification: "server_graded", mode: "construct" });
  const ledgersBefore = JSON.stringify(tables.WordAttempt) + JSON.stringify(tables.GrammarAttempt);

  const dry = await backfillLearner(svc, "a@x", { dryRun: true });
  ok("dry run writes nothing", dry.dryRun && tables.ItemEvidence.length === 0 && tables.LearnerItem.length === 0);
  ok("dry run reports items + unresolved", dry.items === 4 && dry.unresolved === 2, JSON.stringify(dry));
  const r1 = await backfillLearner(svc, "a@x");
  ok("backfill writes evidence + one item per key", r1.evidenceAdded === 5 && tables.LearnerItem.length === 4, JSON.stringify(r1));
  ok("multi-sense 'bank' stays unresolved (word:v-bank:*)", tables.LearnerItem.some((r) => r.item_key === "word:v-bank:*"));
  ok("lemma 'run' resolved via VocabularyWord", tables.LearnerItem.some((r) => r.item_key === "word:v-run:0"));
  ok("no FSRS fields written by game evidence", tables.LearnerItem.every((r) => r.due === undefined && r.stability === undefined) && tables.ItemEvidence.every((e) => e.moved_fsrs === false));
  ok("other learners untouched", tables.LearnerItem.every((r) => r.user_email === "a@x"));
  const r2 = await backfillLearner(svc, "a@x");
  ok("idempotent: second run adds no evidence, no new items", r2.evidenceAdded === 0 && tables.LearnerItem.length === 4 && tables.ItemEvidence.length === 5);
  ok("verify: deterministic, no mismatches, no duplicates", (await verifyLearner(svc, "a@x")).mismatches.length === 0);
  tables.LearnerItem.push({ ...tables.LearnerItem[0], id: "dup" });
  ok("verify reports duplicates", (await verifyLearner(svc, "a@x")).duplicates === 1);
  const r3 = await backfillLearner(svc, "a@x");
  ok("backfill merges duplicates", r3.merged === 1 && tables.LearnerItem.length === 4);
  ok("game ledgers never modified", JSON.stringify(tables.WordAttempt) + JSON.stringify(tables.GrammarAttempt) === ledgersBefore);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
