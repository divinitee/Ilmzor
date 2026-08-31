import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import SupportSubtitle from "@/components/lesson/SupportSubtitle";
import ExplainHelp from "@/components/lesson/ExplainHelp";

// Prototype only — typed-beat renderer for Lesson 1's Teach phase, testing
// whether "concept -> example -> contrast -> micro-check" actually feels
// like a guided experience rather than a text page. Beat content is
// hardcoded below, not fetched from the database (deliberate scope
// boundary — see LessonRunner.jsx). Every transition uses only opacity/
// transform (framer-motion), no canvas, no continuous animation loops —
// per the locked animation rule: every effect must serve comprehension or
// orientation, nothing decorative.
//
// Support-language subtitles now live in the shared SupportSubtitle
// component (also used by McqGateItem/OpenGateItem) — one implementation,
// not one per screen.

const EASE = [0.22, 1, 0.36, 1]; // calm, restrained — no bounce/overshoot

function BeatDots({ idx, total }) {
  return (
    <div className="flex items-center gap-1.5 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i === idx ? "w-6 bg-blue-500" : i < idx ? "w-1.5 bg-blue-500/40" : "w-1.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function ConceptBeat({ beat, onNext }) {
  return (
    <div className="flex flex-col items-center text-center max-w-sm">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="text-2xl font-semibold text-foreground leading-snug"
      >
        {beat.english}
      </motion.p>
      <div className="mb-8"><SupportSubtitle support={beat.support} /></div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        onClick={onNext}
        className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 select-none"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

function ExampleBeat({ beat, onNext }) {
  const parts = beat.emphasis ? beat.english.split(beat.emphasis) : [beat.english, ""];
  return (
    <div className="flex flex-col items-center text-center max-w-sm">
      <motion.p
        layoutId="teach-sentence"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="text-xl text-foreground leading-relaxed mb-10"
      >
        {parts[0]}
        {beat.emphasis && (
          <motion.span
            initial={{ backgroundColor: "rgba(59,130,246,0)" }}
            animate={{ backgroundColor: "rgba(59,130,246,0.18)" }}
            transition={{ delay: 0.7, duration: 0.5, ease: EASE }}
            className="font-semibold text-blue-400 rounded px-1"
          >
            {beat.emphasis}
          </motion.span>
        )}
        {parts[1]}
      </motion.p>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        onClick={onNext}
        className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 select-none"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

function ContrastBeat({ beat, onNext }) {
  return (
    <div className="flex flex-col items-center text-center max-w-md w-full">
      <div className="grid grid-cols-2 gap-4 w-full mb-10">
        <motion.div
          layoutId="teach-sentence"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <p className="text-[11px] font-bold text-blue-500 tracking-wide mb-2">{beat.left.label}</p>
          <p className="text-sm text-foreground leading-snug">{beat.left.english}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <p className="text-[11px] font-bold text-indigo-400 tracking-wide mb-2">{beat.right.label}</p>
          <p className="text-sm text-foreground leading-snug">{beat.right.english}</p>
        </motion.div>
      </div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        onClick={onNext}
        className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 select-none"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

function MicroCheckBeat({ beat, onNext }) {
  const [picked, setPicked] = useState(null); // graded, ungated — see LessonRunner.jsx for the persistence boundary

  const pick = (opt) => {
    if (picked) return;
    setPicked(opt);
    setTimeout(onNext, 1100);
  };

  return (
    <div className="flex flex-col items-center text-center max-w-sm w-full">
      <p className="text-base font-medium text-foreground">{beat.prompt}</p>
      <div className="mb-6"><SupportSubtitle support={beat.support} /></div>
      <div className="space-y-3 w-full">
        {beat.options.map((opt) => {
          const isPicked = picked === opt;
          const showState = picked && (isPicked || opt.correct);
          return (
            <motion.button
              key={opt.english}
              onClick={() => pick(opt)}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors duration-300 ${
                showState
                  ? opt.correct ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-rose-500 bg-rose-500/10 text-rose-400"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <span className="flex items-center justify-between">
                {opt.english}
                {showState && (opt.correct ? <Check className="w-4 h-4" /> : isPicked ? <X className="w-4 h-4" /> : null)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const RENDERERS = { concept: ConceptBeat, example: ExampleBeat, contrast: ContrastBeat, micro_check: MicroCheckBeat };

export default function TeachExperience({ beats, onComplete }) {
  const [idx, setIdx] = useState(0);
  const beat = beats[idx];
  const Renderer = RENDERERS[beat.type];

  const next = () => {
    if (idx + 1 < beats.length) setIdx(idx + 1);
    else onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <ExplainHelp contentKey={`teach_${beat.type}`} />
      <BeatDots idx={idx} total={beats.length} />
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {Renderer ? <Renderer beat={beat} onNext={next} /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
