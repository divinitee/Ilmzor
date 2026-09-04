import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, BookOpen, MessageSquareText, TrendingUp, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { chooseFreePlan, TRIAL_DAYS, TRIAL_ENABLED } from "@/lib/subscription";
import { PLAN_LIST, formatPrice } from "@/lib/plans";
import ProfileSetup from "@/components/onboarding/ProfileSetup";
import { needsProfileSetup } from "@/lib/profileStatus";
import { resolveUserNameOrEmail } from "@/lib/profileName";
import { useAppLang } from "@/hooks/useAppLang";

// Post-registration flow for students: choose a plan (with a soft nudge
// before committing to free) -> quick tutorial -> a warm, skippable
// placement-test suggestion. The test is no longer mandatory — it's
// pitched on its own merits, not used as a gate.

function PlanStep({ onFree, onSeePlans }) {
  const { t } = useAppLang();
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
      <Sparkles className="w-10 h-10 text-blue-500 mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.planTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t("onboarding.planSub")}</p>
      <button
        onClick={onFree}
        className="w-full h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg mb-3 select-none"
      >
        {t("onboarding.startFree")}
      </button>
      <button
        onClick={onSeePlans}
        className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium select-none"
      >
        {t("onboarding.seePaid")}
      </button>
    </div>
  );
}

function ConfirmFreeStep({ onConfirm, onSeePlans }) {
  const { t } = useAppLang();
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full text-center">
      <h2 className="text-xl font-bold text-foreground mb-2">{t("onboarding.confirmTitle")}</h2>
      <p className="text-sm text-muted-foreground mb-8">
        {TRIAL_ENABLED
          ? t("onboarding.confirmBodyTrial", { days: TRIAL_DAYS })
          : t("onboarding.confirmBodyNoTrial")}
      </p>
      <button
        onClick={onConfirm}
        className="w-full h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg mb-3 select-none"
      >
        {t("onboarding.confirmYes")}
      </button>
      <button
        onClick={onSeePlans}
        className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium select-none"
      >
        {t("onboarding.confirmShowPaid")}
      </button>
    </div>
  );
}

function PlansStep({ onBackToFree }) {
  const { t } = useAppLang();
  const paid = PLAN_LIST.filter((p) => p.id !== "free");
  return (
    <div className="flex-1 flex flex-col px-6 max-w-sm mx-auto w-full py-8">
      <h2 className="text-xl font-bold text-foreground mb-5">{t("onboarding.plansTitle")}</h2>
      <div className="space-y-3 mb-6">
        {paid.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.id}
              to="/pricing"
              className={`block rounded-xl border-2 ${p.border} bg-gradient-to-br ${p.color} p-4`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-5 h-5 ${p.iconColor}`} />
                <span className="font-bold text-foreground">{p.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{formatPrice(p.monthlyPrice)} {t("onboarding.perMonth")}</p>
            </Link>
          );
        })}
      </div>
      <button onClick={onBackToFree} className="text-sm text-muted-foreground hover:text-foreground underline select-none">
        {t("onboarding.plansBackFree")}
      </button>
    </div>
  );
}

const TUTORIAL_SLIDES = [
  { icon: BookOpen, titleKey: "onboarding.tutorial.skillHubTitle", bodyKey: "onboarding.tutorial.skillHubBody" },
  { icon: MessageSquareText, titleKey: "onboarding.tutorial.aiTitle", bodyKey: "onboarding.tutorial.aiBody" },
  { icon: TrendingUp, titleKey: "onboarding.tutorial.progressTitle", bodyKey: "onboarding.tutorial.progressBody" },
];

function TutorialStep({ onDone }) {
  const { t } = useAppLang();
  const [idx, setIdx] = useState(0);
  const slide = TUTORIAL_SLIDES[idx];
  const Icon = slide.icon;
  const isLast = idx === TUTORIAL_SLIDES.length - 1;
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/15 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{t(slide.titleKey)}</h2>
      <p className="text-sm text-muted-foreground mb-8">{t(slide.bodyKey)}</p>
      <div className="flex justify-center gap-1.5 mb-6">
        {TUTORIAL_SLIDES.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-blue-500" : "w-1.5 bg-muted"}`} />
        ))}
      </div>
      <button
        onClick={() => (isLast ? onDone() : setIdx(idx + 1))}
        className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-1.5 select-none"
      >
        {isLast ? t("onboarding.gotIt") : t("onboarding.next")} <ChevronRight className="w-4 h-4" />
      </button>
      {!isLast && (
        <button onClick={onDone} className="mt-3 text-sm text-muted-foreground hover:text-foreground select-none">
          {t("onboarding.skip")}
        </button>
      )}
    </div>
  );
}

function SuggestTestStep({ onTakeIt, onLater }) {
  const { t } = useAppLang();
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full text-center">
      <Sparkles className="w-10 h-10 text-blue-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-foreground mb-2">{t("onboarding.testTitle")}</h2>
      <p className="text-sm text-muted-foreground mb-8">{t("onboarding.testBody")}</p>
      <button
        onClick={onTakeIt}
        className="w-full h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg mb-3 select-none"
      >
        {t("onboarding.testTake")}
      </button>
      <button onClick={onLater} className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium select-none">
        {t("onboarding.testLater")}
      </button>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState("plan");
  // null = still checking. A Google signup reaches the app without ever having
  // seen the registration form, so the four profile questions run here first.
  const [setupUser, setSetupUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (cancelled) return;
      if (me && needsProfileSetup(me)) setSetupUser(me);
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChooseFree = async () => {
    const me = await base44.auth.me().catch(() => null);
    if (me) await chooseFreePlan(me.email, resolveUserNameOrEmail(me));
    setStep("tutorial");
  };

  // Hold the plan pitch back until we know whether the profile questions are
  // owed — otherwise a Google student sees "Start free" flash before being
  // asked their name.
  if (!checked) return <div className="min-h-screen bg-background" />;

  if (setupUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col py-8">
        <ProfileSetup user={setupUser} onDone={() => setSetupUser(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col py-8">
      {step === "plan" && <PlanStep onFree={() => setStep("confirm")} onSeePlans={() => setStep("plans")} />}
      {step === "confirm" && <ConfirmFreeStep onConfirm={handleChooseFree} onSeePlans={() => setStep("plans")} />}
      {step === "plans" && <PlansStep onBackToFree={() => setStep("confirm")} />}
      {step === "tutorial" && <TutorialStep onDone={() => setStep("suggest-test")} />}
      {step === "suggest-test" && (
        <SuggestTestStep onTakeIt={() => navigate("/placement-test")} onLater={() => navigate("/")} />
      )}
    </div>
  );
}
