import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// studentApi: every write that grants access, sets teacher attribution, or
// records homework for the CALLING student. (Teacher Panel phase 1, 2026-09-23)
//
// Why this exists: StudentSubscription, TeacherReferral, User.teacher_status
// and User.classroom_code used to be written straight from the browser, so a
// student could give themselves VIP, approve themselves as a teacher, or point
// their commission attribution at any teacher. RLS now blocks client writes to
// those fields, and this function is the only thing (besides admins and
// dodoWebhook) that changes them.
//
// Rules:
//  - Identity always comes from the session (auth.me()), never the payload.
//  - Writes use the service role and whitelist the fields they touch.
//  - Nothing in the payload is trusted beyond "which assignment / which code /
//    what score". A score is still self-reported by the game; the function
//    makes sure it can only land on an assignment this student actually has.
//
// Keep TRIAL_ENABLED / TRIAL_DAYS in sync with src/lib/subscription.js (the
// client only uses them for copy).

const TRIAL_ENABLED = true;
const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'Asia/Tashkent';

const nowIso = () => new Date().toISOString();
const todayUtc = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString().slice(0, 10);
// Due dates are calendar days as a teacher in Uzbekistan means them.
const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const normEmail = (e: unknown) => String(e || '').trim().toLowerCase();
const normCode = (c: unknown) => String(c || '').trim().toUpperCase().slice(0, 32);

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

const isRealPlan = (sub: any) => !!sub?.plan && !/free/i.test(sub.plan);
const isPayingActive = (sub: any) => sub?.status === 'active' && !sub.is_trial && isRealPlan(sub);
const displayName = (u: any) => u?.display_name || u?.full_name || u?.email || '';

// Same row-selection everywhere: a paid/active row wins over leftovers, then
// the most recently touched. Duplicate rows are an admin clean-up problem;
// this just stops us from picking the wrong one.
async function findSub(svc: any, me: any) {
  let rows = await svc.StudentSubscription.filter({ phone: me.email });
  if (!rows?.length) rows = await svc.StudentSubscription.filter({ created_by_id: me.id });
  if (!rows?.length) return null;
  const rank = (s: any) => (s.status === 'active' ? 2 : 0) + (s.dodo_subscription_id ? 1 : 0);
  return [...rows].sort((a, b) =>
    rank(b) - rank(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || '')),
  )[0];
}

async function findGroupByCode(svc: any, code: string) {
  const rows = await svc.TeacherReferral.filter({ code }, 'created_date');
  return rows?.[0] || null;
}

function membershipOf(sub: any, group: any) {
  if (!sub?.referral_code) return null;
  return {
    code: sub.referral_code,
    teacher_name: sub.teacher_name || group?.teacher_name || '',
    group_label: group?.label || '',
    level: group?.level || '',
    removed: sub.roster_status === 'removed',
  };
}

async function mirrorClassroomCode(svc: any, userId: string, code: string) {
  // User.classroom_code is a read-only mirror of the active membership (it
  // feeds UserCoins.classroom_code and the profile screen). Only this
  // function and teacherApi write it.
  try { await svc.User.update(userId, { classroom_code: code }); } catch (e) { console.error('mirror user code', e?.message); }
  try {
    const coins = await svc.UserCoins.filter({ user_id: userId });
    for (const c of coins || []) await svc.UserCoins.update(c.id, { classroom_code: code });
  } catch (e) { console.error('mirror coins code', e?.message); }
}

// ---------------------------------------------------------------- actions

async function refresh(svc: any, me: any) {
  let sub = await findSub(svc, me);
  // Expiry transition (moved from Home.jsx / handleExpiredSubscription).
  if (sub && sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date()) {
    let patch: any;
    if (sub.cancelled_at) patch = { status: 'cancelled' };
    else if (sub.is_trial) patch = { status: 'active', plan: 'Free Plan', is_trial: false, expires_at: '' };
    else patch = { status: 'inactive' };
    sub = await svc.StudentSubscription.update(sub.id, patch);
  }
  let group = null;
  if (sub?.referral_code) group = await findGroupByCode(svc, sub.referral_code);
  return { subscription: sub || null, membership: membershipOf(sub, group) };
}

async function startTrial(svc: any, me: any) {
  const existing = await findSub(svc, me);
  // An admin-paused/cancelled account must not hand itself access back by
  // re-running onboarding, and a paying member must never be downgraded.
  if (existing && ['paused', 'cancelled'].includes(existing.status)) return { subscription: existing, result: 'blocked' };
  if (existing && isPayingActive(existing)) return { subscription: existing, result: 'already_paying' };
  if (existing?.is_trial && existing.status === 'active') return { subscription: existing, result: 'trial_running' };

  // One trial per account. Legacy rows that already went through a trial
  // (is_trial, or rolled onto the Free Plan) count as used.
  const trialUsed = !!me.trial_used_at || !!existing?.is_trial || /free/i.test(existing?.plan || '');
  const giveTrial = TRIAL_ENABLED && !trialUsed;
  const payload = giveTrial
    ? { status: 'active', plan: 'Learner Plan', is_trial: true, expires_at: addDays(TRIAL_DAYS) }
    : { status: 'active', plan: 'Free Plan', is_trial: false, expires_at: '' };

  const sub = existing
    ? await svc.StudentSubscription.update(existing.id, payload)
    : await svc.StudentSubscription.create({ student_name: displayName(me), phone: me.email, ...payload });
  if (giveTrial) {
    try { await svc.User.update(me.id, { trial_used_at: nowIso() }); } catch (e) { console.error('trial flag', e?.message); }
  }
  return { subscription: sub, result: giveTrial ? 'trial_started' : 'free_plan' };
}

async function joinClass(svc: any, me: any, body: any) {
  const code = normCode(body.code);
  if (!code) throw new ApiError(400, 'code_required');
  if (me.teacher_status === 'approved' || me.teacher_status === 'pending') throw new ApiError(403, 'teachers_cannot_join');

  const group = await findGroupByCode(svc, code);
  if (!group) throw new ApiError(404, 'code_not_found');
  if (group.group_status === 'ended') throw new ApiError(409, 'class_ended');
  if (group.teacher_id === me.id) throw new ApiError(409, 'own_class');
  let owner: any = null;
  try { owner = await svc.User.get(group.teacher_id); } catch { owner = null; }
  if (!owner || !(owner.role === 'admin' || owner.teacher_status === 'approved')) throw new ApiError(409, 'class_unavailable');

  const sub = await findSub(svc, me);
  if (sub && sub.referral_code === code) {
    if (sub.roster_status === 'removed') throw new ApiError(403, 'removed_from_class');
    await mirrorClassroomCode(svc, me.id, code);
    return { subscription: sub, membership: membershipOf(sub, group), result: 'already_member' };
  }

  const patch = {
    referral_code: code,
    teacher_id: group.teacher_id,
    teacher_name: group.teacher_name || displayName(owner),
    roster_status: 'active',
  };
  const next = sub
    ? await svc.StudentSubscription.update(sub.id, patch)
    : await svc.StudentSubscription.create({ student_name: displayName(me), phone: me.email, status: 'inactive', ...patch });
  try { await svc.TeacherReferral.update(group.id, { uses: (group.uses || 0) + 1 }); } catch (e) { console.error('uses', e?.message); }
  await mirrorClassroomCode(svc, me.id, code);
  return { subscription: next, membership: membershipOf(next, group), result: 'joined' };
}

async function leaveClass(svc: any, me: any) {
  const sub = await findSub(svc, me);
  if (sub?.referral_code) {
    await svc.StudentSubscription.update(sub.id, { referral_code: '', teacher_id: '', teacher_name: '', roster_status: 'active' });
  }
  await mirrorClassroomCode(svc, me.id, '');
  return { membership: null, result: 'left' };
}

async function applyTeacher(svc: any, me: any, body: any) {
  if (me.role === 'admin') return { teacher_status: 'approved', result: 'admin' };
  if (me.teacher_status === 'approved' || me.teacher_status === 'pending') return { teacher_status: me.teacher_status, result: 'unchanged' };
  if (me.teacher_status === 'rejected') throw new ApiError(403, 'application_rejected');
  const patch: any = { teacher_status: 'pending' };
  const center = String(body.teaching_center || '').trim().slice(0, 120);
  const phone = String(body.teacher_phone || '').trim().slice(0, 40);
  if (center) patch.teaching_center = center;
  if (phone) patch.teacher_phone = phone;
  await svc.User.update(me.id, patch);
  return { teacher_status: 'pending', result: 'applied' };
}

// Active membership = a subscription row pointing at a group code, not removed,
// whose group still belongs to the teacher on the row.
async function activeMembership(svc: any, me: any) {
  const sub = await findSub(svc, me);
  if (!sub?.referral_code || sub.roster_status === 'removed') return null;
  const group = await findGroupByCode(svc, sub.referral_code);
  if (!group || group.teacher_id !== sub.teacher_id) return null;
  return { sub, group };
}

const isTargeted = (a: any, email: string) =>
  a.target !== 'students' || (a.student_emails || []).map(normEmail).includes(normEmail(email));

function statusFor(a: any, s: any, today: string) {
  if (s?.first_completed_at) return 'completed';
  if (a.due_date && today > a.due_date) return 'overdue';
  return 'assigned';
}

async function listHomework(svc: any, me: any) {
  const m = await activeMembership(svc, me);
  if (!m) return { membership: null, assignments: [] };
  const rows = await svc.HomeworkAssignment.filter(
    { classroom_code: m.group.code, teacher_id: m.group.teacher_id, status: 'active' },
    '-created_date', 100,
  );
  const mine = (rows || []).filter((a: any) => isTargeted(a, me.email));
  const subs = await svc.HomeworkSubmission.filter({ student_email: normEmail(me.email) }, '-last_completed_at', 500);
  const byAssignment = new Map((subs || []).map((s: any) => [s.assignment_id, s]));
  const today = todayLocal();
  const order: Record<string, number> = { overdue: 0, assigned: 1, completed: 2 };
  const assignments = mine.map((a: any) => {
    const s: any = byAssignment.get(a.id);
    return {
      id: a.id,
      title: a.title,
      skill_label: a.skill_label || '',
      game: a.game,
      bank: a.bank || '',
      difficulty: a.difficulty || '',
      due_date: a.due_date || '',
      teacher_name: a.teacher_name || m.group.teacher_name || '',
      group_label: a.group_label || m.group.label || '',
      status: statusFor(a, s, today),
      best_score_pct: s?.best_score_pct ?? null,
      attempts: s?.attempts || 0,
      completed_at: s?.first_completed_at || null,
      completed_late: !!s?.completed_late,
    };
  }).sort((x: any, y: any) =>
    order[x.status] - order[y.status] || String(x.due_date || '9999').localeCompare(String(y.due_date || '9999')),
  );
  return { membership: membershipOf(m.sub, m.group), assignments, today };
}

async function submitHomework(svc: any, me: any, body: any) {
  const id = String(body.assignment_id || '');
  const score = Number(body.score_pct);
  if (!id) throw new ApiError(400, 'assignment_required');
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new ApiError(400, 'bad_score');

  let a: any = null;
  try { a = await svc.HomeworkAssignment.get(id); } catch { a = null; }
  if (!a) throw new ApiError(404, 'assignment_not_found');
  if (a.status !== 'active') throw new ApiError(409, 'assignment_closed');

  const m = await activeMembership(svc, me);
  if (!m || m.group.code !== a.classroom_code || m.group.teacher_id !== a.teacher_id || !isTargeted(a, me.email)) {
    throw new ApiError(403, 'not_assigned');
  }

  const email = normEmail(me.email);
  const pct = Math.round(score);
  const now = nowIso();
  const existing = (await svc.HomeworkSubmission.filter({ assignment_id: a.id, student_email: email }))?.[0];
  let submission;
  if (existing) {
    submission = await svc.HomeworkSubmission.update(existing.id, {
      attempts: (existing.attempts || 0) + 1,
      last_score_pct: pct,
      best_score_pct: Math.max(existing.best_score_pct ?? 0, pct),
      last_completed_at: now,
      student_name: displayName(me),
    });
  } else {
    submission = await svc.HomeworkSubmission.create({
      assignment_id: a.id,
      teacher_id: a.teacher_id,
      group_id: a.group_id || m.group.id,
      student_email: email,
      student_id: me.id,
      student_name: displayName(me),
      attempts: 1,
      best_score_pct: pct,
      last_score_pct: pct,
      first_completed_at: now,
      last_completed_at: now,
      completed_late: !!(a.due_date && todayLocal() > a.due_date),
    });
  }
  return { submission };
}

// ---------------------------------------------------------------- router

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = {
  refresh: (svc, me) => refresh(svc, me),
  startTrial: (svc, me) => startTrial(svc, me),
  joinClass,
  leaveClass: (svc, me) => leaveClass(svc, me),
  applyTeacher,
  listHomework: (svc, me) => listHomework(svc, me),
  submitHomework,
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me?.id || !me?.email) return Response.json({ error: 'not authenticated', code: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fn = ACTIONS[String(body.action || '')];
    if (!fn) return Response.json({ error: 'unknown action', code: 'unknown_action' }, { status: 400 });

    const data = await fn(base44.asServiceRole.entities, me, body);
    return Response.json({ ok: true, ...data });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('studentApi error:', error);
    return Response.json({ error: error?.message || 'server error', code: 'server_error' }, { status: 500 });
  }
});
