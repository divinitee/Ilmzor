import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Target, Gauge, Hash, ArrowRight, ArrowLeft, Check, Loader2, Briefcase, Award, Plane, GraduationCap, Film, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";
import { PROFILE_STR, GOAL_KEYS } from "@/lib/profileSetupCopy";
import { LEVELS } from "@/lib/levels";
import { setUserLevel } from "@/lib/levelStore";
import { resolveUserName, resolveUserNameOrEmail } from "@/lib/profileName";

// The four questions a Google signup never got asked, because they skipped
// the registration form entirely. Same questions, same wording and same
// writes as registration — only the auth-specific steps (language, role,
// email, password, OTP) are dropped, since by the time this runs the account
// already exists and is signed in.
//
// Rendered by Onboarding before anything else when needsProfileSetup(user).

const GOAL_ICONS = { work: Briefcase, ielts: Award, travel: Plane, university: GraduationCap, movies: Film, daily: MessageCircle };

const ease = [0.22, 1, 0.36, 1];
const variants = {
  enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

function StepHeader({ icon: Icon, title, sub }) {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const STEPS = ["name", "goals", "level", "code"];

export default function ProfileSetup({ user, onDone }) {
  const { lang } = useAppLang();
  const s = PROFILE_STR[lang] || PROFILE_STR.uz;

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  // A Google account usually arrives with a real name from the provider —
  // prefill it so the student just confirms rather than retypes.
  const [username, setUsername] = useState(() => resolveUserName(user));
  const [goals, setGoals] = useState([]);
  const [level, setLevel] = useState("");
  const [classCode, setClassCode] = useState("");
  const [saving, setSaving] = useState(false);

  const currentKey = STEPS[step];
  const TOTAL = STEPS.length;
  const progress = Math.round(((step + 1) / TOTAL) * 100);

  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const back = () => go(step - 1);

  const canNext = () => {
    if (currentKey === "name") return username.trim().length > 0;
    // Unskippable, exactly as in registration: the level drives the word pool,
    // difficulty and which game modes unlock.
    if (currentKey === "level") return !!level;
    return true;
  };

  const toggleGoal = (key) =>
    setGoals((prev) => (prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]));

  const finish = async () => {
    setSaving(true);
    try {
      // display_name, not full_name — the platform silently discards writes to
      // full_name (see src/lib/profileName.js).
      await base44.auth.updateMe({
        display_name: username.trim(),
        goals,
        classroom_code: classCode.trim().toUpperCase(),
      });
      if (level) await setUserLevel(level, "self");

      if (classCode.trim()) {
        // Same referral linking registration does, so a Google student who
        // enters their teacher's code still gets connected to that teacher.
        try {
          const me = await base44.auth.me();
          const refs = await base44.entities.TeacherReferral.filter({ code: classCode.trim().toUpperCase() });
          if (refs.length > 0) {
            const ref = refs[0];
            const existing = await base44.entities.StudentSubscription.filter({ phone: me.email });
            if (existing.length === 0) {
              await base44.entities.StudentSubscription.create({
                student_name: resolveUserNameOrEmail(me),
                phone: me.email,
                status: "inactive",
                referral_code: ref.code,
                teacher_id: ref.teacher_id,
                teacher_name: ref.teacher_name,
              });
              await base44.entities.TeacherReferral.update(ref.id, { uses: (ref.uses || 0) + 1 });
            }
          }
        } catch (refErr) {
          console.error("Referral linking error:", refErr);
        }
      }
    } catch (e) {
      console.error("Profile setup save failed:", e);
    } finally {
      setSaving(false);
      // Always hand control back: a failed write must not trap the student on
      // this screen. needsProfileSetup() will simply ask again next load.
      onDone?.();
    }
  };

  const onNext = () => (step === TOTAL - 1 ? finish() : go(step + 1));

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">{step + 1} / {TOTAL}</span>
            <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-sm p-6 min-h-[440px] flex flex-col">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step} custom={dir} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease }}
              className="flex-1 flex flex-col"
            >
              {currentKey === "name" && (
                <>
                  <StepHeader icon={User} title={s.nameTitle} sub={s.nameSub} />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="ps-name">{s.fullName}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="ps-name" type="text" autoComplete="name" autoFocus
                        placeholder={s.fullNamePh}
                        value={username} onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                </>
              )}

              {currentKey === "goals" && (
                <>
                  <StepHeader icon={Target} title={s.goalsTitle} sub={s.goalsSub} />
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    {GOAL_KEYS.map((key) => {
                      const Icon = GOAL_ICONS[key];
                      const selected = goals.includes(key);
                      return (
                        <button
                          key={key} onClick={() => toggleGoal(key)}
                          className={`flex items-center gap-2 p-4 rounded-2xl border-2 transition-all select-none text-left ${
                            selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary/10" : "bg-muted"}`}>
                            <Icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <span className="font-medium text-foreground text-sm flex-1">{s.goals[key]}</span>
                          {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {currentKey === "level" && (
                <>
                  <StepHeader icon={Gauge} title={s.levelTitle} sub={s.levelSub} />
                  <div className="space-y-2 flex-1">
                    {LEVELS.map((id) => {
                      const selected = level === id;
                      return (
                        <button
                          key={id} onClick={() => setLevel(id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all select-none text-left ${
                            selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <span className="flex-1 text-sm font-medium text-foreground leading-snug">{s.levelOpts[id]}</span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-1 rounded-full border flex-shrink-0 ${
                            selected ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                          }`}>{id}</span>
                          {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {currentKey === "code" && (
                <>
                  <StepHeader icon={Hash} title={s.codeTitle} sub={s.codeSub} />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="ps-code">
                      {s.codeLabel} <span className="text-muted-foreground font-normal">({s.optional})</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="ps-code" type="text" autoFocus
                        placeholder={s.codePh}
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        className="pl-10 h-11 font-mono uppercase tracking-widest" maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{s.codeHint}</p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={back} className="h-11 px-4" disabled={saving}>
                <ArrowLeft className="w-4 h-4 mr-1" /> {s.back}
              </Button>
            )}
            <Button type="button" onClick={onNext} className="flex-1 h-11 font-semibold" disabled={!canNext() || saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{s.saving}</>
              ) : (
                <>{step === TOTAL - 1 ? s.finish : s.next} <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
