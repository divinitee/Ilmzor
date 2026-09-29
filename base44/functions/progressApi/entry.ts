import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  GAME_SKILL_MAP, SKILL_KEYS, recomputeSkill, rebuildSkill, readSkillStates,
} from '../../shared/progressEngine.ts';

// progressApi (VT-6): the only write path for progress evidence and SkillState.
//   submitRound   validate a finished round, write RewardEvent (+ GrammarAttempt
//                 for grammar), recompute that skill's SkillState, return state.
//   getSkillState caller's 5 SkillState rows + overall + today's activity.
//   rebuild       admin: rebuild SkillState from the ledger (backfill / proof).
// Observed performance is computed here from counts/items; a client scorePct
// is never accepted.

const LEVELS = new Set(['Starter', 'A1', 'A2', 'B1', 'B2', 'C1']);
const int = (v: unknown) => (Number.isInteger(v) ? (v as number) : NaN);

class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

function validateRound(body: any) {
  const game = String(body.game || '');
  const skill = GAME_SKILL_MAP[game];
  if (!skill) throw new ApiError(400, 'unknown_game');
  const round_id = String(body.round_id || '').slice(0, 80);
  if (!round_id) throw new ApiError(400, 'missing_round_id');
  const level = LEVELS.has(body.level) ? body.level : undefined;

  let items_correct: number, items_total: number, items: any[] = [];
  if (game === 'grammar') {
    // Grammar rounds must carry per-question evidence; counts are derived from it.
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new ApiError(400, 'bad_items');
    items = body.items.map((it: any, i: number) => ({
      item_id: it?.item_id != null ? String(it.item_id).slice(0, 80) : undefined,
      item_index: i,
      correct: it?.correct === true,
    }));
    items_total = items.length;
    items_correct = items.filter((i) => i.correct).length;
  } else {
    items_total = int(body.items_total);
    items_correct = int(body.items_correct);
    if (!(items_total >= 1 && items_total <= 200)) throw new ApiError(400, 'bad_items_total');
    if (!(items_correct >= 0 && items_correct <= items_total)) throw new ApiError(400, 'bad_items_correct');
  }
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= lo && n <= hi ? n : d;
  };
  return {
    game, skill, round_id, level, items, items_correct, items_total,
    grammar_topic: body.grammar_topic ? String(body.grammar_topic).slice(0, 60) : undefined,
    amount: num(body.amount, 0, 2000, 0),
    base_xp: num(body.base_xp, 0, 2000, 0),
    streak_best: Math.min(num(body.streak_best, 0, 200, 0), items_total),
    hint_multiplier: num(body.hint_multiplier, 0, 1, 1),
  };
}

async function submitRound(svc: any, me: any, body: any) {
  const r = validateRound(body);
  // Idempotent per round: a retried submit never double-counts evidence.
  const dup = await svc.RewardEvent.filter({ user_email: me.email, round_id: r.round_id }, '-created_date', 1);
  if (!dup?.length) {
    if (r.skill === 'grammar' && r.items.length) {
      await svc.GrammarAttempt.bulkCreate(r.items.map((it: any) => ({
        user_email: me.email, game: r.game, grammar_topic: r.grammar_topic,
        item_id: it.item_id, item_index: it.item_index, correct: it.correct,
        level: r.level, round_id: r.round_id,
      })));
    }
    await svc.RewardEvent.create({
      user_email: me.email, game: r.game, round_id: r.round_id, level: r.level,
      items_total: r.items_total, items_correct: r.items_correct,
      amount: r.amount, base_xp: r.base_xp, streak_best: r.streak_best, hint_multiplier: r.hint_multiplier,
    });
    await recomputeSkill(svc, me.email, r.skill);
  }
  return { duplicate: !!dup?.length, observed_pct: Math.round((100 * r.items_correct) / r.items_total), ...(await readSkillStates(svc, me.email)) };
}

async function getSkillState(svc: any, me: any, body: any) {
  const state = await readSkillStates(svc, me.email);
  // Today's activity for the dashboard missions: observed rounds, not mastery.
  const since = body.since && !isNaN(Date.parse(body.since)) ? new Date(body.since).toISOString() : new Date(Date.now() - 86400000).toISOString();
  const today = (await svc.RewardEvent.filter({ user_email: me.email, created_date: { $gte: since }, items_total: { $gt: 0 } }, '-created_date', 200)) || [];
  const skillsToday = new Set(today.map((e: any) => GAME_SKILL_MAP[e.game]).filter(Boolean));
  const bestToday = today.reduce((m: number, e: any) => Math.max(m, Math.round((100 * (e.items_correct || 0)) / e.items_total)), 0);
  return { ...state, today: { playedToday: today.length > 0, skillsToday: skillsToday.size, bestToday } };
}

async function rebuild(svc: any, me: any, body: any) {
  if (me.role !== 'admin') throw new ApiError(403, 'admin_only');
  let emails: string[] = [];
  if (body.email) emails = [String(body.email).trim().toLowerCase()];
  else {
    const a = await svc.SkillHubProgress.list({ distinct: 'user_email' });
    const b = await svc.RewardEvent.list({ distinct: 'user_email' });
    const vals = (x: any) => (Array.isArray(x) ? x : x?.items || []);
    emails = [...new Set([...vals(a), ...vals(b)].filter(Boolean))].slice(Number(body.offset) || 0, (Number(body.offset) || 0) + (Number(body.limit) || 25));
  }
  const out: any[] = [];
  for (const email of emails) {
    for (const skill of SKILL_KEYS) {
      await rebuildSkill(svc, email, skill);
      await new Promise((r) => setTimeout(r, 250)); // backfill stays under the entity rate limit
    }
    out.push({ email, ...(await readSkillStates(svc, email)) });
  }
  return { rebuilt: out.length, results: out };
}

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = { submitRound, getSkillState, rebuild };

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