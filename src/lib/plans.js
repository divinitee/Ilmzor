import { Crown, Star, Zap, Sparkles } from "lucide-react";

// Monthly base prices (so'm). Yearly = monthly × 12 × 0.75 (= monthly × 9, a 25% discount).
export const YEARLY_DISCOUNT = 0.25;

export const PLAN_LIST = [
  {
    id: "free",
    name: "Free Plan",
    monthlyPrice: 0,
    icon: Sparkles,
    color: "from-slate-500/10 to-slate-400/10",
    border: "border-slate-300",
    iconColor: "text-slate-600",
    badgeKey: null,
    hasAI: true,
    aiLimit: 3,
    featureKeys: ["flashcard_only", "ai_daily_3"],
  },
  {
    id: "learner",
    name: "Learner Plan",
    monthlyPrice: 24777,
    icon: Star,
    color: "from-indigo-500/20 to-violet-500/20",
    border: "border-indigo-500",
    badgeKey: "learner",
    iconColor: "text-indigo-600",
    hasAI: true,
    aiLimit: 25,
    featureKeys: ["all_units", "full_test", "all_games", "ai_daily_25", "personalized_vocab"],
  },
  {
    id: "vip",
    name: "VIP Plan",
    monthlyPrice: 49999,
    icon: Crown,
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-400",
    iconColor: "text-amber-600",
    badgeKey: null,
    hasAI: true,
    // Real enforced daily ceiling, not a literal Infinity. VIP is marketed and
    // displayed as "unlimited (fair use)" — see aiDisplayUnlimited below — but
    // AI calls still draw from one shared Base44 integration-credit pool across
    // every user, so a true Infinity here would have zero backstop against a
    // runaway account or bug. 300/day is a placeholder sized to be far above any
    // genuine study session; tune once real usage data exists (see aiLimits.js).
    aiLimit: 300,
    aiDisplayUnlimited: true,
    featureKeys: ["all_units", "full_test", "all_games", "early_access", "priority_support", "ai_unlimited", "personalized_vocab"],
  },
];

export const yearlyPrice = (monthly) => monthly === 24777 ? 222222 : monthly === 49999 ? 444444 : Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));

export const formatPrice = (n) => Number(n).toLocaleString("en-US");

export const getPlanById = (id) => PLAN_LIST.find((p) => p.id === id);

// Resolve a stored plan name ("VIP Plan") or id ("vip") to a plan object.
// Falls back to Free when nothing matches (lowest limit for unknown / no subscription).
export const resolvePlan = (planNameOrId) => {
  if (!planNameOrId) return getPlanById("free");
  const v = String(planNameOrId).toLowerCase();
  return PLAN_LIST.find((p) => p.id === v || p.name.toLowerCase() === v || v.includes(p.id)) || getPlanById("free");
};

export const getAiDailyLimit = (planNameOrId) => resolvePlan(planNameOrId).aiLimit;

// Display-only hint: true for a plan marketed as "unlimited (fair use)" (VIP).
// Never use this for enforcement — aiLimit above is the real, always-checked
// ceiling; this only tells the UI to show "unlimited" instead of a raw count
// while the real limit isn't hit.
export const isAiDisplayUnlimited = (planNameOrId) => !!resolvePlan(planNameOrId).aiDisplayUnlimited;