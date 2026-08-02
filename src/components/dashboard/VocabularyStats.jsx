import React from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, DEMO } from "@/lib/dashboardData";
import AnimatedCounter from "./AnimatedCounter";

const ease = [0.22, 1, 0.36, 1];

export default function VocabularyStats({ results }) {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;

  const stats = [
    { label: s.today, value: DEMO.wordsToday, grad: "from-blue-500/15 to-indigo-500/5", text: "text-blue-500" },
    { label: s.thisWeek, value: DEMO.wordsWeek, grad: "from-violet-500/15 to-purple-500/5", text: "text-violet-500" },
    { label: s.thisMonth, value: DEMO.wordsMonth, grad: "from-emerald-500/15 to-teal-500/5", text: "text-emerald-500" },
    { label: s.thisYear, value: DEMO.wordsYear, grad: "from-amber-500/15 to-orange-500/5", text: "text-amber-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-sm"
    >
      <h3 className="font-bold text-foreground mb-1">{s.vocabStats}</h3>
      <p className="text-xs text-muted-foreground mb-4">{s.wordsMastered}</p>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((st, i) => (
          <motion.div
            key={st.label}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease, delay: 0.05 * i }}
            className={`rounded-xl p-3 bg-gradient-to-br ${st.grad} border border-border`}
          >
            <p className="text-xs text-muted-foreground mb-1">{st.label}</p>
            <AnimatedCounter value={st.value} className={`text-2xl font-bold ${st.text}`} />
          </motion.div>
        ))}

        {/* Lifetime — full width, highlighted */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease, delay: 0.25 }}
          className="col-span-2 rounded-xl p-4 bg-gradient-to-r from-rose-500/15 to-pink-500/10 border border-border flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{s.lifetime}</p>
            <AnimatedCounter value={DEMO.wordsLifetime} className="text-2xl font-bold text-rose-500" />
          </div>
          <span className="text-xs text-muted-foreground">{s.wordsMastered}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}