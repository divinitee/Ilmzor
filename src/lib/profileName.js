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
