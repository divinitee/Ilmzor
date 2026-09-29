import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import SkillOrb from "./SkillOrb";
import { useProfileCopy } from "@/lib/profile/profileCopy";

const EASE = [0.16, 1, 0.3, 1]; // ease-out-expo
const R = 36; // % of stage

const place = (i, n) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
};

export default function SkillConstellation({ profile, onSelect }) {
  const reduce = useReducedMotion();
  const { c, skillName } = useProfileCopy();
  const { nodes, summary } = profile;
  const pts = nodes.map((_, i) => place(i, nodes.length));
  const d = (s) => (reduce ? 0 : s);

  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-square">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: d(1.2) }}
        className="absolute inset-[18%] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(91,46,145,0.35), transparent)" }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(239,230,213,0.05)" strokeWidth="0.3" />
        {nodes.map((n, i) => {
          const next = pts[(i + 1) % pts.length];
          return (
            <g key={n.key}>
              <motion.line x1="50" y1="50" x2={pts[i].x} y2={pts[i].y}
                stroke={n.mapped ? n.color : "rgba(239,230,213,0.25)"} strokeWidth={n.mapped ? 0.45 : 0.25}
                strokeDasharray={n.mapped ? undefined : "0.8 1.6"}
                initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }} animate={{ pathLength: 1, opacity: n.mapped ? 0.7 : 0.5 }}
                transition={{ delay: d(0.4 + i * 0.08), duration: d(1.1), ease: EASE }} />
              {n.mapped && nodes[(i + 1) % nodes.length].mapped && (
                <motion.line x1={pts[i].x} y1={pts[i].y} x2={next.x} y2={next.y} stroke="rgba(239,230,213,0.18)" strokeWidth="0.25"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(1.3), duration: d(1) }} />
              )}
            </g>
          );
        })}
      </svg>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: d(0.2), duration: d(1), ease: EASE }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] aspect-square rounded-full flex flex-col items-center justify-center text-center border border-white/10 bg-white/[0.03] backdrop-blur-md">
        <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{c("title")}</span>
        <span className="mt-1 text-[11px] md:text-xs font-semibold text-foreground leading-tight px-2">{c(`core_${summary.state}`)}</span>
      </motion.div>

      {nodes.map((n, i) => (
        <motion.button key={n.key} type="button" onClick={() => onSelect(n.key)}
          initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: d(0.9 + i * 0.1), duration: d(0.9), ease: EASE }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 p-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
          style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }}
          aria-label={`${skillName(n.key)}: ${n.mapped ? c("developed", { n: n.mastery }) : c("unmapped")}`}>
          <span className="transition-transform duration-500 group-hover:scale-110">
            <SkillOrb node={n} size={n.mapped ? 44 + n.mastery * 0.14 : 44} layoutId={`orb-${n.key}`} />
          </span>
          <span className="text-[11px] font-semibold text-foreground/90 whitespace-nowrap">{skillName(n.key)}</span>
          <span className="text-[10px] whitespace-nowrap" style={{ color: n.mapped ? n.color : undefined }}>
            {n.mapped ? c(n.stage) : <span className="text-muted-foreground">{c("unmapped")}</span>}
          </span>
        </motion.button>
      ))}
    </div>
  );
}