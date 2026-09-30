// Skill Intelligence — SHADOW leaf state: pure derivation + admin rebuild/verify
// against an in-memory entity store (no Base44, no network).
//   node --experimental-strip-types tools/skill-intelligence/leafstate-tests.mjs
import { deriveLeafStates, diffLeafState, canonical, LEAF_COMPARABLE } from "../../base44/shared/leafStateCore.js";
import { rebuildLeafStates, verifyLeafStates } from "../../base44/shared/leafStateEngine.ts";
import { EVIDENCE_WINDOW_N } from "../../base44/shared/progressCore.js";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const hdr = (t) => console.log(`\n=== ${t} ===`);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NOW = Date.parse("2026-09-30T12:00:00.000Z");
const day = (d, h = 8) => `2026-09-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00.000Z`;

// ---- fixture ledger for one learner ----
let seq = 0;
const W = (o) => ({ ledger: "WordAttempt", id: `w${++seq}`, user_email: "a@x", word: "w", level: "A2", support: "none", ...o });
const G = (o) => ({ ledger: "GrammarAttempt", id: `g${++seq}`, user_email: "a@x", game: "grammar_practice", level: "A1", verification: "server_graded", ...o });
const rows = [];
// 12 verified spelling rounds across 3 days, 2 items each; round k has k%2 correct items -> alternating credit
for (let k = 0; k < 12; k++) for (let i = 0; i < 2; i++) rows.push(W({ game: "spelling", bank: "typing", verification: "server_graded", correct: i < (k % 2) + 1, round_id: `sp${k}`, round_at: day(20 + (k % 3), 8 + k), item_index: i }));
// attested odd_one_out round
for (let i = 0; i < 5; i++) rows.push(W({ game: "odd_one_out", verification: "client_attested", correct: true, round_id: "oo1", round_at: day(25), item_index: i }));
// bankless historic usage round -> unattributed at Vocabulary
for (let i = 0; i < 3; i++) rows.push(W({ game: "usage", verification: "client_attested", correct: true, round_id: "us1", round_at: day(26), item_index: i }));
// grammar practice (construct) + retired punctuation quiz (retained)
for (let i = 0; i < 4; i++) rows.push(G({ item_id: `gpr.tenses.present.simple-routine.b.00${i + 1}`, correct: i !== 3, round_id: "gp1", round_at: day(27), item_index: i }));
for (let i = 0; i < 2; i++) rows.push(G({ game: "grammar", item_id: `punctuation:${i}`, correct: true, round_id: "pq1", round_at: day(27, 10), item_index: i }));
// sentence AI grades: one counted, one not; one definition receipt
rows.push({ ledger: "AiGradedItem", id: "ai1", user_email: "a@x", task: "sentence", round_id: "se1", score: 80, counted: true, round_at: day(28) });
rows.push({ ledger: "AiGradedItem", id: "ai2", user_email: "a@x", task: "sentence", round_id: "se2", score: 10, counted: false, round_at: day(28, 9) });
rows.push({ ledger: "AiGradedItem", id: "ai3", user_email: "a@x", task: "definition", round_id: "de1", score: 90, round_at: day(28, 10) });
// legacy RewardEvent
rows.push({ ledger: "RewardEvent", id: "re1", user_email: "a@x", game: "spelling", items_total: 10, items_correct: 5, created_date: day(1) });

const { states, coverage } = deriveLeafStates(rows, NOW);
const by = Object.fromEntries(states.map((s) => [s.node_id, s]));

/* ------------------------------------------------------------------ */
hdr("1. Leaf state content");
const sp = by["orthography.spelling"];
ok("spelling: 12 verified rounds, 24 items", sp.verified_rounds === 12 && sp.verified_items === 24);
const lastTen = [...Array(12).keys()].slice(2).reduce((a, k) => a + (k % 2) + 1, 0);
ok(`correctness = newest ${EVIDENCE_WINDOW_N} verified rounds, item-weighted`, sp.correctness === Math.round((100 * lastTen) / 20) && sp.items_in_window === 20, `${sp.correctness}`);
ok("confidence + freshness from verified evidence (last verified 8 days ago -> stale)", sp.confidence === "high" && sp.freshness === "stale", sp.freshness);
ok("verification profile", eq(sp.verification_profile, { server_graded: 24 }));
ok("evidence profile by mode/level/support", eq(sp.evidence_profile, { by_mode: { construct: 24 }, by_level: { A2: 24 }, by_support: { none: 24 } }));
ok("progress-cell INPUTS: one cell (A2 × construct) with distinct UTC days", eq(sp.cells.map((c) => [c.level, c.mode, c.items, c.rounds, c.distinct_days_utc]), [["A2", "construct", 24, 12, 3]]));
ok("no cell STATE (○◐●◆) is decided here", sp.cells.every((c) => !("state" in c) && !("glyph" in c)));
ok("no mastery field anywhere", states.every((s) => !Object.keys(s).some((k) => /master/i.test(k))));
const oo = by["vocabulary.sense_relations"];
ok("attested-only leaf: correctness NULL (never 0), no cells, activity counted", oo.correctness === null && oo.cells.length === 0 && oo.attested_rounds === 1 && oo.attested_items === 5 && oo.verified_items === 0);
ok("bankless usage -> Vocabulary AREA row, unattributed", by.vocabulary?.unattributed_items === 3 && by.vocabulary.node_kind === "area" && by.vocabulary.correctness === null);
const gt = by["grammar.tenses"];
ok("grammar practice -> grammar.tenses, construct, 3/4", gt.correctness === 75 && eq(gt.evidence_profile.by_mode, { construct: 4 }));
ok("retired punctuation -> retained on COMING_SOON leaf, no correctness", by["orthography.punctuation"].retained_items === 2 && by["orthography.punctuation"].correctness === null && by["orthography.punctuation"].node_state === "COMING_SOON");
ok("counted sentence grade only", by["production.writing_sentence"].verified_items === 1 && by["production.writing_sentence"].correctness === 80);
ok("legacy RewardEvent -> Orthography AREA only", by.orthography?.legacy_rounds === 1 && by.orthography.legacy_items === 10 && !by.orthography.cells.length);
ok("coverage report by strength", eq(coverage, { attested: 5, legacy: 1, none: 2, retained: 2, unattributed: 3, verified: 29 }), JSON.stringify(coverage));
ok("no cross-leaf average / overall percentage is produced", !states.some((s) => s.node_id === "english") && !("overall" in { states, coverage }));

/* ------------------------------------------------------------------ */
hdr("2. Incidental evidence never becomes progress");
const FX = [{ key: "fx", game: "fx", bank: null, leaf: "vocabulary.collocations_chunks", mode: "recognise", verification: "server_graded", dimensions: ["correct", "form"], coMeasured: [{ dimension: "form", leaf: "vocabulary.form_and_meaning", basis: "fixture" }], retired: false }];
const fx = deriveLeafStates([W({ game: "fx", verification: "server_graded", correct: true, round_id: "f1", round_at: day(29) })], NOW, { activities: FX });
const fxBy = Object.fromEntries(fx.states.map((s) => [s.node_id, s]));
ok("primary leaf gets verified evidence", fxBy["vocabulary.collocations_chunks"].verified_items === 1);
ok("co-measured leaf gets INCIDENTAL count only — no correctness, no cells", eq([fxBy["vocabulary.form_and_meaning"].incidental_items, fxBy["vocabulary.form_and_meaning"].correctness, fxBy["vocabulary.form_and_meaning"].cells.length, fxBy["vocabulary.form_and_meaning"].verified_items], [1, null, 0, 0]));

/* ------------------------------------------------------------------ */
hdr("3. Rebuild determinism (pure)");
const shuffled = [...rows].sort((a, b) => (a.id < b.id ? 1 : -1));
ok("input order does not matter", eq(deriveLeafStates(shuffled, NOW).states.map(canonical), states.map(canonical)));
ok("repeat derivation is byte-identical", JSON.stringify(deriveLeafStates(rows, NOW)) === JSON.stringify(deriveLeafStates(rows, NOW)));
ok("fingerprint stable across runs", eq(deriveLeafStates(shuffled, NOW).states.map((s) => s.fingerprint), states.map((s) => s.fingerprint)));
ok("now is required (no hidden clock)", (() => { try { deriveLeafStates(rows); return false; } catch { return true; } })());
ok("diff detects a changed field", eq(diffLeafState({ ...sp, verified_items: 1 }, sp).map((d) => d.field), ["verified_items"]));
ok("comparable fields exclude freshness (re-derived on read)", !LEAF_COMPARABLE.includes("freshness"));

/* ------------------------------------------------------------------ */
hdr("4. Admin rebuild + verify against an in-memory store");
function makeStore(data) {
  const tables = {};
  const match = (row, q) => Object.entries(q).every(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if ("$exists" in v) return (row[k] !== undefined && row[k] !== null) === v.$exists;
      if ("$in" in v) return v.$in.includes(row[k]);
      return false;
    }
    return row[k] === v;
  });
  const entity = (name) => {
    tables[name] = tables[name] || [];
    const t = tables[name];
    let n = 0;
    return {
      async filter(q, sort, limit = 50, skip = 0) { return t.filter((r) => match(r, q)).slice(skip, skip + limit).map((r) => ({ ...r })); },
      async create(o) { const r = { id: `${name}-${++n}`, created_date: new Date(NOW).toISOString(), ...o }; t.push(r); return { ...r }; },
      async update(id, o) { const r = t.find((x) => x.id === id); Object.assign(r, o); return { ...r }; },
      async delete(id) { t.splice(t.findIndex((x) => x.id === id), 1); },
    };
  };
  const svc = {};
  for (const e of ["WordAttempt", "GrammarAttempt", "AiGradedItem", "RewardEvent", "LeafState", "SkillState"]) svc[e] = entity(e);
  for (const r of data) { const { ledger, ...rest } = r; tables[ledger].push(rest); }
  tables.SkillState.push({ id: "ss1", user_email: "a@x", skill: "spelling", current_mastery: 42 });
  return { svc, tables };
}
const { svc, tables } = makeStore(rows);
const before = JSON.stringify(tables.SkillState) + JSON.stringify(tables.WordAttempt) + JSON.stringify(tables.GrammarAttempt) + JSON.stringify(tables.AiGradedItem) + JSON.stringify(tables.RewardEvent);
const v0 = await verifyLeafStates(svc, "a@x", NOW);
ok("verify before rebuild: deterministic, every node reported missing", v0.deterministic && v0.mismatches.length === states.length && v0.mismatches.every((m) => m.missing));
const rb = await rebuildLeafStates(svc, "a@x", NOW);
ok("rebuild writes one LeafState row per node", rb.written === states.length && tables.LeafState.length === states.length);
const v1 = await verifyLeafStates(svc, "a@x", NOW);
ok("verify after rebuild: deterministic, zero mismatches", v1.deterministic && v1.mismatches.length === 0, JSON.stringify(v1.mismatches).slice(0, 300));
const rb2 = await rebuildLeafStates(svc, "a@x", NOW);
ok("rebuild is idempotent (update in place, no duplicates)", rb2.written === states.length && tables.LeafState.length === states.length);
ok("stored rows equal the pure derivation", tables.LeafState.every((r) => canonical(r) === canonical(by[r.node_id])));
tables.LeafState.find((r) => r.node_id === "orthography.spelling").correctness = 1;
const v2 = await verifyLeafStates(svc, "a@x", NOW);
ok("verify reports a tampered field as a diff", v2.mismatches.length === 1 && v2.mismatches[0].diff[0].field === "correctness");
tables.LeafState.push({ id: "stale", user_email: "a@x", node_id: "vocabulary.word_formation" });
ok("verify reports stale nodes", (await verifyLeafStates(svc, "a@x", NOW)).mismatches.some((m) => m.stale));
await rebuildLeafStates(svc, "a@x", NOW);
ok("rebuild repairs tampering and removes stale rows", (await verifyLeafStates(svc, "a@x", NOW)).mismatches.length === 0 && !tables.LeafState.some((r) => r.id === "stale"));
const after = JSON.stringify(tables.SkillState) + JSON.stringify(tables.WordAttempt) + JSON.stringify(tables.GrammarAttempt) + JSON.stringify(tables.AiGradedItem) + JSON.stringify(tables.RewardEvent);
ok("SkillState and every ledger are untouched by rebuild/verify", before === after);
ok("other learners are untouched", (await rebuildLeafStates(svc, "b@x", NOW)).written === 0 && tables.LeafState.every((r) => r.user_email === "a@x"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
