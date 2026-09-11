import { base44 } from "@/api/base44Client";

// Everything in the schema that belongs to a single person, and the fields
// that can point at them.
//
// The key field is wildly inconsistent across entities for historical
// reasons — and two of them are actively misleading: StudentSubscription's
// `phone` and QuizResult's `student_phone` both store EMAIL addresses, not
// phone numbers. That is exactly why this map exists in one place instead of
// each call site guessing.
//
// GrammarProfile and GrammarAssessmentRun were MISSING from
// AdminWipeUsers.jsx's original list, so even a full factory reset used to
// leave a user's grammar profile and assessment history orphaned under their
// email — and a "fresh" re-registration would inherit it. That page now
// imports this list so the two can never drift apart again.
export const USER_DATA_ENTITIES = [
  { name: "AiUsageLog", emailFields: ["user_email"], idFields: ["user_id"] },
  { name: "AssessmentResult", emailFields: ["user_email"], idFields: [] },
  // teacher_id is deliberately NOT matched: it points at the other party in
  // the conversation, not the row's owner.
  { name: "ChatMessage", emailFields: ["student_email"], idFields: [], excluded: ["teacher_id"] },
  { name: "GrammarAssessmentRun", emailFields: ["user_email"], idFields: [] },
  { name: "GrammarProfile", emailFields: ["user_email"], idFields: [] },
  { name: "QuizResult", emailFields: ["student_phone"], idFields: [] },
  { name: "RewardEvent", emailFields: ["user_email"], idFields: [] },
  { name: "SavedWord", emailFields: ["user_email"], idFields: [] },
  { name: "SkillHubProgress", emailFields: ["user_email"], idFields: [] },
  { name: "StudentProgress", emailFields: ["user_email"], idFields: [] },
  // teacher_id is deliberately NOT matched. On a subscription row it names
  // the REFERRING TEACHER, not the subscriber — matching it would mean that
  // wiping one teacher deletes every one of their students' paid
  // subscriptions. Students of a deleted teacher keep their access and are
  // simply left pointing at a teacher_id that no longer resolves.
  { name: "StudentSubscription", emailFields: ["phone"], idFields: [], excluded: ["teacher_id"] },
  { name: "TeacherReferral", emailFields: ["teacher_email"], idFields: ["teacher_id"] },
  { name: "UserCoins", emailFields: ["email"], idFields: ["user_id"] },
  { name: "WordAttempt", emailFields: ["user_email"], idFields: [] },
];

// Profile fields cleared by a reset, so the account walks back through
// registration/onboarding as if brand new.
//
// `role` is deliberately absent: that is Base44's own platform permission
// field, and clearing it on an admin would strip their access for real.
export const PROFILE_RESET_PATCH = {
  display_name: "",
  goals: [],
  classroom_code: "",
  cefr_level: null,
  level_source: null,
  level_set_at: null,
  cal_up: 0,
  cal_down: 0,
  teacher_status: "none",
  teacher_status_note: "",
  teacher_commission_rate_pct: null,
  teacher_commission_accrued_usd: 0,
  teacher_payout_status: "none",
  teacher_last_payout_at: null,
};

// Resetting data is always safe: the login survives, so there is no way to
// lock yourself out. Wiping your own account is a legitimate thing to want —
// it's how you test registration as a fresh user.
export function guardReset(target) {
  if (!target?.id) return "No user selected.";
  return null;
}

// Deleting the account is the one move that can lock you out of your own app,
// so it refuses on yourself and on any other admin.
export function guardDelete(target, me) {
  if (!target?.id) return "No user selected.";
  if (me && target.id === me.id) {
    return "This is your own account. Reset its data freely — but deleting it would lock you out of your own app.";
  }
  if (target.role === "admin") {
    return "That account is an admin. Remove its admin role in Base44 first if you really mean to delete it.";
  }
  return null;
}

// Deletes every row belonging to this person across all 13 entities above.
// Matches on the declared email/id fields plus created_by_id as a catch-all,
// de-duplicating by row id so a row matched twice is only deleted once.
// Never throws — a failure on one entity is recorded and the sweep continues,
// so one locked row can't strand the rest of the wipe half-done.
export async function wipeUserData(user, onProgress) {
  const email = user?.email;
  const id = user?.id;
  const results = [];

  for (const ent of USER_DATA_ENTITIES) {
    let deleted = 0;
    let failed = 0;
    let firstError = null;
    const seen = new Set();

    const queries = [
      ...(email ? ent.emailFields.map((f) => ({ [f]: email })) : []),
      ...(id ? (ent.idFields || []).map((f) => ({ [f]: id })) : []),
      ...(id ? [{ created_by_id: id }] : []),
    ];

    for (const q of queries) {
      let rows = [];
      try {
        rows = await base44.entities[ent.name].filter(q);
      } catch (e) {
        // A filter on a field this entity doesn't have (created_by_id on an
        // odd entity, say) just yields nothing useful — not worth failing on.
        continue;
      }
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        try {
          await base44.entities[ent.name].delete(row.id);
          deleted += 1;
        } catch (e) {
          failed += 1;
          if (!firstError) firstError = e?.message || String(e);
        }
      }
    }

    results.push({ name: ent.name, deleted, failed, error: firstError });
    onProgress?.([...results]);
  }

  return results;
}

// Clears the profile fields so the account re-enters onboarding. Uses
// auth.updateMe() when the target is the caller — that's the supported path
// for your own record — and the admin entity update for anyone else.
export async function resetUserProfile(user, me) {
  const isSelf = me && user.id === me.id;
  if (isSelf) return base44.auth.updateMe(PROFILE_RESET_PATCH);
  return base44.entities.User.update(user.id, PROFILE_RESET_PATCH);
}

// Full reset: data sweep + profile clear. The login survives.
export async function resetUser(user, me, onProgress) {
  const results = await wipeUserData(user, onProgress);
  let profileError = null;
  try {
    await resetUserProfile(user, me);
  } catch (e) {
    profileError = e?.message || String(e);
  }
  return { results, profileError };
}

// Data sweep, then remove the auth record itself. Whether the platform
// permits deleting a User row is not guaranteed — if it refuses, the data is
// still gone and the caller is told the account itself survived.
export async function deleteUserAccount(user, me, onProgress) {
  const results = await wipeUserData(user, onProgress);
  let accountDeleted = false;
  let accountError = null;
  try {
    await base44.entities.User.delete(user.id);
    accountDeleted = true;
  } catch (e) {
    accountError = e?.message || String(e);
  }
  return { results, accountDeleted, accountError };
}
