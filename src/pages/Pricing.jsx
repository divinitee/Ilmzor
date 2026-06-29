import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BookOpen, Check, Crown, Star, Zap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    id: "vip",
    name: "VIP Plan",
    price: "49,999",
    period: "so'm / yil",
    icon: Crown,
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-400",
    badge: null,
    iconColor: "text-amber-600",
    features: [
      "Barcha unitlar — cheksiz kirish",
      "To'liq test va reading imkoniyati",
      "Barcha o'yinlar va flashcard",
      "O'qituvchi kuzatuvi",
      "Yangi kontentga erta kirish",
      "Ustuvor qo'llab-quvvatlash",
    ],
  },
  {
    id: "learner",
    name: "Learner Plan",
    price: "24,888",
    period: "so'm / oy",
    icon: Star,
    color: "from-indigo-500/20 to-violet-500/20",
    border: "border-indigo-500",
    badge: "Eng mashhur",
    iconColor: "text-indigo-600",
    features: [
      "Barcha unitlar — cheksiz kirish",
      "To'liq test va reading imkoniyati",
      "Barcha o'yinlar va flashcard",
      "O'qituvchi kuzatuvi",
    ],
  },
  {
    id: "starter",
    name: "Starter Plan",
    price: "17,777",
    period: "so'm / oy",
    icon: Zap,
    color: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-400",
    badge: null,
    iconColor: "text-emerald-600",
    features: [
      "Barcha unitlar — cheksiz kirish",
      "To'liq test va reading imkoniyati",
      "Flashcard rejimi",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("learner");
  const [step, setStep] = useState("plans"); // "plans" | "payment"
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const plan = plans.find(p => p.id === selectedPlan);

  const handleContinue = () => setStep("payment");

  const handleSubmit = async () => {
    if (!paymentRef.trim()) return;
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      const existing = await base44.entities.StudentSubscription.filter({ phone: me.email });
      const planName = plan.name;
      if (existing.length > 0) {
        await base44.entities.StudentSubscription.update(existing[0].id, {
          payment_ref: paymentRef,
          status: "pending",
          plan: planName,
        });
      } else {
        await base44.entities.StudentSubscription.create({
          student_name: me.full_name || me.email,
          phone: me.email,
          payment_ref: paymentRef,
          status: "pending",
          plan: planName,
        });
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
          <h2 className="text-2xl font-bold text-foreground mb-3">To'lov yuborildi!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Tranzaksiya ID'ingiz qabul qilindi. O'qituvchi tasdiqlagan so'ng platformaga to'liq kirish ochiladi.
          </p>
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-400 font-medium">
            ⏳ Odatda 1–24 soat ichida tasdiqlanadi
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
            <ArrowLeft className="w-4 h-4" /> Rejaga qaytish
          </button>

          <div className="bg-card border border-border rounded-3xl shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">To'lovni amalga oshiring</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tanlangan reja: <strong className="text-foreground">{plan.name} — {plan.price} {plan.period}</strong>
              </p>
            </div>

            {/* Card info */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white">
              <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">To'lov kartasi (Uzcard/Humo)</p>
              <p className="text-xl font-mono font-bold tracking-wider mb-3 select-all">9860 1201 5281 8502</p>
              <p className="text-sm opacity-90">Egasi: <strong>Temur Normatov Ulugbekovich</strong></p>
            </div>

            {/* QR */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Yoki QR-kod orqali:</p>
              <img
                src="https://media.base44.com/images/public/6a40f974860993eff3634df0/4ef59e6e7_paymentqr.jpg"
                alt="QR"
                className="w-36 h-36 mx-auto rounded-xl border-4 border-white shadow-md object-contain bg-white"
              />
            </div>

            {/* Ref input */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Tranzaksiya ID / Chek raqami:</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="Masalan: 45781223"
                className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !paymentRef.trim()}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold select-none"
            >
              {submitting ? "Yuborilmoqda..." : "To'lovni tasdiqlashga yuborish"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Plans page
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 px-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Obuna rejasini tanlang</h1>
          <p className="text-sm text-muted-foreground mt-2">
            To'liq kirish uchun qulay rejani tanlang va ingliz tilini o'rganing
          </p>
        </div>

        {/* Free trial banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-primary font-medium">🎉 Bepul sinov davri tugadi</p>
          <p className="text-xs text-muted-foreground mt-1">Davom etish uchun quyidagi rejalardan birini tanlang</p>
        </div>

        {/* Plan cards */}
        <div className="space-y-4 mb-8">
          {plans.map((p, i) => {
            const Icon = p.icon;
            const isSelected = selectedPlan === p.id;
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
                    <div className={`w-11 h-11 rounded-xl bg-background/60 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${p.iconColor}`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{p.name}</h3>
                      {p.badge && (
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{p.badge}</span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {p.price} <span className="text-sm font-normal text-muted-foreground">{p.period}</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {p.features.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {f}
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
          {plan.name} — {plan.price} so'm — Davom etish
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          To'lovni bank kartasi yoki QR orqali amalga oshirasiz
        </p>
      </div>
    </div>
  );
}