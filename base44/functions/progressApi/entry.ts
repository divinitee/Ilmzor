import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  GAME_SKILL_MAP, XP_ONLY_GAMES, SKILL_KEYS, MAX_ITEMS, DEFINITION_CLEAR, COMPARABLE,
  gradePractice, gradeQuiz, gradeTranslation, normalise,
  claimRound, recomputeSkill, rebuildSkill, deriveSkill, readSkillStates, pageAll,
} from '../../shared/progressEngine.ts';

// progressApi (VT-6, corrected 2026-09-29). Progress and rewards are separate:
//   submitEvidence  a round's per-item evidence -> item ledger -> SkillState.
//                   Graded here where the answer key exists (grammar), from
//                   server AI receipts for AI games (definition, sentence),
//                   and client-attested otherwise (flagged per row).
//   submitReward    XP ledger only (RewardEvent ledger_version 2). Never mastery.
//   getSkillState   caller's five rows + today's activity.
//   rebuild / verify  admin: rebuild from ledgers / prove rebuild == normal path.
// Both submits are exactly-once per round via claimRound().

const LEVELS = new Set(['Starter', 'A1', 'A2', 'B1', 'B2', 'C1']);
const str = (v: unknown, n: number) => String(v ?? '').slice(0, n);

class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

function base(body: any) {
  const game = str(body.game, 40);
  const round_id = str(body.round_id, 80);
  if (!round_id) throw new ApiError(400, 'missing_round_id');
  return { game, round_id, level: LEVELS.has(body.level) ? body.level : undefined };
}

function itemsOf(body: any) {
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_ITEMS) throw new ApiError(400, 'bad_items');
  return body.items;
}

/** Returns { ledger, rows[], verification } with each row's `correct` or `score` decided here. */
async function gradeEvidence(svc: any, me: any, r: any, body: any) {
  const skill = GAME_SKILL_MAP[r.game];
  if (skill === 'grammar') {
    const rows = itemsOf(body).map((it: any, i: number) => {
      const item_id = str(it?.item_id, 80);
      const correct = r.game === 'grammar' ? gradeQuiz(item_id, it?.given) : gradePractice(item_id, it?.given);
      if (correct === null) throw new ApiError(400, 'unknown_item');
      return { item_id, item_index: i, correct, given: str(Array.isArray(it?.given) ? it.given.join(' | ') : it?.given, 200), grammar_topic: str(body.grammar_topic || item_id.split(':')[0], 80) };
    });
    return { ledger: 'GrammarAttempt', rows, verification: 'server_graded' };
  }
  if (skill === 'creativity') {
    const ai = await svc.AiGradedItem.filter({ user_email: me.email, round_id: r.round_id, task: 'sentence' }, 'created_date', 1);
    if (!ai?.[0]) throw new ApiError(422, 'no_ai_grade');
    return { ledger: 'AiGradedItem', rows: [], ai: ai[0], verification: 'server_ai' };
  }
  // Word-shaped evidence.
  let items: any[];
  if (r.game === 'quiz' && !Array.isArray(body.items)) {
    const total = Number(body.items_total), correct = Number(body.items_correct);
    if (!(Number.isInteger(total) && total >= 1 && total <= MAX_ITEMS && Number.isInteger(correct) && correct >= 0 && correct <= total)) throw new ApiError(400, 'bad_counts');
    items = Array.from({ length: total }, (_, i) => ({ word: '(quiz item)', correct: i < correct }));
  } else items = itemsOf(body);
  const ids = [...new Set(items.map((i: any) => i?.word_id).filter(Boolean).map((x: any) => str(x, 40)))];
  const words = ids.length ? await svc.VocabularyWord.filter({ id: { $in: ids } }, 'id', ids.length) : [];
  const byId = new Map((words || []).map((w: any) => [w.id, w]));
  if (byId.size !== ids.length) throw new ApiError(400, 'unknown_word');

  let aiByKey = new Map<string, number>();
  if (skill === 'comprehension') {
    const ai = (await svc.AiGradedItem.filter({ user_email: me.email, round_id: r.round_id, task: 'definition' }, 'created_date', 200)) || [];
    for (const a of ai) if (!aiByKey.has(a.item_key)) aiByKey.set(a.item_key, Number(a.score) || 0);
  }
  let anyAttested = false;
  const rows = items.map((it: any) => {
    const w = it?.word_id ? byId.get(str(it.word_id, 40)) : null;
    const word = str(w?.english || it?.word, 80);
    if (!word) throw new ApiError(400, 'bad_items');
    let correct: boolean | null = null;
    if (skill === 'comprehension') correct = (aiByKey.get(normalise(word)) ?? -1) >= DEFINITION_CLEAR;
    else if (r.game === 'quiz' && w) correct = gradeTranslation(w, it?.type, it?.given);
    if (correct === null) { correct = it?.correct === true; anyAttested = true; }
    return { word, word_id: w?.id, correct };
  });
  const verification = skill === 'comprehension' ? 'server_ai' : anyAttested ? 'client_attested' : 'server_graded';
  return { ledger: 'WordAttempt', rows, verification };
}

async function submitEvidence(svc: any, me: any, body: any) {
  const r = base(body);
  const skill = GAME_SKILL_MAP[r.game];
  if (!skill) throw new ApiError(400, XP_ONLY_GAMES.includes(r.game) ? 'not_evidence' : 'unknown_game');
  const g: any = await gradeEvidence(svc, me, r, body); // validate BEFORE claiming
  const receipt = await claimRound(svc, me.email, r.round_id, 'evidence');
  if (!receipt) return { duplicate: true, ...(await readSkillStates(svc, me.email)) };
  const round_at = receipt.round_at;
  let total: number, credit: number;
  if (g.ai) {
    await svc.AiGradedItem.update(g.ai.id, { counted: true, round_at });
    total = 1; credit = Math.max(0, Math.min(100, Number(g.ai.score) || 0)) / 100;
  } else {
    await svc[g.ledger].bulkCreate(g.rows.map((row: any) => ({
      ...row, user_email: me.email, game: r.game, level: r.level, round_id: r.round_id, round_at, verification: g.verification,
    })));
    total = g.rows.length; credit = g.rows.filter((x: any) => x.correct).length;
  }
  await svc.RoundReceipt.update(receipt.id, { status: 'done', game: r.game, skill, items_total: total, items_credit: credit, verification: g.verification });
  await recomputeSkill(svc, me.email, skill);
  return { duplicate: false, observed_pct: Math.round((100 * credit) / total), verification: g.verification, ...(await readSkillStates(svc, me.email)) };
}

async function submitReward(svc: any, me: any, body: any) {
  const r = base(body);
  if (!GAME_SKILL_MAP[r.game] && !XP_ONLY_GAMES.includes(r.game)) throw new ApiError(400, 'unknown_game');
  const n = (v: unknown, lo: number, hi: number, d: number) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? x : d; };
  const items_total = n(body.items_total, 0, 200, 0);
  const items_correct = Math.min(n(body.items_correct, 0, 200, 0), items_total);
  const receipt = await claimRound(svc, me.email, r.round_id, 'reward');
  if (!receipt) return { duplicate: true };
  await svc.RewardEvent.create({
    user_email: me.email, game: r.game, round_id: r.round_id, level: r.level, ledger_version: 2,
    items_total, items_correct, amount: n(body.amount, 0, 2000, 0), base_xp: n(body.base_xp, 0, 2000, 0),
    streak_best: Math.min(n(body.streak_best, 0, 200, 0), items_total), hint_multiplier: n(body.hint_multiplier, 0, 1, 1),
  });
  await svc.RoundReceipt.update(receipt.id, { status: 'done', game: r.game });
  return { duplicate: false };
}

async function getSkillState(svc: any, me: any, body: any) {
  const state = await readSkillStates(svc, me.email);
  // Today's activity (dashboard missions): rounds played, not mastery.
  const since = body.since && !isNaN(Date.parse(body.since)) ? new Date(body.since).toISOString() : new Date(Date.now() - 86400000).toISOString();
  const today = (await svc.RoundReceipt.filter({ user_email: me.email, kind: 'evidence', status: 'done', created_date: { $gte: since } }, '-created_date', 200)) || [];
  const skillsToday = new Set(today.map((e: any) => e.skill).filter(Boolean));
  const bestToday = today.reduce((m: number, e: any) => Math.max(m, e.items_total ? Math.round((100 * e.items_credit) / e.items_total) : 0), 0);
  return { ...state, today: { playedToday: today.length > 0, skillsToday: skillsToday.size, bestToday } };
}

async function allLearners(svc: any) {
  const set = new Set<string>();
  for (const ent of ['RewardEvent', 'WordAttempt', 'GrammarAttempt', 'AiGradedItem', 'SkillState']) {
    let cursor: string | undefined;
    do {
      const page: any = await svc[ent].list({ distinct: 'user_email', limit: 1000, ...(cursor ? { cursor } : {}) });
      const vals = Array.isArray(page) ? page : page?.items || [];
      vals.forEach((v: any) => v && set.add(String(v)));
      cursor = !Array.isArray(page) && page?.has_more ? page.next_cursor : undefined;
    } while (cursor);
  }
  return [...set].sort();
}

async function targets(svc: any, body: any) {
  if (body.email) return { emails: [str(body.email, 200).trim().toLowerCase()], total: 1, next_offset: null };
  const all = await allLearners(svc);
  const offset = Math.max(0, Number(body.offset) || 0), limit = Math.min(50, Math.max(1, Number(body.limit) || 10));
  const emails = all.slice(offset, offset + limit);
  return { emails, total: all.length, next_offset: offset + limit < all.length ? offset + limit : null };
}

async function rebuild(svc: any, me: any, body: any) {
  if (me.role !== 'admin') throw new ApiError(403, 'admin_only');
  const t = await targets(svc, body);
  for (const email of t.emails) for (const skill of SKILL_KEYS) await rebuildSkill(svc, email, skill);
  return { rebuilt: t.emails.length, total: t.total, next_offset: t.next_offset, has_more: t.next_offset != null };
}

/** Proves the normal path equals a from-scratch rebuild, per learner and skill. */
async function verify(svc: any, me: any, body: any) {
  if (me.role !== 'admin') throw new ApiError(403, 'admin_only');
  const t = await targets(svc, body);
  const now = Date.now();
  const mismatches: any[] = [];
  for (const email of t.emails) for (const skill of SKILL_KEYS) {
    const stored = (await svc.SkillState.filter({ user_email: email, skill }, '-updated_date', 1))?.[0] || {};
    const d: any = await deriveSkill(svc, email, skill, now);
    const diff = COMPARABLE.filter((k) => (stored[k] ?? null) !== (d[k] ?? null) && !(k === 'historical_peak' && (stored[k] || 0) === (d[k] || 0)));
    if (diff.length) mismatches.push({ email, skill, diff: diff.map((k) => [k, stored[k], d[k]]) });
  }
  return { checked: t.emails.length, total: t.total, next_offset: t.next_offset, mismatches };
}

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = { submitEvidence, submitReward, getSkillState, rebuild, verify };

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me?.email) return Response.json({ ok: false, error: 'not authenticated', code: 'unauthenticated' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const fn = ACTIONS[String(body.action || '')];
    if (!fn) return Response.json({ ok: false, error: 'unknown action', code: 'unknown_action' }, { status: 400 });
    const data = await fn(base44.asServiceRole.entities, me, body);
    return Response.json({ ok: true, ...data });
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ ok: false, error: error.code, code: error.code }, { status: error.status });
    console.error('progressApi error:', error);
    return Response.json({ ok: false, error: (error as any)?.message || 'server error', code: 'server_error' }, { status: 500 });
  }
}