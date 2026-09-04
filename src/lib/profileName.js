// ---------------------------------------------------------------------------
// Where a student's name comes from.
//
// `full_name` is a Base44 built-in and is effectively READ-ONLY from inside the
// app: updateMe() accepts a payload containing it, returns success, and
// persists every other field in that same payload — avatar_url and
// classroom_code both wrote fine — while full_name comes back unchanged. That
// is why "Set your name" appeared to save and then silently reverted, and why
// freshly registered accounts kept the platform's default (the email's local
// part) no matter what the student typed at signup.
//
// So the app owns `display_name` instead (see base44/entities/User.jsonc) and
// full_name is only ever read — it still carries a real name when the auth
// provider supplied one, e.g. a Google sign-in.
//
// Read a name through resolveUserName()/displayName() and never off
// user.full_name directly, or the placeholder leaks back into the UI.
// ---------------------------------------------------------------------------

// A full_name that's just the student's email address (or its local part,
// e.g. Google sign-in / the platform's own account-creation default when no
// name was collected) isn't a real display name — it's a placeholder that
// leaked into the field. Treated as "unset" everywhere a name is shown or
// edited, so it never displays or pre-fills as if the student had chosen it.
export function isPlaceholderName(fullName, email) {
  const name = (fullName || "").trim().toLowerCase();
  if (!name) return true;
  const emailNorm = (email || "").trim().toLowerCase();
  if (!emailNorm) return false;
  const local = emailNorm.split("@")[0];
  return name === emailNorm || name === local;
}

// Real display name, or "" if what's stored is just an email-derived
// placeholder.
export function displayName(fullName, email) {
  return isPlaceholderName(fullName, email) ? "" : (fullName || "").trim();
}

// The one place that decides what a user is called. The student's own
// display_name wins; a provider-supplied full_name is the fallback; an
// email-derived placeholder counts as no name at all and returns "".
export function resolveUserName(user) {
  const chosen = (user?.display_name || "").trim();
  if (chosen) return chosen;
  return displayName(user?.full_name, user?.email);
}

// Same, but never empty — for the places that record a name onto another
// entity (leaderboard rows, quiz results, chat messages) where a blank would
// be worse than the email.
export function resolveUserNameOrEmail(user) {
  return resolveUserName(user) || user?.email || "";
}
