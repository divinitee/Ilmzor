import React from "react";
import { motion } from "framer-motion";
import { EASE, RM } from "@/components/skillhub/StagePrimitives";
import { TIER_STATE } from "@/lib/grammarMapState";

// A tier is a ZONE — bigger than a Vocabulary skill node, carrying its CEFR
// band and where the learner's placement stands against it.
export default function GrammarTierNode({ node, index, active, hidden, onClick, hot, dim, onHoverStart, onHoverEnd, c }) {
  const current = node.state === TIER_STATE.CURRENT;
  const ahead = node.state === TIER_STATE.AHEAD;
  const chip = current ? c("home_here") : node.state === TIER_STATE.PLACED_ABOVE ? c("home_placed_above") : ahead ? c("home_ahead") : null;
  const Icon = node.icon;
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${index * 0.8}s` }}>
        <motion.button
          onClick={onClick} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={hidden ? { scale: 0.85, opacity: 0, z: 0 } : active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={hidden ? { duration: 0 } : { delay: active ? 0.12 + index * 0.09 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.97 }}
          className="group relative"
          style={{ filter: ahead ? undefined : `drop-shadow(0 14px 26px ${node.glow})`, transformPerspective: 700 }}
        >
          {!ahead && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-full pointer-events-none hub-glow-pulse"
              style={{ width: "140%", height: "140%", background: `radial-gradient(closest-side, ${node.glow}, transparent 72%)`, filter: "blur(16px)", opacity: current ? 0.75 : 0.5 }} />
          )}
          <span className={`relative flex flex-col items-center justify-center text-white rounded-[28px] w-28 h-28 md:w-32 md:h-32 border backdrop-blur-xl transition-colors ${ahead ? "border-white/10 bg-white/[0.04] opacity-70 group-hover:opacity-90" : "border-white/15 bg-white/[0.07] group-hover:border-white/30 group-hover:bg-white/[0.12]"} ${hot || current ? "skill-border-glow" : ""}`}
            style={{ "--arrival-color": node.glow }}>
            <Icon className="w-6 h-6 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]" style={{ color: node.accent }} />
            <span className="text-[11px] font-bold tracking-wide leading-tight text-center px-2">{node.name}</span>
            <span className="text-[9px] text-white/65 mt-0.5 leading-none">
              {node.levels.length > 1 ? `${node.levels[0]}–${node.levels[node.levels.length - 1]}` : node.levels[0]} · {c("home_groups", { n: node.clusters.length })}
            </span>
            {chip && (
              <span className="mt-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none"
                style={current
                  ? { color: node.accent, borderColor: `${node.accent}66`, background: `${node.accent}22` }
                  : { color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }}>
                {chip}
              </span>
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}