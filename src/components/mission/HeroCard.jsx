import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Play, Clock, Compass, BookOpen, ArrowRight } from "lucide-react";

function Field({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight truncate">{value || "—"}</p>
    </div>
  );
}

export default function HeroCard({ path, unit, accent, accentGlow, onContinue }) {
  return (
    <div className="relative">
      <span className="neo-bloom neo-bloom-blue" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative premium-card mission-sweep p-5 md:p-6 overflow-hidden"
      >
        <div className="relative flex items-center gap-2 mb-3">
          <span className="neo-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">
            <Sparkles className="w-3 h-3" /> Mission Control
          </span>
        </div>
        <h2 className="relative text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Continue Learning
        </h2>
        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <Field label="Current Path" value={path} icon={Compass} />
          <Field label="Current Unit" value={unit} icon={BookOpen} />
        </div>
        <div className="relative mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> <span>Estimated session · 5 min</span>
        </div>
        <button
          onClick={onContinue}
          className="hero-continue relative mt-5 w-full h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 select-none overflow-hidden"
          style={{ background: `linear-gradient(180deg, ${accent}, #1d4ed8)`, "--accent-glow": accentGlow }}
        >
          <Play className="w-5 h-5" /> Continue <ArrowRight className="w-4 h-4 opacity-80" />
        </button>
      </motion.div>
    </div>
  );
}