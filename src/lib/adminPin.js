// Convenience lock for /admin. Read this before trusting it for anything.
//
// This is NOT a security boundary. Access to admin data is granted by Base44
// auth plus the role-based RLS rules, enforced server-side — anyone holding a
// valid admin session can call the entity API directly and never encounter
// this screen. A 4-8 digit PIN is also trivially brute-forceable from its
// hash by anyone who can read the User row.
//
// What it IS good for: stopping someone who wanders up to an already-unlocked
// laptop from clicking into /admin and cancelling subscriptions. That's the
// whole job. Real hardening belongs on the Base44 account itself (2FA).

const SESSION_KEY = "virora_admin_unlocked";
const SALT = "virora-admin-pin-v1:";

export const PIN_MIN = 4;
export const PIN_MAX = 8;
export const PIN_PATTERN = /^\d{4,8}$/;

export async function hashPin(pin) {
  const data = new TextEncoder().encode(SALT + String(pin));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Unlock lasts for the browser session only, so closing the tab re-locks it.
// Wrapped because storage access throws outright in some privacy modes.
export function isUnlockedThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* non-fatal: the gate just asks again next navigation */
  }
}

export function clearUnlock() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
