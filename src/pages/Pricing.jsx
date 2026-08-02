import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BookOpen, Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppLang } from "@/hooks/useAppLang";
import { PLAN_LIST, yearlyPrice, formatPrice } from "@/lib/plans";
import TelegramPaymentLink from "@/components/TelegramPaymentLink";

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useAppLang();
  const [selectedPlan, setSelectedPlan] = useState("learner");
  const [cycle, setCycle] = useState("monthly");
  const [step, setStep] = useState("plans");
  const [paymentRef, setPaymentRef] = useState("");
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isYearly = cycle === "yearly";
  const plan = PLAN_LIST.find((p) => p.id === selectedPlan);
  const price = isYearly ? yearlyPrice(plan.monthlyPrice) : plan.monthlyPrice;
  const period = isYearly ? t("pricing.per_year") : t("pricing.per_month");

  const handleContinue = () => setStep("payment");

  const handleSubmit = async () => {
    if (!paymentRef.trim() || !studentName.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      const existing = await base44.entities.StudentSubscription.filter({ phone: me.email });
      const planName = plan.name;
      const payload = {
        student_name: studentName,
        payment_ref: paymentRef,
        status: "pending",
        plan: planName,
        billing_cycle: cycle,
      };
      if (existing.length > 0) {
        await base44.entities.StudentSubscription.update(existing[0].id, payload);
      } else {
        await base44.entities.StudentSubscription.create({ ...payload, phone: me.email });
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">{t("pricing.submitted_title")}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t("pricing.submitted_desc")}</p>
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-400 font-medium">
            {t("pricing.submitted_wait")}
          </div>
        </div>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <button onClick={() => setStep("plans")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 select-none">
            <ArrowLeft className="w-4 h-4" /> {t("pricing.back_to_plan")}
          </button>

          <div className="bg-card border border-border rounded-3xl shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">{t("pricing.payment_title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("pricing.selected_plan")} <strong className="text-foreground">{plan.name} — {formatPrice(price)} {period}</strong>
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t("pricing.qr_via")}</p>
              <img
                src="https://media.base44.com/images/public/6a40f974860993eff3634df0/4ef59e6e7_paymentqr.jpg"
                alt="QR"
                className="w-36 h-36 mx-auto rounded-xl border-4 border-white shadow-md object-contain bg-white"
              />
            </div>

            <TelegramPaymentLink />

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t("pricing.name_label")}</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={t("pricing.name_placeholder")}
                  className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t("pricing.phone_label")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("pricing.phone_placeholder")}
                  className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t("pricing.ref_label")}</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder={t("pricing.ref_placeholder")}
                  className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !paymentRef.trim() || !studentName.trim() || !phone.trim()}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold select-none"
            >
              {submitting ? t("pricing.submitting") : t("pricing.submit_payment")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("pricing.header_title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("pricing.header_sub")}</p>
        </div>

        <div className="bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-300 dark:border-rose-700 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{t("pricing.discount_title")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("pricing.discount_sub")}</p>
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

        <div className="space-y-4 mb-8">
          {PLAN_LIST.filter((p) => p.monthlyPrice > 0).map((p, i) => {
            const Icon = p.icon;
            const isSelected = selectedPlan === p.id;
            const pPrice = isYearly ? yearlyPrice(p.monthlyPrice) : p.monthlyPrice;
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

        <Button onClick={handleContinue} className="w-full h-12 text-base font-bold select-none">
          {plan.name} — {formatPrice(price)} so'm {t("pricing.continue_btn")}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">{t("pricing.payment_note")}</p>
      </div>
    </div>
  );
}