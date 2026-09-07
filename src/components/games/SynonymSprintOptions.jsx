import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

// All four options are synonyms at the student's own tier. Two columns rather
// than the stacked list the other games use — a sprint round should read as one
// glance, and the options here are single words instead of definitions.
//
// A wrong pick is struck out and disabled and the student picks again on the
// same word (costing another try) rather than being pushed forward, which is
// what makes the attempt budget able to end a round.
export default function SynonymSprintOptions({ options, accent, ruledOut = [], revealed, correct, onPick, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 mt-4">
      {options.map((opt, i) => {
        const out = ruledOut.includes(opt);
        const isCorrect = revealed && opt === correct;
        return (
          <motion.button
            key={`${opt}-${i}`}
            onClick={() => onPick(opt)}
            disabled={disabled || out || revealed}
            whileTap={{ scale: disabled || out || revealed ? 1 : 0.97 }}
            className={`min-h-[64px] px-3 py-3 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-1.5 text-center transition-colors select-none ${
              isCorrect
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                : out
                ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
            }`}
          >
            <span className="break-words">{opt}</span>
            {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />}
            {out && <X className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />}
          </motion.button>
        );
      })}
    </div>
  );
}