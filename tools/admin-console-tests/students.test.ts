// Admin Console P2a (Students) tests.
//   deno test --allow-read tools/admin-console-tests/students.test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { createAdminApiHandler } from '../../base44/shared/adminApiHandler.ts';
import { totpAt, stepAt } from '../../base44/shared/adminAuthCore.ts';
import { makeWorld } from './mock_base44.ts';

const KEY = 'test-key-0123456789-abcdefghijklmnopqrstuvwxyz';
const T0 = Date.parse('2026-10-04T08:00:15Z');
const DAY = 86400000;

async function setup() {
  const world = makeWorld();
  let now = T0;
  const handle = createAdminApiHandler({
    createClientFromRequest: world.createClientFromRequest,
    getSecret: (n) => ({ ADMIN_SESSION_KEY: KEY, ADMIN_CONSOLE_USER_IDS: 'u_tee' } as Record<string, string>)[n],
    now: () => now,
  });
  const call = async (who: string | null, action: string, payload: Record<string, unknown> = {}) => {
    const headers: Record<string, string> = {};
    if (who) headers['x-test-user'] = who;
    const res = await handle(new Request('http://x', { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) }));
    return { status: res.status, body: await res.json() };
  };
  const s = await call('tee', 'enrollStart');
  const c = await call('tee', 'enrollConfirm', { code: await totpAt(s.body.secret, stepAt(now)) });
  const token = c.body.token as string;
  const E = world.entities;
  // seed data
  E.TeacherReferral.rows.push(
    { id: 'g1', code: 'MALIKA1', label: 'Malika B1 evening', teacher_id: 'u_teacher', teacher_name: 'Malika', uses: 2, group_status: 'active' },
    { id: 'g2', code: 'TEE1', label: 'Tee IELTS', teacher_id: 'u_tee', teacher_name: 'Tee', uses: 0, group_status: 'active' },
    { id: 'g3', code: 'OLD1', label: 'Old group', teacher_id: 'u_teacher', teacher_name: 'Malika', uses: 5, group_status: 'ended' },
  );
  E.ActivitySession.rows.push(
    { id: 'a1', student_email: 'student@example.com', ended_at: '2026-10-03T10:00:00Z', duration_seconds: 600 },
    { id: 'a2', student_email: 'student@example.com', ended_at: '2026-09-20T10:00:00Z', duration_seconds: 1200 },
  );
  const act = (op: string, extra: Record<string, unknown> = {}, user_id = 'u_student') => call('tee', 'studentAction', { token, user_id, op, ...extra });
  const subOf = (email: string) => E.StudentSubscription.rows.find((r) => r.phone === email);
  return { world, E, call, token, act, subOf, tick: (ms: number) => { now += ms; } };
}

Deno.test('students: all three actions need a console token and an allowlisted admin', async () => {
  const t = await setup();
  for (const action of ['studentsList', 'studentDetail', 'studentAction']) {
    assertEquals((await t.call('tee', action, { user_id: 'u_student', op: 'pause' })).body.code, 'token_missing', action);
    assertEquals((await t.call('student', action, { token: t.token })).body.code, 'forbidden', action);
    assertEquals((await t.call('ilmzor', action, { token: t.token })).body.code, 'not_allowlisted', action);
  }
});

Deno.test('studentsList: rows with plan kind, group, method, last active; orphans listed', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push(
    { id: 's1', phone: 'student@example.com', status: 'active', plan: 'Learner Plan', is_trial: true, expires_at: '2026-10-06', referral_code: 'MALIKA1', teacher_id: 'u_teacher', updated_date: '2026-10-01' },
    { id: 's9', phone: 'gone@example.com', status: 'active', plan: 'VIP Plan', expires_at: '2026-11-01', updated_date: '2026-10-01' },
  );
  const r = await t.call('tee', 'studentsList', { token: t.token });
  assertEquals(r.status, 200);
  const st = r.body.rows.find((x: any) => x.email === 'student@example.com');
  assertEquals(st.sub.kind, 'trial');
  assertEquals(st.group.label, 'Malika B1 evening');
  assertEquals(st.last_active_at, '2026-10-03T10:00:00.000Z');
  assertEquals(r.body.orphans.map((o: any) => o.email), ['gone@example.com']);
  assert(!r.body.groups.some((g: any) => g.code === 'OLD1'), 'ended groups not offered');
});

Deno.test('grant: creates a row for someone with none; validates input; audited with before/after', async () => {
  const t = await setup();
  assertEquals((await t.act('grant', { plan: 'gold', cycle: 'monthly' })).body.code, 'invalid_input');
  assertEquals((await t.act('grant', { plan: 'vip', cycle: 'monthly', until: '2026-01-01' })).body.code, 'invalid_input');
  const r = await t.act('grant', { plan: 'vip', cycle: 'monthly', note: 'paid cash' });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const row = t.subOf('student@example.com');
  assertEquals(row.plan, 'VIP Plan');
  assertEquals(row.status, 'active');
  assertEquals(row.expires_at, '2026-11-04');
  assertEquals(row.payment_ref, 'admin-grant');
  assertEquals(row.paid_since, '2026-10-04');
  const a = t.E.AdminAuditLog.rows.find((x) => x.action === 'student_grant');
  assert(a && a.before.includes('created') && a.after.includes('VIP Plan') && a.details.includes('paid cash'));
  assertEquals(a.target_id, row.id);
});

Deno.test('live card subscription: plan changes refused, group move allowed', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push({ id: 's1', phone: 'student@example.com', status: 'active', provider: 'dodo', dodo_subscription_id: 'sub_x', plan: 'Learner Plan', expires_at: '2026-11-01', updated_date: '2026-10-01' });
  for (const op of ['grant', 'extend', 'pause', 'cancel']) {
    const r = await t.act(op, { plan: 'vip', cycle: 'monthly', days: 7 });
    assertEquals(r.body.code, 'card_managed_by_dodo', op);
  }
  assertEquals((await t.act('move', { code: 'MALIKA1' })).status, 200);
});

Deno.test('extend adds on top of remaining days; refused on a free plan', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push({ id: 's1', phone: 'student@example.com', status: 'active', plan: 'Learner Plan', expires_at: '2026-10-10', updated_date: '2026-10-01' });
  assertEquals((await t.act('extend', { days: 0 })).body.code, 'invalid_input');
  assertEquals((await t.act('extend', { days: 7 })).status, 200);
  assertEquals(t.subOf('student@example.com').expires_at, '2026-10-17');
  t.E.StudentSubscription.rows[0].plan = 'Free Plan';
  t.E.StudentSubscription.rows[0].expires_at = '';
  assertEquals((await t.act('extend', { days: 7 })).body.code, 'wrong_state');
});

Deno.test('pause banks days, resume gives them back; wrong states refused', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push({ id: 's1', phone: 'student@example.com', status: 'active', plan: 'VIP Plan', expires_at: '2026-10-14', updated_date: '2026-10-01' });
  assertEquals((await t.act('resume')).body.code, 'wrong_state');
  assertEquals((await t.act('pause')).status, 200);
  const row = t.subOf('student@example.com');
  assertEquals(row.status, 'paused');
  assertEquals(row.paused_days_remaining, 10);
  t.tick(30 * DAY);
  assertEquals((await t.act('resume')).status, 200);
  assertEquals(t.subOf('student@example.com').expires_at, '2026-11-13');
});

Deno.test('cancel now vs at period end, and reactivate both', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push({ id: 's1', phone: 'student@example.com', status: 'active', plan: 'VIP Plan', billing_cycle: 'monthly', expires_at: '2026-10-20', updated_date: '2026-10-01' });
  assertEquals((await t.act('cancel', { immediate: false })).status, 200);
  let row = t.subOf('student@example.com');
  assertEquals([row.status, row.cancelled_at], ['active', '2026-10-04']);
  assertEquals((await t.act('reactivate')).status, 200);
  assertEquals(t.subOf('student@example.com').cancelled_at, '');
  assertEquals((await t.act('cancel', { immediate: true })).status, 200);
  assertEquals(t.subOf('student@example.com').status, 'cancelled');
  assertEquals((await t.act('reactivate')).status, 200);
  row = t.subOf('student@example.com');
  assertEquals([row.status, row.expires_at], ['active', '2026-11-04']);
});

Deno.test('approve: a pending real plan only', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push({ id: 's1', phone: 'student@example.com', status: 'pending', plan: 'Learner Plan', billing_cycle: 'yearly', updated_date: '2026-10-01' });
  assertEquals((await t.act('approve')).status, 200);
  const row = t.subOf('student@example.com');
  assertEquals([row.status, row.expires_at], ['active', '2027-10-04']);
  assertEquals((await t.act('approve')).body.code, 'wrong_state');
});

Deno.test('move: commission follows the student; mirrors classroom code; guards', async () => {
  const t = await setup();
  t.E.StudentSubscription.rows.push({ id: 's1', phone: 'student@example.com', status: 'active', plan: 'VIP Plan', expires_at: '2026-11-01', referral_code: 'TEE1', teacher_id: 'u_tee', teacher_name: 'Tee', updated_date: '2026-10-01' });
  t.E.UserCoins.rows.push({ id: 'c1', user_id: 'u_student', classroom_code: 'TEE1' });
  assertEquals((await t.act('move', { code: 'NOPE' })).body.code, 'group_not_found');
  assertEquals((await t.act('move', { code: 'OLD1' })).body.code, 'group_ended');
  assertEquals((await t.act('move', { code: 'TEE1' })).body.code, 'already_in_group');
  assertEquals((await t.act('move', { code: 'MALIKA1' }, 'u_teacher')).body.code, 'is_teacher');
  const r = await t.act('move', { code: 'malika1' });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const row = t.subOf('student@example.com');
  assertEquals([row.referral_code, row.teacher_id, row.teacher_name, row.roster_status], ['MALIKA1', 'u_teacher', 'Malika', 'active']);
  assertEquals(t.E.TeacherReferral.rows.find((g) => g.code === 'MALIKA1').uses, 3);
  assertEquals(t.E.User.rows.find((u) => u.id === 'u_student').classroom_code, 'MALIKA1');
  assertEquals(t.E.UserCoins.rows[0].classroom_code, 'MALIKA1');
  const a = t.E.AdminAuditLog.rows.find((x) => x.action === 'student_move');
  assert(a.before.includes('u_tee') && a.after.includes('u_teacher'));
  // unassign
  assertEquals((await t.act('move', { code: '' })).status, 200);
  assertEquals(t.subOf('student@example.com').teacher_id, '');
  assertEquals((await t.act('move', { code: '' })).body.code, 'not_in_group');
});

Deno.test('move: Tee cannot be put in his own group', async () => {
  const t = await setup();
  assertEquals((await t.act('move', { code: 'TEE1' }, 'u_tee')).body.code, 'own_group');
});

Deno.test('studentDetail: profile, payments, history and activity', async () => {
  const t = await setup();
  t.E.ManualPayment.rows.push({ id: 'p1', user_id: 'u_student', plan: 'learner', billing_cycle: 'monthly', amount_uzs: 35999, payment_code: 'VR-1', status: 'approved' });
  await t.act('grant', { plan: 'learner', cycle: 'monthly' });
  const d = await t.call('tee', 'studentDetail', { token: t.token, user_id: 'u_student' });
  assertEquals(d.status, 200);
  assertEquals(d.body.profile.email, 'student@example.com');
  assertEquals(d.body.subscription.kind, 'paid');
  assertEquals(d.body.payments.length, 1);
  assert(d.body.history.some((h: any) => h.action === 'student_grant'));
  assertEquals(d.body.activity.minutes_7d, 10);
  assertEquals(d.body.activity.minutes_30d, 30);
  assertEquals((await t.call('tee', 'studentDetail', { token: t.token, user_id: 'nobody' })).body.code, 'not_found');
});
