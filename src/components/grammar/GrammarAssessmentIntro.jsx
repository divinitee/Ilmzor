import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Target, Shuffle, Map, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useGrammarCopy } from "@/lib/grammarCopy";

// Four short stages, one screen each — not a fake onboarding sequence. The
// student can leave at any point without starting, which is the whole point of
// moving this out of registration: it is a choice, not a gate.

const ACCENT = "#3E9E92";

const STAGES = [
  { icon: Stethoscope, title: "s1_title", body: "s1_body" },
  { icon: Target, title: "s2_title", body: "s2_body" },
  { icon: Shuffle, title: "s3_title", body: "s3_body" },
  { icon: Map, title: "s4_title", body: "s4_body" },
];

export default function GrammarAssessmentIntro({ onStart, onExit }) {
  const c = useGrammarCopy();
  const [step, setStep] = useState(0);
  const last = step === STAGES.length - 1;
  const Stage = STAGES[step];
  const Icon = Stage.icon;

  return (
    <div className="premium-mesh min-h-screen">
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-28 flex flex-col min-h-screen">
        <div className="text-center mb-6">
          <div className="relative inline-flex mb-3">
            <span className="neo-bloom" aria-hidden="true" />
            <div
              className="relative neo-pill px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: ACCENT }}
            >
              <Sparkles className="w-3.5 h-3.5" /> {c("intro_eyebrow")}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {c("intro_title")}
          </h1>
        </div>

        {/* stage dots */}
        <div className="flex justify-center gap-1.5 mb-6" aria-hidden="true">
          {STAGES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 22 : 8,
                background: i <= step ? ACCENT : "rgba(255,255,255,0.16)",
              }}
            />
          ))}
        </div>

        <div className="flex-1 flex items-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              className="premium-card w-full rounded-[28px] p-6"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(62,158,146,0.15)", border: `1px solid ${ACCENT}40` }}
              >
                <Icon className="w-7 h-7" style={{ color: ACCENT }} />
              </div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
                {c("intro_step", { n: step + 1, total: STAGES.length })}
              </p>
              <h2 className="text-xl font-bold text-foreground mb-3">{c(Stage.title)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{c(Stage.body)}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (step === 0 ? onExit() : setStep(step - 1))}
            className="neo-pill px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? c("intro_skip") : ""}
          </button>

          <button
            type="button"
            onClick={() => (last ? onStart() : setStep(step + 1))}
            className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-[#04201d] select-none transition-transform active:scale-[0.99]"
            style={{ background: `linear-gradient(180deg, #4fb9ab, ${ACCENT})` }}
          >
            {last ? c("intro_start") : c("intro_next")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {step > 0 && (
          <button
            type="button"
            onClick={onExit}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors select-none mx-auto"
          >
            {c("intro_skip")}
          </button>
        )}
      </div>
    </div>
  );
}
