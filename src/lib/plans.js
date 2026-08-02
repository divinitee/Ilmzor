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
    monthlyPrice: 222222,
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
    aiLimit: Infinity,
    featureKeys: ["all_units", "full_test", "all_games", "early_access", "priority_support", "ai_unlimited", "personalized_vocab"],
  },
];

export const yearlyPrice = (monthly) => Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));

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