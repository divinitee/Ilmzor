import React from "react";
import { motion } from "framer-motion";
import { Check, BookOpen, Zap, Target, Flame } from "lucide-react";

const ICONS = { BookOpen, Zap, Target, Flame };

export default function MissionsCard({ missions, accent, accentGlow }) {
  const doneCount = missions.filter((m) => m.done).length;
  return (
    <section className="premium-card p-5 md:p-6">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Today's Mission</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">{doneCount}/{missions.length}</span>
      </header>
      <div className="space-y-2.5">
        {missions.map((m, i) => {
          const Icon = ICONS[m.icon] || BookOpen;
          const pct = m.target ? Math.min(100, Math.round((m.progress / m.target) * 100)) : m.done ? 100 : 0;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative rounded-2xl border p-3 transition-all overflow-hidden ${m.done ? "border-white/20" : "border-white/10 bg-white/[0.03]"}`}
              style={m.done ? { background: `linear-gradient(180deg, ${accentGlow}, transparent 85%)`, borderColor: accent } : undefined}
            >
              <div className="relative flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={m.done ? { background: accent, color: "#fff" } : { background: "rgba(255,255,255,0.05)" }}
                >
                  <Icon className="w-4 h-4 text-foreground" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{m.label}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: accent }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={m.done ? { background: accent } : { background: "rgba(255,255,255,0.05)" }}
                >
                  <Check className={`w-3.5 h-3.5 ${m.done ? "text-white" : "text-muted-foreground/40"}`} />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}