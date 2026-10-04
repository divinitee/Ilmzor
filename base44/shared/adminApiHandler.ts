// adminApi request handler (VT-35 P1, 2026-10-04).
//
// base44/functions/adminApi/entry.ts only wires this to Deno.serve with the
// real SDK and secrets. Keeping the handler here, with its dependencies passed
// in, is what lets tools/admin-console-tests drive every refusal case.
//
// THE RULE: adminApi is the only way to perform a privileged Admin Console
// operation. Every call must pass ALL of these, in this order, or nothing
// happens:
//   1. a Base44 session (auth.me)
//   2. configuration present (ADMIN_SESSION_KEY ≥ 32 chars, allowlist non-empty)
//      — otherwise refuse everything (fail closed)
//   3. role === 'admin'
//   4. user id on ADMIN_CONSOLE_USER_IDS
//   5. for anything past sign-in: a console token whose signature, expiry,
//      user id and session epoch all check out
// Sign-in itself needs a TOTP code (±1 step, never the same step twice) or a
// single-use backup code, and 5 wrong tries lock it for 15 minutes.
//
// Never returned, logged or audited: TOTP seeds (except the one-time
// enrolment response), codes, backup codes, tokens.

import {
  AuthError, deriveKeys, parseAllowlist, newSeed, encryptSeed, decryptSeed,
  verifyTotp, otpauthUri, newBackupCodes, consumeBackup, lockedUntil,
  failurePatch, successPatch, signToken, verifyToken, TOKEN_TTL_MS,
  PENDING_ENROL_TTL_MS, MAX_FAILS, normalizeBackup,
} from './adminAuthCore.ts';
import { computeOverview, displayName } from './adminOverviewCore.ts';

export interface HandlerDeps {
  createClientFromRequest: (req: Request) => any;
  getSecret: (name: string) => string | undefined | null;
  now?: () => number;
}

type Ctx = {
  svc: any;
  me: any;
  row: any;
  body: any;
  now: number;
  keys: { tokenKey: CryptoKey; seedKey: CryptoKey };
  allowlist: Set<string>;
  audit: (e: AuditEntry) => Promise<void>;
};

type AuditEntry = {
  action: string;
  outcome?: 'ok' | 'refused' | 'error';
  reason?: string;
  details?: string;
  target_type?: string;
  target_id?: string;
  before?: unknown;
  after?: unknown;
};

const iso = (ms: number) => new Date(ms).toISOString();
const str = (v: unknown, n = 2000) => (v === undefined || v === null ? '' : (typeof v === 'string' ? v : JSON.stringify(v)).slice(0, n));

// Actions that work before a console token exists.
const PRE_AUTH = new Set(['status', 'enrollStart', 'enrollConfirm', 'verify']);
// Note: successful `status` and `ping` calls are not audited (the page makes
// them on every load); their refusals are, like every other refusal.

async function pageAll(entity: any, query: Record<string, unknown> = {}, cap = 20000) {
  const out: any[] = [];
  for (let skip = 0; skip < cap; skip += 500) {
    const page = (await entity.filter(query, 'created_date', 500, skip)) || [];
    out.push(...page);
    if (page.length < 500) break;
  }
  return out;
}

async function loadRow(svc: any, userId: string) {
  const rows = (await svc.AdminSecurity.filter({ user_id: userId }, 'created_date', 2)) || [];
  return rows[0] || null;
}

const isEnrolled = (row: any) => !!(row?.enrolled_at && row?.totp_secret_enc);
const epochOf = (row: any) => Number(row?.session_epoch) || 0;

function assertNotLocked(row: any, now: number) {
  const until = lockedUntil(row, now);
  if (until) throw new AuthError(429, 'locked', { locked_until: until });
}

// Record a wrong code and throw the matching refusal.
async function refuseCode(ctx: Ctx, reason: string): Promise<never> {
  const patch = failurePatch(ctx.row, ctx.now);
  await ctx.svc.AdminSecurity.update(ctx.row.id, patch);
  ctx.row = { ...ctx.row, ...patch };
  if (patch.locked_until) throw new AuthError(429, 'locked', { locked_until: patch.locked_until, audit_reason: reason });
  throw new AuthError(422, 'wrong_code', { attempts_left: MAX_FAILS - patch.failed_attempts, audit_reason: reason });
}

// Check a second factor: a TOTP code against `seedEnc`, or a backup code.
// Returns what to write on success.
async function checkFactor(ctx: Ctx, seedEnc: string, opts: { allowBackup: boolean }) {
  assertNotLocked(ctx.row, ctx.now);
  const { code, backup_code } = ctx.body || {};
  if (backup_code && opts.allowBackup) {
    const left = await consumeBackup(ctx.row.backup_code_hashes, backup_code);
    if (!left) return refuseCode(ctx, normalizeBackup(backup_code).length === 8 ? 'wrong_backup_code' : 'malformed_backup_code');
    return { method: 'backup_code', patch: { backup_code_hashes: left } as Record<string, unknown> };
  }
  if (!code) throw new AuthError(400, 'code_required');
  const seed = await decryptSeed(ctx.keys.seedKey, seedEnc);
  const step = await verifyTotp(seed, code, ctx.now, ctx.row.last_used_step);
  if (step === null) {
    const replay = (await verifyTotp(seed, code, ctx.now, null)) !== null;
    return refuseCode(ctx, replay ? 'code_replayed' : 'wrong_code');
  }
  return { method: 'totp', patch: { last_used_step: step } as Record<string, unknown> };
}

async function issueToken(ctx: Ctx, epoch: number) {
  const token = await signToken(ctx.keys.tokenKey, { uid: ctx.me.id, ep: epoch }, ctx.now);
  return { token, expires_at: iso(ctx.now + TOKEN_TTL_MS) };
}

// ------------------------------------------------------------ actions

const ACTIONS: Record<string, (ctx: Ctx) => Promise<Record<string, unknown>>> = {
  // What the gate screen needs to know. Reveals nothing secret.
  async status(ctx) {
    return {
      enrolled: isEnrolled(ctx.row),
      locked_until: lockedUntil(ctx.row, ctx.now),
      email: ctx.me.email,
    };
  },

  // First-time enrolment. The ONLY response that ever contains the seed.
  async enrollStart(ctx) {
    if (isEnrolled(ctx.row)) throw new AuthError(409, 'already_enrolled');
    const seed = newSeed();
    const patch = { pending_secret_enc: await encryptSeed(ctx.keys.seedKey, seed), pending_created_at: iso(ctx.now), email: ctx.me.email };
    if (ctx.row) await ctx.svc.AdminSecurity.update(ctx.row.id, patch);
    else ctx.row = await ctx.svc.AdminSecurity.create({ user_id: ctx.me.id, session_epoch: 1, failed_attempts: 0, ...patch });
    await ctx.audit({ action: 'enroll_start', details: 'New authenticator secret issued (pending confirmation).' });
    return { otpauth_uri: otpauthUri(seed, ctx.me.email), secret: seed, account: ctx.me.email, confirm_within_minutes: PENDING_ENROL_TTL_MS / 60000 };
  },

  async enrollConfirm(ctx) {
    if (isEnrolled(ctx.row)) throw new AuthError(409, 'already_enrolled');
    return confirmPending(ctx, 'enroll_confirm');
  },

  // Sign in: TOTP code or backup code → console token.
  async verify(ctx) {
    if (!isEnrolled(ctx.row)) throw new AuthError(409, 'not_enrolled');
    const f = await checkFactor(ctx, ctx.row.totp_secret_enc, { allowBackup: true });
    // Using a backup code usually means the phone is gone: revoke every other
    // console session at the same time.
    const epoch = f.method === 'backup_code' ? epochOf(ctx.row) + 1 : epochOf(ctx.row);
    const patch: Record<string, unknown> = { ...f.patch, ...successPatch(), session_epoch: epoch, last_login_at: iso(ctx.now) };
    await ctx.svc.AdminSecurity.update(ctx.row.id, patch);
    const left = Array.isArray(patch.backup_code_hashes) ? (patch.backup_code_hashes as string[]).length : (ctx.row.backup_code_hashes || []).length;
    await ctx.audit({
      action: 'sign_in',
      details: f.method === 'backup_code' ? `Signed in with a backup code (${left} left). All other console sessions signed out.` : 'Signed in with authenticator code.',
    });
    return { ...(await issueToken(ctx, epoch)), method: f.method, backup_codes_left: left };
  },

  // ----- everything below requires a valid console token -----

  async ping(ctx) {
    return { valid: true };
  },

  async overview(ctx) {
    const [users, subs, payments] = await Promise.all([
      pageAll(ctx.svc.User),
      pageAll(ctx.svc.StudentSubscription),
      pageAll(ctx.svc.ManualPayment),
    ]);
    await ctx.audit({ action: 'overview' });
    return computeOverview({ users, subs, payments, now: ctx.now });
  },

  async security(ctx) {
    const admins = (await ctx.svc.User.filter({ role: 'admin' }, 'created_date', 50)) || [];
    await ctx.audit({ action: 'security_view' });
    return {
      enrolled_at: ctx.row.enrolled_at || null,
      last_login_at: ctx.row.last_login_at || null,
      backup_codes_left: (ctx.row.backup_code_hashes || []).length,
      admins: admins.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: displayName(u),
        console_access: ctx.allowlist.has(u.id),
        is_you: u.id === ctx.me.id,
      })),
    };
  },

  async auditList(ctx) {
    const limit = Math.min(Math.max(Number(ctx.body?.limit) || 50, 1), 200);
    const skip = Math.max(Number(ctx.body?.skip) || 0, 0);
    const q: Record<string, unknown> = {};
    if (ctx.body?.outcome && ['ok', 'refused', 'error'].includes(ctx.body.outcome)) q.outcome = ctx.body.outcome;
    const rows = (await ctx.svc.AdminAuditLog.filter(q, '-created_date', limit, skip)) || [];
    return {
      rows: rows.map((r: any) => ({
        id: r.id, ts: r.ts || r.created_date, actor_email: r.actor_email, action: r.action, outcome: r.outcome,
        reason: r.reason || '', details: r.details || '', target_type: r.target_type || '', target_id: r.target_id || '',
        before: r.before || '', after: r.after || '', channel: r.channel || 'console',
      })),
      has_more: rows.length === limit,
    };
  },

  async signOutAll(ctx) {
    const before = epochOf(ctx.row);
    await ctx.svc.AdminSecurity.update(ctx.row.id, { session_epoch: before + 1 });
    await ctx.audit({ action: 'sign_out_all', before: { session_epoch: before }, after: { session_epoch: before + 1 }, details: 'Every console session signed out.' });
    return { signed_out: true };
  },

  // New backup codes: token + a fresh authenticator code. Old ones die.
  async regenerateBackupCodes(ctx) {
    const f = await checkFactor(ctx, ctx.row.totp_secret_enc, { allowBackup: false });
    const { codes, hashes } = await newBackupCodes();
    await ctx.svc.AdminSecurity.update(ctx.row.id, { ...f.patch, ...successPatch(), backup_code_hashes: hashes });
    await ctx.audit({ action: 'backup_codes_regenerated', details: 'All previous backup codes invalidated.' });
    return { backup_codes: codes };
  },

  // Move to a new phone: token + current code (or a backup code), then the
  // same confirm step as first enrolment.
  async reenrollStart(ctx) {
    const f = await checkFactor(ctx, ctx.row.totp_secret_enc, { allowBackup: true });
    const seed = newSeed();
    const patch = { ...f.patch, ...successPatch(), pending_secret_enc: await encryptSeed(ctx.keys.seedKey, seed), pending_created_at: iso(ctx.now) };
    await ctx.svc.AdminSecurity.update(ctx.row.id, patch);
    ctx.row = { ...ctx.row, ...patch };
    await ctx.audit({ action: 'reenroll_start', details: `Re-enrolment started (verified with ${f.method === 'backup_code' ? 'a backup code' : 'authenticator code'}).` });
    return { otpauth_uri: otpauthUri(seed, ctx.me.email), secret: seed, account: ctx.me.email, confirm_within_minutes: PENDING_ENROL_TTL_MS / 60000 };
  },

  async reenrollConfirm(ctx) {
    return confirmPending(ctx, 'reenroll_confirm');
  },
};

// Shared by first enrolment and re-enrolment: the pending seed becomes the
// real one only after it has produced a valid code.
async function confirmPending(ctx: Ctx, auditAction: string) {
  if (!ctx.row?.pending_secret_enc) throw new AuthError(409, 'no_pending_enrolment');
  const started = Date.parse(ctx.row.pending_created_at || '');
  if (!Number.isFinite(started) || ctx.now - started > PENDING_ENROL_TTL_MS) throw new AuthError(410, 'pending_expired');
  assertNotLocked(ctx.row, ctx.now);
  if (!ctx.body?.code) throw new AuthError(400, 'code_required');
  const seed = await decryptSeed(ctx.keys.seedKey, ctx.row.pending_secret_enc);
  const step = await verifyTotp(seed, ctx.body.code, ctx.now, null);
  if (step === null) return refuseCode(ctx, 'wrong_code');
  const { codes, hashes } = await newBackupCodes();
  const epoch = epochOf(ctx.row) + 1;
  await ctx.svc.AdminSecurity.update(ctx.row.id, {
    totp_secret_enc: ctx.row.pending_secret_enc,
    pending_secret_enc: '',
    pending_created_at: '',
    enrolled_at: iso(ctx.now),
    last_used_step: step,
    backup_code_hashes: hashes,
    session_epoch: epoch,
    last_login_at: iso(ctx.now),
    ...successPatch(),
  });
  await ctx.audit({ action: auditAction, details: '2FA enrolled. 8 new backup codes issued; every earlier console session signed out.' });
  return { ...(await issueToken(ctx, epoch)), backup_codes: codes };
}

// ------------------------------------------------------------ entry

export function createAdminApiHandler(deps: HandlerDeps) {
  const clock = deps.now || (() => Date.now());

  return async function handle(req: Request): Promise<Response> {
    if (req.method !== 'POST') return Response.json({ ok: false, error: 'POST only', code: 'method' }, { status: 405 });
    const now = clock();
    let base44: any;
    let me: any = null;
    try {
      base44 = deps.createClientFromRequest(req);
      me = await base44.auth.me();
    } catch {
      me = null;
    }
    if (!me?.id) return Response.json({ ok: false, error: 'not authenticated', code: 'unauthenticated' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    const audit = async (e: AuditEntry) => {
      try {
        await svc.AdminAuditLog.create({
          ts: iso(now), actor_id: me.id, actor_email: me.email || '', channel: 'console',
          action: e.action, outcome: e.outcome || 'ok', reason: e.reason || '',
          details: str(e.details, 1000), target_type: e.target_type || '', target_id: e.target_id || '',
          before: str(e.before), after: str(e.after),
        });
      } catch (err) {
        console.error('adminApi audit write failed:', (err as any)?.message);
      }
    };

    const refuse = async (err: AuthError) => {
      const { audit_reason, ...extra } = err.extra || {};
      await audit({ action: action || 'unknown', outcome: 'refused', reason: String(audit_reason || err.code) });
      return Response.json({ ok: false, error: err.code, code: err.code, ...extra }, { status: err.status });
    };

    try {
      // 2. configuration — fail closed
      const allowlist = parseAllowlist(deps.getSecret('ADMIN_CONSOLE_USER_IDS'));
      if (allowlist.size === 0) throw new AuthError(503, 'not_configured');
      const keys = await deriveKeys(deps.getSecret('ADMIN_SESSION_KEY') || '');

      // 3. role, 4. allowlist
      if (me.role !== 'admin') throw new AuthError(403, 'forbidden');
      if (!allowlist.has(me.id)) throw new AuthError(403, 'not_allowlisted');

      const fn = ACTIONS[action];
      if (!fn) throw new AuthError(400, 'unknown_action');

      const ctx: Ctx = { svc, me, row: await loadRow(svc, me.id), body, now, keys, allowlist, audit };

      // 5. console token for everything past sign-in
      if (!PRE_AUTH.has(action)) {
        if (!isEnrolled(ctx.row)) throw new AuthError(403, 'not_enrolled');
        await verifyToken(keys.tokenKey, body?.token, { uid: me.id, ep: epochOf(ctx.row) }, now);
      }

      const data = await fn(ctx);
      return Response.json({ ok: true, ...data });
    } catch (err) {
      if (err instanceof AuthError) return refuse(err);
      console.error('adminApi error:', (err as any)?.message);
      await audit({ action: action || 'unknown', outcome: 'error', reason: 'server_error', details: str((err as any)?.message, 300) });
      return Response.json({ ok: false, error: 'server_error', code: 'server_error' }, { status: 500 });
    }
  };
}
