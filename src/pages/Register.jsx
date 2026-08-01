import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, BookOpen, Mail, Lock, Loader2, Hash, User, ArrowRight, ArrowLeft, Check, Globe } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { useAppLang } from "@/hooks/useAppLang";
import { APP_LANGS } from "@/i18n/translations";

const STR = {
  uz: {
    langTitle: "Tilni tanlang", langSub: "Ilova tilini tanlang — keyin o'zgartirishingiz mumkin",
    roleTitle: "Siz kimisiz?", roleSub: "Hisob turini tanlang",
    student: "O'quvchi", studentDesc: "So'zlar va o'yinlarni o'rganing",
    teacher: "O'qituvchi", teacherDesc: "O'quvchilaringizni kuzating",
    nameTitle: "Ismingiz", nameSub: "Ism familiyangizni kiriting",
    fullName: "Ism familiya", fullNamePh: "Masalan: Alibek Karimov",
    credsTitle: "Hisob ma'lumotlari", credsSub: "Email va parol yarating",
    email: "Email", emailPh: "you@example.com",
    password: "Parol", confirm: "Parolni tasdiqlang", pwdMismatch: "Parollar mos kelmadi",
    codeTitle: "Sinf kodi", codeSub: "O'qituvchingiz bergan kodni kiriting",
    codeStudentLabel: "Sinf kodi", codeStudentPh: "Masalan: ABC123", codeStudentHint: "O'qituvchingiz bergan sinf kodini kiriting",
    codeTeacherLabel: "Xona kodi", codeTeacherPh: "Masalan: ROOM1", codeTeacherHint: "O'quvchilar siz bilan bog'lanish uchun ishlatiladigan kod",
    optional: "ixtiyoriy",
    next: "Keyingisi", back: "Orqaga", create: "Hisob yaratish", creating: "Yaratilmoqda...",
    otpTitle: "Emailni tasdiqlang", otpSub: "{email} ga 6 xonali kod yuborildi",
    verify: "Tasdiqlash", verifying: "Tekshirilmoqda...", resend: "Qayta yuborish",
    codeSent: "Kod yuborildi", codeSentDesc: "Emailingizni tekshiring.",
    google: "Google orqali davom etish", or: "yoki",
    haveAccount: "Hisob bormi?", login: "Kirish",
    registerFail: "Ro'yxatdan o'tish muvaffaqiyatsiz", otpFail: "Tasdiqlash kodi noto'g'ri", resendFail: "Kodni qayta yuborib bo'lmadi",
  },
  en: {
    langTitle: "Choose your language", langSub: "Pick your app language — you can change it later",
    roleTitle: "Who are you?", roleSub: "Choose your account type",
    student: "Student", studentDesc: "Learn words and play games",
    teacher: "Teacher", teacherDesc: "Track your students",
    nameTitle: "Your name", nameSub: "Enter your full name",
    fullName: "Full name", fullNamePh: "e.g. Alibek Karimov",
    credsTitle: "Account details", credsSub: "Create your email and password",
    email: "Email", emailPh: "you@example.com",
    password: "Password", confirm: "Confirm password", pwdMismatch: "Passwords don't match",
    codeTitle: "Class code", codeSub: "Enter the code from your teacher",
    codeStudentLabel: "Class code", codeStudentPh: "e.g. ABC123", codeStudentHint: "Enter the class code given by your teacher",
    codeTeacherLabel: "Room code", codeTeacherPh: "e.g. ROOM1", codeTeacherHint: "Code students use to connect with you",
    optional: "optional",
    next: "Next", back: "Back", create: "Create account", creating: "Creating...",
    otpTitle: "Verify your email", otpSub: "We sent a 6-digit code to {email}",
    verify: "Verify", verifying: "Verifying...", resend: "Resend code",
    codeSent: "Code sent", codeSentDesc: "Check your email.",
    google: "Continue with Google", or: "or",
    haveAccount: "Already have an account?", login: "Log in",
    registerFail: "Registration failed", otpFail: "Invalid verification code", resendFail: "Couldn't resend code",
  },
  ru: {
    langTitle: "Выберите язык", langSub: "Выберите язык приложения — потом можно изменить",
    roleTitle: "Кто вы?", roleSub: "Выберите тип аккаунта",
    student: "Ученик", studentDesc: "Учите слова и играйте",
    teacher: "Учитель", teacherDesc: "Отслеживайте учеников",
    nameTitle: "Ваше имя", nameSub: "Введите имя и фамилию",
    fullName: "Имя и фамилия", fullNamePh: "Напр. Алибек Каримов",
    credsTitle: "Данные аккаунта", credsSub: "Создайте email и пароль",
    email: "Email", emailPh: "you@example.com",
    password: "Пароль", confirm: "Подтвердите пароль", pwdMismatch: "Пароли не совпадают",
    codeTitle: "Код класса", codeSub: "Введите код от учителя",
    codeStudentLabel: "Код класса", codeStudentPh: "Напр. ABC123", codeStudentHint: "Введите код класса, выданный учителем",
    codeTeacherLabel: "Код комнаты", codeTeacherPh: "Напр. ROOM1", codeTeacherHint: "Код, по которому ученики связываются с вами",
    optional: "необязательно",
    next: "Далее", back: "Назад", create: "Создать аккаунт", creating: "Создание...",
    otpTitle: "Подтвердите email", otpSub: "Мы отправили 6-значный код на {email}",
    verify: "Подтвердить", verifying: "Проверка...", resend: "Отправить снова",
    codeSent: "Код отправлен", codeSentDesc: "Проверьте почту.",
    google: "Продолжить через Google", or: "или",
    haveAccount: "Уже есть аккаунт?", login: "Войти",
    registerFail: "Регистрация не удалась", otpFail: "Неверный код подтверждения", resendFail: "Не удалось отправить код снова",
  },
};

const ease = [0.22, 1, 0.36, 1];
const variants = {
  enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

const TOTAL = 6;

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

function NavButtons({ onBack, onNext, nextLabel, backLabel, disabled, loading, loadingLabel }) {
  return (
    <div className="flex items-center gap-3 mt-6">
      {onBack && (
        <Button type="button" variant="outline" onClick={onBack} className="h-11 px-4" disabled={loading}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}
        </Button>
      )}
      <Button type="button" onClick={onNext} className="flex-1 h-11 font-semibold" disabled={disabled || loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{loadingLabel}</>
        ) : (
          <>{nextLabel} <ArrowRight className="w-4 h-4 ml-1" /></>
        )}
      </Button>
    </div>
  );
}

export default function Register() {
  const { lang, setLang } = useAppLang();
  const s = STR[lang] || STR.uz;

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const progress = Math.round(((step + 1) / TOTAL) * 100);

  const go = (nextStep) => { setDir(nextStep > step ? 1 : -1); setStep(nextStep); setError(""); };
  const next = () => {
    if (step === 3 && password !== confirmPassword) { setError(s.pwdMismatch); return; }
    setError("");
    go(step + 1);
  };
  const back = () => go(step - 1);

  const canNext = () => {
    if (step === 2) return username.trim().length > 0;
    if (step === 3) return email.trim() && password && confirmPassword;
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (password !== confirmPassword) { setError(s.pwdMismatch); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setDir(1);
      setStep(5);
    } catch (err) {
      setError(err.message || s.registerFail);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);

      if (username.trim()) {
        try { await base44.auth.updateMe({ full_name: username.trim() }); } catch { /* ignore */ }
      }

      if (role === "student" && referralCode.trim()) {
        try {
          const me = await base44.auth.me();
          const refs = await base44.entities.TeacherReferral.filter({ code: referralCode.trim().toUpperCase() });
          if (refs.length > 0) {
            const ref = refs[0];
            await base44.entities.StudentSubscription.create({
              student_name: me.full_name || email,
              phone: email,
              status: "inactive",
              referral_code: ref.code,
              teacher_id: ref.teacher_id,
              teacher_name: ref.teacher_name,
            });
            await base44.entities.TeacherReferral.update(ref.id, { uses: (ref.uses || 0) + 1 });
          }
        } catch (refErr) {
          console.error("Referral linking error:", refErr);
        }
      }

      window.location.href = "/";
    } catch (err) {
      setError(err.message || s.otpFail);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: s.codeSent, description: s.codeSentDesc });
    } catch (err) {
      setError(err.message || s.resendFail);
    }
  };

  const handleGoogle = () => base44.auth.loginWithProvider("google", "/");

  const isTeacher = role === "teacher";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Progress */}
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

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
          className="bg-card border border-border rounded-3xl shadow-sm p-6 min-h-[440px] flex flex-col"
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step} custom={dir} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease }}
              className="flex-1 flex flex-col"
            >
              {/* Step 0: Language */}
              {step === 0 && (
                <>
                  <StepHeader icon={Globe} title={s.langTitle} sub={s.langSub} />
                  <div className="space-y-3 flex-1">
                    {APP_LANGS.map((l) => (
                      <button
                        key={l.id} onClick={() => setLang(l.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all select-none ${
                          lang === l.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="text-2xl">{l.flag}</span>
                        <span className="flex-1 text-left font-semibold text-foreground">{l.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{l.short}</span>
                        {lang === l.id && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <NavButtons onNext={next} nextLabel={s.next} />
                </>
              )}

              {/* Step 1: Role */}
              {step === 1 && (
                <>
                  <StepHeader icon={GraduationCap} title={s.roleTitle} sub={s.roleSub} />
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <button
                      onClick={() => setRole("student")}
                      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition-all select-none text-center ${
                        role === "student" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">{s.student}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{s.studentDesc}</span>
                    </button>
                    <button
                      onClick={() => setRole("teacher")}
                      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition-all select-none text-center ${
                        role === "teacher" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">{s.teacher}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{s.teacherDesc}</span>
                    </button>
                  </div>
                  <NavButtons onBack={back} onNext={next} nextLabel={s.next} backLabel={s.back} />
                </>
              )}

              {/* Step 2: Name */}
              {step === 2 && (
                <>
                  <StepHeader icon={User} title={s.nameTitle} sub={s.nameSub} />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="username">{s.fullName}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="username" type="text" autoComplete="name" autoFocus
                        placeholder={s.fullNamePh}
                        value={username} onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <NavButtons onBack={back} onNext={next} nextLabel={s.next} backLabel={s.back} disabled={!username.trim()} />
                </>
              )}

              {/* Step 3: Credentials */}
              {step === 3 && (
                <>
                  <StepHeader icon={Mail} title={s.credsTitle} sub={s.credsSub} />
                  <Button variant="outline" className="w-full h-11 text-sm font-medium mb-4" onClick={handleGoogle}>
                    <GoogleIcon className="w-5 h-5 mr-2" />
                    {s.google}
                  </Button>
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">{s.or}</span>
                    </div>
                  </div>
                  {error && <div className="mb-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
                  <div className="space-y-3 flex-1">
                    <div className="space-y-2">
                      <Label htmlFor="email">{s.email}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" type="email" autoComplete="email" autoFocus placeholder={s.emailPh}
                          value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{s.password}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••"
                          value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">{s.confirm}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-11" />
                      </div>
                    </div>
                  </div>
                  <NavButtons onBack={back} onNext={next} nextLabel={s.next} backLabel={s.back} disabled={!canNext()} />
                </>
              )}

              {/* Step 4: Class / Room code */}
              {step === 4 && (
                <>
                  <StepHeader icon={Hash} title={s.codeTitle} sub={s.codeSub} />
                  {error && <div className="mb-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="referral">
                      {isTeacher ? s.codeTeacherLabel : s.codeStudentLabel}{" "}
                      <span className="text-muted-foreground font-normal">({s.optional})</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="referral" type="text" autoFocus
                        placeholder={isTeacher ? s.codeTeacherPh : s.codeStudentPh}
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="pl-10 h-11 font-mono uppercase tracking-widest" maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isTeacher ? s.codeTeacherHint : s.codeStudentHint}
                    </p>
                  </div>
                  <NavButtons onBack={back} onNext={handleSubmit} nextLabel={s.create} backLabel={s.back} loading={loading} loadingLabel={s.creating} />
                </>
              )}

              {/* Step 5: OTP */}
              {step === 5 && (
                <>
                  <StepHeader icon={Mail} title={s.otpTitle} sub={s.otpSub.replace("{email}", email)} />
                  {error && <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
                  <div className="flex justify-center mb-6 flex-1 items-start pt-2">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                      <InputOTPGroup>
                        <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                        <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button className="w-full h-11 font-semibold" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{s.verifying}</> : s.verify}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    <button onClick={handleResend} className="text-primary font-medium hover:underline">{s.resend}</button>
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {s.haveAccount}{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">{s.login}</Link>
        </p>
      </div>
    </div>
  );
}