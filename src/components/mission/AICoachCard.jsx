import React from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

export default function AICoachCard({ recs, accent, accentGlow }) {
  return (
    <section className="premium-card p-5 md:p-6">
      <header className="flex items-center gap-2.5 mb-4">
        <span
          className="relative w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: accentGlow }}
        >
          <Brain className="w-4 h-4 text-white" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider leading-none">AI Coach</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Personalized guidance</p>
        </div>
      </header>
      <div className="space-y-2.5">
        {recs.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-2.5 rounded-2xl bg-white/[0.03] border border-white/10 p-3"
          >
            <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <p className="text-xs text-foreground/90 leading-relaxed">{r}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}