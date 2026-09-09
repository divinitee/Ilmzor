import React from "react";
import { motion } from "framer-motion";
import { Crosshair, TrendingUp, ClipboardList, X, Info } from "lucide-react";
import { EASE } from "@/components/skillhub/StagePrimitives";
import { DOMAIN_STATE, domainState } from "@/lib/grammarMapState";
import { STATE_TONE } from "./tierMeta";

const ICON = { [DOMAIN_STATE.FOCUS]: Crosshair, [DOMAIN_STATE.STRONG]: TrendingUp, [DOMAIN_STATE.UNKNOWN]: ClipboardList };

// Branch layer. Branches stay a compact pill list under the map — putting
// every branch on the node map would turn the screen into a sitemap. Tapping
// a branch still opens the "In development" notice: there is no practice
// content or per-branch progress yet, and the panel says so plainly.
export default function GrammarDomainPanel({ domain, r, onBranch, onClose, c }) {
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
        {domain.branches.map((b) => (
          <button key={b} type="button" onClick={() => onBranch(domain)}
            className="neo-pill px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-white/10 transition-colors select-none">
            {b.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/80 mt-4 leading-snug">
        <Info className="w-3.5 h-3.5 mt-px shrink-0" /> {c("home_practice_pending")}
      </p>
    </motion.div>
  );
}