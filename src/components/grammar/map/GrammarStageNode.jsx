import React from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { EASE, RM } from "@/components/skillhub/StagePrimitives";

// One practice stage of the five-step ladder. Locked stages still render as
// nodes rather than vanishing — a student should be able to see the whole
// ladder ahead of them, not discover it exists later.
export default function GrammarStageNode({ node, active, onClick, hot, dim, glow, accent, delay = 0, onHoverStart, onHoverEnd }) {
  const Icon = node.locked ? Lock : node.icon;
  const tone = node.locked ? "#8b95a3" : accent;
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${node._i * 0.6}s` }}>
        <motion.button
          onClick={node.locked ? undefined : onClick} disabled={node.locked}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: 1, opacity: node.locked ? 0.55 : 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? delay + 0.1 + node._i * 0.06 : 0, duration: 0.7, ease: EASE }}
          whileHover={node.locked ? undefined : { scale: 1.04, transition: { duration: 0.4, ease: EASE } }}
          whileTap={node.locked ? undefined : { scale: 0.95 }}
          className="group relative min-w-[104px] max-w-[136px] disabled:cursor-default"
          style={{ transformPerspective: 700 }}
        >
          {!node.locked && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none hub-glow-pulse"
              style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors border-white/15 bg-white/[0.06] ${node.locked ? "" : "group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot && !node.locked ? "skill-border-glow" : ""}`}
            style={{ "--arrival-color": tone }}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg mb-1"
              style={{ background: `${tone}1f`, border: `1px solid ${tone}44` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: tone }} />
            </span>
            <span className="block text-[11px] font-bold text-foreground leading-tight">{node.name}</span>
            <span className="block text-[8px] text-muted-foreground/65 mt-1 leading-tight px-0.5">{node.sub}</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
