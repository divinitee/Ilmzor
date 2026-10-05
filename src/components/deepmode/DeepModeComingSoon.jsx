import React from "react";
import { motion } from "framer-motion";
import { Layers, Clock, Compass, MessageCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DEEP_MODE_COPY } from "./deepModeCopy";

// Student-facing Deep Mode tab. Deep Mode itself is not built yet (design:
// Explore -> Interact with the AI teacher -> record explored/practised, no
// mastery gate). Until it is, this tab explains what it will do, using a
// hand-checked example word map so the promise is concrete.

const SYNONYMS = ["unite", "combine", "join"];
const ANTONYMS = ["divide", "separate", "split"];

function Tile({ label, tint, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${className}`}
      style={{ borderColor: `${tint}40`, background: `linear-gradient(180deg, ${tint}1f, ${tint}08)` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: tint }}>{label}</p>
      {children}
    </div>
  );
}

function Chip({ children, tint }) {
  return (
    <span
      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-1 mb-1"
      style={{ color: tint, background: `${tint}1a`, border: `1px solid ${tint}33` }}
    >
      {children}
    </span>
  );
}

export default function DeepModeComingSoon({ onNavigate }) {
  const { lang } = useAppLang();
  const c = DEEP_MODE_COPY[lang] || DEEP_MODE_COPY.en;

  const forms = [
    { pos: c.noun, word: "unification" },
    { pos: c.verb, word: "unify" },
    { pos: c.adjective, word: "unified" },
    { pos: c.adverb, word: null },
  ];

  const steps = [
    { icon: Compass, title: c.step1Title, body: c.step1Body },
    { icon: MessageCircle, title: c.step2Title, body: c.step2Body },
    { icon: CheckCircle2, title: c.step3Title, body: c.step3Body },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-10 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="relative inline-flex mb-4">
          <span className="neo-bloom" aria-hidden="true" />
          <div className="relative neo-pill px-4 py-1.5 text-amber-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <Clock className="w-3.5 h-3.5" /> {c.badge}
          </div>
        </div>
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Layers className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{c.title}</h1>
        <p className="text-base font-semibold text-fuchsia-200/90 mt-1">{c.tagline}</p>
        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">{c.intro}</p>
      </motion.div>

      {/* Example word map */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="premium-card p-5 space-y-3"
        aria-label={c.exampleLabel}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground text-center">{c.exampleLabel}</p>

        <div className="text-center rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-2xl font-bold text-foreground tracking-tight">unify</p>
          <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mt-0.5">{c.definitionLabel}</p>
          <p className="text-sm text-foreground/90 mt-1">{c.definition}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Tile label={c.prefixLabel} tint="#f5c542">
            <p className="text-sm font-bold text-foreground">{c.prefixValue}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{c.prefixAlso}</p>
          </Tile>
          <Tile label={c.suffixLabel} tint="#d6c79a">
            <p className="text-sm font-bold text-foreground">{c.suffixValue}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{c.suffixAlso}</p>
          </Tile>
          <Tile label={c.synonymsLabel} tint="#4ade80">
            {SYNONYMS.map((w) => <Chip key={w} tint="#4ade80">{w}</Chip>)}
          </Tile>
          <Tile label={c.antonymsLabel} tint="#f87171">
            {ANTONYMS.map((w) => <Chip key={w} tint="#f87171">{w}</Chip>)}
          </Tile>
        </div>

        <Tile label={c.formsLabel} tint="#a78bfa">
          <div className="grid grid-cols-2 gap-2">
            {forms.map((f) => (
              <div key={f.pos} className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{f.pos}</p>
                {f.word ? (
                  <p className="text-sm font-bold text-foreground">{f.word}</p>
                ) : (
                  <p className="text-xs italic text-muted-foreground/80">{c.noAdverb}</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">{c.formsNote}</p>
        </Tile>
      </motion.section>

      {/* How it will work */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="space-y-2.5"
      >
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider px-1">{c.howTitle}</h3>
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                <span className="text-primary mr-1.5">{i + 1}.</span>{title}
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
