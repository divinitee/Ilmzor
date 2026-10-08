// Coach Engine — Stage 1 + Stage 2 tests: facts, FSRS boundary, decision engine,
// planner invariants, policies, goal graph, and the DB engine on an in-memory store
// (idempotency, isolation, snapshots, handoff, continuation, shadow). No network.
//   cd tools/coach && npm i   (installs ts-fsrs for tests only)
//   node --experimental-strip-types tools/coach/core-tests.mjs
import { readFileSync } from "node:fs";
import * as tsfsrs from "ts-fsrs";
import {
  resolveWordItem, grammarItemFor, baseWeight, evidenceFromLedgers, effectiveWeights,
  deriveItemState, deriveItem, deriveLearnerItems, canonicalItem, dayOf, isResolved, LABELS,
  replayFsrs, ratingFor, ENGINE_VERSION,
} from "../../base44/shared/coachCore.js";
import { rankCandidates, planSession, planToday, DEPTHS, PLAN_VERSION } from "../../base44/shared/coachPlan.js";
import { POLICIES, PERSONAS, resolveCoach, entitlementOf, needsHandoff, weightSum, minutesFor } from "../../base44/shared/coachPolicies.js";
import { GRAPH_VERSION, LIVE_GRAMMAR_TOPICS, PREREQUISITES, GOALS, goalOf, onPath, goalRelevance, unlockCount, prerequisitesOf } from "../../base44/shared/coachGraph.js";
import { PRACTICE_KEYS } from "../../base44/shared/grammarKeys.js";
import { ENGINE_STAMP, backfillLearner, verifyLearner, applyRound, getToday, startContinuation, ackHandoff, saveProfile, getMap, shadowLearner } from "../../base44/shared/coachEngine.ts";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const hdr = (t) => console.log(`\n=== ${t} ===`);
const at = (d, h = 8) => `2026-10-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00.000Z`;
const NOW = Date.parse("2026-10-08T07:00:00.000Z"); // 12:00 in Tashkent
const DAY = 86400000;
const deps = { fsrsLib: tsfsrs };
const G = (k) => `grammar:tenses.present.${k}`;

/* ------------------------------------------------------------------ */
hdr("1. Sense-aware identity");
{
  const maps = { senseIndexes: new Map([["bank", [0, 1]], ["iron", [1]]]), wordIdsByLemma: new Map([["happy", ["w-happy"]], ["light", ["l1", "l2"]]]) };
  ok("sense_id wins", resolveWordItem({ sense_id: "bank:1", word_id: "bank" }, maps).item_key === "word:bank:1");
  ok("multi-sense word without a sense is NOT guessed", resolveWordItem({ word_id: "bank", word: "bank" }, maps).item_key === "word:bank:*");
  ok("one approved sense resolves to that index", resolveWordItem({ word_id: "iron" }, maps).item_key === "word:iron:1");
  ok("no WordSense rows -> :0", resolveWordItem({ word_id: "w9" }, maps).item_key === "word:w9:0");
  ok("lemma with exactly one word row resolves", resolveWordItem({ word: " Happy " }, maps).item_key === "word:w-happy:0");
  ok("ambiguous lemma stays unresolved", resolveWordItem({ word: "light" }, maps).item_key === "word:lemma:light:*");
  const ev = [
    { item_type: "word", item_key: "word:bank:*", round_id: "r1", at: at(1), items: 3, correct: 3, attestation: "server_graded", weight: 1 },
    { item_type: "word", item_key: "word:lemma:light:*", round_id: "r1", at: at(1), items: 3, correct: 3, attestation: "server_graded", weight: 1 },
    { item_type: "word", item_key: "word:w9:0", round_id: "r1", at: at(1), items: 3, correct: 3, attestation: "server_graded", weight: 1 },
  ];
  const items = deriveLearnerItems(ev, tsfsrs);
  ok("unresolved evidence never becomes a LearnerItem", items.length === 1 && items[0].item_key === "word:w9:0");
  ok("grammar keys", grammarItemFor({ game: "grammar_practice", grammar_topic: "tenses.present.simple-routine" }).item_key === G("simple-routine") && grammarItemFor({ game: "grammar", item_id: "punctuation:3" }).item_key === "grammar:hub.punctuation");
}

/* ------------------------------------------------------------------ */
hdr("2. Evidence weighting: multipliers -> same-day decay -> client cap");
{
  ok("client x recognise x hint = 0.18", baseWeight({ attestation: "client_attested", mode: "recognise", hints_used: 1 }) === 0.18);
  ok("server produce = 1.0; incidental x0.3", baseWeight({ attestation: "server_graded", mode: "produce" }) === 1 && baseWeight({ attestation: "server_graded", mode: "produce", context: "incidental" }) === 0.3);
  const E = (o) => ({ item_type: "word", item_key: "word:w1:0", items: 5, correct: 5, attestation: "server_graded", weight: 1, ...o });
  ok("repeated same-day evidence decays x0.5^(k-1)", effectiveWeights([E({ round_id: "a", at: at(3, 8) }), E({ round_id: "b", at: at(3, 9) }), E({ round_id: "c", at: at(3, 10) })]).map((e) => e.w_eff).join() === "1,0.5,0.25");
  const client = effectiveWeights(Array.from({ length: 8 }, (_, i) => E({ round_id: `c${i}`, at: at(3, 8 + i), attestation: "client_attested", weight: 0.6 })));
  const total = client.reduce((s, e) => s + e.w_eff, 0);
  ok("client daily cap: contribution <= 1.0 per item per day", total <= 1.0 + 1e-9 && total >= 0.99, String(total));
  ok("next day starts fresh", effectiveWeights([E({ round_id: "x", at: at(3) }), E({ round_id: "y", at: at(4) })]).every((e) => e.w_eff === 1));
  ok("Tashkent day boundary", dayOf(Date.parse("2026-10-03T19:30:00Z")) === "2026-10-04");
  const legacy = evidenceFromLedgers([{ ledger: "GrammarAttempt", game: "grammar_practice", grammar_topic: "tenses.present.continuous-negative", item_id: "gpr.tenses.present.continuous-negative.transform.013", correct: true, round_id: "old", round_at: at(1), verification: "server_graded" }]);
  ok("pre-enrichment rows get mode from the activity map", legacy[0].mode === "construct" && legacy[0].weight === 0.8);
  ok("count-only quiz rows stay outside the coach", evidenceFromLedgers([{ ledger: "WordAttempt", word: "(quiz item)", correct: true, round_id: "q" }]).length === 0);
}

/* ------------------------------------------------------------------ */
hdr("3. Learner state");
{
  const E = (o) => ({ item_type: "grammar", item_key: "grammar:t", items: 5, attestation: "server_graded", mode: "construct", weight: 0.8, ...o });
  ok("low accuracy = weak", deriveItemState([E({ round_id: "1", at: at(1), correct: 2 })]).learning_state === "weak");
  ok("two bad rounds in a row = weak", deriveItemState([E({ round_id: "1", at: at(1), correct: 5 }), E({ round_id: "2", at: at(2), correct: 5 }), E({ round_id: "3", at: at(3), correct: 1 }), E({ round_id: "4", at: at(4), correct: 2 })]).learning_state === "weak");
  ok("one great day = learning", deriveItemState([E({ round_id: "1", at: at(1), correct: 5 })]).learning_state === "learning");
  ok("80%+ on 2 days = solid (Strong)", deriveItemState([E({ round_id: "1", at: at(1), correct: 5 }), E({ round_id: "2", at: at(2), correct: 4 })]).learning_state === "solid" && LABELS.solid === "Strong");
  const spam = Array.from({ length: 20 }, (_, i) => ({ item_type: "word", item_key: "word:w1:0", items: 5, correct: 5, attestation: "client_attested", mode: "recognise", weight: 0.36, round_id: `s${i}`, at: at(5, 8) }));
  const s = deriveItemState(spam);
  ok("same-day client spam: not Strong, confidence low, weight capped", s.learning_state !== "solid" && s.confidence === "low" && s.evidence_weight <= 1);
  const dup = [E({ round_id: "1", at: at(1), correct: 5 }), E({ round_id: "1", at: at(1), correct: 5 }), E({ round_id: "2", at: at(2), correct: 4 })];
  ok("duplicated rows never count twice", deriveItem(dup, tsfsrs).rounds === 2);
  ok("order-independent", canonicalItem(deriveItem(dup, tsfsrs)) === canonicalItem(deriveItem([...dup].reverse(), tsfsrs)));
}

/* ------------------------------------------------------------------ */
hdr("4. FSRS boundary (WHEN only)");
{
  const C = (o) => ({ item_type: "grammar", item_key: G("simple-routine"), items: 5, correct: 5, attestation: "server_graded", mode: "construct", weight: 0.8, context: "target", ...o });
  ok("rating rules", ratingFor({ items: 10, correct: 4 }) === "again" && ratingFor({ items: 10, correct: 6 }) === "hard" && ratingFor({ items: 10, correct: 9 }) === "good" && ratingFor({ items: 5, correct: 5, hints_used: 1 }) === "good" && ratingFor({ items: 5, correct: 5 }) === "easy");
  ok("normal game evidence never advances FSRS", replayFsrs([C({ source: "game", round_id: "g", at: at(5) })], tsfsrs).card === null && deriveItem([C({ source: "game", round_id: "g", at: at(5) })], tsfsrs).due === undefined);
  ok("incidental coach evidence never advances FSRS", replayFsrs([C({ source: "coach_session", context: "incidental", round_id: "i", at: at(5) })], tsfsrs).card === null);
  const one = deriveItem([C({ source: "coach_session", round_id: "c1", at: at(5, 8) })], tsfsrs);
  ok("coach-targeted evidence advances FSRS", one.reps === 1 && Date.parse(one.due) > Date.parse(at(5, 8)) && one.fsrs_last_day === "2026-10-05", JSON.stringify(one));
  const twice = deriveItem([C({ source: "coach_session", round_id: "c1", at: at(5, 8) }), C({ source: "coach_session", round_id: "c2", at: at(5, 10), correct: 1 })], tsfsrs);
  ok("second FSRS transition the same day is blocked", twice.reps === 1 && twice.due === one.due);
  const nextDay = deriveItem([C({ source: "coach_session", round_id: "c1", at: at(5, 8) }), C({ source: "coach_session", round_id: "c3", at: at(7, 8) })], tsfsrs);
  ok("next day moves it again", nextDay.reps === 2);
  ok("unresolved never gets FSRS", replayFsrs([C({ item_key: "word:w:*", source: "coach_session", round_id: "u", at: at(5) })], tsfsrs).card === null);
}

/* ------------------------------------------------------------------ */
hdr("5. Decision engine + planner");
const goal = GOALS.everyday;
const IT = (key, state, o = {}) => ({ item_type: key.startsWith("word") ? "word" : "grammar", item_key: key, learning_state: state, confidence: "low", weighted_accuracy: state === "weak" ? 0.4 : state === "solid" ? 0.9 : 0.7, ...o });
const ago = (days) => new Date(NOW - days * DAY).toISOString();
{
  const P = POLICIES.velvet;
  const probe = planToday({ items: [], newCandidates: [{ item_type: "grammar", item_key: G("simple-routine") }, { item_type: "grammar", item_key: G("continuous-negative") }], goal, policy: P, minutes: 10, now: NOW });
  const first = probe.explanation[0];
  ok("Unknown -> probe (5 questions, 2 min, 'New')", first.depth === "probe" && first.est_minutes === 2 && first.questions === 5 && first.short_reason === "New");
  ok("frontier: a new topic waits for its prerequisite", !probe.explanation.some((e) => e.item_key === G("continuous-negative")));

  const rep = rankCandidates({ items: [IT(G("third-person-s"), "weak"), IT(G("simple-negative"), "learning", { due: ago(1), scheduled_days: 3 })], goal, policy: P, now: NOW });
  const r0 = rep.find((c) => c.it.item_key === G("third-person-s"));
  ok("weak prerequisite replaces the dependent item", r0 && r0.reasons.includes(`prerequisite_for:${G("simple-negative")}`) && !rep.some((c) => c.it.item_key === G("simple-negative")), JSON.stringify(rep.map((c) => [c.it.item_key, c.reasons])));

  const due = rankCandidates({ items: [IT("word:a:0", "learning", { due: ago(0.05), scheduled_days: 4 })], goal, policy: P, now: NOW })[0];
  ok("due item -> review bucket, practice depth", due.bucket === "review" && due.depth === "practice" && due.reasons.includes("due"));
  const od = rankCandidates({ items: [IT("word:a:0", "solid", { due: ago(0.05), scheduled_days: 4, confidence: "high" }), IT("word:b:0", "solid", { due: ago(4), scheduled_days: 4, confidence: "high" })], goal, policy: P, now: NOW });
  ok("overdue outranks just-due", od[0].it.item_key === "word:b:0" && od[0].features.urgency === 1 && od[1].features.urgency < 0.1);
  const lc = rankCandidates({ items: [IT("word:a:0", "learning", { confidence: "high" }), IT("word:b:0", "learning", { confidence: "low" })], goal, policy: P, now: NOW });
  ok("low confidence raises priority", lc[0].it.item_key === "word:b:0" && lc[0].features.uncertainty === 1 && lc[0].reasons.includes("low_confidence"));
  ok("done today is gated out", rankCandidates({ items: [IT("word:a:0", "weak")], goal, policy: P, now: NOW, doneToday: new Set(["word:a:0"]) }).length === 0);
  ok("no playable content is gated out", rankCandidates({ items: [IT(G("past-simple"), "weak")], goal, policy: P, now: NOW, hasContent: (k) => k !== G("past-simple") }).length === 0);

  // Planner invariant: property test over random learners.
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const states = ["weak", "learning", "solid"];
  let worst = 0, revBreach = 0, scenarios = 0;
  for (let s = 0; s < 400; s++) {
    const n = Math.floor(rnd() * 40);
    const items = Array.from({ length: n }, (_, i) => IT(`word:w${i}:0`, states[Math.floor(rnd() * 3)], { confidence: ["low", "medium", "high"][Math.floor(rnd() * 3)], due: rnd() < 0.5 ? ago(rnd() * 6) : undefined, scheduled_days: 1 + Math.floor(rnd() * 10) }));
    const newCandidates = Array.from({ length: Math.floor(rnd() * 10) }, (_, i) => ({ item_type: "word", item_key: `word:n${i}:0` }));
    for (const pol of Object.values(POLICIES)) for (const minutes of pol.limits.minutesOptions) {
      const p = planToday({ items, newCandidates, goal, policy: pol, minutes, now: NOW });
      const sum = p.explanation.reduce((a, e) => a + e.est_minutes, 0);
      const rev = p.explanation.filter((e) => e.bucket === "review").reduce((a, e) => a + e.est_minutes, 0);
      worst = Math.max(worst, sum - minutes);
      if (p.fallback !== "maintenance" && rev > pol.limits.maxReviewRatio * minutes + 1e-9) revBreach++;
      if (sum !== p.minutes_planned) worst = Infinity;
      scenarios++;
    }
  }
  ok(`planner never exceeds the budget (${scenarios} scenarios)`, worst <= 0, String(worst));
  ok("reviews never exceed the policy's review cap", revBreach === 0, String(revBreach));
  const allRev = planSession(rankCandidates({ items: [IT("word:a:0", "learning", { due: ago(1) }), IT("word:b:0", "learning", { due: ago(1) }), IT("word:c:0", "weak")], goal, policy: POLICIES.vira, now: NOW }), { policy: POLICIES.vira, minutes: 10 });
  ok("at least one non-review item when one fits", allRev.queue.some((c) => c.bucket !== "review") && allRev.minutes_planned <= 10);
  const none = planToday({ items: [], newCandidates: [], goal, policy: POLICIES.vira, minutes: 10, now: NOW });
  ok("no useful content -> 'goal complete for now' + suggestion", none.explanation.length === 0 && none.fallback === "goal_complete" && none.suggestion === "choose_another_goal");
  const later = new Date(NOW + 5 * DAY).toISOString();
  const maint = planToday({ items: [IT("word:a:0", "solid", { stability: 9, due: later, reps: 2 }), IT("word:b:0", "solid", { stability: 2, due: later, reps: 2 })], newCandidates: [], goal, policy: POLICIES.vira, minutes: 10, now: NOW });
  ok("nothing due/weak/new -> maintenance review, lowest stability first", maint.fallback === "maintenance" && maint.explanation[0].item_key === "word:b:0" && maint.explanation[0].depth === "brushup");
  const p1 = planToday({ items: [IT("word:a:0", "weak")], newCandidates: [], goal, policy: POLICIES.velvet, minutes: 10, now: NOW });
  const p2 = planToday({ items: [IT("word:a:0", "weak")], newCandidates: [], goal, policy: POLICIES.velvet, minutes: 10, now: NOW });
  ok("plans are deterministic (same hash)", p1.plan_hash === p2.plan_hash);
  const fc = rankCandidates({ items: [IT("word:g:0", "learning")], goal, policy: P, now: NOW })[0];
  ok("game-learned item with no FSRS card is due for a first coach check", fc.bucket === "review" && fc.reasons.includes("first_check"));
  const mixed = planSession(rankCandidates({ items: [...Array.from({ length: 6 }, (_, i) => IT(`word:r${i}:0`, "learning", { due: ago(1), reps: 1 })), IT("word:w:0", "weak")], newCandidates: [{ item_type: "word", item_key: "word:n:0" }], goal, policy: POLICIES.vira, now: NOW }), { policy: POLICIES.vira, minutes: 10 });
  ok("reviews leave room for one remediation and one probe", mixed.queue.some((c) => c.bucket === "remediate") && mixed.queue.some((c) => c.bucket === "new") && mixed.minutes_planned <= 10, mixed.queue.map((c) => c.bucket).join());
  ok("explanation carries features, reasons, policy version", p1.explanation[0].features && p1.explanation[0].reasons.length && p1.explanation[0].policy === "velvet@2");
}

/* ------------------------------------------------------------------ */
hdr("6. Policies, personas, entitlement (P1 final)");
{
  ok("Vira: 10 min, 0 continuations", POLICIES.vira.limits.minutesOptions.join() === "10" && POLICIES.vira.limits.continuationSessionsPerDay === 0);
  ok("Velvet: 10/15/20, 1 continuation, goal switching", POLICIES.velvet.limits.minutesOptions.join() === "10,15,20" && POLICIES.velvet.limits.continuationSessionsPerDay === 1 && POLICIES.velvet.limits.goalSwitching);
  ok("VI: 15/20/25, 2 continuations, 1 goal at launch", POLICIES.vi.limits.minutesOptions.join() === "15,20,25" && POLICIES.vi.limits.continuationSessionsPerDay === 2 && POLICIES.vi.limits.activeGoals === 1);
  ok("review cap 0.6 everywhere", Object.values(POLICIES).every((p) => p.limits.maxReviewRatio === 0.6));
  ok("weights sum to 1", Object.values(POLICIES).every((p) => weightSum(p) === 1));
  ok("no persona inside any policy", Object.values(POLICIES).every((p) => !("persona" in p)));
  const core = readFileSync(new URL("../../base44/shared/coachCore.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  const plan = readFileSync(new URL("../../base44/shared/coachPlan.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  ok("facts layer reads no policy/persona; planner reads no persona", !/coachPolicies|persona/i.test(core) && !/persona|PERSONAS/.test(plan));
  ok("minutesFor clamps to the policy's options", minutesFor(POLICIES.vira, 25) === 10 && minutesFor(POLICIES.vi, 20) === 20);
  const N = Date.parse("2026-10-08T10:00:00Z");
  const trial = resolveCoach({ status: "active", plan: "Learner Plan", is_trial: true, expires_at: "2026-10-10" }, N);
  ok("trial = Velvet policy + Vira persona + Velvet conversion persona, no Telegram", trial.policy.id === "velvet" && trial.persona.id === "vira" && trial.conversionPersona.id === "velvet" && trial.policy.capabilities.telegram === "none");
  ok("Learner -> Velvet, VIP -> VI, lapsed -> free", resolveCoach({ status: "active", plan: "Learner Plan", expires_at: "2026-11-01" }, N).coach === "velvet" && resolveCoach({ status: "active", plan: "VIP Plan", expires_at: "2026-11-01" }, N).coach === "vi" && entitlementOf({ status: "cancelled", plan: "VIP Plan" }, N) === "free");
  ok("handoff on entitlement change only", needsHandoff("learner", "vip") && !needsHandoff("learner", "learner"));
  ok("personas are separate config", Object.keys(PERSONAS).join() === "vira,velvet,vi");
}

/* ------------------------------------------------------------------ */
hdr("7. Goal graph");
{
  ok("live topics == grammarKeys PRACTICE_KEYS", JSON.stringify([...LIVE_GRAMMAR_TOPICS].sort()) === JSON.stringify(Object.keys(PRACTICE_KEYS).sort()));
  ok("prerequisites only use live topics", PREREQUISITES.flat().every((k) => LIVE_GRAMMAR_TOPICS.includes(k.replace(/^grammar:/, ""))));
  ok("unlock count is transitive", unlockCount(goalOf("grammar_basics"), G("simple-routine")) === 2);
  ok("prerequisitesOf", prerequisitesOf(goal, G("simple-negative"))[0] === G("third-person-s"));
  ok("hub quiz banks never on a path", !onPath(GOALS.everyday, "grammar:hub.punctuation"));
  ok("goal relevance from data", goalRelevance(GOALS.vocabulary, "word:w1:0") === 0.8);
}

/* ------------------------------------------------------------------ */
hdr("8. Engine on an in-memory store");
function makeStore() {
  const tables = {};
  const match = (row, q) => Object.entries(q).every(([k, v]) => (v && typeof v === "object" && !Array.isArray(v)) ? ("$in" in v ? v.$in.includes(row[k]) : "$exists" in v ? (row[k] != null) === v.$exists : false) : row[k] === v);
  const sorter = (sort) => {
    if (!sort) return () => 0;
    const desc = sort.startsWith("-"); const f = desc ? sort.slice(1) : sort;
    return (a, b) => (String(a[f] ?? "").localeCompare(String(b[f] ?? ""))) * (desc ? -1 : 1);
  };
  let clock = 0;
  const entity = (name) => {
    tables[name] = tables[name] || [];
    const t = tables[name]; let n = 0;
    return {
      async filter(q, sort, limit = 50, skip = 0) { await null; return t.filter((r) => match(r, q)).sort(sorter(sort)).slice(skip, skip + limit).map((r) => ({ ...r })); },
      async create(o) { await null; const r = { id: `${name}-${++n}`, created_date: new Date(NOW + (++clock)).toISOString(), ...o }; t.push(r); return { ...r }; },
      async bulkCreate(list) { const out = []; for (const o of list) out.push(await this.create(o)); return out; },
      async update(id, o) { await null; const r = t.find((x) => x.id === id); if (r) Object.assign(r, o); return r; },
      async delete(id) { await null; const i = t.findIndex((x) => x.id === id); if (i >= 0) t.splice(i, 1); },
    };
  };
  const svc = {};
  for (const e of ["WordAttempt", "GrammarAttempt", "VocabularyWord", "WordSense", "ItemEvidence", "LearnerItem", "PlanLog", "CoachProfile", "User"]) svc[e] = entity(e);
  return { svc, tables };
}
{
  const { svc, tables } = makeStore();
  for (let i = 1; i <= 8; i++) tables.VocabularyWord.push({ id: `v${i}`, english: `word${i}`, cefr: "A2" });
  tables.VocabularyWord.push({ id: "c1", english: "coach", cefr: "A2" }, { id: "c2", english: "coach", cefr: "A2" });
  tables.User.push({ id: "ua", email: "a@x", cefr_level: "A2" }, { id: "ub", email: "b@x", cefr_level: "A2" });
  const W = (o) => ({ id: `wa${Math.random()}`, game: "usage", mode: "recognise", verification: "client_attested", support: "none", ...o });
  tables.WordAttempt.push(
    W({ user_email: "a@x", word_id: "v1", word: "word1", correct: true, round_id: "r1", round_at: at(1) }),
    W({ user_email: "a@x", word_id: "v1", word: "word1", correct: false, round_id: "r2", round_at: at(2) }),
    W({ user_email: "a@x", word: "coach", correct: true, round_id: "r2", round_at: at(2) }),
    W({ user_email: "b@x", word_id: "v2", word: "word2", correct: true, round_id: "rb", round_at: at(2) }),
  );
  tables.GrammarAttempt.push({ id: "ga1", user_email: "a@x", game: "grammar_practice", grammar_topic: "tenses.present.simple-routine", item_id: "gpr.tenses.present.simple-routine.choose.001", correct: true, round_id: "g1", round_at: at(3), verification: "server_graded", mode: "recognise" });
  const ledgersBefore = JSON.stringify(tables.WordAttempt) + JSON.stringify(tables.GrammarAttempt);
  const A = { email: "a@x", id: "ua" }, B = { email: "b@x", id: "ub" };
  const LEARNER = { status: "active", plan: "Learner Plan", expires_at: "2026-11-30" };

  // Shadow mode writes nothing.
  const sizes = () => Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  const before = JSON.stringify(sizes());
  const sh = await shadowLearner(svc, "a@x", deps, NOW);
  ok("shadow mode runs every policy and writes nothing", Object.keys(sh.plans).length === 7 && JSON.stringify(sizes()) === before, JSON.stringify(Object.keys(sh.plans)));

  // Today's Practice (free -> Vira, 10 min), lazy backfill.
  const t1 = await getToday(svc, A, null, {}, deps, NOW);
  ok("getToday: Vira, 10-minute plan within budget", t1.coach.coach === "vira" && t1.plan.minutes === 10 && t1.plan.minutes_planned <= 10 && t1.plan.items.length > 0, JSON.stringify(t1.plan));
  ok("lazy backfill wrote evidence; no unresolved LearnerItem", tables.ItemEvidence.some((e) => e.item_key === "word:lemma:coach:*") && tables.LearnerItem.every((r) => isResolved(r.item_key)));
  ok("student view hides internal features", t1.plan.items.every((i) => !("features" in i) && !("priority" in i)));
  ok("first plan of the day -> one daily_initial snapshot", tables.PlanLog.length === 1 && tables.PlanLog[0].trigger === "daily_initial");
  await getToday(svc, A, null, {}, deps, NOW + 60000);
  ok("identical getToday writes no new snapshot", tables.PlanLog.length === 1);
  ok("PlanLog version stamps come from the code constants (no stale literals)", tables.PlanLog[0].engine === ENGINE_STAMP && ENGINE_STAMP === [PLAN_VERSION, ENGINE_VERSION, GRAPH_VERSION].join("+") && tables.PlanLog[0].policy === POLICIES[tables.PlanLog[0].policy.split("@")[0]].version && t1.plan.items.every((i) => i.engine === undefined || i.engine === PLAN_VERSION), JSON.stringify({ e: tables.PlanLog[0].engine, p: tables.PlanLog[0].policy }));
  ok("policies use continuationSessionsPerDay (no extraRounds leak)", Object.values(POLICIES).every((p) => Number.isInteger(p.limits.continuationSessionsPerDay) && !JSON.stringify(p).includes("extraRounds")));
  await Promise.all([getToday(svc, A, null, {}, deps, NOW + 61000), getToday(svc, A, null, {}, deps, NOW + 62000)]);
  ok("concurrent identical getToday calls write no duplicate snapshot", tables.PlanLog.length === 1);

  // Coach session evidence through applyRound (the progressApi hook).
  const target = t1.plan.items.find((i) => i.item_type === "word") || t1.plan.items[0];
  const rowsFor = (key, round, okCount, total, when, extra = {}) => key.startsWith("word:")
    ? Array.from({ length: total }, (_, i) => ({ ledger: "WordAttempt", user_email: "a@x", game: "spelling", mode: "produce", verification: "server_graded", support: "none", word_id: key.split(":")[1], word: "w", correct: i < okCount, round_id: round, round_at: when, ...extra }))
    : Array.from({ length: total }, (_, i) => ({ ledger: "GrammarAttempt", user_email: "a@x", game: "grammar_practice", grammar_topic: key.slice(8), item_id: `gpr.${key.slice(8)}.build.00${i}`, mode: "construct", verification: "server_graded", correct: i < okCount, round_id: round, round_at: when, ...extra }));
  const sk = t1.session.session_key;
  const sub1 = await applyRound(svc, "a@x", { rows: rowsFor(target.item_key, "cs1", 5, 5, new Date(NOW + 120000).toISOString()), coach: { session_key: sk } }, deps);
  const li = () => tables.LearnerItem.find((r) => r.item_key === target.item_key);
  ok("coach-targeted evidence moves FSRS", sub1.coachItems === 1 && li()?.reps === 1 && !!li()?.due, JSON.stringify(li()));
  const snap1 = JSON.stringify(li());
  const sub2 = await applyRound(svc, "a@x", { rows: rowsFor(target.item_key, "cs1", 5, 5, new Date(NOW + 120000).toISOString()), coach: { session_key: sk } }, deps);
  ok("duplicate submission is idempotent (no evidence, item unchanged)", sub2.evidenceAdded === 0 && JSON.stringify(li()) === snap1);
  await applyRound(svc, "a@x", { rows: rowsFor(target.item_key, "cs2", 1, 5, new Date(NOW + 180000).toISOString()), coach: { session_key: sk } }, deps);
  ok("second coach session the same day: state updates, FSRS does not", li().reps === 1 && li().rounds >= 3);
  await Promise.all([
    applyRound(svc, "a@x", { rows: rowsFor(target.item_key, "cs3", 3, 5, new Date(NOW + 200000).toISOString()) }, deps),
    applyRound(svc, "a@x", { rows: rowsFor(target.item_key, "cs4", 4, 5, new Date(NOW + 210000).toISOString()) }, deps),
  ]);
  const rowsForKey = tables.LearnerItem.filter((r) => r.item_key === target.item_key);
  const fresh = deriveItem(tables.ItemEvidence.filter((e) => e.user_email === "a@x" && e.item_key === target.item_key), tsfsrs);
  ok("concurrent submissions converge on one correct row", rowsForKey.length === 1 && canonicalItem(rowsForKey[0]) === canonicalItem(fresh), `${rowsForKey.length} rows`);
  const forged = await applyRound(svc, "a@x", { rows: rowsFor("word:v3:0", "cs5", 5, 5, new Date(NOW + 220000).toISOString()), coach: { session_key: "2026-10-08:today:0-forged" } }, deps);
  ok("forged/unknown session key -> plain game evidence, no FSRS", forged.coachItems === 0 && !tables.LearnerItem.find((r) => r.item_key === "word:v3:0")?.due);
  const cross = await applyRound(svc, "b@x", { rows: rowsFor(target.item_key, "xb1", 5, 5, new Date(NOW + 230000).toISOString()).map((r) => ({ ...r, user_email: "b@x" })), coach: { session_key: sk } }, deps);
  ok("another learner's session key gives no coach credit", cross.coachItems === 0);

  // Recalculation after evidence + isolation.
  const t2 = await getToday(svc, A, null, {}, deps, NOW + 300000);
  ok("practised item leaves today's plan; snapshot trigger evidence_changed", !t2.plan.items.some((i) => i.item_key === target.item_key) && tables.PlanLog.some((p) => p.trigger === "evidence_changed"));
  const tb = await getToday(svc, B, null, {}, deps, NOW);
  const bEvidenceKeys = new Set(tables.ItemEvidence.filter((e) => e.user_email === "b@x").map((e) => e.item_key));
  const bItems = tables.LearnerItem.filter((r) => r.user_email === "b@x");
  const aOnly = tables.ItemEvidence.filter((e) => e.user_email === "a@x" && !bEvidenceKeys.has(e.item_key) && isResolved(e.item_key)).map((e) => e.item_key);
  ok("cross-user isolation: B's facts come only from B's evidence", bItems.length > 0 && bItems.every((r) => bEvidenceKeys.has(r.item_key)) && !bItems.some((r) => aOnly.includes(r.item_key)) && tb.plan.items.length > 0);

  // Continuations.
  let threw = null; try { await startContinuation(svc, A, null, deps, NOW + 310000); } catch (e) { threw = e.code; }
  ok("Vira has no continuation session", threw === "no_continuations_left");
  const tL = await getToday(svc, A, LEARNER, {}, deps, NOW + 320000);
  ok("subscription change -> handoff free -> learner", tL.handoff?.from === "free" && tL.handoff?.to === "learner" && tL.coach.coach === "velvet");
  await ackHandoff(svc, A, LEARNER, NOW + 330000);
  tables.CoachProfile.find((p) => p.user_email === "a@x").last_policy_version = "velvet@1";
  const tL2 = await getToday(svc, A, LEARNER, {}, deps, NOW + 340000);
  ok("policy version change alone -> no handoff", tL2.handoff === null);
  const c1 = await startContinuation(svc, A, LEARNER, deps, NOW + 350000);
  ok("Keep going: fresh session from updated state (practised items excluded)", c1.session.kind === "continuation" && c1.session.session_no === 1 && !c1.plan.items.some((i) => i.item_key === target.item_key) && tables.PlanLog.some((p) => p.trigger === "continuation_initial"));
  let threw2 = null; try { await startContinuation(svc, A, LEARNER, deps, NOW + 360000); } catch (e) { threw2 = e.code; }
  ok("Velvet's one continuation is enforced", threw2 === "no_continuations_left");

  // Profile + map.
  let pe = null; try { await saveProfile(svc, A, LEARNER, { daily_minutes: 25 }, NOW); } catch (e) { pe = e.code; }
  ok("minutes outside the policy's options are refused", pe === "minutes_not_offered");
  await saveProfile(svc, A, LEARNER, { daily_minutes: 20, goal_id: "vocabulary", onboarded: true }, NOW);
  const t3 = await getToday(svc, A, LEARNER, {}, deps, NOW + 400000);
  ok("goal + time change -> new snapshot, plan within 20 min", t3.settings.minutes === 20 && t3.plan.minutes_planned <= 20 && tables.PlanLog.some((p) => ["goal_changed", "time_changed"].includes(p.trigger)));
  const map = await getMap(svc, A, LEARNER, NOW);
  ok("Learner Map: resolved items only, labels only", map.words.every((w) => isResolved(w.item_key) && Object.values(LABELS).includes(w.label)));

  // Verify + backfill idempotency + ledgers untouched.
  const v = await verifyLearner(svc, "a@x", deps);
  ok("verify: deterministic, no mismatches, no duplicates, no unresolved items", v.deterministic && v.mismatches.length === 0 && v.duplicates === 0 && v.unresolvedItems === 0, JSON.stringify(v.mismatches.slice(0, 2)));
  const evCount = tables.ItemEvidence.length;
  const bf = await backfillLearner(svc, "a@x", {}, deps);
  ok("backfill is idempotent", bf.evidenceAdded === 0 && tables.ItemEvidence.length === evCount);
  ok("game ledgers are never modified", JSON.stringify(tables.WordAttempt) + JSON.stringify(tables.GrammarAttempt) === ledgersBefore);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
