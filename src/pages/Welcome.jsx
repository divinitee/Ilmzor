import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen, Gamepad2, Sparkles, Trophy, ArrowRight, ArrowLeft, Check, Crown, Star, Zap } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";

const STEPS = [
  {
    emoji: "👋",
    title: "Xush kelibsiz!",
    text: "Vocabulary A2·B1·B2 — ingliz tilini o'ynab, o'rganib, mashq qilib zo'rlang. Keling, ilovani qisqa ko'rib chiqamiz.",
    color: "from-indigo-500 to-violet-600",
    icon: BookOpen,
  },
  {
    emoji: "📚",
    title: "So'zlar ro'yxati",
    text: "12 ta unit bo'ylab yuzlab so'zlarni ko'ring. English, O'zbek va Rus tarjimalarini solishtiring, flashcard bilan yodlang.",
    color: "from-emerald-500 to-teal-600",
    icon: BookOpen,
  },
  {
    emoji: "🎮",
    title: "O'yinlar zonasi",
    text: "Vokabulyar Quiz va Jumla Yasash o'yinlarida qatnashing. Har bir to'g'ri javob uchun 🪙 tanga yutib oling.",
    color: "from-amber-500 to-orange-600",
    icon: Gamepad2,
  },
  {
    emoji: "🤖",
    title: "AI So'z Ustozi",
    text: "AI bilan suhbat qurib, so'zlarni jumlada ishlatishni mashq qiling. U sizni tuzatadi va rag'batlantiradi.",
    color: "from-violet-500 to-pink-600",
    icon: Sparkles,
  },
  {
    emoji: "🏆",
    title: "Test & Natija",
    text: "Har unitdan 30 savollik test topshiring. Natijalaringizni kuzating, reytingda ko'tariling va o'qituvchidan kuzatuv oling.",
    color: "from-sky-500 to-blue-600",
    icon: Trophy,
  },
];

const PLANS = [
  { id: "vip", name: "VIP", price: "49,999", original: "79,999", period: "/yil", icon: Crown, color: "text-amber-600", badge: "38% chegirma", features: ["Barcha unitlar", "AI So'z Ustozi", "Barcha o'yinlar"] },
  { id: "learner", name: "Learner", price: "24,888", original: "39,999", period: "/oy", icon: Star, color: "text-indigo-600", badge: "38% chegirma", features: ["Barcha unitlar", "AI So'z Ustozi", "Testlar"] },
  { id: "starter", name: "Starter", price: "17,777", original: "29,999", period: "/oy", icon: Zap, color: "text-emerald-600", badge: "41% chegirma", features: ["Barcha unitlar", "Flashcard"] },
];

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const last = step === STEPS.length - 1;

  const next = () => {
    if (last) { setFinished(true); return; }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden">
      <ParticleBackground />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 safe-header">
        <div className="flex items-center gap-2 select-none">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Vocabulary A2·B1·B2</span>
        </div>
        {!finished && (
          <button onClick={() => setFinished(true)} className="text-xs font-medium text-muted-foreground hover:text-foreground select-none">
            O'tkazib yuborish
          </button>
        )}
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-16">
        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-muted-foreground/20"}`}
                  />
                ))}
              </div>

              {/* Step card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 40, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -40, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="bg-background/80 backdrop-blur rounded-3xl border border-border shadow-xl p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                    className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${STEPS[step].color} flex items-center justify-center text-5xl shadow-lg`}
                  >
                    {STEPS[step].emoji}
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">{STEPS[step].title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{STEPS[step].text}</p>
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex items-center justify-between mt-8">
                <Button variant="ghost" onClick={back} disabled={step === 0} className="select-none">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Orqaga
                </Button>
                <span className="text-xs text-muted-foreground font-medium">{step + 1} / {STEPS.length}</span>
                <Button onClick={next} className="select-none">
                  {last ? "Tayyor" : "Keyingi"} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Greeting */}
              <div className="text-center pt-6 pb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl"
                >
                  <span className="text-4xl">🎓</span>
                </motion.div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Boshlaymizmi?</h1>
                <p className="text-sm text-muted-foreground">Bepul sinov bilan boshlang yoki premium rejani tanlang.</p>
              </div>

              {/* Free option */}
              <Link to="/register" className="block mb-5">
                <motion.div
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="bg-background/80 backdrop-blur border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-5 flex items-center gap-4 select-none"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">Bepul boshlash</p>
                    <p className="text-xs text-muted-foreground">So'zlar ro'yxati va bir nechta o'yin — bepul</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </Link>

              {/* Premium plans with show-discount */}
              <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                🎉 Chegirmali obuna rejalari
              </p>
              <div className="space-y-3 mb-6">
                {PLANS.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="bg-background/80 backdrop-blur border border-border rounded-2xl p-4 flex items-center gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-5 h-5 ${p.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">{p.name}</p>
                          <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{p.badge}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{p.features.join(" · ")}</p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-sm text-muted-foreground line-through">{p.original}</span>
                          <span className="text-lg font-bold text-foreground">{p.price}</span>
                          <span className="text-xs text-muted-foreground">so'm{p.period}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Link to="/pricing">
                <Button className="w-full h-12 text-base font-bold select-none mb-3">
                  Obuna rejalarini ko'rish <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>

              <p className="text-center text-xs text-muted-foreground">
                Hisobingiz bormi?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">Kirish</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}