import React from "react";
import { motion } from "framer-motion";
import { Crosshair, TrendingUp, ClipboardList, X, Info, Play } from "lucide-react";
import { EASE } from "@/components/skillhub/StagePrimitives";
import { DOMAIN_STATE, domainState } from "@/lib/grammarMapState";
import { STATE_TONE, GRAMMAR_ACCENT } from "./tierMeta";

const ICON = { [DOMAIN_STATE.FOCUS]: Crosshair, [DOMAIN_STATE.STRONG]: TrendingUp, [DOMAIN_STATE.UNKNOWN]: ClipboardList };

// Branch layer. Branches stay a compact pill list under the map — putting
// every branch on the node map would turn the screen into a sitemap. Tapping
// a branch with authored practice starts a round; the rest still open the
// "In development" notice, so the map never promises a dead end. There is no
// content or per-branch progress yet, and the panel says so plainly.
export default function GrammarDomainPanel({ domain, r, onBranch, onClose, c, hasPractice }) {
  const state = domainState(r);
  const tone = STATE_TONE[state];
  const Icon = ICON[state];
  const line = state === DOMAIN_STATE.FOCUS ? c("home_dom_focus", { level: r.level })
    : state === DOMAIN_STATE.STRONG ? c("home_dom_strong", { level: r.level })
      : c("home_not_assessed");
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="premium-card rounded-[24px] p-4 mt-1"
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tone}22`, border: `1px solid ${tone}40` }}>
          <Icon className="w-4 h-4" style={{ color: tone }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground truncate">{domain.name}</h2>
            {r?.level && <span className="text-xs font-bold shrink-0" style={{ color: tone }}>{r.level}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{line}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={c("home_close")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors select-none shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mt-4 mb-2">
        {c("home_topics")} · {domain.branches.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {domain.branches.map((b) => {
          // A branch with authored practice is a live target; the rest still
          // open the "coming soon" note, so the map never promises a dead end.
          const live = hasPractice?.(domain.id, b);
          return (
            <button key={b} type="button" onClick={() => onBranch(domain, b)}
              className="neo-pill px-3 py-1.5 text-xs font-medium transition-colors select-none hover:bg-white/10"
              style={live ? { color: GRAMMAR_ACCENT, borderColor: `${GRAMMAR_ACCENT}55` } : undefined}>
              {live && <Play className="w-3 h-3 mr-1 inline-block align-[-1px]" />}
              {b.replace(/-/g, " ")}
            </button>
          );
        })}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/80 mt-4 leading-snug">
        <Info className="w-3.5 h-3.5 mt-px shrink-0" /> {c("home_practice_pending")}
      </p>
    </motion.div>
  );
}