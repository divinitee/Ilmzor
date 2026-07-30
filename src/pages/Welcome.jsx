import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen, Gamepad2, Sparkles, Trophy, ArrowRight, ArrowLeft, Check, Crown, Star, Zap, Home as HomeIcon, Settings as SettingsIcon } from "lucide-react";

const STEPS = [
  {
    emoji: "🎓",
    title: "Xush kelibsiz",
    text: "Vocabulary A2·B1·B2 — ingliz tilini o'ynab, o'rganib, mashq qilib egallang. Keling, ilovani birgalikda ko'rib chiqamiz.",
    accent: "from-indigo-500 via-violet-500 to-fuchsia-500",
    glow: "rgba(124,58,237,0.45)",
  },
  {
    emoji: "📚",
    title: "So'zlar Ro'yxati",
    text: "12 ta unit bo'ylab yuzlab so'zlarni o'rganing. English, O'zbek va Rus tarjimalarini solishtiring — flashcard bilan yodlang.",
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
    glow: "rgba(16,185,129,0.45)",
  },
  {
    emoji: "🎮",
    title: "O'yinlar Zonasi",
    text: "Vokabulyar Quiz va Jumla Yasash o'yinlarida qatnashing. Har bir to'g'ri javob uchun 🪙 tanga yutib oling.",
    accent: "from-amber-500 via-orange-500 to-rose-500",
    glow: "rgba(245,158,11,0.45)",
  },
  {
    emoji: "🤖",
    title: "AI So'z Ustozi",
    text: "AI bilan suhbat qurib, so'zlarni real jumlalarda ishlatishni mashq qiling. U sizni tuzatadi va rag'batlantiradi.",
    accent: "from-violet-500 via-purple-500 to-pink-500",
    glow: "rgba(168,85,247,0.45)",
  },
  {
    emoji: "🏆",
    title: "Test & Reyting",
    text: "Har unitdan 30 savollik test topshiring, natijalarni kuzating va reyting jadvalida ko'tariling. O'qituvchi sizni kuzatib boradi.",
    accent: "from-sky-500 via-blue-500 to-indigo-500",
    glow: "rgba(59,130,246,0.45)",
  },
];

const TABS = [
  { icon: HomeIcon, label: "Bosh sahifa", color: "text-indigo-500" },
  { icon: BookOpen, label: "So'zlar", color: "text-emerald-500" },
  { icon: Gamepad2, label: "O'yinlar", color: "text-amber-500" },
  { icon: Sparkles, label: "AI Ustoz", color: "text-violet-500" },
  { icon: SettingsIcon, label: "Sozlamalar", color: "text-slate-500" },
];

const PLANS = [
  { id: "vip", name: "VIP", price: "49,999", original: "79,999", period: "/yil", icon: Crown, color: "text-amber-600", badge: "−38%" },
  { id: "learner", name: "Learner", price: "24,888", original: "39,999", period: "/oy", icon: Star, color: "text-indigo-600", badge: "−38%" },
  { id: "starter", name: "Starter", price: "17,777", original: "29,999", period: "/oy", icon: Zap, color: "text-emerald-600", badge: "−41%" },
];

// Floating aurora blob
function AuroraBlob({ className, delay = 0 }) {
  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full blur-3xl opacity-40 ${className}`}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -25, 15, 0],
        scale: [1, 1.15, 0.95, 1],
      }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

const ease = [0.22, 1, 0.36, 1];

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const last = step === STEPS.length - 1;

  const next = useCallback(() => {
    if (last) { setFinished(true); return; }
    setStep(s => s + 1);
  }, [last]);

  const back = () => setStep(s => Math.max(0, s - 1));

  // Parallax tilt for the hero card
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(my, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mx, [-0.5, 0.5], [-8, 8]);

  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const handleLeave = () => { mx.set(0); my.set(0); };

  const current = STEPS[step];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col">
      {/* Animated aurora background */}
      <div className="absolute inset-0 overflow-hidden">
        <AuroraBlob className="w-[28rem] h-[28rem] bg-indigo-600 -top-20 -left-20" delay={0} />
        <AuroraBlob className="w-[24rem] h-[24rem] bg-violet-600 top-1/3 -right-24" delay={3} />
        <AuroraBlob className="w-[22rem] h-[22rem] bg-fuchsia-600 bottom-0 left-1/4" delay={6} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.06),transparent_60%)]" />
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 safe-header">
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease }}
          className="flex items-center gap-2 select-none"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30"
          >
            <BookOpen className="w-5 h-5 text-white" />
          </motion.div>
          <span className="font-bold text-white text-lg tracking-tight">Vocabulary <span className="text-indigo-400">A2·B1·B2</span></span>
        </motion.div>
        {!finished && (
          <button onClick={() => setFinished(true)} className="text-xs font-medium text-white/50 hover:text-white transition-colors select-none">
            O'tkazib yuborish
          </button>
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-5 pb-10">

        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div key="tutorial" className="flex-1 flex flex-col" exit={{ opacity: 0 }}>
              {/* Hero heading */}
              <div className="text-center pt-2 pb-6">
                <motion.span
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}
                  className="inline-block text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-3"
                >
                  Ilova sayohati
                </motion.span>
                <motion.h1
                  key={current.title}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease }}
                  className="text-4xl font-bold text-white"
                >
                  {current.title}
                </motion.h1>
              </div>

              {/* 3D tilt hero card */}
              <motion.div
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
                style={{ perspective: 1200 }}
                className="flex-1 flex flex-col items-center justify-center"
              >
                <motion.div
                  style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                  className="relative w-full max-w-sm"
                >
                  {/* Glow */}
                  <motion.div
                    key={`glow-${step}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute -inset-4 rounded-[2rem] blur-2xl"
                    style={{ background: current.glow }}
                  />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, scale: 0.85, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -30 }}
                      transition={{ type: "spring", stiffness: 200, damping: 22 }}
                      className="relative bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl p-8 text-center overflow-hidden"
                    >
                      {/* sheen */}
                      <motion.div
                        aria-hidden
                        initial={{ x: "-120%" }} animate={{ x: "120%" }}
                        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                      />

                      {/* Big emoji orb */}
                      <motion.div
                        initial={{ scale: 0, rotate: -25 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.08 }}
                        className="relative w-28 h-28 mx-auto mb-6"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${current.accent} blur-md opacity-60`}
                        />
                        <div className={`relative w-full h-full rounded-3xl bg-gradient-to-br ${current.accent} flex items-center justify-center text-6xl shadow-xl`}>
                          {current.emoji}
                        </div>
                      </motion.div>

                      {/* Staggered text */}
                      <motion.p
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.5, ease }}
                        className="text-sm text-white/70 leading-relaxed"
                      >
                        {current.text}
                      </motion.p>

                      {/* floating mini-icons */}
                      <div className="absolute -top-3 -right-3 select-none pointer-events-none">
                        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-sm">✨</motion.div>
                      </div>
                      <div className="absolute -bottom-2 -left-3 select-none pointer-events-none">
                        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 3.4, repeat: Infinity, delay: 0.5 }} className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-sm">🪙</motion.div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </motion.div>

              {/* App layout preview (mock phone with bottom tabs) */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}
                className="mt-6"
              >
                <p className="text-center text-[11px] uppercase tracking-widest text-white/30 mb-3 font-semibold">Ilova tuzilishi</p>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 px-2 py-2.5 flex justify-between shadow-lg">
                  {TABS.map((t, i) => {
                    const Icon = t.icon;
                    const active = i === step % TABS.length;
                    return (
                      <motion.div
                        key={t.label}
                        animate={active ? { y: -3 } : { y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className="flex flex-col items-center gap-1 flex-1 py-1 select-none"
                      >
                        <div className={`p-1.5 rounded-xl transition-colors ${active ? "bg-white/10" : ""}`}>
                          <Icon className={`w-4 h-4 ${active ? t.color : "text-white/30"}`} />
                        </div>
                        <span className={`text-[9px] font-medium ${active ? "text-white/70" : "text-white/25"}`}>{t.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 my-5">
                {STEPS.map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setStep(i)}
                    className="select-none"
                    whileTap={{ scale: 0.8 }}
                  >
                    <motion.div
                      animate={{ width: i === step ? 28 : 8, opacity: i === step ? 1 : 0.3 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className="h-2 rounded-full bg-white"
                    />
                  </motion.button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={back} disabled={step === 0} className="text-white/70 hover:text-white hover:bg-white/10 select-none">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Orqaga
                </Button>
                <span className="text-xs text-white/40 font-medium tabular-nums">{step + 1} / {STEPS.length}</span>
                <Button onClick={next} className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 border-0 select-none shadow-lg shadow-indigo-500/30">
                  {last ? "Tayyor" : "Keyingi"} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cta"
              className="flex-1 flex flex-col justify-center"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
            >
              {/* Greeting */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-24 h-24 mx-auto mb-5 rounded-[1.75rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40"
                >
                  <span className="text-5xl">🚀</span>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}
                  className="text-4xl font-bold text-white mb-2"
                >
                  Boshlaymizmi?
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-sm text-white/50">
                  Bepul sinov bilan boshlang yoki premium rejani tanlang.
                </motion.p>
              </div>

              {/* Free option */}
              <Link to="/register" className="block mb-6">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="relative bg-white/5 backdrop-blur-xl border border-emerald-400/30 rounded-2xl p-5 flex items-center gap-4 select-none overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="relative flex-1">
                    <p className="font-bold text-white">Bepul boshlash</p>
                    <p className="text-xs text-white/50">So'zlar ro'yxati va bir nechta o'yin — bepul</p>
                  </div>
                  <ArrowRight className="relative w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </motion.div>
              </Link>

              {/* Discount header */}
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-center text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3"
              >
                🔥 Chegirmali obuna rejalari
              </motion.p>

              {/* Premium plans */}
              <div className="space-y-3 mb-6">
                {PLANS.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 + i * 0.1, ease }}
                      whileHover={{ scale: 1.02, x: 2 }}
                      className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
                    >
                      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: p.id === "vip" ? "rgba(245,158,11,0.6)" : p.id === "learner" ? "rgba(99,102,241,0.6)" : "rgba(16,185,129,0.6)" }} />
                      <div className="relative w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-5 h-5 ${p.color}`} />
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{p.name}</p>
                          <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{p.badge}</span>
                        </div>
                        <p className="text-xs text-white/40 truncate mt-0.5">Barcha unitlar · Testlar · O'yinlar</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-sm text-white/30 line-through">{p.original}</span>
                          <span className="text-xl font-bold text-white">{p.price}</span>
                          <span className="text-xs text-white/40">so'm{p.period}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Link to="/pricing">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button className="w-full h-12 text-base font-bold border-0 select-none bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/40">
                    Obuna rejalarini ko'rish <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              </Link>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-center text-xs text-white/40 mt-4">
                Hisobingiz bormi?{" "}
                <Link to="/login" className="text-indigo-400 font-medium hover:underline">Kirish</Link>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}