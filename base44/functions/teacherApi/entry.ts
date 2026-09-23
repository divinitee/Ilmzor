import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// teacherApi: the Teacher Panel's only read/write path for classes, rosters,
// homework and results. (Teacher Panel phase 1, 2026-09-23)
//
// Access: role admin, or User.teacher_status === "approved". teacher_status
// is field-locked to admins, so it can't be self-granted any more.
//
// Scope: every query is filtered to teacher_id === the caller. A teacher can
// only see students whose StudentSubscription names them as teacher (set
// server-side by studentApi.joinClass), and can only change rows they own.
// Service role is used for all reads/writes, so the checks in this file ARE
// the security boundary. Don't add an action without an ownership check.

const TZ = 'Asia/Tashkent';
const INACTIVE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const normEmail = (e: unknown) => String(e || '').trim().toLowerCase();
const displayName = (u: any) => u?.display_name || u?.full_name || u?.email || '';

// Activities a student can actually launch from an assignment (SkillHub.jsx's
// activeGame switch). Anything else would be an assignment nobody can open.
const PLAYABLE_GAMES = new Set([
  'quiz', 'sentence', 'usage', 'spelling', 'wordforms', 'crossword', 'definition', 'grammar',
  'definition_match', 'context_guess', 'memory_flip', 'picture_match', 'synonym_sprint',
  'odd_one_out', 'related_words', 'connection_challenge',
]);
const LEVELS = new Set(['Starter', 'A1', 'A2', 'B1', 'B2', 'C1']);
const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const GROUP_STATUSES = new Set(['running', 'paused', 'ended']);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

// Same classifier as src/lib/subscription.js subscriptionKind().
function subscriptionKind(sub: any) {
  if (!sub) return 'unpaid';
  if (sub.status === 'pending') return 'pending';
  if (sub.status === 'paused') return 'paused';
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.status !== 'active') return 'unpaid';
  if (sub.cancelled_at) return 'ending';
  if (sub.is_trial) return 'trial';
  if (!sub.plan || /free/i.test(sub.plan)) return 'free';
  return 'paid';
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

function cleanGroupFields(body: any) {
  const out: any = {};
  if (body.label !== undefined) out.label = String(body.label || '').trim().slice(0, 80);
  if (body.level !== undefined) {
    if (body.level && !LEVELS.has(body.level)) throw new ApiError(400, 'bad_level');
    out.level = body.level || null;
  }
  if (body.days !== undefined) {
    const days = Array.isArray(body.days) ? body.days.filter((d: string) => DAYS.has(d)) : [];
    out.days = [...new Set(days)];
  }
  for (const k of ['start_time', 'end_time']) {
    if (body[k] !== undefined) {
      if (body[k] && !TIME_RE.test(body[k])) throw new ApiError(400, 'bad_time');
      out[k] = body[k] || null;
    }
  }
  if (body.group_status !== undefined) {
    if (!GROUP_STATUSES.has(body.group_status)) throw new ApiError(400, 'bad_group_status');
    out.group_status = body.group_status;
  }
  return out;
}

async function ownedGroup(svc: any, me: any, groupId: string) {
  let g: any = null;
  try { g = await svc.TeacherReferral.get(String(groupId || '')); } catch { g = null; }
  if (!g || g.teacher_id !== me.id) throw new ApiError(404, 'group_not_found');
  return g;
}

async function myRoster(svc: any, me: any) {
  const subs = await svc.StudentSubscription.filter({ teacher_id: me.id }, 'created_date', 1000);
  return subs || [];
}

// ---------------------------------------------------------------- reads

async function overview(svc: any, me: any) {
  const [groups, subs, assignments, submissions] = await Promise.all([
    svc.TeacherReferral.filter({ teacher_id: me.id }, 'created_date', 200),
    myRoster(svc, me),
    svc.HomeworkAssignment.filter({ teacher_id: me.id }, '-created_date', 300),
    svc.HomeworkSubmission.filter({ teacher_id: me.id }, '-last_completed_at', 2000),
  ]);
  const groupByCode = new Map((groups || []).map((g: any) => [g.code, g]));

  // Last activity per rostered student, from ActivitySession by the
  // student's own email (not the client-stamped teacher_id).
  const emails = [...new Set(subs.map((s: any) => s.phone).filter(Boolean))];
  const lastActive = new Map<string, number>();
  const weekSeconds = new Map<string, number>();
  if (emails.length) {
    const weekAgo = Date.now() - 7 * DAY_MS;
    const sessions = await svc.ActivitySession.filter({ student_email: { $in: emails } }, '-ended_at', 3000);
    for (const s of sessions || []) {
      const t = s.ended_at ? new Date(s.ended_at).getTime() : 0;
      if (!t) continue;
      const k = normEmail(s.student_email);
      if (!lastActive.has(k) || t > (lastActive.get(k) || 0)) lastActive.set(k, t);
      if (t >= weekAgo) weekSeconds.set(k, (weekSeconds.get(k) || 0) + (s.duration_seconds || 0));
    }
  }

  const today = todayLocal();
  const subsByAssignment = new Map<string, Map<string, any>>();
  for (const s of submissions || []) {
    if (!subsByAssignment.has(s.assignment_id)) subsByAssignment.set(s.assignment_id, new Map());
    subsByAssignment.get(s.assignment_id)!.set(normEmail(s.student_email), s);
  }

  const students = subs.map((s: any) => {
    const email = normEmail(s.phone);
    const g: any = groupByCode.get(s.referral_code);
    const last = lastActive.get(email) || 0;
    const joinedMs = s.created_date ? new Date(s.created_date).getTime() : Date.now();
    const activity = last
      ? (Date.now() - last >= INACTIVE_DAYS * DAY_MS ? 'inactive' : 'active')
      : (Date.now() - joinedMs >= INACTIVE_DAYS * DAY_MS ? 'inactive' : 'new');
    return {
      subscription_id: s.id,
      email,
      name: s.student_name || email,
      group_id: g?.id || null,
      group_code: s.referral_code || '',
      group_label: g?.label || '',
      roster_status: s.roster_status === 'removed' ? 'removed' : 'active',
      plan_kind: subscriptionKind(s),
      last_active_at: last ? new Date(last).toISOString() : null,
      week_minutes: Math.round((weekSeconds.get(email) || 0) / 60),
      activity,
      joined_at: s.created_date || null,
    };
  });
  const activeByCode = new Map<string, any[]>();
  for (const st of students) {
    if (st.roster_status !== 'active' || !st.group_code) continue;
    if (!activeByCode.has(st.group_code)) activeByCode.set(st.group_code, []);
    activeByCode.get(st.group_code)!.push(st);
  }

  const assignmentRows = (assignments || []).map((a: any) => {
    const members = activeByCode.get(a.classroom_code) || [];
    const targeted = a.target === 'students'
      ? members.filter((m: any) => (a.student_emails || []).map(normEmail).includes(m.email))
      : members;
    const done = subsByAssignment.get(a.id) || new Map();
    // Recipients = current targeted members, plus anyone who already
    // completed it (a completion never vanishes because a student moved).
    const recipientEmails = new Set<string>([...targeted.map((m: any) => m.email), ...done.keys()]);
    const nameOf = new Map(students.map((st: any) => [st.email, st.name]));
    const recipients = [...recipientEmails].map((email) => {
      const sub: any = done.get(email);
      const status = sub?.first_completed_at ? 'completed' : (a.due_date && today > a.due_date ? 'overdue' : 'assigned');
      return {
        email,
        name: nameOf.get(email) || sub?.student_name || email,
        status,
        best_score_pct: sub?.best_score_pct ?? null,
        attempts: sub?.attempts || 0,
        completed_at: sub?.first_completed_at || null,
        completed_late: !!sub?.completed_late,
        still_member: targeted.some((m: any) => m.email === email),
      };
    });
    const count = (st: string) => recipients.filter((r) => r.status === st).length;
    const g: any = groupByCode.get(a.classroom_code);
    return {
      id: a.id,
      title: a.title,
      skill_label: a.skill_label || '',
      game: a.game,
      difficulty: a.difficulty || '',
      due_date: a.due_date || '',
      status: a.status,
      target: a.target || 'class',
      group_id: g?.id || a.group_id || null,
      group_code: a.classroom_code,
      group_label: g?.label || a.group_label || '',
      created_at: a.created_date,
      counts: { total: recipients.length, completed: count('completed'), overdue: count('overdue'), assigned: count('assigned') },
      recipients,
    };
  });

  const recent = (submissions || []).slice(0, 12).map((s: any) => {
    const a = (assignments || []).find((x: any) => x.id === s.assignment_id);
    return {
      assignment_id: s.assignment_id,
      assignment_title: a?.title || 'Assignment',
      student_email: s.student_email,
      student_name: s.student_name || s.student_email,
      best_score_pct: s.best_score_pct ?? null,
      last_score_pct: s.last_score_pct ?? null,
      completed_at: s.last_completed_at || s.first_completed_at,
      completed_late: !!s.completed_late,
    };
  });

  const groupRows = (groups || []).map((g: any) => ({
    id: g.id,
    code: g.code,
    label: g.label || '',
    level: g.level || '',
    days: g.days || [],
    start_time: g.start_time || '',
    end_time: g.end_time || '',
    group_status: g.group_status || 'running',
    student_count: (activeByCode.get(g.code) || []).length,
  }));

  return {
    access: 'approved',
    teacher: { id: me.id, name: displayName(me), email: me.email },
    today,
    groups: groupRows,
    students,
    assignments: assignmentRows,
    recent_completions: recent,
  };
}

async function studentActivity(svc: any, me: any, body: any) {
  const email = normEmail(body.email);
  const roster = await myRoster(svc, me);
  if (!roster.some((s: any) => normEmail(s.phone) === email)) throw new ApiError(404, 'student_not_found');
  const sessions = await svc.ActivitySession.filter({ student_email: email }, '-ended_at', 100);
  return { sessions: sessions || [] };
}

// ---------------------------------------------------------------- writes

async function createGroup(svc: any, me: any, body: any) {
  const fields = cleanGroupFields(body);
  let code = '';
  for (let i = 0; i < 8 && !code; i++) {
    const candidate = generateCode();
    const clash = await svc.TeacherReferral.filter({ code: candidate });
    if (!clash?.length) code = candidate;
  }
  if (!code) throw new ApiError(500, 'code_generation_failed');
  const existing = await svc.TeacherReferral.filter({ teacher_id: me.id });
  const group = await svc.TeacherReferral.create({
    teacher_id: me.id,
    teacher_name: displayName(me),
    teacher_email: me.email,
    code,
    uses: 0,
    ...fields,
    label: fields.label || `Group ${(existing?.length || 0) + 1}`,
    group_status: 'running',
  });
  return { group };
}

async function updateGroup(svc: any, me: any, body: any) {
  const g = await ownedGroup(svc, me, body.group_id);
  const fields = cleanGroupFields(body);
  const group = await svc.TeacherReferral.update(g.id, fields);
  return { group };
}

async function setRoster(svc: any, me: any, body: any) {
  let sub: any = null;
  try { sub = await svc.StudentSubscription.get(String(body.subscription_id || '')); } catch { sub = null; }
  if (!sub || sub.teacher_id !== me.id) throw new ApiError(404, 'student_not_found');
  const removed = !!body.removed;
  // Roster only. Never touches status/plan (the student's own access) and
  // never touches teacher_id (commission attribution follows the student's
  // own join/leave, not a roster toggle).
  await svc.StudentSubscription.update(sub.id, { roster_status: removed ? 'removed' : 'active' });
  try {
    const users = await svc.User.filter({ email: sub.phone });
    if (users?.[0]) await svc.User.update(users[0].id, { classroom_code: removed ? '' : sub.referral_code || '' });
  } catch (e) { console.error('mirror code', e?.message); }
  return { subscription_id: sub.id, roster_status: removed ? 'removed' : 'active' };
}

async function createAssignment(svc: any, me: any, body: any) {
  const g = await ownedGroup(svc, me, body.group_id);
  if (g.group_status === 'ended') throw new ApiError(409, 'group_ended');
  const game = String(body.game || '');
  if (!PLAYABLE_GAMES.has(game)) throw new ApiError(400, 'unsupported_activity');
  const due = body.due_date ? String(body.due_date) : '';
  if (due && !DATE_RE.test(due)) throw new ApiError(400, 'bad_due_date');
  if (due && due < todayLocal()) throw new ApiError(400, 'due_date_in_past');

  const target = body.target === 'students' ? 'students' : 'class';
  let studentEmails: string[] = [];
  if (target === 'students') {
    const wanted = new Set((Array.isArray(body.student_emails) ? body.student_emails : []).map(normEmail));
    const roster = await myRoster(svc, me);
    studentEmails = roster
      .filter((s: any) => s.referral_code === g.code && s.roster_status !== 'removed' && wanted.has(normEmail(s.phone)))
      .map((s: any) => normEmail(s.phone));
    if (!studentEmails.length) throw new ApiError(400, 'no_valid_students');
  }

  const assignment = await svc.HomeworkAssignment.create({
    teacher_id: me.id,
    teacher_email: me.email,
    teacher_name: displayName(me),
    classroom_code: g.code,
    group_id: g.id,
    group_label: g.label || '',
    target,
    student_emails: studentEmails,
    skill_id: String(body.skill_id || '').slice(0, 60),
    skill_label: String(body.skill_label || '').slice(0, 80),
    title: String(body.title || game).slice(0, 120),
    game,
    bank: body.bank ? String(body.bank).slice(0, 60) : undefined,
    difficulty: body.difficulty ? String(body.difficulty).slice(0, 20) : undefined,
    due_date: due || undefined,
    status: 'active',
  });
  return { assignment };
}

async function closeAssignment(svc: any, me: any, body: any) {
  let a: any = null;
  try { a = await svc.HomeworkAssignment.get(String(body.assignment_id || '')); } catch { a = null; }
  if (!a || a.teacher_id !== me.id) throw new ApiError(404, 'assignment_not_found');
  await svc.HomeworkAssignment.update(a.id, { status: body.reopen ? 'active' : 'closed' });
  return { assignment_id: a.id, status: body.reopen ? 'active' : 'closed' };
}

// ---------------------------------------------------------------- router

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = {
  overview: (svc, me) => overview(svc, me),
  studentActivity,
  createGroup,
  updateGroup,
  setRoster,
  createAssignment,
  closeAssignment,
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me?.id) return Response.json({ error: 'not authenticated', code: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const allowed = me.role === 'admin' || me.teacher_status === 'approved';
    if (!allowed) {
      // Pending/rejected applicants get a readable answer for the panel's
      // status screen, and nothing else.
      if (action === 'overview') return Response.json({ ok: true, access: me.teacher_status || 'none' });
      return Response.json({ error: 'teacher access required', code: 'not_teacher' }, { status: 403 });
    }
    const fn = ACTIONS[action];
    if (!fn) return Response.json({ error: 'unknown action', code: 'unknown_action' }, { status: 400 });
    const data = await fn(base44.asServiceRole.entities, me, body);
    return Response.json({ ok: true, ...data });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('teacherApi error:', error);
    return Response.json({ error: error?.message || 'server error', code: 'server_error' }, { status: 500 });
  }
});
