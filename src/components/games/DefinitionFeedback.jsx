import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDefinitionCopy } from "@/components/games/definitionCopy";
import { averageScore, clearedBar } from "@/components/games/definitionGrader";

// Per-answer feedback. The three 0-100 sub-scores and the tip are shown exactly
// as before; the old "+3 / 5" chip is replaced by cleared / not-cleared, since
// round XP now comes from gameScoring.js rather than the grader's 1-5 number.
export default function DefinitionFeedback({ result, accent, isLast, onNext }) {
  const { c, t } = useDefinitionCopy();
  const cleared = clearedBar(result);
  const avg = averageScore(result);
  const rows = [
    { label: t("gameui.def_accuracy"), val: result.accuracy },
    { label: t("gameui.def_completeness"), val: result.completeness },
    { label: t("gameui.def_own_words"), val: result.own_words },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-5 mb-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <span className="font-semibold text-foreground text-sm">
          {avg >= 70 ? t("gameui.def_reward_great") : cleared ? t("gameui.def_reward_ok") : t("gameui.def_reward_low")}
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cleared ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
          {cleared ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
          {cleared ? c("cleared") : c("not_cleared")} · {c("avg_score", { n: avg })}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        {rows.map(({ label, val }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{label}</span><span className="font-semibold text-foreground">{val}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} className="h-full rounded-full" style={{ background: accent }} />
            </div>
          </div>
        ))}
      </div>
      {result.tip && <p className="text-xs text-muted-foreground bg-white/[0.04] rounded-lg px-3 py-2 select-text">💬 {result.tip}</p>}
      <Button onClick={onNext} className="w-full mt-4 select-none">{isLast ? t("gameui.finish") : t("gameui.next_question")}</Button>
    </motion.div>
  );
}