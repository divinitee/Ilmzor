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
      <div className="max-w-lg mx-auto">
        <div className="relative text-center mb-8">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
            aria-label="Back"
            title="Back"
            className="absolute left-0 top-0 w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-0 group">
            <button type="button" aria-label="Subject to change" title="Subject to change" className="w-7 h-7 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground flex items-center justify-center transition-colors">
              <Info className="w-3.5 h-3.5" />
            </button>
            <span className="pointer-events-none absolute right-0 top-9 z-20 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[10px] font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">Subject to change</span>
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div className="inline-flex items-center gap-2 mb-3 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Launch Offer · First Public Release
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("pricing.header_title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("pricing.header_sub")}</p>
        </div>

        {/* Billing cycle toggle */}

        {/* Billing cycle toggle end */}
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
            <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{yearlySavingPct()}%</span>
          </button>
        </div>

        {/* Time pressure sits once above the cards; the price half of it lives
            on each card, so a VIP buyer never reads a Learner number. */}
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Launch Pricing</p>
          <p className="text-[11px] text-muted-foreground mt-1">Be among the first VIRORA learners.</p>
        </div>
        <FounderCountdown className="mb-6" />

        <div className="space-y-4 mb-8">
          {PLAN_LIST.filter((p) => p.monthlyPrice > 0).map((p, i) => {
            const Icon = p.icon;
            const isSelected = selectedPlan === p.id;
            const pPrice = isYearly ? p.yearlyPrice : p.monthlyPrice;
            const pPeriod = isYearly ? t("pricing.per_year") : t("pricing.per_month");
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setSelectedPlan(p.id)}
                className={`w-full text-left bg-gradient-to-br ${p.color} border-2 rounded-2xl p-5 transition-all select-none ${
                  isSelected ? `${p.border} shadow-lg` : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-background/60 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${p.iconColor}`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{p.name}</h3>
                      {p.badgeKey && (
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t(`plans.badges.${p.badgeKey}`)}</span>
                      )}
                      {isYearly && <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">−25%</span>}
                    </div>
                    {isYearly && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(p.monthlyPrice * 12)}</span>
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">{t("pricing.discount_word")}</span>
                      </div>
                    )}
                    <p className="text-xl font-bold text-foreground">
                      {formatPrice(pPrice)} <span className="text-sm font-normal text-muted-foreground">{pPeriod}</span>
                    </p>
                    <FounderPriceNote className="mt-1" planId={p.id} cycle={cycle} />
                    <ul className="mt-3 space-y-1.5">
                      {p.featureKeys.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {t(`plans.features.${f}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 transition-all ${
                    isSelected ? `${p.border} bg-current` : "border-muted-foreground/30"
                  }`}>
                    {isSelected && <div className={`w-full h-full rounded-full ${p.id === "vip" ? "bg-amber-500" : p.id === "learner" ? "bg-indigo-600" : "bg-emerald-500"}`} />}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Dodo is the sole payment path. Checkout creates the Dodo session,
            and the webhook is the only authority that grants access. */}
        <Button
          onClick={handleCardCheckout}
          disabled={cardLoading}
          className="w-full h-12 text-base font-bold select-none gap-2"
        >
          {cardLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("pricing.card_loading")}</>
            : <><CreditCard className="w-4 h-4" /> {t("pricing.card_btn")}</>}
        </Button>

        {cardError && (
          <p className="text-center text-xs text-destructive mt-2">{cardError}</p>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">{t("pricing.payment_note")}</p>
      </div>
    </div>
  );
}