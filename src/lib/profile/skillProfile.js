// Skill Profile view model — a PURE presentation adapter over server SkillState.
// SkillState → buildSkillProfile() → UI. Nothing here computes mastery; it only
// classifies what the server already decided. Top-level skills are read from
// the state itself (with display meta from SKILLS when known), so the taxonomy
// can grow without touching the UI. A future comparison mode can build two
// profiles (learner A, learner B) and hand both to the same components.
import { SKILLS, GAME_SKILL_MAP } from "@/lib/gameSkills";
import { SKILL_CHILDREN } from "@/lib/skillTreeData";
import { GRAMMAR_NAV } from "@/lib/grammarTiers";

const META = Object.fromEntries(SKILLS.map((s) => [s.key, s]));
const FALLBACK_COLOR = "#9A63E0";

/** "unmapped" = no evidence; otherwise banded by the server's own mastery. */
export function stageFor(row) {
  if (!row.evidence_count) return "unmapped";
  if (row.current_mastery >= 75) return "strong";
  if (row.current_mastery >= 40) return "developing";
  return "emerging";
}

// Real practice areas that feed a skill: Skill Hub categories containing a
// playable game mapped to it, plus the grammar tiers for grammar. Labels only.
function areasFor(key) {
  if (key === "grammar") return GRAMMAR_NAV.map((t) => t.name);
  return (SKILL_CHILDREN.vocabulary || [])
    .filter((c) => !c.comingSoon && c.challenges.some((ch) => GAME_SKILL_MAP[ch.game] === key))
    .map((c) => c.label);
}

// skillStates: raw server SkillState rows. Each node keeps its row as `raw`
// (computed_at, last_verified_at, legacy fields…) so nothing is lost.
export function buildSkillProfile(skillStates) {
  if (!skillStates) return null;
  const nodes = skillStates.map((r) => {
    const meta = META[r.skill] || {};
    const mapped = !!r.evidence_count;
    const peak = Math.round(r.historical_peak || 0);
    const mastery = Math.round(r.current_mastery || 0);
    return {
      key: r.skill,
      color: meta.color || FALLBACK_COLOR,
      mapped,
      mastery: mapped ? mastery : null,
      stage: stageFor(r),
      confidence: r.confidence || "low",
      freshness: r.freshness || "cold",
      rounds: r.evidence_count || 0,
      peak: mapped ? peak : null,
      atPeak: mapped && mastery >= peak,
      lastEvidenceAt: r.last_evidence_at || null,
      areas: areasFor(r.skill),
      raw: r,
    };
  });
  const mappedCount = nodes.filter((n) => n.mapped).length;
  return {
    nodes,
    summary: {
      mapped: mappedCount,
      total: nodes.length,
      rounds: nodes.reduce((a, n) => a + n.rounds, 0),
      state: mappedCount === 0 ? "unmapped" : mappedCount === nodes.length ? "mapped" : "developing",
    },
  };
}