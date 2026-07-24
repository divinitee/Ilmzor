import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Star, Zap, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";

const plans = [
  {
    id: "vip",
    name: "VIP Plan",
    price: "49,999",
    period: "so'm / yil",
    icon: Crown,
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-400",
    iconColor: "text-amber-600",
    hasAI: true,
    badgeKey: null,
    featureKeys: ["all_units", "full_test", "all_games", "teacher_track", "early_access", "priority_support"],
  },
  {
    id: "learner",
    name: "Learner Plan",
    price: "24,888",
    period: "so'm / oy",
    icon: Star,
    color: "from-indigo-500/20 to-violet-500/20",
    border: "border-indigo-500",
    badgeKey: "learner",
    iconColor: "text-indigo-600",
    hasAI: true,
    featureKeys: ["all_units", "full_test", "all_games", "teacher_track"],
  },
  {
    id: "starter",
    name: "Starter Plan",
    price: "17,777",
    period: "so'm / oy",
    icon: Zap,
    color: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-400",
    iconColor: "text-emerald-600",
    hasAI: false,
    badgeKey: null,
    featureKeys: ["all_units", "full_test", "flashcard_only"],
  },
];

export default function Plans() {
  const { t } = useAppLang();
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950">
      <header className="bg-background/80 backdrop-blur border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-foreground select-none">{t("plans.title")}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">{t("plans.all_title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("plans.sub", { ai: t("plans.ai_tutor_name") })}
          </p>
        </div>

        <div className="space-y-4">
          {plans.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-gradient-to-br ${p.color} border-2 ${p.border} rounded-2xl p-5`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-background/60 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-5 h-5 ${p.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{p.name}</h3>
                      {p.badgeKey && (
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t(`plans.badges.${p.badgeKey}`)}</span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {p.price} <span className="text-sm font-normal text-muted-foreground">{p.period}</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {p.featureKeys.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {t(`plans.features.${f}`)}
                        </li>
                      ))}
                      {p.hasAI && (
                        <li className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                          {t("plans.ai_line")}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <Link to="/pricing">
          <Button className="w-full h-12 text-base font-bold mt-8 select-none">
            {t("plans.select_btn")}
          </Button>
        </Link>
      </div>
    </div>
  );
}