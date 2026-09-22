import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Check, CreditCard, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";
import { PLAN_LIST, formatPrice } from "@/lib/plans";
import FounderPriceNote from "@/components/FounderPriceNote";
import FounderCountdown from "@/components/FounderCountdown";
import { getCurrentStage, yearlySavingPct } from "@/lib/founderPricing";

export default function Pricing() {
  const { t } = useAppLang();
  const [selectedPlan, setSelectedPlan] = useState("learner");
  const [cycle, setCycle] = useState("monthly");
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const isYearly = cycle === "yearly";
  const plan = PLAN_LIST.find((p) => p.id === selectedPlan);
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const period = isYearly ? t("pricing.per_year") : t("pricing.per_month");

  // Card payment via Dodo Payments. The backend function derives the buyer
  // from the authenticated session and builds the checkout — nothing about
  // who is paying is taken from this component, so a tampered client can't
  // buy a subscription onto someone else's account. Access is granted by the
  // dodoWebhook function when Dodo confirms payment, never here.
  const handleCardCheckout = async (planId = selectedPlan, billingCycle = cycle) => {
    setCardError("");
    setCardLoading(true);
    try {
      const res = await base44.functions.invoke("createDodoCheckout", {
        plan: planId,
        billing_cycle: billingCycle,
        // Label only — the binding locked price is derived server-side from
        // what Dodo actually charges (see dodoWebhook).
        founder_stage: getCurrentStage().id,
      });
      const url = res?.data?.url;
      if (!url) throw new Error(res?.data?.error || "No checkout link returned");
      window.location.href = url;
    } catch (err) {
      console.error("Dodo checkout failed:", err);
      setCardError(t("pricing.card_error"));
      setCardLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070817] text-white px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute right-[-10rem] top-[28rem] h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute left-[-12rem] top-[34rem] h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl">
      <div className="mx-auto max-w-5xl">
        <div className="relative mb-8 sm:mb-10">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
            aria-label="Back"
            title="Back"
            className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Founding Learner · First Public Release
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
              Choose your level of access.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
              Start with the essentials. Upgrade when you want the complete VIRORA learning system.
            </p>
          </div>

          <div className="absolute right-0 top-0 group">
            <button type="button" aria-label="Pricing information" title="Pricing information" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
              <Info className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute right-0 top-11 z-20 w-52 rounded-xl border border-white/10 bg-[#111327] px-3 py-2 text-left text-[10px] leading-4 text-white/65 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
              Founder pricing is subject to the current VIRORA launch stage.
            </span>
          </div>
        </div>

        <div className="mb-7 flex flex-col items-center gap-4">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-inner">
            <button
              type="button"
              aria-pressed={!isYearly}
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                !isYearly ? "bg-white text-slate-950 shadow-lg" : "text-white/50 hover:text-white"
              }`}
            >
              {t("pricing.billing_monthly")}
            </button>
            <button
              type="button"
              aria-pressed={isYearly}
              onClick={() => setCycle("yearly")}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                isYearly ? "bg-white text-slate-950 shadow-lg" : "text-white/50 hover:text-white"
              }`}
            >
              {t("pricing.billing_yearly")}
              <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">
                {t("pricing.billing_save", { pct: yearlySavingPct() })}
              </span>
            </button>
          </div>
        </div>

        <FounderCountdown className="mb-8" />

        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          {PLAN_LIST.filter((p) => p.monthlyPrice > 0).map((p, i) => {
            const Icon = p.icon;
            const isSelected = selectedPlan === p.id;
            const pPrice = isYearly ? p.yearlyPrice : p.monthlyPrice;
            const pPeriod = isYearly ? t("pricing.per_year") : t("pricing.per_month");
            const isVip = p.id === "vip";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelectedPlan(p.id)}
                className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border bg-white/[0.035] p-6 transition-all duration-300 sm:p-7 ${
                  isSelected
                    ? isVip
                      ? "border-amber-300/60 bg-amber-200/[0.045] shadow-[0_0_55px_rgba(245,158,11,0.10)]"
                      : "border-violet-400/60 bg-violet-400/[0.055] shadow-[0_0_55px_rgba(139,92,246,0.14)]"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isVip ? "via-amber-300/70" : "via-violet-300/70"} to-transparent opacity-80`} />

                {p.badgeKey && (
                  <div className="absolute right-6 top-5 rounded-full bg-violet-500 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-violet-500/20">
                    {t(`plans.badges.${p.badgeKey}`)}
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${isVip ? "border-amber-300/15 bg-amber-300/[0.08]" : "border-violet-300/15 bg-violet-300/[0.08]"}`}>
                    <Icon className={`h-5 w-5 ${isVip ? "text-amber-300" : "text-violet-300"}`} />
                  </div>
                  <div className="min-w-0 pr-16">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                      {isVip ? "Complete access" : "For serious learners"}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{p.name.replace(" Plan", "")}</h2>
                  </div>
                </div>

                <div className="mt-7 border-b border-white/10 pb-6">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.045em] text-white">{formatPrice(pPrice)}</span>
                    <span className="pb-1.5 text-sm text-white/40">{pPeriod}</span>
                  </div>
                  {isYearly && (
                    <p className="mt-2 text-xs font-medium text-violet-300">
                      {t("pricing.billing_save", { pct: yearlySavingPct() })}
                    </p>
                  )}
                  <FounderPriceNote className="mt-3" planId={p.id} cycle={cycle} />
                </div>

                <div className="mt-6 flex-1">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                    What’s included
                  </p>
                  <ul className="space-y-3">
                    {p.featureKeys.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3 text-sm leading-5 text-white/65">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${isVip ? "bg-amber-300/10 text-amber-300" : "bg-violet-300/10 text-violet-300"}`}>
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span>{t(`plans.features.${f}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="button"
                  disabled={cardLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(p.id);
                    handleCardCheckout(p.id, cycle);
                  }}
                  className={`mt-7 h-12 w-full rounded-xl text-sm font-bold transition-all ${
                    isVip
                      ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                      : "bg-violet-500 text-white hover:bg-violet-400"
                  }`}
                >
                  {cardLoading && selectedPlan === p.id
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("pricing.card_loading")}</>
                    : <><CreditCard className="h-4 w-4" /> {t("pricing.card_btn")}</>}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {cardError && (
          <p className="mt-3 text-center text-xs text-rose-300">{cardError}</p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/35">
          <CreditCard className="h-3.5 w-3.5" />
          <span>{t("pricing.payment_note")}</span>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-[11px] leading-5 text-white/25">
          Prices shown are for the current founder stage. Plan features and availability may evolve as VIRORA develops.
        </p>
      </div>
    </div>
  );
}