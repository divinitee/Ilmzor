import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";
import { PLAN_LIST, formatPrice } from "@/lib/plans";
import FounderPriceNote from "@/components/FounderPriceNote";
import FounderCountdown from "@/components/FounderCountdown";
import { yearlySavingPct } from "@/lib/founderPricing";

const ease = [0.22, 1, 0.36, 1];

export default function LandingPricing() {
  const { t } = useAppLang();
  const [cycle, setCycle] = useState("monthly");
  const isYearly = cycle === "yearly";

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-2xl mx-auto">
          
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 landing-dark:text-blue-400">{t("landing.pricing.label")}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 landing-dark:text-slate-50 tracking-tight">{t("landing.pricing.title")}</h2>
        </motion.div>
        <div className="absolute right-0 top-0 group">
          <button type="button" aria-label="Subject to change" title="Subject to change" className="w-7 h-7 rounded-full border border-slate-300 landing-dark:border-slate-700 text-slate-400 landing-dark:text-slate-500 hover:text-slate-600 landing-dark:hover:text-slate-300 hover:border-slate-400 landing-dark:hover:border-slate-500 flex items-center justify-center transition-colors">
            <Info className="w-3.5 h-3.5" />
          </button>
          <span className="pointer-events-none absolute right-0 top-9 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">Subject to change</span>
        </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors select-none ${
            !isYearly ?
            "border-blue-600 bg-blue-50 landing-dark:bg-blue-950/40 text-blue-600 landing-dark:text-blue-300" :
            "border-slate-200 landing-dark:border-slate-700 text-slate-500 landing-dark:text-slate-400"}`
            }>
            
            {t("pricing.billing_monthly")}
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`relative px-5 py-2 rounded-full text-sm font-semibold border-2 transition-colors select-none ${
            isYearly ?
            "border-blue-600 bg-blue-50 landing-dark:bg-blue-950/40 text-blue-600 landing-dark:text-blue-300" :
            "border-slate-200 landing-dark:border-slate-700 text-slate-500 landing-dark:text-slate-400"}`
            }>
            
            {t("pricing.billing_yearly")}
            <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{yearlySavingPct()}%</span>
          </button>
        </div>

        <div className="max-w-md mx-auto mb-4 rounded-2xl border border-blue-200 landing-dark:border-blue-900/60 bg-blue-50/70 landing-dark:bg-blue-950/30 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700 landing-dark:text-blue-300">Launch Pricing</p>
          <p className="text-[11px] text-slate-500 landing-dark:text-slate-400 mt-1">Be among the first VIRORA learners.</p>
        </div>
        <FounderCountdown variant="landing" className="max-w-md mx-auto mb-8" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {PLAN_LIST.map((p, i) => {
            const Icon = p.icon;
            const isFree = p.monthlyPrice === 0;
            const price = isYearly ? p.yearlyPrice : p.monthlyPrice;
            const period = isYearly ? t("pricing.per_year") : t("pricing.per_month");
            const highlighted = p.id === "learner";
            const isVip = p.id === "vip";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease, delay: i * 0.07 }}
                whileHover={{ y: -6 }}
                className={`relative rounded-3xl border p-6 sm:p-7 flex flex-col overflow-hidden transition-all duration-300 ${
                highlighted ?
                "premium-card premium-glow bg-white landing-dark:bg-violet-400/[0.055] border-blue-600 landing-dark:border-violet-400/60 ring-1 ring-blue-600 landing-dark:ring-0 shadow-[0_0_55px_rgba(139,92,246,0.14)] lg:-mt-2" :
                isVip ?
                "premium-card bg-white landing-dark:bg-amber-200/[0.045] border-slate-200 landing-dark:border-amber-300/60 shadow-[0_0_55px_rgba(245,158,11,0.10)]" :
                "premium-card bg-white landing-dark:bg-white/[0.035] border-slate-200 landing-dark:border-white/10 hover:border-slate-300 landing-dark:hover:border-white/20 hover:bg-slate-50 landing-dark:hover:bg-white/[0.05]"}`
                }>
                
                {highlighted &&
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-xs font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-700 px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> {t("plans.badges.learner")}
                  </span>
                }
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${
                  isVip
                    ? "border-amber-300/15 bg-amber-300/[0.08]"
                    : "border-violet-300/15 bg-violet-300/[0.08]"
                }`}>
                  <Icon className={`w-5 h-5 ${isVip ? "text-amber-300" : "text-violet-300"}`} />
                </div>
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isVip ? "via-amber-300/70" : "via-violet-300/70"} to-transparent opacity-80`} />
                <h3 className="font-bold text-slate-900 landing-dark:text-slate-50 text-lg">{p.name}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 landing-dark:text-slate-500">
                  {t(`plans.position.${p.id}`)}
                </p>
                <p className="mt-3 min-h-[40px] text-sm leading-5 text-slate-500 landing-dark:text-slate-400">
                  {t(`plans.descriptions.${p.id}`)}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  {isFree ?
                  <span className="text-3xl font-bold text-slate-900 landing-dark:text-slate-50">{t("landing.pricing.free")}</span> :

                  <>
                      <span className="text-3xl font-bold text-slate-900 landing-dark:text-slate-50">{formatPrice(price)}</span>
                      <span className="text-sm text-slate-400 landing-dark:text-slate-500">{period}</span>
                    </>
                  }
                </div>
                {!isFree && isYearly &&
                <p className="text-[11px] text-rose-600 landing-dark:text-rose-400 font-semibold mt-1">{t("pricing.billing_save", { pct: yearlySavingPct(p.id) })}</p>
                }
                {/* The landing's own pricing section — the prices a visitor sees
                    BEFORE signing up, so the founder-price caveat matters more
                    here than anywhere else in the product. */}
                {!isFree && (
                  <FounderPriceNote
                    variant="landing"
                    className="mt-1.5"
                    planId={p.id}
                    cycle={cycle}
                  />
                )}
                <div className="mt-5 pt-4 border-t border-slate-200/80 landing-dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 landing-dark:text-slate-500 mb-3">
                    {t("pricing.included")}
                  </p>
                  <ul className="space-y-2.5 flex-1">
                  {p.featureKeys.map((f) =>
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600 landing-dark:text-slate-300">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 landing-dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600 landing-dark:text-green-400" />
                      </span>
                      {t(`plans.features.${f}`)}
                    </li>
                  )}
                  </ul>
                </div>
                <Link to="/register" className="mt-6">
                  <Button
                    variant={highlighted ? "default" : "outline"}
                    className={`w-full h-11 text-sm [font-family:'Barlow',_sans-serif] font-bold ${
                    highlighted ?
                    "" :
                    "bg-white landing-dark:bg-slate-800 border border-slate-200 landing-dark:border-slate-700 text-slate-700 landing-dark:text-slate-200 hover:bg-slate-50 landing-dark:hover:bg-slate-700"}`
                    }>
                    
                    {isFree ? t("landing.nav.start_free") : "Select"} {!isFree && <ArrowRight className="w-4 h-4 ml-1" />}
                  </Button>
                </Link>
              </motion.div>);

          })}
        </div>
      </div>
    </section>);

}