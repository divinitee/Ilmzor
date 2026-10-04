// Admin Console (VT-35 P1) refusal tests.
//
//   cd <app root> && deno test --allow-read tools/admin-console-tests/
//
// Drives base44/shared/adminApiHandler.ts with an in-memory Base44
// (mock_base44.ts), a fake clock and fake secrets. entry_wiring.test.ts also
// loads the real functions/adminApi/entry.ts through import_map.json.

import { assert, assertEquals, assertNotEquals, assertMatch } from 'jsr:@std/assert@1';
import { createAdminApiHandler } from '../../base44/shared/adminApiHandler.ts';
import {
  totpAt, stepAt, TOKEN_TTL_MS, LOCK_MS, PENDING_ENROL_TTL_MS, base32Encode,
  deriveKeys, signToken,
} from '../../base44/shared/adminAuthCore.ts';
import { computeOverview } from '../../base44/shared/adminOverviewCore.ts';
import { makeWorld } from './mock_base44.ts';

const KEY = 'test-key-0123456789-abcdefghijklmnopqrstuvwxyz';
const T0 = Date.parse('2026-10-04T08:00:15Z'); // mid-step, away from a boundary

function setup(opts: { key?: string | null; allow?: string | null } = {}) {
  const world = makeWorld();
  let now = T0;
  const secrets: Record<string, string | null | undefined> = {
    ADMIN_SESSION_KEY: opts.key === undefined ? KEY : opts.key,
    ADMIN_CONSOLE_USER_IDS: opts.allow === undefined ? 'u_tee' : opts.allow,
  };
  const handle = createAdminApiHandler({
    createClientFromRequest: world.createClientFromRequest,
    getSecret: (n) => secrets[n],
    now: () => now,
  });
  const call = async (who: string | null, action: string, payload: Record<string, unknown> = {}, method = 'POST') => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (who) headers['x-test-user'] = who;
    const res = await handle(new Request('http://x/adminApi', { method, headers, body: method === 'POST' ? JSON.stringify({ action, ...payload }) : undefined }));
    return { status: res.status, body: await res.json() };
  };
  return {
    world, call, secrets,
    get now() { return now; },
    tick: (ms: number) => { now += ms; },
    codeFor: (seed: string, offset = 0) => totpAt(seed, stepAt(now) + offset),
  };
}

// Enrol Tee and return the seed, token and backup codes.
async function enrolled(t: ReturnType<typeof setup>) {
  const s = await t.call('tee', 'enrollStart');
  assertEquals(s.status, 200);
  const seed = s.body.secret as string;
  const c = await t.call('tee', 'enrollConfirm', { code: await t.codeFor(seed) });
  assertEquals(c.status, 200, JSON.stringify(c.body));
  t.tick(30_000); // next step, so the next login code isn't a replay
  return { seed, token: c.body.token as string, backup: c.body.backup_codes as string[] };
}

const audits = (t: ReturnType<typeof setup>) => t.world.entities.AdminAuditLog.rows;
const lastAudit = (t: ReturnType<typeof setup>) => audits(t)[audits(t).length - 1];

// ------------------------------------------------------------ RFC 6238

Deno.test('TOTP matches the RFC 6238 SHA-1 test vector', async () => {
  const seed = base32Encode(new TextEncoder().encode('12345678901234567890'));
  // RFC: T=59 → 94287082 (8 digits); 6-digit truncation → 287082
  assertEquals(await totpAt(seed, stepAt(59_000)), '287082');
  // T=1111111109 → 07081804 → 081804
  assertEquals(await totpAt(seed, stepAt(1111111109_000)), '081804');
});

// ------------------------------------------------------------ gate refusals

Deno.test('refuses: not signed in', async () => {
  const t = setup();
  const r = await t.call(null, 'status');
  assertEquals(r.status, 401);
  assertEquals(r.body.code, 'unauthenticated');
});

Deno.test('refuses: GET', async () => {
  const t = setup();
  assertEquals((await t.call('tee', 'status', {}, 'GET')).status, 405);
});

Deno.test('refuses (fail closed): ADMIN_SESSION_KEY missing or short, allowlist empty', async () => {
  for (const cfg of [{ key: null }, { key: 'short-key' }, { allow: '' }, { allow: null }]) {
    const t = setup(cfg);
    const r = await t.call('tee', 'status');
    assertEquals(r.status, 503, JSON.stringify(cfg));
    assertEquals(r.body.code, 'not_configured');
  }
});

Deno.test('refuses: signed-in student (not admin)', async () => {
  const t = setup({ allow: 'u_tee,u_student' }); // even if wrongly allowlisted
  const r = await t.call('student', 'status');
  assertEquals(r.status, 403);
  assertEquals(r.body.code, 'forbidden');
  assertEquals(lastAudit(t).outcome, 'refused');
  assertEquals(lastAudit(t).actor_id, 'u_student');
});

Deno.test('refuses: admin role but not on the allowlist (the ilmzor account)', async () => {
  const t = setup();
  for (const action of ['status', 'enrollStart', 'verify', 'overview']) {
    const r = await t.call('ilmzor', action, { code: '123456' });
    assertEquals(r.status, 403, action);
    assertEquals(r.body.code, 'not_allowlisted');
  }
  assertEquals(t.world.entities.AdminSecurity.rows.length, 0); // could not even start enrolment
});

Deno.test('refuses: unknown action', async () => {
  const t = setup();
  assertEquals((await t.call('tee', 'deleteEverything')).body.code, 'unknown_action');
});

Deno.test('refuses: token-only actions before enrolment', async () => {
  const t = setup();
  for (const action of ['overview', 'security', 'auditList', 'signOutAll', 'ping']) {
    const r = await t.call('tee', action);
    assertEquals(r.status, 403, action);
    assertEquals(r.body.code, 'not_enrolled');
  }
});

// ------------------------------------------------------------ enrolment

Deno.test('enrolment: seed returned once, stored encrypted, confirm issues token + 8 backup codes', async () => {
  const t = setup();
  const s = await t.call('tee', 'enrollStart');
  assertEquals(s.status, 200);
  assertMatch(s.body.otpauth_uri, /^otpauth:\/\/totp\/VIRORA%20Console/);
  const seed = s.body.secret;
  const row = t.world.entities.AdminSecurity.rows[0];
  assert(!JSON.stringify(row).includes(seed), 'seed must not be stored in plaintext');
  assertEquals(row.enrolled_at, undefined);

  // status never shows the seed
  const st = await t.call('tee', 'status');
  assert(!JSON.stringify(st.body).includes(seed));
  assertEquals(st.body.enrolled, false);

  const wrong = await t.call('tee', 'enrollConfirm', { code: '000000' === (await t.codeFor(seed)) ? '111111' : '000000' });
  assertEquals(wrong.status, 422);
  assertEquals(wrong.body.code, 'wrong_code');
  assertEquals(wrong.body.attempts_left, 4);

  const ok = await t.call('tee', 'enrollConfirm', { code: await t.codeFor(seed) });
  assertEquals(ok.status, 200);
  assert(ok.body.token);
  assertEquals(ok.body.backup_codes.length, 8);
  const after = t.world.entities.AdminSecurity.rows[0];
  for (const c of ok.body.backup_codes) assert(!JSON.stringify(after).includes(c), 'backup codes stored as hashes only');
  assertEquals(after.pending_secret_enc, '');
  assertEquals(after.failed_attempts, 0);

  // and the token works
  assertEquals((await t.call('tee', 'ping', { token: ok.body.token })).status, 200);
});

Deno.test('refuses: second enrolment once enrolled (re-enrolment needs token + code)', async () => {
  const t = setup();
  await enrolled(t);
  assertEquals((await t.call('tee', 'enrollStart')).body.code, 'already_enrolled');
  assertEquals((await t.call('tee', 'enrollConfirm', { code: '123456' })).body.code, 'already_enrolled');
});

Deno.test('refuses: enrolment confirmed after 15 minutes', async () => {
  const t = setup();
  const s = await t.call('tee', 'enrollStart');
  t.tick(PENDING_ENROL_TTL_MS + 1000);
  const r = await t.call('tee', 'enrollConfirm', { code: await t.codeFor(s.body.secret) });
  assertEquals(r.status, 410);
  assertEquals(r.body.code, 'pending_expired');
});

// ------------------------------------------------------------ tokens

Deno.test('refuses: no token, garbage, tampered payload, wrong key', async () => {
  const t = setup();
  const { token } = await enrolled(t);
  assertEquals((await t.call('tee', 'overview')).body.code, 'token_missing');
  assertEquals((await t.call('tee', 'overview', { token: 'nonsense' })).body.code, 'token_malformed');

  const [payload, sig] = token.split('.');
  const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  const forged = btoa(JSON.stringify({ ...claims, exp: claims.exp + 1e9 })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assertEquals((await t.call('tee', 'overview', { token: `${forged}.${sig}` })).body.code, 'token_bad_signature');

  const otherKeys = await deriveKeys('some-other-key-0123456789-abcdefghijklmnop');
  const foreign = await signToken(otherKeys.tokenKey, { uid: 'u_tee', ep: claims.ep }, t.now);
  assertEquals((await t.call('tee', 'overview', { token: foreign })).body.code, 'token_bad_signature');
});

Deno.test('refuses: expired token (12 h)', async () => {
  const t = setup();
  const { token } = await enrolled(t);
  t.tick(TOKEN_TTL_MS + 1000);
  const r = await t.call('tee', 'overview', { token });
  assertEquals(r.status, 403);
  assertEquals(r.body.code, 'token_expired');
});

Deno.test("refuses: someone else's token", async () => {
  // Both admins allowlisted here, so the only thing stopping ilmzor is the token's user id.
  const t = setup({ allow: 'u_tee,u_ilmzor' });
  const { token } = await enrolled(t);
  // ilmzor enrols too so it gets past not_enrolled
  const s = await t.call('ilmzor', 'enrollStart');
  await t.call('ilmzor', 'enrollConfirm', { code: await t.codeFor(s.body.secret) });
  const r = await t.call('ilmzor', 'overview', { token });
  assertEquals(r.body.code, 'token_wrong_user');
});

Deno.test('sign out everywhere revokes every outstanding token', async () => {
  const t = setup();
  const { seed, token } = await enrolled(t);
  const second = await t.call('tee', 'verify', { code: await t.codeFor(seed) });
  assertEquals(second.status, 200);
  assertEquals((await t.call('tee', 'signOutAll', { token })).status, 200);
  assertEquals((await t.call('tee', 'ping', { token })).body.code, 'token_revoked');
  assertEquals((await t.call('tee', 'ping', { token: second.body.token })).body.code, 'token_revoked');
  const sa = audits(t).find((a) => a.action === 'sign_out_all');
  assert(sa && sa.before.includes('session_epoch'));
});

// ------------------------------------------------------------ codes

Deno.test('refuses: replayed code (same step twice)', async () => {
  const t = setup();
  const { seed } = await enrolled(t);
  const code = await t.codeFor(seed);
  assertEquals((await t.call('tee', 'verify', { code })).status, 200);
  const again = await t.call('tee', 'verify', { code });
  assertEquals(again.status, 422);
  assertEquals(again.body.code, 'wrong_code');
  assertEquals(lastAudit(t).reason, 'code_replayed');
});

Deno.test('clock drift: ±1 step accepted, ±2 refused', async () => {
  const t = setup();
  const { seed } = await enrolled(t);
  t.tick(5 * 30_000);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(seed, -2) })).status, 422);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(seed, -1) })).status, 200);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(seed, +2) })).status, 422);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(seed, +1) })).status, 200);
});

Deno.test('lockout: 5 wrong codes lock for 15 min, even the right code', async () => {
  const t = setup();
  const { seed } = await enrolled(t);
  const right = await t.codeFor(seed);
  const wrong = right === '000000' ? '111111' : '000000';
  for (let i = 1; i <= 4; i++) {
    const r = await t.call('tee', 'verify', { code: wrong });
    assertEquals(r.body.attempts_left, 5 - i);
  }
  const fifth = await t.call('tee', 'verify', { code: wrong });
  assertEquals(fifth.status, 429);
  assertEquals(fifth.body.code, 'locked');
  const locked = await t.call('tee', 'verify', { code: right });
  assertEquals(locked.status, 429);
  // backup codes are locked too
  assertEquals((await t.call('tee', 'verify', { backup_code: 'AAAA-BBBB' })).status, 429);
  t.tick(LOCK_MS + 1000);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(seed) })).status, 200);
});

Deno.test('lockout also covers enrolment confirmation', async () => {
  const t = setup();
  const s = await t.call('tee', 'enrollStart');
  const right = await t.codeFor(s.body.secret);
  const wrong = right === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) await t.call('tee', 'enrollConfirm', { code: wrong });
  const r = await t.call('tee', 'enrollConfirm', { code: right });
  assertEquals(r.status, 429);
});

Deno.test('backup codes: single use, and using one signs out other sessions', async () => {
  const t = setup();
  const { token, backup } = await enrolled(t);
  const r = await t.call('tee', 'verify', { backup_code: backup[0].toLowerCase() });
  assertEquals(r.status, 200);
  assertEquals(r.body.backup_codes_left, 7);
  assertEquals((await t.call('tee', 'ping', { token })).body.code, 'token_revoked');
  assertEquals((await t.call('tee', 'ping', { token: r.body.token })).status, 200);
  const again = await t.call('tee', 'verify', { backup_code: backup[0] });
  assertEquals(again.status, 422);
  assertEquals(lastAudit(t).reason, 'wrong_backup_code');
});

Deno.test('regenerate backup codes needs token + current code; old codes die', async () => {
  const t = setup();
  const { seed, token, backup } = await enrolled(t);
  assertEquals((await t.call('tee', 'regenerateBackupCodes', { token })).body.code, 'code_required');
  const r = await t.call('tee', 'regenerateBackupCodes', { token, code: await t.codeFor(seed) });
  assertEquals(r.status, 200);
  assertEquals(r.body.backup_codes.length, 8);
  t.tick(30_000);
  assertEquals((await t.call('tee', 'verify', { backup_code: backup[1] })).status, 422);
  assertEquals((await t.call('tee', 'verify', { backup_code: r.body.backup_codes[0] })).status, 200);
});

Deno.test('re-enrolment: needs token + code; old seed and old tokens stop working', async () => {
  const t = setup();
  const { seed, token } = await enrolled(t);
  assertEquals((await t.call('tee', 'reenrollStart', {})).body.code, 'token_missing');
  assertEquals((await t.call('tee', 'reenrollStart', { token })).body.code, 'code_required');
  const s = await t.call('tee', 'reenrollStart', { token, code: await t.codeFor(seed) });
  assertEquals(s.status, 200);
  const newSeed = s.body.secret;
  assertNotEquals(newSeed, seed);
  // until confirmed, the old seed still signs in
  t.tick(30_000);
  const c = await t.call('tee', 'reenrollConfirm', { token, code: await t.codeFor(newSeed) });
  assertEquals(c.status, 200, JSON.stringify(c.body));
  assertEquals((await t.call('tee', 'ping', { token })).body.code, 'token_revoked');
  t.tick(30_000);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(seed) })).status, 422);
  assertEquals((await t.call('tee', 'verify', { code: await t.codeFor(newSeed) })).status, 200);
});

Deno.test('rotated ADMIN_SESSION_KEY: old tokens refused, stored seed unreadable (forces re-enrolment)', async () => {
  const t = setup();
  const { seed, token } = await enrolled(t);
  t.secrets.ADMIN_SESSION_KEY = 'rotated-key-0123456789-abcdefghijklmnopqrst';
  assertEquals((await t.call('tee', 'ping', { token })).body.code, 'token_bad_signature');
  const r = await t.call('tee', 'verify', { code: await t.codeFor(seed) });
  assertEquals(r.status, 500);
  assertEquals(r.body.code, 'seed_unreadable');
});

// ------------------------------------------------------------ audit hygiene

Deno.test('audit log: every refusal recorded; never contains seeds, codes or tokens', async () => {
  const t = setup();
  const { seed, token, backup } = await enrolled(t);
  const code = await t.codeFor(seed);
  await t.call('tee', 'verify', { code });
  await t.call('tee', 'verify', { code }); // replay
  await t.call('tee', 'verify', { backup_code: backup[2] });
  await t.call('ilmzor', 'overview', { token });
  await t.call('student', 'status');
  const blob = JSON.stringify(audits(t));
  for (const secret of [seed, token, code, ...backup, KEY]) assert(!blob.includes(secret), 'audit leaked a secret');
  const refused = audits(t).filter((a) => a.outcome === 'refused').map((a) => a.reason);
  for (const r of ['code_replayed', 'not_allowlisted', 'forbidden']) assert(refused.includes(r), r);
});

Deno.test('auditList and security need a token and return rows', async () => {
  const t = setup();
  const { token } = await enrolled(t);
  assertEquals((await t.call('tee', 'auditList')).body.code, 'token_missing');
  const a = await t.call('tee', 'auditList', { token });
  assertEquals(a.status, 200);
  assert(a.body.rows.length >= 2);
  // newest first: the refused token-less auditList call just above
  assertEquals(a.body.rows[0].outcome, 'refused');
  assertEquals(a.body.rows[0].reason, 'token_missing');
  const s = await t.call('tee', 'security', { token });
  assertEquals(s.body.backup_codes_left, 8);
  const ilm = s.body.admins.find((x: any) => x.email === 'ilmzor.uz@gmail.com');
  assertEquals(ilm.console_access, false);
});

// ------------------------------------------------------------ schemas (RLS)

Deno.test('AdminSecurity and AdminAuditLog: no client can create/read/update/delete', async () => {
  for (const name of ['AdminSecurity', 'AdminAuditLog']) {
    const raw = await Deno.readTextFile(new URL(`../../base44/entities/${name}.jsonc`, import.meta.url));
    const schema = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
    for (const op of ['create', 'read', 'update', 'delete']) {
      assertEquals(schema.rls?.[op], { user_condition: { role: 'never' } }, `${name}.${op}`);
    }
  }
});

// ------------------------------------------------------------ overview maths

Deno.test('overview: trials and lapsed rows are never "paying"', () => {
  const now = Date.parse('2026-10-04T08:00:00Z');
  const o = computeOverview({
    now,
    users: [
      { id: 'a', created_date: '2026-10-01T00:00:00Z' },
      { id: 'b', created_date: '2026-09-01T00:00:00Z', teacher_status: 'pending', full_name: 'Aziza' },
    ],
    subs: [
      { status: 'active', is_trial: true, plan: 'Learner Plan', expires_at: '2026-10-05' }, // trial ending
      { status: 'active', is_trial: true, plan: 'Learner Plan', expires_at: '2026-10-20' }, // trial, not ending
      { status: 'active', plan: 'VIP Plan', expires_at: '2026-11-01' },                    // paying
      { status: 'active', plan: 'Learner Plan', expires_at: '2026-10-01' },                // lapsed, not refreshed
      { status: 'active', plan: 'Learner Plan', cancelled_at: '2026-10-02', expires_at: '2026-10-30' }, // ending = still paying
      { status: 'active', plan: 'Free Plan' },
      { status: 'paused', plan: 'VIP Plan' },
    ],
    payments: [
      { id: 'p1', status: 'pending', amount_uzs: 35999, plan: 'learner', billing_cycle: 'monthly', submitted_at: '2026-10-04T07:00:00Z' },
      { id: 'p2', status: 'approved', amount_uzs: 35999, reviewed_at: '2026-10-03T10:00:00Z' },
      { id: 'p3', status: 'approved', amount_uzs: 999999, reviewed_at: '2026-09-15T10:00:00Z' },
      { id: 'p4', status: 'awaiting_receipt', amount_uzs: 359999 },
    ],
  });
  assertEquals(o.counters.signups_7d, 1);
  assertEquals(o.counters.trials_ending_48h, 1);
  assertEquals(o.counters.paying_students, 2);
  assertEquals(o.counters.lapsed_not_refreshed, 1);
  assertEquals(o.counters.pending_qr_payments, 1);
  assertEquals(o.counters.pending_teacher_applications, 1);
  assertEquals(o.counters.revenue_month_qr_uzs, 35999);
  assertEquals(o.counters.revenue_month_card_usd, null);
  assertEquals(o.needs_you.length, 2);
});
