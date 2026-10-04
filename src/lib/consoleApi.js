import { base44 } from "@/api/base44Client";

// Client for base44/functions/adminApi (Admin Console, VT-35).
//
// The console token lives in sessionStorage only: closing the tab signs the
// console out. It proves nothing on its own: adminApi checks role, the user id
// allowlist, the token signature, expiry and the session epoch on every call.
//
// Deliberately NOT the shared serverApi `call`: that retries any 401 once,
// and a sign-in attempt must never be sent twice (it would count as two wrong
// codes). Here only a plain Base44 "unauthenticated" blip is retried.

const TOKEN_KEY = "virora_console_token";
const TOKEN_ERRORS = new Set([
  "token_missing", "token_malformed", "token_bad_signature",
  "token_expired", "token_wrong_user", "token_revoked", "not_enrolled",
]);

export function getConsoleToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setConsoleToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the console just asks for a code again */
  }
}

export const clearConsoleToken = () => setConsoleToken("");

export class ConsoleError extends Error {
  constructor(code, status, extra = {}) {
    super(code);
    this.code = code;
    this.status = status;
    Object.assign(this, extra);
  }
  get isSessionError() {
    return TOKEN_ERRORS.has(this.code);
  }
}

export async function consoleApi(action, payload = {}, { withToken = true, retried = false } = {}) {
  const body = { action, ...payload };
  if (withToken) body.token = getConsoleToken();
  try {
    const res = await base44.functions.invoke("adminApi", body);
    const data = res?.data ?? res;
    if (data && data.ok === false) throw new ConsoleError(data.code || "request_failed", 200, data);
    return data;
  } catch (e) {
    if (e instanceof ConsoleError) throw e;
    const resp = e?.response?.data || e?.data || {};
    const status = e?.response?.status || e?.status;
    const code = resp.code || e?.code || "request_failed";
    if (code === "unauthenticated" && !retried) {
      await new Promise((r) => setTimeout(r, 700));
      return consoleApi(action, payload, { withToken, retried: true });
    }
    const err = new ConsoleError(code, status, resp);
    if (err.isSessionError) clearConsoleToken();
    throw err;
  }
}

// Human copy for every refusal the console can show.
export const CONSOLE_ERRORS = {
  wrong_code: "That code didn't work.",
  code_required: "Enter the 6-digit code from your authenticator app.",
  locked: "Too many wrong codes. The console is locked for 15 minutes.",
  pending_expired: "That setup expired (15 minutes). Start again.",
  no_pending_enrolment: "Start the setup first.",
  already_enrolled: "2FA is already set up on this account.",
  not_enrolled: "2FA isn't set up yet.",
  not_configured: "The console isn't configured on the server yet (ADMIN_SESSION_KEY / ADMIN_CONSOLE_USER_IDS).",
  not_allowlisted: "This account isn't allowed into the console.",
  forbidden: "Admins only.",
  seed_unreadable: "The stored 2FA secret can't be read (the server key changed). Follow the recovery steps to re-enrol.",
  token_expired: "Your console session expired. Enter a new code.",
  token_revoked: "You were signed out of the console everywhere. Enter a new code.",
  unauthenticated: "Sign in to VIRORA first.",
  server_error: "Something went wrong on the server.",
  request_failed: "Couldn't reach the server.",
};

const CONFIG_DETAIL = {
  key_missing: "The server can't see ADMIN_SESSION_KEY. If you just added it, the backend may need a redeploy.",
  key_too_short: "ADMIN_SESSION_KEY is shorter than 32 characters. Replace it with a longer random value.",
  allowlist_empty: "ADMIN_CONSOLE_USER_IDS is empty.",
};

export const errorText = (e) =>
  (e?.code === "not_configured" && CONFIG_DETAIL[e?.detail]) || CONSOLE_ERRORS[e?.code] || CONSOLE_ERRORS.request_failed;
