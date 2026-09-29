import React from "react";
import { motion } from "framer-motion";

// The luminous body of a skill. Mastery → ring fill + inner light; confidence
// → ring solidity; freshness → glow strength. Unmapped → hollow dashed shell.
const CONF_OPACITY = { low: 0.55, medium: 0.8, high: 1 };
const FRESH_GLOW = { fresh: 1, stale: 0.55, cold: 0.3 };

export default function SkillOrb({ node, size = 56, layoutId }) {
  const r = 22, C = 2 * Math.PI * r;
  const frac = node.mapped ? node.mastery / 100 : 0;
  const glow = node.mapped ? FRESH_GLOW[node.freshness] ?? 0.5 : 0;
  return (
    <motion.div layoutId={layoutId} className="relative rounded-full" style={{ width: size, height: size }}>
      {node.mapped && (
        <span
          className="absolute inset-[-35%] rounded-full blur-xl pointer-events-none"
          style={{ background: `radial-gradient(closest-side, ${node.color}, transparent)`, opacity: 0.25 + 0.45 * frac * glow }}
        />
      )}
      <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full -rotate-90">
        <defs>
          <radialGradient id={`orb-${node.key}`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={node.color} stopOpacity={node.mapped ? 0.35 + 0.5 * frac : 0} />
            <stop offset="100%" stopColor="#08060C" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <circle cx="28" cy="28" r={r} fill={`url(#orb-${node.key})`} stroke="rgba(239,230,213,0.14)" strokeWidth="1.2"
          strokeDasharray={node.mapped ? undefined : "2.5 3.5"} />
        {node.mapped && (
          <circle cx="28" cy="28" r={r} fill="none" stroke={node.color} strokeWidth="2.4" strokeLinecap="round"
            strokeDasharray={`${C * frac} ${C}`} opacity={CONF_OPACITY[node.confidence]} />
        )}
      </svg>
      {!node.mapped && <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-foreground/30" />}
    </motion.div>
  );
}