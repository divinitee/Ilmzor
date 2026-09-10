import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { EASE, RM } from "@/components/skillhub/StagePrimitives";

// A topic inside a branch. Same node grammar as the domain layer — orbit
// position, drift, arrival glow — so diving from a branch into its topics reads
// as one more step down the same map rather than a jump to a different screen.
export default function GrammarTopicNode({ node, active, onClick, hot, dim, glow, accent, delay = 0, onHoverStart, onHoverEnd }) {
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${node._i * 0.6}s` }}>
        <motion.button
          onClick={onClick} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: 1, opacity: 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? delay + 0.1 + node._i * 0.06 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[104px] max-w-[140px]"
          style={{ transformPerspective: 700 }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none hub-glow-pulse"
            style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11] ${hot ? "skill-border-glow" : ""}`}
            style={{ "--arrival-color": accent }}>
            <Play className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: accent }} />
            <span className="block text-[11px] font-bold text-foreground leading-tight">{node.name}</span>
            <span className="block text-[8px] text-muted-foreground/60 mt-1 leading-tight">{node.questions} questions</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
