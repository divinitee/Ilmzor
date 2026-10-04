// End-to-end smoke test of the REAL progressApi handler (Deno) against an
// in-memory entity store. The Base44 SDK is replaced via import_map.json.
//   deno run --import-map=tools/skill-intelligence/deno/import_map.json tools/skill-intelligence/deno/progressapi-smoke.ts
import handler from '../../../base44/functions/progressApi/entry.ts';

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${!c && x ? ' -> ' + x : ''}`); };

const tables: Record<string, any[]> = {};
let seq = 0;
const match = (row: any, q: any): boolean => Object.entries(q || {}).every(([k, v]: [string, any]) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if ('$exists' in v) return (row[k] !== undefined && row[k] !== null) === v.$exists;
    if ('$in' in v) return v.$in.includes(row[k]);
    if ('$gt' in v) return row[k] > v.$gt;
    if ('$gte' in v) return row[k] >= v.$gte;
    return false;
  }
  return row[k] === v;
});
function entity(name: string) {
  const t = (tables[name] ||= []);
  const sorter = (sort?: string) => (a: any, b: any) => {
    if (!sort) return 0;
    const desc = sort.startsWith('-'); const k = desc ? sort.slice(1) : sort;
    return (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (desc ? -1 : 1);
  };
  const mk = (o: any) => { const r = { id: `${name}-${++seq}`, created_date: new Date(Date.now() + seq).toISOString(), ...o }; t.push(r); return { ...r }; };
  return {
    async filter(q: any, sort?: string, limit = 50, skip = 0) { return t.filter((r) => match(r, q)).sort(sorter(sort)).slice(skip, skip + limit).map((r) => ({ ...r })); },
    async count(q: any) { return t.filter((r) => match(r, q)).length; },
    async create(o: any) { return mk(o); },
    async bulkCreate(os: any[]) { return os.map(mk); },
    async update(id: string, o: any) { const r = t.find((x) => x.id === id); Object.assign(r, o); return { ...r }; },
    async delete(id: string) { const i = t.findIndex((x) => x.id === id); if (i >= 0) t.splice(i, 1); },
    async list(opts: any) { return opts?.distinct ? [...new Set(t.map((r) => r[opts.distinct]))] : t.map((r) => ({ ...r })); },
  };
}
const entities: any = new Proxy({}, { get: (target: any, name: string) => (target[name] ||= entity(name)) });
let me: any = { email: 'learner@x', role: 'user' };
(globalThis as any).__base44Client = { auth: { me: async () => me }, asServiceRole: { entities } };
const call = async (body: any) => (await handler(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }))).json();

tables.VocabularyWord = [{ id: 'v1', english: 'apple' }, { id: 'v2', english: 'ice cream' }, { id: 'v3', english: 'river' }];

console.log('\n=== spelling: server-graded + enriched ===');
const r1 = await call({ action: 'submitEvidence', game: 'spelling', bank: 'typing', level: 'A2', round_id: 'sp-1', items: [
  { word: 'apple', word_id: 'v1', correct: true, given: 'apple', support: 'none' },
  { word: 'ice cream', word_id: 'v2', correct: true, given: 'icecrem', support: 'hint' }, // client lies: server says wrong
  { word: 'river', word_id: 'v3', correct: false, given: '' },                          // never reached
] });
ok('round accepted as server_graded', r1.ok && r1.verification === 'server_graded', JSON.stringify(r1).slice(0, 200));
const wa = tables.WordAttempt.filter((r) => r.round_id === 'sp-1');
ok('server decides correctness (client flag ignored)', JSON.stringify(wa.map((r) => r.correct)) === '[true,false,false]');
ok('rows enriched: bank/mode/support/versions/given', wa.every((r) => r.bank === 'typing' && r.mode === 'construct' && r.taxonomy_version === 1 && r.activity_map_version === 1 && r.verification === 'server_graded')
  && wa[1].support === 'hint' && wa[2].support === 'unknown' && wa[1].given === 'icecrem');
ok('SkillState (live 5-skill) still updated as before', tables.SkillState.some((s) => s.skill === 'spelling' && s.current_mastery === 33));

console.log('\n=== spelling from an OLD client (no given) stays client-attested ===');
const r2 = await call({ action: 'submitEvidence', game: 'spelling', round_id: 'sp-2', items: [{ word: 'apple', word_id: 'v1', correct: true }] });
ok('old payload -> client_attested, client flag used (unchanged behaviour)', r2.verification === 'client_attested' && tables.WordAttempt.find((r) => r.round_id === 'sp-2').correct === true);
ok('old payload still enriched, bank absent', (() => { const r = tables.WordAttempt.find((x) => x.round_id === 'sp-2'); return r.bank === undefined && r.mode === 'construct' && r.support === 'unknown'; })());

console.log('\n=== other paths unchanged, enriched ===');
const r3 = await call({ action: 'submitEvidence', game: 'usage', bank: 'collocation_match', round_id: 'us-1', items: [{ word: 'make', correct: true }] });
ok('usage still client_attested, bank recorded', r3.verification === 'client_attested' && tables.WordAttempt.find((r) => r.round_id === 'us-1').bank === 'collocation_match');
const r4 = await call({ action: 'submitEvidence', game: 'grammar', round_id: 'gq-1', grammar_topic: 'punctuation', items: [{ item_id: 'punctuation:0', given: 0 }] });
const ga = tables.GrammarAttempt.find((r) => r.round_id === 'gq-1');
ok('retired quiz: server graded, bank from item id, recognise', r4.verification === 'server_graded' && ga.bank === 'punctuation' && ga.mode === 'recognise' && ga.taxonomy_version === 1);
const r5 = await call({ action: 'submitEvidence', game: 'grammar_practice', round_id: 'gp-1', items: [{ item_id: 'gpr.tenses.present.simple-routine.b.001', given: 'goes' }] });
ok('practice: server graded, construct', r5.verification === 'server_graded' && tables.GrammarAttempt.find((r) => r.round_id === 'gp-1').mode === 'construct');
ok('duplicate round still rejected', (await call({ action: 'submitEvidence', game: 'spelling', bank: 'typing', round_id: 'sp-1', items: [{ word: 'apple', word_id: 'v1', given: 'apple' }] })).duplicate === true);

console.log('\n=== admin shadow rebuild/verify ===');
ok('learner cannot rebuild leaf states', (await call({ action: 'rebuildLeafStates', email: 'learner@x' })).code === 'admin_only');
ok('learner cannot verify leaf states', (await call({ action: 'verifyLeafStates', email: 'learner@x' })).code === 'admin_only');
me = { email: 'admin@x', role: 'admin' };
const skillBefore = JSON.stringify(tables.SkillState);
// submitEvidence rebuilds LeafState after every round, so rows already exist and are current here.
const vPre = await call({ action: 'verifyLeafStates', email: 'learner@x' });
ok('per-round rebuild keeps rows current: rows exist, zero mismatches', tables.LeafState.length > 0 && vPre.ok && vPre.nondeterministic.length === 0 && vPre.mismatched.length === 0);
// Drop the rows to check verify still reports missing ones.
tables.LeafState.length = 0;
const v0 = await call({ action: 'verifyLeafStates', email: 'learner@x' });
ok('verify with rows removed: deterministic, all missing', v0.ok && v0.nondeterministic.length === 0 && v0.mismatched.length === 1);
const rb = await call({ action: 'rebuildLeafStates', email: 'learner@x' });
ok('rebuild wrote shadow rows', rb.ok && rb.results[0].written > 0 && tables.LeafState.length === rb.results[0].written);
const v1 = await call({ action: 'verifyLeafStates', email: 'learner@x' });
ok('verify after rebuild: deterministic, zero mismatches', v1.ok && v1.nondeterministic.length === 0 && v1.mismatched.length === 0, JSON.stringify(v1.results?.[0]?.mismatches).slice(0, 300));
const ls = Object.fromEntries(tables.LeafState.map((r) => [r.node_id, r]));
ok('spelling leaf: verified 1/3 from server grading; old-client row attested', ls['orthography.spelling'].verified_items === 3 && ls['orthography.spelling'].correctness === 33 && ls['orthography.spelling'].attested_items === 1);
ok('punctuation retained on COMING_SOON leaf', ls['orthography.punctuation'].retained_items === 1 && ls['orthography.punctuation'].correctness === null);
ok('SkillState untouched by shadow rebuild', JSON.stringify(tables.SkillState) === skillBefore);
ok('getSkillState still returns the live 5 skills', (await call({ action: 'getSkillState' })).skills.length === 5);
const rbAll = await call({ action: 'rebuildLeafStates', limit: 10 });
ok('batch rebuild walks learners', rbAll.ok && rbAll.total >= 1);

console.log(`\n${pass} passed, ${fail} failed`);
Deno.exit(fail ? 1 : 0);
