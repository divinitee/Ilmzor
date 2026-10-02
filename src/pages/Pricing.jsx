import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Check, CreditCard, Loader2, Info, QrCode, ArrowRight } from "lucide-react";
import { qrPayApi } from "@/lib/serverApi";
import { qrT, formatUzs } from "@/lib/qrPay";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";
import { PLAN_LIST, formatPrice } from "@/lib/plans";
import FounderPriceNote from "@/components/FounderPriceNote";
import FounderCountdown from "@/components/FounderCountdown";
import { getCurrentStage, yearlySavingPct } from "@/lib/founderPricing";
import { refreshMySubscription, subscriptionKind } from "@/lib/subscription";
import { PLAN_THEME, planKey, metalText } from "@/lib/planTheme";
import { pT } from "@/lib/planCopy";
import MemberCard, { PlanDot } from "@/components/payments/MemberCard";

// Pricing, one colour identity per plan (Tee, 2026-10-03):
//   Free → light electric blue · Learner → VIRORA purple · VIP → black & gold.
// Every plan shows its membership card so the three are told apart at a glance.
// Payments: Humo/Uzcard by QR (so'm, /pay/qr) or Visa/Mastercard via Dodo.

// Mobile shows the paid plans first and Free last; desktop reads left→right.
const ORDER = { free: "order-3 lg:order-1", learner: "order-1 lg:order-2", vip: "order-2 lg:order-3" };

export default function Pricing() {
  const { t, lang } = useAppLang();
  const navigate = useNavigate();
  const [qrConfig, setQrConfig] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const [cardLoading, setCardLoading] = useState("");
  const [cardError, setCardError] = useState("");
  const [name, setName] = useState("");
  const [current, setCurrent] = useState(null); // "free" | "learner" | "vip" | null

  const isYearly = cycle === "yearly";
  const q = (key, vars) => qrT(lang, key, vars);
  const p = (key, vars) => pT(lang, key, vars);
  const founding = getCurrentStage().id === "founder";

  useEffect(() => {
    let alive = true;
    // So'm prices for the QR option, set by the admin in /admin-qr-payments.
    qrPayApi("config").then((res) => { if (alive) setQrConfig(res?.config || null); }).catch(() => {});
    base44.auth.me().then((me) => { if (alive) setName(me?.full_name || ""); }).catch(() => {});
    refreshMySubscription()
      .then((res) => {
        if (!alive) return;
        const sub = res?.subscription;
        const kind = subscriptionKind(sub);
        if (["paid", "ending"].includes(kind)) setCurrent(planKey(sub.plan));
        else if (kind === "free") setCurrent("free");
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const goQr = (planId) => navigate(`/pay/qr?plan=${planId}&cycle=${cycle}`);

  // Card payment via Dodo Payments. The backend derives the buyer from the
  // session; access is granted only by dodoWebhook when Dodo confirms.
  const handleCardCheckout = async (planId) => {
    setCardError("");
    setCardLoading(planId);
    try {
      const res = await base44.functions.invoke("createDodoCheckout", {
        plan: planId,
        billing_cycle: cycle,
        founder_stage: getCurrentStage().id, // label only; price is server-side
      });
      const url = res?.data?.url;
      if (!url) throw new Error(res?.data?.error || "No checkout link returned");
      window.location.href = url;
    } catch (err) {
      console.error("Dodo checkout failed:", err);
      setCardError(t("pricing.card_error"));
      setCardLoading("");
    }
  };

  const kicker = { free: p("free_kicker"), learner: p("learner_kicker"), vip: p("vip_kicker") };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070817] px-4 py-8 text-white sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute left-[-12rem] top-[30rem] h-[26rem] w-[26rem] rounded-full blur-3xl" style={{ background: "rgba(92,200,255,0.08)" }} />
        <div className="absolute right-[-12rem] top-[30rem] h-[26rem] w-[26rem] rounded-full blur-3xl" style={{ background: "rgba(217,181,114,0.08)" }} />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* header */}
        <div className="relative mb-8 sm:mb-10">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/"))}
            aria-label="Back"
            title="Back"
            className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center px-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {t("pricing.pricing_eyebrow")}
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
              {t("pricing.pricing_hero_title")}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">{t("pricing.pricing_hero_sub")}</p>
          </div>

          <div className="group absolute right-0 top-0">
            <button type="button" aria-label="Pricing information" title="Pricing information" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
              <Info className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute right-0 top-11 z-20 w-52 rounded-xl border border-white/10 bg-[#111327] px-3 py-2 text-left text-[10px] leading-4 text-white/65 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
              {t("pricing.pricing_info")}
            </span>
          </div>
        </div>

        {/* cycle switch + colour legend */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-inner">
            {["monthly", "yearly"].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cycle === c}
                onClick={() => setCycle(c)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${cycle === c ? "bg-white text-slate-950 shadow-lg" : "text-white/50 hover:text-white"}`}
              >
                {t(c === "monthly" ? "pricing.billing_monthly" : "pricing.billing_yearly")}
                {c === "yearly" && (
                  <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">
                    {t("pricing.billing_save", { pct: yearlySavingPct() })}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-white/55">
            <span className="text-white/40">{p("legend")}:</span>
            {["free", "learner", "vip"].map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <PlanDot plan={k} size={9} />
                <span style={{ color: PLAN_THEME[k].accent }}>{PLAN_THEME[k].label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Humo / Uzcard banner */}
        <div className="mx-auto mb-7 flex max-w-xl items-center gap-3 rounded-2xl border border-[rgba(214,180,108,0.40)] bg-[rgba(139,92,246,0.10)] px-4 py-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={PLAN_THEME.vip.metal}>
            <QrCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{q("banner_title")}</p>
            <p className="text-xs leading-5 text-[#CDBFE6]">{q("banner_sub")}</p>
          </div>
        </div>

        <FounderCountdown className="mb-8" />

        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {PLAN_LIST.map((plan, i) => {
            const k = planKey(plan.id);
            const th = PLAN_THEME[k];
            const isFree = k === "free";
            const isVip = k === "vip";
            const usd = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const uzs = qrConfig?.prices?.[k]?.[cycle];
            const isCurrent = current === k;
            return (
              <motion.section
                key={plan.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                aria-label={th.label}
                className={`relative flex h-full flex-col overflow-hidden rounded-[28px] p-5 sm:p-6 ${ORDER[k]}`}
                style={{
                  background: th.surface,
                  border: `1px solid ${isVip ? th.border : th.border.replace(/0\.\d+\)$/, "0.35)")}`,
                  boxShadow: isVip
                    ? `0 0 70px ${th.glow}, inset 0 1px 0 rgba(255,236,190,0.18)`
                    : `0 0 40px ${th.glow.replace(/0\.\d+\)$/, "0.12)")}`,
                }}
              >
                {/* plan colour line on top */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${th.dot}, transparent)` }} />

                {isVip && (
                  <>
                    {/* slow gold rays behind the card */}
                    <div
                      className="vr-spin-xslow pointer-events-none absolute h-[560px] w-[560px] rounded-full"
                      style={{ left: "calc(50% - 280px)", top: "-120px", background: "repeating-conic-gradient(from 0deg, rgba(233,201,140,0.07) 0deg 6deg, rgba(233,201,140,0) 6deg 18deg)" }}
                    />
                    <span className="vr-twinkle absolute left-[12%] top-[38%] h-1 w-1 rounded-full bg-[#F6E7BE]" />
                    <span className="vr-twinkle absolute right-[14%] top-[22%] h-1 w-1 rounded-full bg-[#E9D29A]" style={{ animationDelay: "1.1s" }} />
                    <span className="vr-twinkle absolute right-[30%] top-[46%] h-[3px] w-[3px] rounded-full bg-[#D9B572]" style={{ animationDelay: "0.6s" }} />
                  </>
                )}

                {/* title row */}
                <div className="relative mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <PlanDot plan={k} size={11} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: th.sub }}>{kicker[k]}</span>
                      <h2 className={`text-2xl font-semibold tracking-tight ${isVip ? "vr-serif text-[28px]" : ""}`} style={isFree ? { color: th.text } : metalText(th)}>
                        {isFree ? p("free_title") : plan.name.replace(" Plan", "")}
                      </h2>
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={th.metal}>{p("current")}</span>
                  ) : plan.badgeKey ? (
                    <span className="rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={th.metal}>{t(`plans.badges.${plan.badgeKey}`)}</span>
                  ) : null}
                </div>

                {/* membership card */}
                <div className="relative flex justify-center">
                  <MemberCard
                    plan={k}
                    name={name}
                    lang={lang}
                    founding={!isFree && founding}
                    active={isCurrent}
                    rightLabel={isFree ? p("status") : p("plan_word")}
                    rightValue={isFree ? p("always") : (isYearly ? q("yearly") : q("monthly"))}
                  />
                </div>

                {/* price */}
                <div className="relative mt-6 border-b pb-5" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                  {isFree ? (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-semibold tracking-[-0.045em]" style={{ color: th.text }}>{p("free_price")}</span>
                      </div>
                      <p className="mt-2 text-xs font-medium" style={{ color: th.accent }}>{p("free_note")}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-semibold tracking-[-0.045em]" style={isVip ? metalText(th) : { color: "#fff" }}>{formatPrice(usd)}</span>
                        <span className="pb-1.5 text-sm text-white/40">{isYearly ? t("pricing.per_year") : t("pricing.per_month")}</span>
                      </div>
                      {uzs > 0 && (
                        <p className="mt-1.5 text-[15px] font-bold" style={{ color: th.accent }}>
                          {q("or_uzs", { amount: formatUzs(uzs) })} {isYearly ? q("per_year") : q("per_month")}
                        </p>
                      )}
                      {isYearly && (
                        <p className="mt-2 text-xs font-medium" style={{ color: th.accent }}>{t("pricing.billing_save", { pct: yearlySavingPct() })}</p>
                      )}
                      <FounderPriceNote className="mt-3" planId={plan.id} cycle={cycle} />
                    </>
                  )}
                </div>

                {/* features */}
                <div className="relative mt-5 flex-1">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{t("pricing.pricing_included")}</p>
                  <ul className="space-y-2.5">
                    {plan.featureKeys.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm leading-5 text-white/70">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: th.glow, color: th.accent }}>
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span>{t(`plans.features.${f}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* actions */}
                <div className="relative mt-6 flex flex-col gap-2.5">
                  {isFree ? (
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      style={th.metal}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-extrabold transition-[filter] hover:brightness-110"
                    >
                      {p("free_cta")} <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => goQr(k)}
                        style={th.metal}
                        className="relative flex min-h-[56px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-4 text-[15px] font-extrabold transition-[filter] hover:brightness-110"
                      >
                        <span className="vr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))" }} />
                        <QrCode className="relative h-5 w-5" />
                        <span className="relative">{q("qr_btn")}</span>
                      </button>
                      <button
                        type="button"
                        disabled={!!cardLoading}
                        onClick={() => handleCardCheckout(k)}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border bg-transparent px-4 text-sm font-bold transition hover:bg-white/[0.05] disabled:opacity-60"
                        style={{ borderColor: th.border, color: th.accent }}
                      >
                        {cardLoading === k
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("pricing.card_loading")}</>
                          : <><CreditCard className="h-4 w-4" /> {q("card_btn")}</>}
                      </button>
                    </>
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>

        {cardError && <p className="mt-3 text-center text-xs text-rose-300">{cardError}</p>}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/35">
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          <span className="text-center">{q("footer")}</span>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-[11px] leading-5 text-white/25">{t("pricing.pricing_stage_note")}</p>
      </div>
    </div>
  );
}
