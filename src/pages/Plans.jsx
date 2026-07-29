import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";
import { PLAN_LIST, yearlyPrice, formatPrice } from "@/lib/plans";

export default function Plans() {
  const { t } = useAppLang();
  const [cycle, setCycle] = useState("monthly");
  const isYearly = cycle === "yearly";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950">
      <header className="bg-background/80 backdrop-blur border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-foreground select-none">{t("plans.title")}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t("plans.all_title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("plans.sub", { ai: t("plans.ai_tutor_name") })}
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors select-none ${
              !isYearly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {t("pricing.billing_monthly")}
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`relative px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors select-none ${
              isYearly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {t("pricing.billing_yearly")}
            <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">25%</span>
          </button>
        </div>

        <div className="space-y-4">
          {PLAN_LIST.map((p, i) => {
            const Icon = p.icon;
            const price = isYearly ? yearlyPrice(p.monthlyPrice) : p.monthlyPrice;
            const period = isYearly ? t("pricing.per_year") : t("pricing.per_month");
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
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          {t(`plans.badges.${p.badgeKey}`)}
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {formatPrice(price)} <span className="text-sm font-normal text-muted-foreground">{period}</span>
                    </p>
                    {isYearly && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                        {t("pricing.billing_save", { pct: 25 })}
                      </p>
                    )}
                    <ul className="mt-3 space-y-1.5">
                      {p.featureKeys.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {t(`plans.features.${f}`)}
                        </li>
                      ))}
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