import { base44 } from "@/api/base44Client";
import { LEGACY_DEFAULT_LEVEL, isKnownLevel, isLegacyAccount } from "@/lib/levels";

// Reads and writes of User.cefr_level live here rather than in levels.js so
// that levels.js stays a pure policy module — it's imported by skillTreeData,
// SkillStage and the games, and none of those should pull in the API client.

// A level is never written without its source. Explicit actions (a self
// assessment, a placement result, a confirmed calibration) always win and
// always overwrite; only the legacy backfill below is fill-if-empty.
export async function setUserLevel(level, source) {
  if (!isKnownLevel(level)) return null;
  try {
    return await base44.auth.updateMe({
      cefr_level: level,
      level_source: source,
      level_set_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("setUserLevel failed", e);
    return null;
  }
}

// Accounts created before the level system have no cefr_level at all.
// levelOf() already resolves those to DEFAULT_LEVEL (B1) so the app behaves
// correctly with the field empty — this just makes it concrete on the record
// the next time the student opens the app, so the value is visible to teacher
// tooling and to calibration rather than being implied everywhere.
//
// Deliberately lazy rather than a bulk migration: writing over every live
// student row buys nothing that this doesn't, and can't half-fail.
// Backfill for students who predate the level system ONLY. It used to fire for
// anyone without a level, which meant every brand-new account was quietly
// stamped B1/legacy_default the first time it loaded Home — and at B1 virtually
// nothing in the Skill Hub locks, so the entire unlock ladder was invisible on
// exactly the accounts it was built for. New accounts get their level from the
// registration level step (source "self") or the placement test instead; if
// neither has happened yet, levelOf() falls back to DEFAULT_LEVEL without
// writing anything, so the real answer can still land later.
export async function ensureUserLevel(user) {
  if (!user || isKnownLevel(user.cefr_level)) return user;
  if (!isLegacyAccount(user)) return user;
  try {
    return await base44.auth.updateMe({
      cefr_level: LEGACY_DEFAULT_LEVEL,
      level_source: "legacy_default",
      level_set_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("ensureUserLevel failed", e);
    return user;
  }
}
