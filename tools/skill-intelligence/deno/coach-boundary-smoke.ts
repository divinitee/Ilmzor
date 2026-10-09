// Stage 3 evidence boundary through the REAL coachApi + progressApi handlers
// (Deno, in-memory store, SDK stubbed via import_map.json). This is the exact
// HTTP contract the /coach page uses:
//   deno run -A --import-map=import_map.json coach-boundary-smoke.ts
import progressApi from '../../../base44/functions/progressApi/entry.ts';
import coachApi from '../../../base44/functions/coachApi/entry.ts';
import { PRACTICE_KEYS } from '../../../base44/shared/grammarKeys.js';

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
    if ('$lt' in v) return row[k] < v.$lt;
    if ('$lte' in v) return row[k] <= v.$lte;
    return false;
  }
  return row[k] === v;
});
function entity(name: string) {
  const t = (tables[name] ||= []);
  const sorter = (sort?: string) => (a: any, b: any) => { if (!sort) return 0; const d = sort.startsWith('-'); const k = d ? sort.slice(1) : sort; return (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (d ? -1 : 1); };
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
let me: any = { email: 'tee.test@x', role: 'user' };
(globalThis as any).__base44Client = { auth: { me: async () => me }, asServiceRole: { entities } };
const post = (h: any) => async (body: any) => (await h(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }))).json();
const P = post(progressApi), C = post(coachApi);

// Corpus + history + an active Learner subscription (-> Velvet: 1 "Keep going").
const words = [['apple', 'olma', 'яблоко'], ['bread', 'non', 'хлеб'], ['water', 'suv', 'вода'], ['river', 'daryo', 'река'], ['house', 'uy', 'дом'], ['book', 'kitob', 'книга']];
tables.VocabularyWord = words.map(([en, uz, ru], i) => ({ id: `v${i + 1}`, english: en, uzbek: uz, russian: ru, cefr: 'A2' }));
tables.WordSense = [];
tables.User = [{ id: 'u1', email: 'tee.test@x', cefr_level: 'A2' }, { id: 'u2', email: 'other@x', cefr_level: 'A2' }];
tables.StudentSubscription = [{ id: 's1', phone: 'tee.test@x', status: 'active', plan: 'Learner Plan', expires_at: '2027-01-31' }];
const old = new Date(Date.now() - 3 * 86400000).toISOString();
tables.WordAttempt = [
  { id: 'h1', user_email: 'tee.test@x', game: 'usage', word_id: 'v1', word: 'apple', correct: true, round_id: 'h-1', round_at: old, verification: 'client_attested', mode: 'recognise' },
  { id: 'h2', user_email: 'tee.test@x', game: 'usage', word_id: 'v2', word: 'bread', correct: false, round_id: 'h-1', round_at: old, verification: 'client_attested', mode: 'recognise' },
];
tables.GrammarAttempt = [];

const answerFor = (topic: string, n: number) => {
  const keys = Object.entries(PRACTICE_KEYS[topic] || {}).filter(([k, v]) => k.startsWith('c') && !String(v).startsWith('§')).slice(0, n);
  return keys.map(([k, v]) => ({ item_id: `gpr.${topic}.choose.${k.slice(1)}`, given: String(v).split('|')[0] }));
};
const coachEv = (key: string) => (tables.ItemEvidence || []).filter((e) => e.session_key === key && e.source === 'coach_session');

console.log('\n=== whoami minutes (read-only, server-authoritative) ===');
tables.StudentSubscription.push({ id: 's2', phone: 'vip@x', status: 'active', plan: 'VIP Plan', expires_at: '2027-01-31' });
const profilesBefore = (tables.CoachProfile || []).length;
const w0 = await C({ action: 'whoami' });
ok('whoami: Learner with no profile -> Velvet policy default (10)', w0.ok && w0.coach === 'velvet' && w0.minutes === 10, JSON.stringify(w0));
ok('whoami is read-only (creates no CoachProfile)', (tables.CoachProfile || []).length === profilesBefore);
me = { email: 'vip@x', role: 'user' };
const wv = await C({ action: 'whoami' });
ok('whoami: VIP with no profile -> VI policy default (15)', wv.coach === 'vi' && wv.minutes === 15, JSON.stringify(wv));
me = { email: 'other@x', role: 'user' };
const wf = await C({ action: 'whoami' });
ok('whoami: free -> Vira (10)', wf.coach === 'vira' && wf.minutes === 10);
me = { email: 'tee.test@x', role: 'user' };

console.log('\n=== Today\'s Practice through the real handlers ===');
const t1 = await C({ action: 'getToday' });
ok('getToday ok: Velvet, today session, not complete', t1.ok && t1.coach.coach === 'velvet' && t1.session.kind === 'today' && t1.session.complete === false, JSON.stringify(t1).slice(0, 300));
const sk = t1.session.session_key;
const items = t1.plan.items;
ok('plan has words and grammar', items.some((i: any) => i.item_type === 'word') && items.some((i: any) => i.item_type === 'grammar'), items.map((i: any) => i.item_key).join(','));

// Words: one server-graded "quiz" round (what CoachWordCheck + Session.flush send).
const wordItems = items.filter((i: any) => i.item_type === 'word');
const quizItems = wordItems.map((i: any, k: number) => {
  const w = tables.VocabularyWord.find((v) => v.id === i.word_id);
  return { word: w.english, word_id: w.id, type: 'multiple_choice', given: k === 0 ? 'WRONG' : w.uzbek, correct: true }; // client lies on the first
});
const rq = await P({ action: 'submitEvidence', game: 'quiz', round_id: 'coach-q1', items: quizItems, coach: { session_key: sk } });
const qRows = tables.WordAttempt.filter((r) => r.round_id === 'coach-q1');
ok('quiz round is server-graded (client "correct" ignored: wrong pick stored as wrong)', rq.ok && rq.verification === 'server_graded' && qRows.find((r) => r.word_id === wordItems[0].word_id)?.correct === false && qRows.filter((r) => r.word_id !== wordItems[0].word_id).every((r) => r.correct === true));
ok('coach evidence exists the moment submitEvidence RETURNS (awaited, no race)', wordItems.every((i: any) => coachEv(sk).some((e) => e.item_key === i.item_key)));
const midDay = await C({ action: 'getToday' });
const early = await C({ action: 'startContinuation' });
ok('partly practised: Keep going NOT offered and startContinuation refused (finish_today_first)', midDay.session.complete === false && midDay.continuation.available === false && early.code === 'finish_today_first', JSON.stringify({ s: midDay.session, k: midDay.continuation, e: early.code }));
const firstWord = tables.LearnerItem.find((r) => r.user_email === 'tee.test@x' && r.item_key === wordItems[0].item_key);
ok('a wrong word answer (server-judged) lowers that item', firstWord && (firstWord.weighted_accuracy ?? 1) < 0.6);

// Grammar: PracticeRunner's payload, one round per topic.
for (const g of items.filter((i: any) => i.item_type === 'grammar')) {
  const topic = g.item_key.replace(/^grammar:/, '');
  const rg = await P({ action: 'submitEvidence', game: 'grammar_practice', round_id: `coach-g-${topic}`, grammar_topic: topic, items: answerFor(topic, 4), coach: { session_key: sk } });
  ok(`grammar round ${topic}: server graded + coach-credited before return`, rg.ok && rg.verification === 'server_graded' && coachEv(sk).some((e) => e.item_key === g.item_key));
}

console.log('\n=== Done -> Keep going ===');
const t2 = await C({ action: 'getToday' });
ok('Done computed after evidence: session complete, no new items', t2.session.session_key === sk && t2.session.complete === true && t2.plan.items.length === 0, JSON.stringify(t2.session));
ok('Keep going offered by the server (1 allowed, 0 used)', t2.continuation.available === true && t2.continuation.allowed === 1 && t2.continuation.used === 0);
const dup = await P({ action: 'submitEvidence', game: 'quiz', round_id: 'coach-q1', items: quizItems, coach: { session_key: sk } });
ok('duplicate round rejected, evidence unchanged', dup.duplicate === true && coachEv(sk).length === new Set(coachEv(sk).map((e) => `${e.round_id}|${e.item_key}`)).size);
const k1 = await C({ action: 'startContinuation' });
const k1keys = new Set(k1.plan.items.map((i: any) => i.item_key));
ok('continuation: fresh queue, nothing practised today reappears', k1.ok && k1.session.kind === 'continuation' && items.every((i: any) => !k1keys.has(i.item_key)), JSON.stringify(k1).slice(0, 300));
const k1b = await C({ action: 'startContinuation' });
const k1c = await C({ action: 'getToday' });
const contKeys = new Set((tables.PlanLog || []).filter((p) => p.kind === 'continuation').map((p) => p.session_key));
ok('double tap + refresh resume the SAME continuation (counted once)', k1b.session.session_key === k1.session.session_key && k1c.session.session_key === k1.session.session_key && contKeys.size === 1);

const saved = await C({ action: 'saveProfile', daily_minutes: 20 });
const w20 = await C({ action: 'whoami' });
ok('whoami reflects the learner\'s saved choice (20)', saved.ok && w20.minutes === 20, JSON.stringify(w20));

console.log('\n=== Session-key boundary ===');
if (k1.plan.items[0]) {
  me = { email: 'other@x', role: 'user' };
  const ki = k1.plan.items[0];
  const payload = ki.item_type === 'grammar'
    ? { game: 'grammar_practice', round_id: 'steal-1', grammar_topic: ki.item_key.slice(8), items: answerFor(ki.item_key.slice(8), 3) }
    : { game: 'quiz', round_id: 'steal-1', items: [{ word: 'x', word_id: ki.word_id, type: 'multiple_choice', given: tables.VocabularyWord.find((v) => v.id === ki.word_id)?.uzbek }] };
  const steal = await P({ action: 'submitEvidence', ...payload, coach: { session_key: k1.session.session_key } });
  ok('another learner using this session_key gets NO coach credit', steal.ok && (tables.ItemEvidence || []).filter((e) => e.user_email === 'other@x' && e.source === 'coach_session').length === 0);
  me = { email: 'tee.test@x', role: 'user' };
}
me = null;
ok('a logged-out request is refused', (await C({ action: 'getToday' })).code === 'unauthenticated');
me = { email: 'tee.test@x', role: 'user' };

console.log(`\n${pass} passed, ${fail} failed`);
Deno.exit(fail ? 1 : 0);
