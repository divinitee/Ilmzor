import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, BookOpen, MessageSquareText, TrendingUp, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { chooseFreePlan, TRIAL_DAYS, TRIAL_ENABLED } from "@/lib/subscription";
import { PLAN_LIST, formatPrice } from "@/lib/plans";
import ProfileSetup from "@/components/onboarding/ProfileSetup";
import { needsProfileSetup } from "@/lib/profileStatus";
import { resolveUserNameOrEmail } from "@/lib/profileName";

// Post-registration flow for students: choose a plan (with a soft nudge
// before committing to free) -> quick tutorial -> a warm, skippable
// placement-test suggestion. The test is no longer mandatory — it's
// pitched on its own merits, not used as a gate.

function PlanStep({ onFree, onSeePlans }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full">
      <Sparkles className="w-10 h-10 text-blue-500 mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Start free</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Jump in for free, or see what the paid plans unlock — either way, you're in.
      </p>
      <button
        onClick={onFree}
        className="w-full h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg mb-3 select-none"
      >
        Start free
      </button>
      <button
        onClick={onSeePlans}
        className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium select-none"
      >
        See paid plans
      </button>
    </div>
  );
}

function ConfirmFreeStep({ onConfirm, onSeePlans }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full text-center">
      <h2 className="text-xl font-bold text-foreground mb-2">Continue with the free plan?</h2>
      <p className="text-sm text-muted-foreground mb-8">
        {TRIAL_ENABLED
          ? `You'll get full access for ${TRIAL_DAYS} days as a welcome gift, then settle onto the free tier — flashcards and a few AI turns a day. You can upgrade any time.`
          : "You'll be on the free tier — flashcards and a few AI turns a day. You can upgrade any time."}
      </p>
      <button
        onClick={onConfirm}
        className="w-full h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg mb-3 select-none"
      >
        Yes, continue free
      </button>
      <button
        onClick={onSeePlans}
        className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium select-none"
      >
        Actually, show me paid plans
      </button>
    </div>
  );
}

function PlansStep({ onBackToFree }) {
  const paid = PLAN_LIST.filter((p) => p.id !== "free");
  return (
    <div className="flex-1 flex flex-col px-6 max-w-sm mx-auto w-full py-8">
      <h2 className="text-xl font-bold text-foreground mb-5">Choose a plan</h2>
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
              <p className="text-sm text-muted-foreground">{formatPrice(p.monthlyPrice)} so'm / month</p>
            </Link>
          );
        })}
      </div>
      <button onClick={onBackToFree} className="text-sm text-muted-foreground hover:text-foreground underline select-none">
        Actually, I'll start free
      </button>
    </div>
  );
}

const TUTORIAL_SLIDES = [
  { icon: BookOpen, title: "Skill Hub", body: "A living map of every English skill \u2014 tap a node to practice vocabulary, grammar, and more." },
  { icon: MessageSquareText, title: "AI Teacher", body: "Stuck on a word or a rule? Ask anytime and get a real explanation, not just a definition." },
  { icon: TrendingUp, title: "Your progress", body: "Everything you practice feeds back into your profile \u2014 the app gets more personalized as you go." },
];

function TutorialStep({ onDone }) {
  const [idx, setIdx] = useState(0);
  const slide = TUTORIAL_SLIDES[idx];
  const Icon = slide.icon;
  const isLast = idx === TUTORIAL_SLIDES.length - 1;
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/15 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{slide.title}</h2>
      <p className="text-sm text-muted-foreground mb-8">{slide.body}</p>
      <div className="flex justify-center gap-1.5 mb-6">
        {TUTORIAL_SLIDES.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-blue-500" : "w-1.5 bg-muted"}`} />
        ))}
      </div>
      <button
        onClick={() => (isLast ? onDone() : setIdx(idx + 1))}
        className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-1.5 select-none"
      >
        {isLast ? "Got it" : "Next"} <ChevronRight className="w-4 h-4" />
      </button>
      {!isLast && (
        <button onClick={onDone} className="mt-3 text-sm text-muted-foreground hover:text-foreground select-none">
          Skip
        </button>
      )}
    </div>
  );
}

function SuggestTestStep({ onTakeIt, onLater }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full text-center">
      <Sparkles className="w-10 h-10 text-blue-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-foreground mb-2">Want a quick level check?</h2>
      <p className="text-sm text-muted-foreground mb-8">
        A short, mixed vocabulary and grammar check — helps us show you the right words and
        grammar for where you're actually at. Totally optional.
      </p>
      <button
        onClick={onTakeIt}
        className="w-full h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg mb-3 select-none"
      >
        Take it
      </button>
      <button onClick={onLater} className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium select-none">
        Maybe later
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
