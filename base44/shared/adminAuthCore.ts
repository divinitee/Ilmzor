// Admin Console authentication core (VT-35 P1, 2026-10-04).
//
// Pure functions only: no SDK, no network. base44/functions/adminApi uses
// them, and tools/admin-console-tests runs them under Deno directly.
//
// What lives here:
//   - TOTP (RFC 6238: HMAC-SHA1, 6 digits, 30 s) with a ±1-step window and a
//     replay guard (a step at or before the last accepted one is refused).
//   - Console session tokens: HMAC-SHA256 over {uid, iat, ep, exp}. Every
//     privileged call checks signature + expiry + user id + session epoch, so
//     bumping AdminSecurity.session_epoch revokes every outstanding token.
//   - AES-GCM encryption of the TOTP seed at rest, so a copy of the database
//     alone is not enough to mint codes; the key lives in the write-only
//     ADMIN_SESSION_KEY secret.
//   - Backup codes (8 single-use, only SHA-256 hashes stored).
//   - The lockout rule: 5 wrong codes → locked for 15 minutes.
//
// Rotating ADMIN_SESSION_KEY invalidates every token AND makes the stored
// seed undecryptable, so it forces re-enrolment. See the recovery section in
// claude/virora-admin-console-handoff.md.

export const TOTP_PERIOD_S = 30;
export const TOTP_DIGITS = 6;
export const TOTP_WINDOW = 1; // accept one step either side for clock drift
export const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
export const MAX_FAILS = 5;
export const LOCK_MS = 15 * 60 * 1000;
export const BACKUP_CODE_COUNT = 8;
export const PENDING_ENROL_TTL_MS = 15 * 60 * 1000;
export const MIN_KEY_LENGTH = 32;
export const ISSUER = 'VIRORA Console';

const enc = new TextEncoder();
const dec = new TextDecoder();

export class AuthError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;
  constructor(status: number, code: string, extra: Record<string, unknown> = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

// ------------------------------------------------------------ encoding

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

// Constant-time string compare (same length required).
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------ keys

// Two independent keys from the one master secret, so the token key and the
// seed-encryption key are never the same bytes.
export async function deriveKeys(master: string) {
  if (typeof master !== 'string' || master.length < MIN_KEY_LENGTH) {
    throw new AuthError(503, 'not_configured');
  }
  const base = await crypto.subtle.importKey('raw', enc.encode(master), 'HKDF', false, ['deriveKey']);
  const salt = enc.encode('virora-admin-console');
  const tokenKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('console-token-v1') },
    base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign', 'verify'],
  );
  const seedKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('totp-seed-v1') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
  return { tokenKey, seedKey };
}

export function parseAllowlist(raw: unknown): Set<string> {
  return new Set(String(raw || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean));
}

// ------------------------------------------------------------ seed at rest

export async function encryptSeed(seedKey: CryptoKey, seedB32: string): Promise<string> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, seedKey, enc.encode(seedB32)));
  return `v1.${b64url(iv)}.${b64url(ct)}`;
}

export async function decryptSeed(seedKey: CryptoKey, blob: string): Promise<string> {
  const [v, ivS, ctS] = String(blob || '').split('.');
  if (v !== 'v1' || !ivS || !ctS) throw new AuthError(500, 'seed_unreadable');
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlDecode(ivS) as BufferSource }, seedKey, b64urlDecode(ctS) as BufferSource);
    return dec.decode(pt);
  } catch {
    // Wrong key (ADMIN_SESSION_KEY rotated) or tampered row.
    throw new AuthError(500, 'seed_unreadable');
  }
}

// ------------------------------------------------------------ TOTP

export const newSeed = () => base32Encode(randomBytes(20)); // 160-bit, RFC 4226 recommendation
export const stepAt = (nowMs: number) => Math.floor(nowMs / 1000 / TOTP_PERIOD_S);

export async function totpAt(seedB32: string, step: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', base32Decode(seedB32) as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8);
  let s = step;
  for (let i = 7; i >= 0; i--) { msg[i] = s & 0xff; s = Math.floor(s / 256); }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export const normalizeCode = (c: unknown) => String(c ?? '').replace(/\s+/g, '');

// Returns the matched step, or null. A step <= lastUsedStep is never matched,
// so a code that already signed someone in cannot be used again.
export async function verifyTotp(seedB32: string, code: unknown, nowMs: number, lastUsedStep: number | null | undefined): Promise<number | null> {
  const c = normalizeCode(code);
  if (!/^\d{6}$/.test(c)) return null;
  const cur = stepAt(nowMs);
  const floor = typeof lastUsedStep === 'number' ? lastUsedStep : -1;
  let matched: number | null = null;
  for (let s = cur - TOTP_WINDOW; s <= cur + TOTP_WINDOW; s++) {
    // Check every candidate (no early exit) to keep timing flat.
    const ok = safeEqual(await totpAt(seedB32, s), c);
    if (ok && s > floor && matched === null) matched = s;
  }
  return matched;
}

export function otpauthUri(seedB32: string, account: string): string {
  const label = encodeURIComponent(`${ISSUER}:${account}`);
  const q = new URLSearchParams({ secret: seedB32, issuer: ISSUER, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_S) });
  return `otpauth://totp/${label}?${q.toString()}`;
}

// ------------------------------------------------------------ backup codes

const BACKUP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

export const normalizeBackup = (c: unknown) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const hashBackup = (c: string) => sha256Hex('virora-backup-v1:' + normalizeBackup(c));

export async function newBackupCodes(n = BACKUP_CODE_COUNT) {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = randomBytes(8);
    const s = [...r].map((b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join('');
    codes.push(`${s.slice(0, 4)}-${s.slice(4)}`);
  }
  const hashes = await Promise.all(codes.map(hashBackup));
  return { codes, hashes };
}

// Returns the remaining hashes if the code matched one, else null.
export async function consumeBackup(hashes: string[] | null | undefined, code: unknown): Promise<string[] | null> {
  const list = Array.isArray(hashes) ? hashes : [];
  if (normalizeBackup(code).length !== 8) return null;
  const h = await hashBackup(String(code));
  let idx = -1;
  list.forEach((x, i) => { if (safeEqual(x, h) && idx === -1) idx = i; });
  if (idx === -1) return null;
  return list.filter((_, i) => i !== idx);
}

// ------------------------------------------------------------ lockout

export function lockedUntil(row: any, nowMs: number): string | null {
  const t = row?.locked_until ? Date.parse(row.locked_until) : NaN;
  return Number.isFinite(t) && t > nowMs ? new Date(t).toISOString() : null;
}

// Patch to write after a wrong code. The 5th failure locks for 15 minutes and
// resets the counter, so the next window gets 5 fresh tries.
export function failurePatch(row: any, nowMs: number) {
  const n = (Number(row?.failed_attempts) || 0) + 1;
  const now = new Date(nowMs).toISOString();
  if (n >= MAX_FAILS) {
    return { failed_attempts: 0, last_failed_at: now, locked_until: new Date(nowMs + LOCK_MS).toISOString() };
  }
  return { failed_attempts: n, last_failed_at: now };
}

export const successPatch = () => ({ failed_attempts: 0, locked_until: '' });

// ------------------------------------------------------------ session tokens

export interface TokenClaims { uid: string; iat: number; ep: number; exp: number }

export async function signToken(tokenKey: CryptoKey, claims: { uid: string; ep: number }, nowMs: number): Promise<string> {
  const full: TokenClaims = { uid: claims.uid, iat: nowMs, ep: claims.ep, exp: nowMs + TOKEN_TTL_MS };
  const payload = b64url(enc.encode(JSON.stringify(full)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', tokenKey, enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}

// Throws AuthError(403, ...) with a precise reason (403, not 401: the shared
// client retries 401s once, which must never happen for a refused token); returns the claims if the
// token is genuine, unexpired, belongs to this user and is from the current
// session epoch.
export async function verifyToken(tokenKey: CryptoKey, token: unknown, expect: { uid: string; ep: number }, nowMs: number): Promise<TokenClaims> {
  if (!token || typeof token !== 'string') throw new AuthError(403, 'token_missing');
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AuthError(403, 'token_malformed');
  let sigOk = false;
  try {
    sigOk = await crypto.subtle.verify('HMAC', tokenKey, b64urlDecode(parts[1]) as BufferSource, enc.encode(parts[0]));
  } catch {
    sigOk = false;
  }
  if (!sigOk) throw new AuthError(403, 'token_bad_signature');
  let c: TokenClaims;
  try {
    c = JSON.parse(dec.decode(b64urlDecode(parts[0])));
  } catch {
    throw new AuthError(403, 'token_malformed');
  }
  if (!c || typeof c.uid !== 'string' || typeof c.exp !== 'number' || typeof c.ep !== 'number' || typeof c.iat !== 'number') {
    throw new AuthError(403, 'token_malformed');
  }
  if (c.exp <= nowMs) throw new AuthError(403, 'token_expired');
  if (c.iat > nowMs + 60_000) throw new AuthError(403, 'token_malformed');
  if (c.uid !== expect.uid) throw new AuthError(403, 'token_wrong_user');
  if (c.ep !== expect.ep) throw new AuthError(403, 'token_revoked');
  return c;
}
