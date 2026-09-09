import { Sprout, Compass, GraduationCap } from "lucide-react";

// Visual identity per Grammar tier — VIRORA palette colours (same family as
// skillTreeData.js) so the Grammar world sits on the Midnight Purple ground.
export const TIER_META = {
  foundational: { accent: "#5B9B7E", glow: "rgba(91,155,126,0.55)", icon: Sprout },
  functional: { accent: "#3E9E92", glow: "rgba(62,158,146,0.55)", icon: Compass },
  academic: { accent: "#6B9EC4", glow: "rgba(107,158,196,0.55)", icon: GraduationCap },
};

export const GRAMMAR_ACCENT = "#3E9E92";
export const GRAMMAR_GLOW = "rgba(62,158,146,0.55)";

// Placement-state tones, shared with GrammarPlacementResult.jsx.
export const STATE_TONE = { focus: "#E08E60", strong: GRAMMAR_ACCENT, unknown: "#8b95a3" };

// Tier nodes climb a path from bottom-left to top-right — a journey with
// stages, not a ring around a hub.
export const TIER_POS = [{ x: 24, y: 74 }, { x: 50, y: 47 }, { x: 76, y: 20 }];