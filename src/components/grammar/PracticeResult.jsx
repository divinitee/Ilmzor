import React from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Sparkles, Check, X } from "lucide-react";
import { EASE } from "@/components/skillhub/StagePrimitives";

// End of a practice round. Same shape as the Vocabulary result screens
// (DefinitionMatchResult and friends): a headline that responds to the score,
// a stat row, then the second look at what went wrong.
//
// The review list is misses only. A student who got seven right does not need
// seven confirmations; they need the three explanations, which is the one thing
// on this screen that can actually change the next round.

const ACCENT = "#3E9E92";
const WARM = "#E08E60";

const Stat = ({ label, value, tone }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
    <p className="text-lg font-bold leading-none" style={{ color: tone || "inherit" }}>{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

export default function PracticeResult({ summary, c, onAgain, onExit }) {
  const { correct, total, pct, tier, streak, missed } = summary;
  const good = pct >= 70;
  const tone = pct >= 90 ? ACCENT : pct >= 50 ? "#D9B45B" : WARM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="premium-card rounded-[28px] p-5 md:p-6"
    >
      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3"
        style={{ background: `${tone}22`, border: `1px solid ${tone}40` }}>
        {good ? <Trophy className="w-8 h-8" style={{ color: tone }} aria-hidden="true" />
              : <Sparkles className="w-8 h-8" style={{ color: tone }} aria-hidden="true" />}
      </div>

      <h2 className="text-xl font-bold text-foreground text-center">{c(`fin_${tier}`)}</h2>
      <p className="text-sm text-muted-foreground text-center mt-1 max-w-[42ch] mx-auto leading-snug">
        {c(`fin_${tier}_sub`)}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <Stat label={c("fin_score")} value={`${correct}/${total}`} />
        <Stat label={c("fin_accuracy")} value={`${pct}%`} tone={tone} />
        <Stat label={c("fin_streak")} value={streak} />
      </div>

      {missed.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mt-5 mb-2">
            {c("fin_review")} · {missed.length}
          </p>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {missed.map((m) => (
              <li key={m.variantId} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-foreground leading-snug">{m.prompt}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: ACCENT }}>
                  {c("fin_answer")}: {m.expected}
                </p>
                {m.why && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.why}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {missed.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-5">
          <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} /> {c("fin_new_questions")}
        </p>
      )}

      <div className="flex gap-2 mt-5">
        <button onClick={onAgain}
          className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-[#04201d] select-none transition-transform active:scale-[0.99]"
          style={{ background: `linear-gradient(180deg, #4fb9ab, ${ACCENT})` }}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" /> {c("fin_again")}
        </button>
        <button onClick={onExit}
          className="neo-pill px-5 h-12 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none">
          {c("fin_done")}
        </button>
      </div>
    </motion.div>
  );
}
