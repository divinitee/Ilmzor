import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

// The four options ARE the level's clue type — translations at Starter/A1,
// same-tier synonyms at A2+. A wrong pick is struck out and disabled, and the
// student picks again (costing another try) rather than being pushed forward,
// so a round can genuinely be failed on the attempt budget.
export default function ContextGuessOptions({ options, accent, ruledOut = [], revealed, correct, onPick, disabled }) {
  return (
    <div className="space-y-2.5 mt-4">
      {options.map((opt, i) => {
        const out = ruledOut.includes(opt);
        const isCorrect = revealed && opt === correct;
        return (
          <motion.button
            key={`${opt}-${i}`}
            onClick={() => onPick(opt)}
            disabled={disabled || out || revealed}
            whileTap={{ scale: disabled || out || revealed ? 1 : 0.98 }}
            className={`w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-medium flex items-center justify-between gap-2 transition-colors select-none ${
              isCorrect
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                : out
                ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
            }`}
          >
            <span className="truncate">{opt}</span>
            {isCorrect && <Check className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />}
            {out && <X className="w-5 h-5 text-rose-400 shrink-0" aria-hidden="true" />}
          </motion.button>
        );
      })}
    </div>
  );
}