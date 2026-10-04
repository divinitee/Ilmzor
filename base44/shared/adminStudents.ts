// Admin Console, Students section (VT-35 P2a, 2026-10-04).
//
// Three actions, all behind the console token (see adminApiHandler.ts):
//   studentsList    one row per account: plan, group, level, last active, method
//   studentDetail   one account: profile, every subscription row, QR payments,
//                   plan history (from AdminAuditLog), activity, groups to move to
//   studentAction   grant | extend | approve | pause | resume | cancel |
//                   reactivate | move. Patches come from subscriptionCore.js,
//                   the same rules /admin uses. Every write is audited with
//                   before/after.
//
// Card (Dodo) rows: a LIVE card subscription can't be changed here (Dodo's
// webhook would overwrite it, and cancelling here wouldn't stop the card
// being charged). Moving such a student to another group is still allowed.
//
// Group moves follow Tee's commission rule (2026-10-04): commission follows
// the student. dodoWebhook credits row.teacher_id at renewal time, so
// updating teacher_id is all it takes; earlier payments are untouched.

import { AuthError } from './adminAuthCore.ts';
import { displayName } from './adminOverviewCore.ts';
import {
  subscriptionKind, isLiveCardSub, isRealPlan, PLAN_NAMES, CYCLES,
  approvePatch, pausePatch, resumePatch, cancelPatch, reactivatePatch,
  grantPatch, extendPatch, movePatch,
} from './subscriptionCore.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const normEmail = (e: unknown) => String(e || '').trim().toLowerCase();
const normCode = (c: unknown) => String(c || '').trim().toUpperCase().slice(0, 32);
const clean = (v: unknown, n = 500) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);

export async function pageAll(entity: any, query: Record<string, unknown> = {}, sort = 'created_date', cap = 20000) {
  const out: any[] = [];
  for (let skip = 0; skip < cap; skip += 500) {
    const page = (await entity.filter(query, sort, 500, skip)) || [];
    out.push(...page);
    if (page.length < 500) break;
  }
  return out;
}

// Same choice studentApi makes: an active row beats leftovers, a card row
// beats a manual one, then the most recently touched.
export function pickSub(rows: any[]) {
  if (!rows?.length) return null;
  const rank = (s: any) => (s.status === 'active' ? 2 : 0) + (s.dodo_subscription_id ? 1 : 0);
  return [...rows].sort((a, b) => rank(b) - rank(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || '')))[0];
}

function subsForUser(user: any, byEmail: Map<string, any[]>, byCreator: Map<string, any[]>) {
  const seen = new Map<string, any>();
  for (const s of [...(byEmail.get(normEmail(user.email)) || []), ...(byCreator.get(user.id) || [])]) seen.set(s.id, s);
  return [...seen.values()];
}

function methodOf(sub: any, approvedQr: boolean) {
  if (!sub) return null;
  if (sub.provider === 'dodo' || sub.dodo_subscription_id) return 'card';
  if (sub.payment_ref === 'admin-grant') return 'grant';
  if (approvedQr || /^VR-/i.test(sub.payment_ref || '')) return 'qr';
  return isRealPlan(sub) && !sub.is_trial ? 'manual' : null;
}

export const subView = (s: any) => s && ({
  id: s.id, plan: s.plan || '', status: s.status || '', kind: subscriptionKind(s), billing_cycle: s.billing_cycle || '',
  expires_at: s.expires_at || '', is_trial: !!s.is_trial, provider: s.provider || '', cancelled_at: s.cancelled_at || '',
  paused_at: s.paused_at || '', paused_days_remaining: s.paused_days_remaining ?? null, paid_since: s.paid_since || '',
  referral_code: s.referral_code || '', teacher_id: s.teacher_id || '', teacher_name: s.teacher_name || '',
  roster_status: s.roster_status || '', payment_ref: s.payment_ref || '', admin_note: s.admin_note || '',
  live_card: isLiveCardSub(s), created_date: s.created_date || '', updated_date: s.updated_date || '',
});

async function lastActiveMap(svc: any) {
  const sessions = (await svc.ActivitySession.filter({}, '-ended_at', 5000)) || [];
  const last = new Map<string, number>();
  for (const s of sessions) {
    const t = s.ended_at ? Date.parse(s.ended_at) : 0;
    if (!t) continue;
    const k = normEmail(s.student_email);
    if (t > (last.get(k) || 0)) last.set(k, t);
  }
  return last;
}

// ------------------------------------------------------------ list

export async function studentsList(ctx: any) {
  const [users, subs, groups, payments, last] = await Promise.all([
    pageAll(ctx.svc.User), pageAll(ctx.svc.StudentSubscription), pageAll(ctx.svc.TeacherReferral),
    pageAll(ctx.svc.ManualPayment), lastActiveMap(ctx.svc),
  ]);
  const byEmail = new Map<string, any[]>();
  const byCreator = new Map<string, any[]>();
  for (const s of subs) {
    const e = normEmail(s.phone);
    if (e) byEmail.set(e, [...(byEmail.get(e) || []), s]);
    if (s.created_by_id) byCreator.set(s.created_by_id, [...(byCreator.get(s.created_by_id) || []), s]);
  }
  const groupByCode = new Map(groups.map((g: any) => [g.code, g]));
  const qrApproved = new Set(payments.filter((p: any) => p.status === 'approved').map((p: any) => p.user_id));
  const claimed = new Set<string>();

  const rows = users.map((u: any) => {
    const mine = subsForUser(u, byEmail, byCreator);
    mine.forEach((s) => claimed.add(s.id));
    const sub = pickSub(mine);
    const g: any = sub?.referral_code ? groupByCode.get(sub.referral_code) : null;
    const lastMs = last.get(normEmail(u.email)) || 0;
    return {
      user_id: u.id,
      name: displayName(u),
      email: u.email || '',
      role: u.role || 'user',
      teacher_status: u.teacher_status || '',
      level: u.cefr_level || '',
      joined_at: u.created_date || '',
      last_active_at: lastMs ? new Date(lastMs).toISOString() : null,
      sub: subView(sub),
      sub_count: mine.length,
      group: g ? { code: g.code, label: g.label || g.code, teacher_name: g.teacher_name || '', teacher_id: g.teacher_id } : (sub?.referral_code ? { code: sub.referral_code, label: sub.referral_code, teacher_name: sub.teacher_name || '', teacher_id: sub.teacher_id || '', missing: true } : null),
      method: methodOf(sub, qrApproved.has(u.id)),
    };
  });

  // Subscription rows whose account no longer exists (deleted users, typos).
  const orphans = subs.filter((s: any) => !claimed.has(s.id)).map(subView).map((s: any) => ({ ...s, email: '' }));
  for (const o of orphans) o.email = normEmail(subs.find((s: any) => s.id === o.id)?.phone);

  const groupOptions = groups
    .filter((g: any) => g.group_status !== 'ended')
    .map((g: any) => ({ code: g.code, label: g.label || g.code, teacher_name: g.teacher_name || '', teacher_id: g.teacher_id, level: g.level || '' }));

  await ctx.audit({ action: 'students_list' });
  return { rows, orphans, groups: groupOptions, as_of: new Date(ctx.now).toISOString() };
}

// ------------------------------------------------------------ detail

async function loadStudent(svc: any, userId: unknown) {
  const id = String(userId || '');
  if (!id) throw new AuthError(400, 'invalid_input');
  let user: any = null;
  try { user = await svc.User.get(id); } catch { user = null; }
  if (!user) throw new AuthError(404, 'not_found');
  const [byEmail, byCreator] = await Promise.all([
    user.email ? svc.StudentSubscription.filter({ phone: user.email }, '-updated_date', 20) : [],
    svc.StudentSubscription.filter({ created_by_id: user.id }, '-updated_date', 20),
  ]);
  const seen = new Map<string, any>();
  for (const s of [...(byEmail || []), ...(byCreator || [])]) seen.set(s.id, s);
  const subs = [...seen.values()];
  return { user, subs, sub: pickSub(subs) };
}

export async function studentDetail(ctx: any) {
  const { user, subs, sub } = await loadStudent(ctx.svc, ctx.body?.user_id);
  const email = normEmail(user.email);
  const since30 = new Date(ctx.now - 30 * DAY_MS).toISOString();
  const [payments, sessions, history, groups] = await Promise.all([
    ctx.svc.ManualPayment.filter({ user_id: user.id }, '-created_date', 50),
    email ? ctx.svc.ActivitySession.filter({ student_email: email }, '-ended_at', 500) : [],
    ctx.svc.AdminAuditLog.filter({ target_id: { $in: [user.id, ...subs.map((s: any) => s.id)] } }, '-created_date', 100),
    pageAll(ctx.svc.TeacherReferral),
  ]);
  const recent = (sessions || []).filter((s: any) => s.ended_at && s.ended_at >= since30);
  const week = recent.filter((s: any) => Date.parse(s.ended_at) >= ctx.now - 7 * DAY_MS);
  const lastAt = (sessions || []).find((s: any) => s.ended_at)?.ended_at || null;

  await ctx.audit({ action: 'student_view', target_type: 'User', target_id: user.id, details: email });
  return {
    profile: {
      user_id: user.id, name: displayName(user), email: user.email || '', role: user.role || 'user',
      teacher_status: user.teacher_status || '', level: user.cefr_level || '', level_source: user.level_source || '',
      joined_at: user.created_date || '', trial_used_at: user.trial_used_at || '', heard_about_us: user.heard_about_us || '',
      classroom_code: user.classroom_code || '',
    },
    subscription: subView(sub),
    other_subscriptions: subs.filter((s: any) => s.id !== sub?.id).map(subView),
    payments: (payments || []).map((p: any) => ({
      id: p.id, plan: p.plan, billing_cycle: p.billing_cycle, amount_uzs: p.amount_uzs, payment_code: p.payment_code,
      status: p.status, submitted_at: p.submitted_at || p.created_date, reviewed_at: p.reviewed_at || '', reviewed_by: p.reviewed_by || '', admin_note: p.admin_note || '',
    })),
    history: (history || []).map((r: any) => ({ ts: r.ts || r.created_date, action: r.action, outcome: r.outcome, details: r.details || '', before: r.before || '', after: r.after || '', actor_email: r.actor_email || '', channel: r.channel || 'console' })),
    activity: {
      last_active_at: lastAt,
      sessions_30d: recent.length,
      minutes_7d: Math.round(week.reduce((n: number, s: any) => n + (Number(s.duration_seconds) || 0), 0) / 60),
      minutes_30d: Math.round(recent.reduce((n: number, s: any) => n + (Number(s.duration_seconds) || 0), 0) / 60),
    },
    groups: groups.filter((g: any) => g.group_status !== 'ended').map((g: any) => ({ code: g.code, label: g.label || g.code, teacher_name: g.teacher_name || '', teacher_id: g.teacher_id, level: g.level || '' })),
  };
}

// ------------------------------------------------------------ actions

const OPS = ['grant', 'extend', 'approve', 'pause', 'resume', 'cancel', 'reactivate', 'move'];
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + 'T00:00:00Z'));

async function mirrorClassroomCode(svc: any, userId: string, code: string) {
  // Same mirror studentApi/teacherApi keep: User.classroom_code + UserCoins.
  try { await svc.User.update(userId, { classroom_code: code }); } catch (e) { console.error('mirror user code', (e as any)?.message); }
  try {
    const coins = (await svc.UserCoins?.filter({ user_id: userId })) || [];
    for (const c of coins) await svc.UserCoins.update(c.id, { classroom_code: code });
  } catch (e) { console.error('mirror coins code', (e as any)?.message); }
}

export async function studentAction(ctx: any) {
  const op = String(ctx.body?.op || '');
  if (!OPS.includes(op)) throw new AuthError(400, 'invalid_input', { field: 'op' });
  const { user, sub } = await loadStudent(ctx.svc, ctx.body?.user_id);
  const note = clean(ctx.body?.note);
  const now = ctx.now;
  const today = new Date(now).toISOString().slice(0, 10);
  const needSub = () => { if (!sub) throw new AuthError(409, 'no_subscription'); };
  const notCard = () => { if (isLiveCardSub(sub)) throw new AuthError(409, 'card_managed_by_dodo'); };
  const wrongState = () => { throw new AuthError(409, 'wrong_state', { kind: subscriptionKind(sub) }); };

  let patch: Record<string, unknown>;
  let group: any = null;
  let details = '';

  switch (op) {
    case 'grant': {
      const plan = String(ctx.body?.plan || '');
      const cycle = String(ctx.body?.cycle || 'monthly');
      const until = ctx.body?.until ? String(ctx.body.until) : '';
      if (!PLAN_NAMES[plan as 'learner' | 'vip'] || !CYCLES.includes(cycle)) throw new AuthError(400, 'invalid_input', { field: 'plan' });
      if (until && (!isDate(until) || until <= today || Date.parse(until) - now > 800 * DAY_MS)) throw new AuthError(400, 'invalid_input', { field: 'until' });
      notCard();
      patch = grantPatch(sub, { plan, cycle, until, note }, now);
      details = `Granted ${PLAN_NAMES[plan as 'learner' | 'vip']} (${cycle}) until ${patch.expires_at}`;
      break;
    }
    case 'extend': {
      const days = Number(ctx.body?.days);
      if (!Number.isInteger(days) || days < 1 || days > 366) throw new AuthError(400, 'invalid_input', { field: 'days' });
      needSub(); notCard();
      if (sub.status !== 'active' || !sub.expires_at) wrongState();
      patch = extendPatch(sub, days, now, note);
      details = `Extended by ${days} days to ${patch.expires_at}`;
      break;
    }
    case 'approve': {
      needSub(); notCard();
      if (!['pending', 'cancelled', 'inactive'].includes(sub.status)) wrongState();
      if (!isRealPlan(sub)) throw new AuthError(409, 'no_plan_to_approve');
      patch = approvePatch(sub, now);
      if (note) patch.admin_note = note;
      details = `Approved ${sub.plan} until ${patch.expires_at}`;
      break;
    }
    case 'pause': {
      needSub(); notCard();
      if (sub.status !== 'active') wrongState();
      patch = pausePatch(sub, now, note);
      details = `Paused (${patch.paused_days_remaining ?? 'no'} days banked)`;
      break;
    }
    case 'resume': {
      needSub(); notCard();
      if (sub.status !== 'paused') wrongState();
      patch = resumePatch(sub, now, note);
      details = `Resumed${patch.expires_at ? ` until ${patch.expires_at}` : ''}`;
      break;
    }
    case 'cancel': {
      needSub(); notCard();
      const immediate = ctx.body?.immediate !== false;
      if (!['active', 'paused'].includes(sub.status)) wrongState();
      if (!immediate && (sub.status !== 'active' || !sub.expires_at)) throw new AuthError(409, 'nothing_to_run_out');
      patch = cancelPatch(sub, { immediate, note }, now);
      details = immediate ? 'Cancelled now' : `Cancels at period end (${sub.expires_at})`;
      break;
    }
    case 'reactivate': {
      needSub(); notCard();
      const kind = subscriptionKind(sub);
      if (kind !== 'cancelled' && kind !== 'ending') wrongState();
      patch = reactivatePatch(sub, now, note);
      details = kind === 'ending' ? 'Scheduled cancellation removed' : `Reactivated until ${patch.expires_at}`;
      break;
    }
    case 'move': {
      if (user.teacher_status === 'approved' || user.teacher_status === 'pending') throw new AuthError(409, 'is_teacher');
      const code = normCode(ctx.body?.code);
      if (code) {
        group = ((await ctx.svc.TeacherReferral.filter({ code }, 'created_date', 1)) || [])[0];
        if (!group) throw new AuthError(404, 'group_not_found');
        if (group.group_status === 'ended') throw new AuthError(409, 'group_ended');
        if (group.teacher_id === user.id) throw new AuthError(409, 'own_group');
        let owner: any = null;
        try { owner = await ctx.svc.User.get(group.teacher_id); } catch { owner = null; }
        if (!owner || !(owner.role === 'admin' || owner.teacher_status === 'approved')) throw new AuthError(409, 'group_unavailable');
        if (sub?.referral_code === code && sub?.roster_status !== 'removed') throw new AuthError(409, 'already_in_group');
        patch = { ...movePatch(group, displayName(owner)), student_name: displayName(user) };
        details = `Moved to ${group.label || code} (${patch.teacher_name}). Commission on future renewals goes to the new teacher.`;
      } else {
        if (!sub?.referral_code) throw new AuthError(409, 'not_in_group');
        patch = movePatch(null);
        details = `Removed from group ${sub.referral_code}`;
      }
      if (note) patch.admin_note = note;
      break;
    }
    default:
      throw new AuthError(400, 'invalid_input');
  }

  const before: Record<string, unknown> = {};
  if (sub) for (const k of Object.keys(patch)) before[k] = sub[k] ?? null;

  let row: any;
  if (sub) row = await ctx.svc.StudentSubscription.update(sub.id, patch);
  else {
    // grant/move for someone with no subscription row yet. A move alone
    // doesn't give access (status inactive), same as joining a class.
    row = await ctx.svc.StudentSubscription.create({
      student_name: displayName(user), phone: user.email, ...(op === 'move' ? { status: 'inactive' } : {}), ...patch,
    });
  }

  if (op === 'move') {
    if (group) { try { await ctx.svc.TeacherReferral.update(group.id, { uses: (group.uses || 0) + 1 }); } catch (e) { console.error('uses', (e as any)?.message); } }
    await mirrorClassroomCode(ctx.svc, user.id, group ? group.code : '');
  }

  await ctx.audit({
    action: `student_${op}`,
    target_type: 'StudentSubscription',
    target_id: row?.id || sub?.id || '',
    before: sub ? before : { created: true },
    after: patch,
    details: `${normEmail(user.email)}: ${details}${note ? ` · note: ${note}` : ''}`,
  });
  // Also index the history under the user id, so a row created here (or a
  // later replacement row) still shows the full story in the drawer.
  return { subscription: subView({ ...(sub || {}), ...(row || {}), ...patch }) };
}
