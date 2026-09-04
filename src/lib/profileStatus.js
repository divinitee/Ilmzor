import { isKnownLevel, isLegacyAccount } from "@/lib/levels";

// Has this student actually told us who they are and where they're starting?
//
// Email/password signups answer all of it inside registration, so they arrive
// complete. Google signups don't: loginWithProvider() hands the browser to the
// provider and drops it back into the app with an account that has an email, a
// provider-supplied name and nothing else — no level, no goals, no class code.
// Those students used to land straight on Home, which is why they silently fell
// through to the DEFAULT_LEVEL fallback and never saw a level question at all.
//
// cefr_level is the marker rather than the name, because a Google account
// usually DOES come with a real full_name, so a missing name proves nothing —
// whereas a missing level can only mean the student was never asked.
//
// Legacy accounts are exempt: they predate the level system, get backfilled to
// B1 by ensureUserLevel, and must never be interrupted by a setup flow for a
// question that didn't exist when they signed up.
export function needsProfileSetup(user) {
  if (!user) return false;
  if (isLegacyAccount(user)) return false;
  return !isKnownLevel(user.cefr_level);
}
