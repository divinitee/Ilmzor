import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen, Mail, Lock, Loader2, Hash, User } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tish muvaffaqiyatsiz");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }

      // Save username
      if (username.trim()) {
        try { await base44.auth.updateMe({ full_name: username.trim() }); } catch {}
      }

      // If student with referral code, link them to the teacher
      if (role === "student" && referralCode.trim()) {
        try {
          const me = await base44.auth.me();
          const refs = await base44.entities.TeacherReferral.filter({ code: referralCode.trim().toUpperCase() });
          if (refs.length > 0) {
            const ref = refs[0];
            // Create subscription linked to teacher
            await base44.entities.StudentSubscription.create({
              student_name: me.full_name || email,
              phone: email,
              status: "inactive",
              referral_code: ref.code,
              teacher_id: ref.teacher_id,
              teacher_name: ref.teacher_name,
            });
            // Increment usage count
            await base44.entities.TeacherReferral.update(ref.id, { uses: (ref.uses || 0) + 1 });
          }
        } catch (refErr) {
          console.error("Referral linking error:", refErr);
        }
      }

      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Tasdiqlash kodi noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Kod yuborildi", description: "Emailingizni tekshiring." });
    } catch (err) {
      setError(err.message || "Kodni qayta yuborib bo'lmadi");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (showOtp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Emailni tasdiqlang</h1>
            <p className="text-sm text-muted-foreground mt-1">{email} ga kod yuborildi</p>
          </div>
          <div className="bg-card border border-border rounded-3xl shadow-sm p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="flex justify-center mb-6">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full h-11 font-semibold" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Tekshirilmoqda...</> : "Tasdiqlash"}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Kod kelmadimi?{" "}
              <button onClick={handleResend} className="text-primary font-medium hover:underline">Qayta yuborish</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ro'yxatdan o'ting</h1>
          <p className="text-sm text-muted-foreground mt-1">Hisob yaratish</p>
        </div>

        {/* Role tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-muted p-1 rounded-2xl">
          <button
            onClick={() => { setRole("student"); setError(""); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all select-none ${
              role === "student" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            O'quvchi
          </button>
          <button
            onClick={() => { setRole("teacher"); setError(""); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all select-none ${
              role === "teacher" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            O'qituvchi
          </button>
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-sm p-6">
          <Button variant="outline" className="w-full h-11 text-sm font-medium mb-5" onClick={handleGoogle}>
            <GoogleIcon className="w-5 h-5 mr-2" />
            Google orqali kirish
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">yoki</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Ism familiya</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="username" type="text" autoComplete="name" placeholder="Ism Familiya"
                  value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-11" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Parolni tasdiqlang</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-11" required />
              </div>
            </div>

            {/* Classroom / room code — both roles */}
            <div className="space-y-2">
              <Label htmlFor="referral">
                {role === "teacher" ? "Sinf xona kodi" : "Sinf kodi"}{" "}
                <span className="text-muted-foreground font-normal">(ixtiyoriy)</span>
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="referral" type="text"
                  placeholder={role === "teacher" ? "Xona kodi (masalan: ROOM1)" : "Masalan: ABC123"}
                  value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="pl-10 h-11 font-mono uppercase tracking-widest" maxLength={10} />
              </div>
              <p className="text-xs text-muted-foreground">
                {role === "teacher"
                  ? "O'quvchilar siz bilan bog'lanish uchun ishlatiladigan kod"
                  : "O'qituvchingiz bergan sinf kodini kiriting"}
              </p>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Yaratilmoqda...</> : "Hisob yaratish"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Hisob bormi?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Kirish</Link>
        </p>
      </div>
    </div>
  );
}