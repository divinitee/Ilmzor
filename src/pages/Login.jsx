import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen, Mail, Lock, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [role, setRole] = useState("student"); // "student" | "teacher"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Email yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Vocabulary A2·B1·B2</h1>
          <p className="text-sm text-muted-foreground mt-1">Hisobingizga kiring</p>
        </div>

        {/* Role tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-muted p-1 rounded-2xl">
          <button
            onClick={() => { setRole("student"); setError(""); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all select-none ${
              role === "student"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            O'quvchi
          </button>
          <button
            onClick={() => { setRole("teacher"); setError(""); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all select-none ${
              role === "teacher"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            O'qituvchi
          </button>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-3xl shadow-sm p-6">
          {role === "student" && (
            <p className="text-xs text-muted-foreground bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl px-3 py-2 mb-5">
              O'quvchi sifatida kirish uchun quyidagi formani to'ldiring
            </p>
          )}
          {role === "teacher" && (
            <p className="text-xs bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-xl px-3 py-2 mb-5">
              O'qituvchi hisobi bilan kirish — o'quvchilaringizni kuzatib boring
            </p>
          )}

          <Button
            variant="outline"
            className="w-full h-11 text-sm font-medium mb-5"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Google orqali kirish
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">yoki</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Parol</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Parolni unutdingizmi?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Kirish...</>
              ) : "Kirish"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Hisob yo'qmi?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </p>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <Link to="/about" className="hover:text-foreground hover:underline">Ilova haqida</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-foreground hover:underline">Bog'lanish</Link>
        </div>
      </div>
    </div>
  );
}