import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import * as tsfsrs from 'npm:ts-fsrs@5.4.2';
import {
  backfillLearner, verifyLearner, deriveForLearner, shadowLearner,
  getToday, startContinuation, ackHandoff, saveProfile, getMap,
} from '../../shared/coachEngine.ts';
import { resolveCoach } from '../../shared/coachPolicies.js';
import { LABELS } from '../../shared/coachCore.js';

// coachApi (VT-40). The Coach Engine's only HTTP surface.
//   learner:  whoami, getToday, startContinuation, ackHandoff, saveProfile, getMap
//   admin:    backfill (dryRun default), verify, explain, shadow (writes nothing)
// The coach (entitlement, policy, persona) is resolved HERE from the caller's
// subscription on every request; the client never sends one. Evidence does NOT come
// in here: coach sessions submit through progressApi.submitEvidence like every game
// (with body.coach = { session_key }), so there is exactly one evidence pipeline.

const deps = { fsrsLib: tsfsrs };

class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
const str = (v: unknown, n: number) => String(v ?? '').slice(0, n);
const admin = (me: any) => { if (me.role !== 'admin') throw new ApiError(403, 'admin_only'); };

async function learners(svc: any) {
  const set = new Set<string>();
  for (const ent of ['WordAttempt', 'GrammarAttempt']) {
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
  const all = await learners(svc);
  const offset = Math.max(0, Number(body.offset) || 0), limit = Math.min(25, Math.max(1, Number(body.limit) || 5));
  return { emails: all.slice(offset, offset + limit), total: all.length, next_offset: offset + limit < all.length ? offset + limit : null };
}

// Same row selection as studentApi.findSub (subscriptions keyed by `phone` = email,
// legacy naming; created_by_id as fallback). A paid/active row wins, then the newest.
async function currentSub(svc: any, me: any) {
  let rows = await svc.StudentSubscription.filter({ phone: me.email });
  if (!rows?.length) rows = await svc.StudentSubscription.filter({ created_by_id: me.id });
  if (!rows?.length) return null;
  const rank = (s: any) => (s.status === 'active' ? 2 : 0) + (s.dodo_subscription_id ? 1 : 0);
  return [...rows].sort((a: any, b: any) => rank(b) - rank(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || '')))[0];
}

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = {
  async whoami(svc, me) {
    const r = resolveCoach(await currentSub(svc, me));
    // minutes: READ-ONLY lookup of the learner's chosen daily minutes, clamped to
    // what this policy offers (minutesFor); policy default when no profile yet.
    // Never creates a profile (profileFor would) and never builds a plan.
    const prof = ((await svc.CoachProfile.filter({ user_email: me.email }, 'created_date', 1)) || [])[0];
    return { entitlement: r.entitlement, coach: r.coach, policy: r.policy.version, persona: r.persona.id, conversionPersona: r.conversionPersona?.id || null, minutes: minutesFor(r.policy, prof?.daily_minutes) };
  },
  // session_no omitted -> the server resolves the active session (see getToday).
  async getToday(svc, me, body) { return getToday(svc, me, await currentSub(svc, me), { session_no: body.session_no === undefined || body.session_no === null ? undefined : Number(body.session_no) || 0 }, deps); },
  async startContinuation(svc, me) { return startContinuation(svc, me, await currentSub(svc, me), deps); },
  async ackHandoff(svc, me) { return ackHandoff(svc, me, await currentSub(svc, me)); },
  async saveProfile(svc, me, body) { return saveProfile(svc, me, await currentSub(svc, me), body); },
  async getMap(svc, me) { return getMap(svc, me, await currentSub(svc, me)); },

  async backfill(svc, me, body) {
    admin(me);
    const t = await targets(svc, body);
    const dryRun = body.dryRun !== false;
    const results = [];
    for (const email of t.emails) results.push(await backfillLearner(svc, email, { dryRun }, deps));
    return { dryRun, done: t.emails.length, total: t.total, next_offset: t.next_offset, has_more: t.next_offset != null, results };
  },
  async verify(svc, me, body) {
    admin(me);
    const t = await targets(svc, body);
    const results = [];
    for (const email of t.emails) results.push(await verifyLearner(svc, email, deps));
    return { checked: t.emails.length, total: t.total, next_offset: t.next_offset, failing: results.filter((r) => !r.deterministic || r.mismatches.length || r.duplicates || r.unresolvedItems).map((r) => r.email), results };
  },
  async explain(svc, me, body) {
    admin(me);
    const email = str(body.email, 200).trim().toLowerCase();
    if (!email) throw new ApiError(400, 'missing_email');
    const { items, evidence, ledgerRows } = await deriveForLearner(svc, email, deps);
    const plans = (await svc.PlanLog.filter({ user_email: email }, '-generated_at', 10)) || [];
    return { email, ledgerRows, evidenceRows: evidence.length, items: items.map((i: any) => ({ ...i, label: (LABELS as Record<string, string>)[i.learning_state] })), recentPlans: plans };
  },
  async shadow(svc, me, body) {
    admin(me);
    const t = await targets(svc, body);
    const results = [];
    for (const email of t.emails) results.push(await shadowLearner(svc, email, deps));
    return { writes: 0, done: t.emails.length, total: t.total, next_offset: t.next_offset, results };
  },
};

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
  } catch (error: any) {
    if (error instanceof ApiError || error?.code) return Response.json({ ok: false, error: error.code, code: error.code }, { status: error.status || 400 });
    console.error('coachApi error:', error);
    return Response.json({ ok: false, error: error?.message || 'server error', code: 'server_error' }, { status: 500 });
  }
}
