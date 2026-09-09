import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Crosshair, HelpCircle, ArrowRight, Trophy } from "lucide-react";
import { useGrammarCopy } from "@/lib/grammarCopy";

// "You are starting here · what we found · what happens next."
// Deliberately not a dashboard: three blocks, one action. Everything shown here
// comes from the application-level result model, never from engine internals.

const ACCENT = "#3E9E92";

export default function GrammarPlacementResult({ result, onEnter }) {
  const c = useGrammarCopy();
  if (!result) return null;

  const certaintyLine =
    result.certainty === "clear" ? c("res_certainty_clear")
      : result.certainty === "reasonable" ? c("res_certainty_reasonable")
        : c("res_certainty_provisional");

  return (
    <div className="premium-mesh min-h-screen">
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-28">
        {/* You are starting here */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(62,158,146,0.15)", border: `1px solid ${ACCENT}40` }}
          >
            <Trophy className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: ACCENT }}>
            {c("res_eyebrow")}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {result.level ? c("res_title", { level: result.level }) : c("res_title_unknown")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">{certaintyLine}</p>
          {result.questionsAnswered > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {c("res_questions", { n: result.questionsAnswered })}
            </p>
          )}
        </motion.div>

        {/* What VIRORA identified */}
        <div className="space-y-3">
          {result.strengths.length > 0 && (
            <Block
              icon={TrendingUp}
              tone="rgba(62,158,146,0.15)"
              color={ACCENT}
              title={c("res_strengths")}
              rows={result.strengths}
            />
          )}
          {result.focus.length > 0 && (
            <Block
              icon={Crosshair}
              tone="rgba(224,142,96,0.15)"
              color="#E08E60"
              title={c("res_focus")}
              rows={result.focus}
            />
          )}
          {result.notYetKnown.length > 0 && (
            <Block
              icon={HelpCircle}
              tone="rgba(255,255,255,0.06)"
              color="#9aa4b2"
              title={c("res_unknown")}
              rows={result.notYetKnown}
              muted
            />
          )}
        </div>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="premium-card rounded-[28px] p-5 mt-4"
        >
          <h2 className="text-sm font-bold text-foreground mb-1.5">{c("res_next_title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{c("res_next_body")}</p>
        </motion.div>

        <button
          type="button"
          onClick={onEnter}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-[#04201d] select-none transition-transform active:scale-[0.99]"
          style={{ background: `linear-gradient(180deg, #4fb9ab, ${ACCENT})` }}
        >
          {c("res_enter")} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Block({ icon: Icon, tone, color, title, rows, muted }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[24px] p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: tone, border: `1px solid ${color}35` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span
            key={r.domain}
            className={`neo-pill px-3 py-1.5 text-xs font-medium ${muted ? "text-muted-foreground" : "text-foreground"}`}
          >
            {r.name}
            {r.level && (
              <span className="ml-1.5 font-bold" style={{ color }}>{r.level}</span>
            )}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
