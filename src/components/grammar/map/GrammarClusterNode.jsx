import React from "react";
import { motion } from "framer-motion";
import { EASE, RM } from "@/components/skillhub/StagePrimitives";
import { STATE_TONE } from "./tierMeta";

// A cluster node reads like Vocabulary's category node: name, how many areas
// it holds, and — instead of an unlocked count, which Grammar has no rule for
// — the placement verdicts of those areas. "Start here" marks the cluster the
// placement flagged with the most focus areas.
export default function GrammarClusterNode({ node, index, active, hidden, onClick, hot, dim, glow, accent, delay = 0, onHoverStart, onHoverEnd, c }) {
  const { focus, strong, unknown } = node.summary;
  const rec = node.recommended;
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${index * 0.7}s` }}>
        <motion.button
          onClick={onClick} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={hidden ? { scale: 0.85, opacity: 0, z: 0 } : active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={hidden ? { duration: 0 } : { delay: active ? delay + 0.1 + index * 0.06 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[96px] max-w-[128px]"
          style={{ transformPerspective: 700 }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none hub-glow-pulse"
            style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${rec ? "rgba(224,142,96,0.5)" : glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11] ${hot || rec ? "skill-border-glow" : ""}`}
            style={{ "--arrival-color": rec ? STATE_TONE.focus : glow }}>
            <span className="block text-[11px] font-bold text-foreground leading-tight">{node.name}</span>
            <span className="block text-[8px] text-muted-foreground mt-0.5 leading-tight">{c("home_areas", { n: node.domains.length })}</span>
            <span className="mt-1 flex flex-wrap justify-center gap-x-1.5 text-[8px] font-semibold leading-tight">
              {focus > 0 && <span style={{ color: STATE_TONE.focus }}>{c("home_focus_n", { n: focus })}</span>}
              {strong > 0 && <span style={{ color: accent }}>{c("home_strong_n", { n: strong })}</span>}
              {unknown > 0 && <span className="text-muted-foreground/70">{c("home_unknown_n", { n: unknown })}</span>}
            </span>
            {rec && (
              <span className="mt-1 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none"
                style={{ color: STATE_TONE.focus, borderColor: `${STATE_TONE.focus}66`, background: `${STATE_TONE.focus}22` }}>
                {c("home_start_here")}
              </span>
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}