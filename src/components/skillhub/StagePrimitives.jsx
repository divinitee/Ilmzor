import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PULSE_PHASES } from "@/lib/skillTreeData";

// Shared node-map primitives, extracted verbatim from SkillStage.jsx
// (2026-09-09) so the Grammar map can speak the same visual language —
// spokes, pulses, layer bloom/recede, forward/back dive — without duplicating
// it. Behaviour is identical to what Vocabulary shipped with.

export const EASE = [0.16, 1, 0.3, 1]; // premium ease-out-expo — slow, smooth settle
export const RM = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function StreamPulses({ color, x, y, filterId }) {
  return PULSE_PHASES.map((p, i) => (
    <circle key={i} r={p.r} fill={color} fillOpacity={p.fo} opacity={0} filter={`url(#${filterId})`}>
      <animateMotion dur="2.2s" begin={`${p.begin}s`} repeatCount="indefinite" path={`M 50 50 L ${x} ${y}`} calcMode="linear" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.22;0.7;1" dur="2.2s" begin={`${p.begin}s`} repeatCount="indefinite" />
    </circle>
  ));
}

export const nodeKey = (n) => n.id || n.label || n._i;

export function Lines({ nodes, color, hovered, filterId }) {
  const anyHot = !!hovered;
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none" style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
      <defs>
        <filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      {nodes.map((n, i) => {
        const hot = hovered === nodeKey(n);
        const c = n.color || color;
        const dx = n.x - 50, dy = n.y - 50;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const r0 = 7, r1 = 9; // gap from hub edge and node edge
        return (
          <line key={nodeKey(n)} className={RM ? "" : "hub-line"}
            style={{ animationDelay: `${i * 0.5}s` }}
            x1={50 + ux * r0} y1={50 + uy * r0} x2={n.x - ux * r1} y2={n.y - uy * r1}
            stroke={c} strokeLinecap="round" vectorEffect="non-scaling-stroke"
            strokeWidth={hot ? 1.4 : 0.7}
            opacity={hot ? 0.95 : anyHot ? 0.12 : 0.32} />
        );
      })}
      {nodes.map((n) => hovered === nodeKey(n) && (
        <g key={nodeKey(n) + "-p"}>
          <StreamPulses color={n.color || color} x={n.x} y={n.y} filterId={filterId} />
        </g>
      ))}
    </svg>
  );
}

/* A layer of nodes. Active blooms open (blur-to-sharp); inactive recedes
   backward — dims, blurs and shrinks slightly instead of vanishing, so the
   user feels the previous layer falling away into depth. */
export function NodeGroup({ active, delay = 0, children }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: "preserve-3d", pointerEvents: active ? "auto" : "none" }}
      initial={{ scale: 0.5, opacity: 0, z: -300, filter: "blur(8px)" }}
      animate={{
        scale: active ? 1 : 0.88,
        opacity: active ? 1 : 0.08,
        z: active ? 0 : -220,
        filter: active ? "blur(0px)" : "blur(6px)",
      }}
      transition={{ duration: 0.9, ease: EASE, delay: active ? delay : 0 }}
    >
      {children}
    </motion.div>
  );
}

/* Forward dive: clicked node brightens, flies to center, morphs
   square→circle into the hub, then the next layer stems out. */
export function ForwardDive({ dive, label }) {
  return (
    <AnimatePresence>
      {dive && (
        <motion.div key={dive.k} className="absolute z-40 pointer-events-none"
          initial={{ left: `${dive.x}%`, top: `${dive.y}%`, scale: 1, opacity: 1 }}
          animate={{
            left: [`${dive.x}%`, `${dive.x}%`, "50%"],
            top: [`${dive.y}%`, `${dive.y}%`, "50%"],
            scale: [1, 1.1, 2.4, 1.15],
            opacity: 1,
          }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE } }}
          transition={{
            duration: 1.1, ease: EASE,
            scale: { times: [0, 0.22, 0.72, 1] },
            left: { times: [0, 0.22, 1] },
            top: { times: [0, 0.22, 1] },
          }}>
          <div className="-translate-x-1/2 -translate-y-1/2 relative">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{ width: 150, height: 150, background: `radial-gradient(closest-side, #ffffff, ${dive.glow} 42%, transparent 74%)`, filter: "blur(14px)" }} />
            <motion.div className="relative flex flex-col items-center justify-center text-white w-20 h-20 md:w-24 md:h-24 border border-white/40 bg-white/[0.14] backdrop-blur-2xl"
              initial={{ borderRadius: "28px" }}
              animate={{ borderRadius: "9999px" }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{ boxShadow: `0 0 70px ${dive.glow}, inset 0 1px 0 rgba(255,255,255,0.3)` }}>
              {dive.Icon ? <dive.Icon className="w-6 h-6 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.65)]" /> : <Sparkles className="w-6 h-6 mb-1 text-white" />}
              <span className="text-[10px] font-bold tracking-wide leading-none text-center px-1.5">{label}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Reverse dive (Back): center node pulls back to its original position,
   shrinking + fading, as the previous layer blooms. */
export function BackDive({ dive, label }) {
  return (
    <AnimatePresence>
      {dive && (
        <motion.div key={dive.k} className="absolute z-40 pointer-events-none"
          initial={{ left: "50%", top: "50%", scale: 1.15, opacity: 1 }}
          animate={{
            left: `${dive.x}%`,
            top: `${dive.y}%`,
            scale: [1.15, 1],
            opacity: [1, 1, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE, opacity: { times: [0, 0.78, 1] } }}>
          <div className="-translate-x-1/2 -translate-y-1/2 relative">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{ width: 150, height: 150, background: `radial-gradient(closest-side, #ffffff, ${dive.glow} 42%, transparent 74%)`, filter: "blur(14px)" }} />
            <div className="relative flex flex-col items-center justify-center text-white w-20 h-20 md:w-24 md:h-24 border border-white/40 bg-white/[0.14] backdrop-blur-2xl rounded-full"
              style={{ boxShadow: `0 0 70px ${dive.glow}, inset 0 1px 0 rgba(255,255,255,0.3)` }}>
              {dive.Icon ? <dive.Icon className="w-6 h-6 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.65)]" /> : <Sparkles className="w-6 h-6 mb-1 text-white" />}
              <span className="text-[10px] font-bold tracking-wide leading-none text-center px-1.5">{label}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}