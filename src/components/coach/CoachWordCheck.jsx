import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

// One word's questions. Reports every answer up; the session submits them in
// one server-graded "quiz" round tagged with the Coach session_key.
export default function CoachWordCheck({ word, questions, color, t, onAnswer, onDone }) {
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState(null);
  const q = questions[k];
  if (!q) return null;

  const choose = (opt) => {
    if (picked !== null) return;
    setPicked(opt);
    onAnswer(word, q, opt);
  };
  const next = () => {
    setPicked(null);
    if (k + 1 < questions.length) setK(k + 1); else onDone();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[28px] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {q.type === "multiple_choice" ? t("pick_meaning") : t("pick_word")}
      </p>
      <p className="text-3xl font-bold text-foreground mt-2 mb-5 break-words">{q.prompt}</p>
      <div className="grid gap-2">
        {q.options.map((opt) => {
          const isRight = picked !== null && opt === q.correct;
          const isWrong = picked === opt && opt !== q.correct;
          return (
            <button key={opt} onClick={() => choose(opt)} disabled={picked !== null}
              className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-colors select-none flex items-center justify-between ${
                isRight ? "border-emerald-400/60 bg-emerald-400/10" : isWrong ? "border-rose-400/60 bg-rose-400/10" : "border-white/10 bg-white/[0.04] hover:border-white/25"}`}>
              <span className="text-foreground">{opt}</span>
              {isRight && <Check className="w-4 h-4 text-emerald-400" />}
              {isWrong && <X className="w-4 h-4 text-rose-400" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button onClick={next} className="mt-5 w-full h-12 rounded-2xl font-semibold text-white select-none" style={{ background: color }}>
          {t("next")}
        </button>
      )}
    </motion.div>
  );
}
