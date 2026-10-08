import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { backfillLearner, verifyLearner, deriveForLearner } from '../../shared/coachEngine.ts';
import { resolveCoach } from '../../shared/coachPolicies.js';
import { LABELS } from '../../shared/coachCore.js';

// coachApi (VT-40). The Coach Engine's only HTTP surface.
// Stage 1 (2026-10-08): admin backfill / verify / preview, plus whoami for the
// policy resolver. Stage 2 adds getToday / getMap / profile; Stage 4 adds
// linkTelegram. Policies are resolved HERE from the caller's subscription on
// every request — the client never sends one.

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

// Same row selection as studentApi.findSub (subscriptions are keyed by `phone` = email,
// legacy naming; created_by_id as fallback). A paid/active row wins, then the newest.
async function currentSub(svc: any, me: any) {
  let rows = await svc.StudentSubscription.filter({ phone: me.email });
  if (!rows?.length) rows = await svc.StudentSubscription.filter({ created_by_id: me.id });
  if (!rows?.length) return null;
  const rank = (s: any) => (s.status === 'active' ? 2 : 0) + (s.dodo_subscription_id ? 1 : 0);
  return [...rows].sort((a: any, b: any) => rank(b) - rank(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || '')))[0];
}

/** Any signed-in user: which coach the server resolves for them (no limits stored anywhere). */
async function whoami(svc: any, me: any) {
  const r = resolveCoach(await currentSub(svc, me));
  return { entitlement: r.entitlement, coach: r.coach, policy: r.policy.version, persona: r.persona.id, conversionPersona: r.conversionPersona?.id || null };
}

/** Admin: build ItemEvidence + LearnerItem from the existing game ledgers. dryRun writes nothing. */
async function backfill(svc: any, me: any, body: any) {
  admin(me);
  const t = await targets(svc, body);
  const dryRun = body.dryRun !== false;
  const results = [];
  for (const email of t.emails) results.push(await backfillLearner(svc, email, { dryRun }));
  return { dryRun, done: t.emails.length, total: t.total, next_offset: t.next_offset, has_more: t.next_offset != null, results };
}

/** Admin: stored LearnerItem == fresh derivation from ItemEvidence, order-independent, no duplicates. */
async function verify(svc: any, me: any, body: any) {
  admin(me);
  const t = await targets(svc, body);
  const results = [];
  for (const email of t.emails) results.push(await verifyLearner(svc, email));
  return { checked: t.emails.length, total: t.total, next_offset: t.next_offset, failing: results.filter((r) => !r.deterministic || r.mismatches.length || r.duplicates).map((r) => r.email), results };
}

/** Admin: one learner's derived items with student-facing labels (debug view; writes nothing). */
async function preview(svc: any, me: any, body: any) {
  admin(me);
  const email = str(body.email, 200).trim().toLowerCase();
  if (!email) throw new ApiError(400, 'missing_email');
  const { items, evidence, ledgerRows } = await deriveForLearner(svc, email);
  return { email, ledgerRows, evidenceRows: evidence.length, items: items.map((i) => ({ ...i, label: (LABELS as Record<string, string>)[i.learning_state] })) };
}

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = { whoami, backfill, verify, preview };

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
    console.error('coachApi error:', error);
    return Response.json({ ok: false, error: (error as any)?.message || 'server error', code: 'server_error' }, { status: 500 });
  }
}
