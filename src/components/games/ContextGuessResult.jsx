import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, RotateCcw, BookOpen, ArrowRight, Check, X } from "lucide-react";
import { useContextCopy } from "@/components/games/contextGuessCopy";
import ContextGuessBadge from "@/components/games/ContextGuessBadge";

const Stat = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
    <p className="text-lg font-bold text-foreground leading-none">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

export default function ContextGuessResult({ summary, items, accent, onKeepGoing, onPlayAgain, onExit }) {
  const { c, t } = useContextCopy();
  const rm = useReducedMotion();
  const { passed, reason, firstTry = [], tries, budget, accuracyPct, streakBest, amount, streakBonus, itemsCorrect, itemsTotal, hintMultiplier } = summary;
  const firstTrySet = new Set(firstTry);

  return (
    <motion.div initial={rm ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="premium-card p-5 w-full max-w-sm mx-auto">
      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${passed ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
        <Trophy className={`w-8 h-8 ${passed ? "text-emerald-400" : "text-amber-400"}`} aria-hidden="true" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-center mb-1" style={{ color: accent }}>
        {reason === "budget" ? c("result_out_of_attempts") : c("result_title")}
      </p>
      <h2 className="text-xl font-bold text-foreground text-center flex items-center justify-center gap-1.5">
        {passed ? <Check className="w-5 h-5 text-emerald-400" aria-hidden="true" /> : <X className="w-5 h-5 text-amber-400" aria-hidden="true" />}
        {passed ? c("result_pass") : c("result_fail")}
      </h2>
      <p className="text-3xl font-bold text-center mt-2 text-amber-300">+{amount} {c("xp")}</p>
      <p className="text-[11px] text-muted-foreground text-center mt-0.5">
        {streakBonus > 0 && c("streak_bonus", { n: streakBonus })}
        {streakBonus > 0 && hintMultiplier === 1 && " · "}
        {hintMultiplier === 1 && c("english_bonus")}
      </p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Stat label={c("first_try")} value={`${itemsCorrect}/${itemsTotal}`} />
        <Stat label={c("tries_used")} value={`${tries}/${budget}`} />
        <Stat label={c("accuracy")} value={`${accuracyPct}%`} />
        <Stat label={c("best_streak")} value={streakBest} />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1.5">{c("words_this_round")}</p>
      <ul className="max-h-36 overflow-y-auto space-y-1 pr-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
            <span className={`font-semibold truncate ${firstTrySet.has(it.word) ? "text-foreground" : "text-muted-foreground"}`}>{it.word}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[45%]">{it.correct}</span>
            <ContextGuessBadge provenance={it.provenance} solved={firstTrySet.has(it.word)} compact />
          </li>
        ))}
      </ul>

      <button onClick={onKeepGoing} className="mt-4 w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg select-none" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)` }}>
        {c("keep_going")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
      <div className="flex gap-2 mt-2">
        <button onClick={onPlayAgain} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
          <RotateCcw className="w-4 h-4" aria-hidden="true" /> {c("play_again")}
        </button>
        <button onClick={onExit} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
          <BookOpen className="w-4 h-4" aria-hidden="true" /> {t("nav.skill_hub")}
        </button>
      </div>
    </motion.div>
  );
}