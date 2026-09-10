import React from "react";
import { motion } from "framer-motion";
import { Crosshair, TrendingUp, ClipboardList } from "lucide-react";
import { EASE, RM } from "@/components/skillhub/StagePrimitives";
import { DOMAIN_STATE, RELATIVE } from "@/lib/grammarMapState";
import { STATE_TONE } from "./tierMeta";

const ICON = { [DOMAIN_STATE.FOCUS]: Crosshair, [DOMAIN_STATE.STRONG]: TrendingUp, [DOMAIN_STATE.UNKNOWN]: ClipboardList };

// A domain is the leaf of the map. It carries the placement verdict (focus /
// strong / not assessed), the placed level, and where that level sits against
// the tier being viewed. Selecting it dives into the domain's branches.
export default function GrammarDomainNode({ node, active, selected, hidden, onClick, hot, dim, glow, delay = 0, onHoverStart, onHoverEnd, c }) {
  const tone = STATE_TONE[node.state];
  const Icon = ICON[node.state];
  const rel = node.relative === RELATIVE.ABOVE ? c("home_rel_above")
    : node.relative === RELATIVE.WITHIN ? c("home_rel_within")
      : node.relative === RELATIVE.BELOW ? c("home_rel_below") : null;
  return (
    <div className={`absolute z-10 hub-node ${dim ? "dim" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className={RM ? "" : "hub-drift"} style={{ animationDelay: `${node._i * 0.6}s` }}>
        <motion.button
          onClick={onClick} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          initial={{ scale: 0, opacity: 0, z: -220 }}
          animate={active ? { scale: selected ? 1.06 : 1, opacity: hidden ? 0 : 1, z: 0 } : { scale: 0.35, opacity: 0, z: -240 }}
          transition={{ delay: active ? delay + 0.1 + node._i * 0.06 : 0, duration: 0.7, ease: EASE }}
          whileHover={{ scale: 1.04, transition: { duration: 0.4, ease: EASE } }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[100px] max-w-[132px]"
          style={{ transformPerspective: 700 }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none hub-glow-pulse"
            style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${selected ? `${tone}99` : glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${selected ? "border-white/35 bg-white/[0.12]" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot || selected ? "skill-border-glow" : ""}`}
            style={{ "--arrival-color": tone }}>
            <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: tone }} />
            <span className="block text-[11px] font-bold text-foreground leading-tight">{node.name}</span>
            <span className="mt-1 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none"
              style={{ color: tone, borderColor: `${tone}55`, background: `${tone}1f` }}>
              {node.level || c("home_not_assessed")}
            </span>
            {rel && <span className="block text-[8px] text-muted-foreground/75 mt-1 leading-tight">{rel}</span>}
            <span className="block text-[8px] text-muted-foreground/60 mt-0.5 leading-tight">{c("home_branches", { n: node.branches.length })}</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}