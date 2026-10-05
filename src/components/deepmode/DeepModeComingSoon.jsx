import React from "react";
import { motion } from "framer-motion";
import { Layers, Clock, Compass, MessageCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DEEP_MODE_COPY } from "./deepModeCopy";
import DeepModeMap from "./DeepModeMap";

// Student-facing Deep Mode tab. Deep Mode is still Coming soon, but students
// can already explore the real word-family map with three sample words
// (Tee, 2026-10-05: tease it). Deep Mode has its own deep-blue look,
// leaning into VIRORA violet.
export default function DeepModeComingSoon({ onNavigate }) {
  const { lang } = useAppLang();
  const c = DEEP_MODE_COPY[lang] || DEEP_MODE_COPY.en;

  const steps = [
    { icon: Compass, title: c.step1Title, body: c.step1Body },
    { icon: MessageCircle, title: c.step2Title, body: c.step2Body },
    { icon: CheckCircle2, title: c.step3Title, body: c.step3Body },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-10 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-xl mx-auto">
        <div className="relative inline-flex mb-4">
          <span className="neo-bloom-blue" aria-hidden="true" />
          <div className="relative neo-pill px-4 py-1.5 text-blue-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <Clock className="w-3.5 h-3.5" /> {c.badge}
          </div>
        </div>
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(61,107,224,0.25)]">
          <Layers className="w-7 h-7 text-blue-300" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{c.title}</h1>
        <p className="text-base font-semibold text-blue-200/90 mt-1">{c.tagline}</p>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{c.intro}</p>
      </motion.div>

      {/* Live preview: the real map with three sample words */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="space-y-3"
        aria-label={c.previewTitle}
      >
        <div className="text-center">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{c.previewTitle}</h2>
          <p className="text-xs text-muted-foreground mt-1">{c.previewBody}</p>
        </div>
        <DeepModeMap />
      </motion.section>

      {/* How it will work */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="space-y-2.5 max-w-xl mx-auto"
      >
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider px-1">{c.howTitle}</h3>
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-blue-300/10 bg-blue-950/20 p-4">
            <span className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-[18px] h-[18px] text-blue-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                <span className="text-blue-300 mr-1.5">{i + 1}.</span>{title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </motion.section>

      {/* Meanwhile */}
      <div className="text-center space-y-3 pt-1">
        <p className="text-sm text-muted-foreground">{c.meanwhile}</p>
        <button
          type="button"
          onClick={() => onNavigate?.("skillhub")}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors select-none"
        >
          {c.cta} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
