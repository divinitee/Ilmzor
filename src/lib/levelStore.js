import { base44 } from "@/api/base44Client";
import { DEFAULT_LEVEL, isKnownLevel } from "@/lib/levels";

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
export async function ensureUserLevel(user) {
  if (!user || isKnownLevel(user.cefr_level)) return user;
  try {
    return await base44.auth.updateMe({
      cefr_level: DEFAULT_LEVEL,
      level_source: "legacy_default",
      level_set_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("ensureUserLevel failed", e);
    return user;
  }
}
