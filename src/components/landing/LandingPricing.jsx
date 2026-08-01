import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";
import { PLAN_LIST, yearlyPrice, formatPrice } from "@/lib/plans";

const ease = [0.22, 1, 0.36, 1];

export default function LandingPricing() {
  const { t } = useAppLang();
  const [cycle, setCycle] = useState("monthly");
  const isYearly = cycle === "yearly";

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 landing-dark:text-blue-400">Pricing</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 landing-dark:text-slate-50 tracking-tight">
            Start free. Upgrade when you're ready.
          </h2>
        </motion.div>

        {/* Billing cycle toggle */}
        <div className="mt-8 flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors select-none ${
              !isYearly
                ? "border-blue-600 bg-blue-50 landing-dark:bg-blue-950/40 text-blue-600 landing-dark:text-blue-300"
                : "border-slate-200 landing-dark:border-slate-700 text-slate-500 landing-dark:text-slate-400"
            }`}
          >
            {t("pricing.billing_monthly")}
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`relative px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors select-none ${
              isYearly
                ? "border-blue-600 bg-blue-50 landing-dark:bg-blue-950/40 text-blue-600 landing-dark:text-blue-300"
                : "border-slate-200 landing-dark:border-slate-700 text-slate-500 landing-dark:text-slate-400"
            }`}
          >
            {t("pricing.billing_yearly")}
            <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">25%</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
          {PLAN_LIST.map((p, i) => {
            const Icon = p.icon;
            const price = isYearly ? yearlyPrice(p.monthlyPrice) : p.monthlyPrice;
            const period = isYearly ? t("pricing.per_year") : t("pricing.per_month");
            const highlighted = p.id === "learner";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  highlighted
                    ? "bg-white landing-dark:bg-slate-900 border-blue-600 ring-1 ring-blue-600 shadow-xl sm:-mt-2"
                    : "bg-white landing-dark:bg-slate-900 border-slate-200 landing-dark:border-slate-800 shadow-sm"
                }`}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> {t("plans.badges.learner")}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-blue-600/10 landing-dark:bg-blue-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600 landing-dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-slate-900 landing-dark:text-slate-50 text-lg">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 landing-dark:text-slate-50">{formatPrice(price)}</span>
                  <span className="text-sm text-slate-400 landing-dark:text-slate-500">{period}</span>
                </div>
                {isYearly && (
                  <p className="text-[11px] text-rose-600 landing-dark:text-rose-400 font-semibold mt-1">
                    {t("pricing.billing_save", { pct: 25 })}
                  </p>
                )}
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.featureKeys.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600 landing-dark:text-slate-300">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 landing-dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600 landing-dark:text-green-400" />
                      </span>
                      {t(`plans.features.${f}`)}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="mt-6">
                  <Button
                    className={`w-full h-11 text-base ${
                      highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        : "bg-white landing-dark:bg-slate-800 border border-slate-200 landing-dark:border-slate-700 text-slate-700 landing-dark:text-slate-200 hover:bg-slate-50 landing-dark:hover:bg-slate-700"
                    }`}
                  >
                    {t("plans.select_btn")} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}